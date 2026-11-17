/**
 * VEILLE ADS — suivi SERP via l'API Serper.dev (fetch uniquement).
 * La clé SERP_API_KEY n'est jamais journalisée ni placée dans un message d'erreur.
 *
 * Éthique : pas de scraping de Google. 403 / 429 => alerte `scraper_blocked`, on passe au mot-clé suivant.
 */
import { csv, hash, createAlert, nowIso, type Env, type ScraperResult } from "../types";

const USER_AGENT = "veille-ads/1.0 (+cloudflare-worker)";
const SERPER_URL = "https://google.serper.dev/search";
const TIMEOUT_MS = 20_000;

/** Entrée organic[] / ads[] de Serper : tous les champs sont optionnels. */
interface SerperItem {
  title?: unknown;
  link?: unknown;
  snippet?: unknown;
  position?: unknown;
}

interface SerperResponse {
  organic?: unknown;
  ads?: unknown;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));
const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
const cleanDomain = (host: string): string => host.trim().toLowerCase().replace(/^www\./, "");

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

export async function runSERPTracker(env: Env): Promise<ScraperResult> {
  const result: ScraperResult = { scraper: "serp", ok: true, inserted: 0, updated: 0, errors: [] };
  try {
    const apiKey = env.SERP_API_KEY;
    if (!apiKey) {
      await alertSafe(env, result.errors, "scraper_not_configured", "info", "SERP_API_KEY manquant : suivi SERP désactivé", {
        scraper: "serp",
      });
      return { ...result, ok: false, skipped: "SERP_API_KEY manquant" };
    }

    const keywords = csv(env.SERP_KEYWORDS);
    if (keywords.length === 0) {
      return { ...result, ok: false, skipped: "SERP_KEYWORDS vide" };
    }

    const targets = csv(env.TARGET_DOMAINS).map(cleanDomain);
    const checkedAt = nowIso().slice(0, 10); // YYYY-MM-DD

    let blocked = 0;
    for (const keyword of keywords) {
      if ((await trackKeyword(env, apiKey, keyword, targets, checkedAt, result)) === "blocked") blocked++;
    }
    if (blocked === keywords.length) {
      return { ...result, ok: false, skipped: "blocked" };
    }
    return result;
  } catch (e) {
    result.errors.push(`erreur inattendue : ${errMsg(e)}`);
    return { ...result, ok: false };
  }
}

async function trackKeyword(
  env: Env,
  apiKey: string,
  keyword: string,
  targets: string[],
  checkedAt: string,
  result: ScraperResult,
): Promise<"blocked" | "done"> {
  let res: Response;
  let data: SerperResponse;
  try {
    res = await fetch(SERPER_URL, {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify({ q: keyword, gl: "us", hl: "en", num: 20 }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 403 || res.status === 429) {
      await alertSafe(
        env,
        result.errors,
        "scraper_blocked",
        "warn",
        `Serper bloqué pour "${keyword}" (HTTP ${res.status}) : mot-clé ignoré`,
        { scraper: "serp", keyword, status: res.status },
      );
      return "blocked";
    }
    if (!res.ok) {
      result.errors.push(`"${keyword}" : HTTP ${res.status}`);
      return "done";
    }
    data = (await res.json()) as SerperResponse;
  } catch (e) {
    result.errors.push(`"${keyword}" : requête échouée (${errMsg(e)})`);
    return "done";
  }

  const entries = [
    ...asArray<SerperItem>(data?.organic).map((item, index) => ({ item, isAd: 0, index })),
    ...asArray<SerperItem>(data?.ads).map((item, index) => ({ item, isAd: 1, index })),
  ];

  const stmts: D1PreparedStatement[] = [];
  for (const { item, isAd, index } of entries) {
    try {
      const link = str(item?.link);
      if (!link) {
        result.errors.push(`"${keyword}" : résultat sans lien ignoré`);
        continue;
      }
      const domain = cleanDomain(new URL(link).hostname);
      const parsed = typeof item.position === "number" ? item.position : Number(item.position);
      const position = Number.isFinite(parsed) && parsed > 0 ? parsed : index + 1;
      const isTarget = targets.some(t => domain === t || domain.endsWith("." + t)) ? 1 : 0;
      const serpHash = await hash(`${keyword}|${checkedAt}|${isAd}|${position}|${link}`);
      stmts.push(
        env.DB.prepare(
          "INSERT OR IGNORE INTO serp_results (keyword, position, url, title, snippet, domain, is_ad, is_target, checked_at, serp_hash) " +
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        ).bind(keyword, position, link, str(item.title), str(item.snippet), domain, isAd, isTarget, checkedAt, serpHash),
      );
    } catch (e) {
      result.errors.push(`"${keyword}" : résultat ignoré (${errMsg(e)})`);
    }
  }
  if (stmts.length === 0) return "done";

  try {
    const outcomes = await env.DB.batch(stmts);
    for (const o of outcomes) result.inserted += o.meta?.changes ?? 0;
  } catch (e) {
    result.errors.push(`"${keyword}" : écriture D1 échouée (${errMsg(e)})`);
  }
  return "done";
}
