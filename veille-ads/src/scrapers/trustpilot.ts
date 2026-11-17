/**
 * VEILLE ADS — scraper Trustpilot (fetch uniquement, sans navigateur).
 * Lit le JSON `__NEXT_DATA__` de la page /review/<domaine>?sort=recency.
 *
 * Éthique : User-Agent honnête, aucun contournement anti-bot.
 * 403 / 429 / captcha => alerte `scraper_blocked`, on passe au domaine suivant.
 */
import { csv, hash, createAlert, type Env, type ScraperResult } from "../types";

const USER_AGENT = "veille-ads/1.0 (+cloudflare-worker)";
const TIMEOUT_MS = 20_000;
const NEXT_DATA_RE = /<script[^>]*\bid="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i;
const CAPTCHA_RE = /captcha|challenge-platform|verify you are human|just a moment\.\.\./i;

/** Champs usuels d'une review dans __NEXT_DATA__ : tous optionnels, parsés défensivement. */
interface TpReview {
  id?: string | number | null;
  title?: unknown;
  text?: unknown;
  rating?: unknown;
  dates?: { publishedDate?: unknown } | null;
  consumer?: { displayName?: unknown } | null;
  reply?: { message?: unknown } | null;
  labels?: { verification?: { isVerified?: unknown } | null } | null;
}

interface NextData {
  props?: { pageProps?: { reviews?: unknown } };
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);
const errMsg = (e: unknown): string => (e instanceof Error ? e.message : String(e));

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

export async function runTrustpilotScraper(env: Env): Promise<ScraperResult> {
  const result: ScraperResult = { scraper: "trustpilot", ok: true, inserted: 0, updated: 0, errors: [] };
  try {
    const domains = csv(env.TRUSTPILOT_DOMAINS);
    if (domains.length === 0) {
      return { ...result, ok: false, skipped: "TRUSTPILOT_DOMAINS vide" };
    }

    let blocked = 0;
    for (const domain of domains) {
      if ((await scrapeDomain(env, domain, result)) === "blocked") blocked++;
    }
    if (blocked === domains.length) {
      return { ...result, ok: false, skipped: "blocked" };
    }
    return result;
  } catch (e) {
    result.errors.push(`erreur inattendue : ${errMsg(e)}`);
    return { ...result, ok: false };
  }
}

async function scrapeDomain(env: Env, domain: string, result: ScraperResult): Promise<"blocked" | "done"> {
  const url = `https://www.trustpilot.com/review/${encodeURIComponent(domain)}?sort=recency`;

  let res: Response;
  let html: string;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    html = await res.text();
  } catch (e) {
    result.errors.push(`${domain} : requête échouée (${errMsg(e)})`);
    return "done";
  }

  const match = NEXT_DATA_RE.exec(html);
  if (res.status === 403 || res.status === 429 || (!match && CAPTCHA_RE.test(html))) {
    await alertSafe(
      env,
      result.errors,
      "scraper_blocked",
      "warn",
      `Trustpilot bloqué pour ${domain} (HTTP ${res.status}) : domaine ignoré`,
      { scraper: "trustpilot", domain, status: res.status, url },
    );
    return "blocked";
  }
  if (!res.ok) {
    result.errors.push(`${domain} : HTTP ${res.status}`);
    return "done";
  }
  if (!match) {
    result.errors.push(`${domain} : __NEXT_DATA__ introuvable (structure de page changée ?)`);
    return "done";
  }

  let reviews: unknown;
  try {
    const data = JSON.parse(match[1]) as NextData;
    reviews = data?.props?.pageProps?.reviews;
  } catch (e) {
    result.errors.push(`${domain} : JSON __NEXT_DATA__ invalide (${errMsg(e)})`);
    return "done";
  }
  if (!Array.isArray(reviews)) {
    result.errors.push(`${domain} : props.pageProps.reviews absent`);
    return "done";
  }

  const rows: { stmt: D1PreparedStatement; rating: number | null }[] = [];
  for (const raw of reviews as (TpReview | null)[]) {
    try {
      if (!raw || raw.id == null || raw.id === "") {
        result.errors.push(`${domain} : review sans id ignorée`);
        continue;
      }
      const num = typeof raw.rating === "number" || typeof raw.rating === "string" ? Number(raw.rating) : NaN;
      const rating = Number.isFinite(num) ? Math.round(num) : null;
      const reviewHash = await hash("tp:" + String(raw.id));
      const stmt = env.DB.prepare(
        "INSERT OR IGNORE INTO reviews (platform, domain, author, rating, title, body, review_date, response, verified, review_hash) " +
          "VALUES ('trustpilot', ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ).bind(
        domain,
        str(raw.consumer?.displayName),
        rating,
        str(raw.title),
        str(raw.text),
        str(raw.dates?.publishedDate),
        str(raw.reply?.message),
        raw.labels?.verification?.isVerified ? 1 : 0,
        reviewHash,
      );
      rows.push({ stmt, rating });
    } catch (e) {
      result.errors.push(`${domain} : review ignorée (${errMsg(e)})`);
    }
  }
  if (rows.length === 0) return "done";

  let newNegative = 0;
  try {
    const outcomes = await env.DB.batch(rows.map(r => r.stmt));
    outcomes.forEach((o, i) => {
      const changes = o.meta?.changes ?? 0;
      result.inserted += changes;
      const rating = rows[i].rating;
      if (changes > 0 && rating !== null && rating <= 2) newNegative++;
    });
  } catch (e) {
    result.errors.push(`${domain} : écriture D1 échouée (${errMsg(e)})`);
    return "done";
  }

  if (newNegative > 0) {
    await alertSafe(
      env,
      result.errors,
      "negative_review",
      "warn",
      `${domain} : ${newNegative} nouvel(le)(s) avis Trustpilot à 2 étoiles ou moins`,
      { scraper: "trustpilot", domain, count: newNegative },
    );
  }
  return "done";
}
