/**
 * VEILLE ADS — surveillance des pages concurrentes (fetch uniquement, sans navigateur).
 * Détection de changement par hash du texte visible, diff par ensembles de mots, prix extraits par regex.
 *
 * Éthique : User-Agent honnête, aucun contournement anti-bot.
 * 403 / 429 / page captcha => alerte `scraper_blocked`, on passe à l'URL suivante.
 */
import { csv, hash, createAlert, type Env, type ScraperResult } from "../types";

const USER_AGENT = "veille-ads/1.0 (+cloudflare-worker)";
const TIMEOUT_MS = 20_000;
const MAX_TEXT_CHARS = 50_000;
const MAX_PRICES = 100;
const CAPTCHA_RE = /captcha|challenge-platform|verify you are human|just a moment\.\.\./i;
// Montant avec symbole (€ $ £) avant ou après, suffixe de période optionnel (/mois, par month, /week…)
const PRICE_RE =
  /(?:[€$£]\s?\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?\s?[€$£])(?:\s*(?:\/|\bpar\b|\bper\b)\s*(?:mois|month|an|year|semaine|week|jour|day))?/gi;

const NAMED_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

interface PrevSnapshot {
  content_hash: string | null;
  text_content: string | null;
  prices: string | null;
}

const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match: string, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

function extractTitle(html: string): string {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? decodeEntities(m[1].replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim() : "";
}

/** Texte visible : retire commentaires, script, style et balises, compacte les espaces, tronque. */
function extractVisibleText(html: string): string {
  const stripped = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(stripped).replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
}

function extractPrices(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(PRICE_RE)) {
    found.add(m[0].replace(/\s+/g, " ").trim());
    if (found.size >= MAX_PRICES) break;
  }
  return [...found];
}

/** Proportion de mots différents entre deux textes (distance de Jaccard sur ensembles de mots, 0..1). */
function changeRatio(prevText: string, nextText: string): number {
  const a = new Set(prevText.toLowerCase().split(/\s+/).filter(Boolean));
  const b = new Set(nextText.toLowerCase().split(/\s+/).filter(Boolean));
  let onlyA = 0;
  let onlyB = 0;
  for (const w of a) if (!b.has(w)) onlyA++;
  for (const w of b) if (!a.has(w)) onlyB++;
  const union = a.size + onlyB;
  return union === 0 ? 0 : Math.round(((onlyA + onlyB) / union) * 10000) / 10000;
}

function parseStringList(raw: string | null): string[] {
  try {
    const v: unknown = JSON.parse(raw ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function alertSafe(
  env: Env,
  errors: string[],
  type: string,
  severity: "info" | "warn" | "critical",
  message: string,
  data: unknown,
): Promise<void> {
  try {
    await createAlert(env, type, severity, message, data);
  } catch (e) {
    errors.push(`alerte "${type}" non enregistrée : ${errMsg(e)}`);
  }
}

export async function runPageMonitor(env: Env): Promise<ScraperResult> {
  const result: ScraperResult = { scraper: "pages", ok: true, inserted: 0, updated: 0, errors: [] };
  try {
    const urls = csv(env.PAGE_CHECK_URLS);
    if (urls.length === 0) {
      return { ...result, ok: false, skipped: "PAGE_CHECK_URLS vide" };
    }

    const parsedThreshold = Number(env.CHANGE_THRESHOLD || 0.05);
    const threshold = Number.isFinite(parsedThreshold) ? parsedThreshold : 0.05;

    let blocked = 0;
    for (const url of urls) {
      if ((await monitorUrl(env, url, threshold, result)) === "blocked") blocked++;
    }
    if (blocked === urls.length) {
      return { ...result, ok: false, skipped: "blocked" };
    }
    return result;
  } catch (e) {
    result.errors.push(`erreur inattendue : ${errMsg(e)}`);
    return { ...result, ok: false };
  }
}

async function monitorUrl(
  env: Env,
  url: string,
  threshold: number,
  result: ScraperResult,
): Promise<"blocked" | "done"> {
  try {
    let res: Response;
    let html: string;
    try {
      res = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.status === 403 || res.status === 429) {
        await alertSafe(
          env,
          result.errors,
          "scraper_blocked",
          "warn",
          `Page bloquée pour ${url} (HTTP ${res.status}) : URL ignorée`,
          { scraper: "pages", url, status: res.status },
        );
        return "blocked";
      }
      if (!res.ok) {
        result.errors.push(`${url} : HTTP ${res.status}`);
        return "done";
      }
      html = await res.text();
    } catch (e) {
      result.errors.push(`${url} : requête échouée (${errMsg(e)})`);
      return "done";
    }

    const title = extractTitle(html);
    if (CAPTCHA_RE.test(title)) {
      await alertSafe(env, result.errors, "scraper_blocked", "warn", `Page captcha pour ${url} : URL ignorée`, {
        scraper: "pages",
        url,
      });
      return "blocked";
    }

    const text = extractVisibleText(html);
    const prices = extractPrices(text);
    const contentHash = await hash(text);

    const prev = await env.DB.prepare(
      "SELECT content_hash, text_content, prices FROM page_snapshots WHERE url = ? ORDER BY id DESC LIMIT 1",
    )
      .bind(url)
      .first<PrevSnapshot>();

    if (prev && prev.content_hash === contentHash) return "done";

    const prevPrices = prev ? parseStringList(prev.prices) : [];
    const pricesAdded = prev ? prices.filter(p => !prevPrices.includes(p)) : [];
    const pricesRemoved = prev ? prevPrices.filter(p => !prices.includes(p)) : [];
    const pricesChanged = pricesAdded.length > 0 || pricesRemoved.length > 0;
    const changePct = prev ? changeRatio(prev.text_content ?? "", text) : 0;

    await env.DB.prepare(
      "INSERT INTO page_snapshots (url, title, content_hash, text_content, prices, changes_detected, change_pct) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(
        url,
        title || null,
        contentHash,
        text,
        JSON.stringify(prices),
        JSON.stringify({ pricesAdded, pricesRemoved }),
        changePct,
      )
      .run();
    result.inserted++;

    if (!prev) return "done"; // premier snapshot : pas de référence, pas d'alerte

    result.updated++;
    if (changePct >= threshold || pricesChanged) {
      const severity: "critical" | "info" = pricesChanged ? "critical" : "info";
      await alertSafe(
        env,
        result.errors,
        "page_change",
        severity,
        `${url} : ${(changePct * 100).toFixed(1)} % du texte modifié${pricesChanged ? ", prix modifiés" : ""}`,
        { url, change_pct: changePct, pricesAdded, pricesRemoved },
      );
    }
    return "done";
  } catch (e) {
    result.errors.push(`${url} : ${errMsg(e)}`);
    return "done";
  }
}
