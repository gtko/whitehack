/**
 * VEILLE ADS — scraper Google Ads Transparency Center (navigateur Browser Rendering).
 *
 * RÈGLE ÉTHIQUE : si la page renvoie un CAPTCHA, « unusual traffic », une page de
 * contrôle ou un 403/429, on s'arrête, on crée une alerte `scraper_blocked` et on
 * renvoie skipped "blocked". Aucun contournement.
 */
import { createAlert, csv, hash, nowIso, type Env, type ScraperResult } from "../types";
import {
  BlockedError,
  errorMessage,
  gotoContent,
  looksBlocked,
  saveScreenshot,
  withPage,
  type Page,
} from "../browser";
import { alertWinners, upsertAds, type AdRow } from "./ads-store";

const MAX_DOMAINS = 8;
const TRANSPARENCY_URL = "https://adstransparency.google.com/?region=anywhere&domain=";

interface Creative {
  adId: string;
  advertiser: string;
  creativeUrl: string;
}

/**
 * Extraction exécutée dans la page. Script en chaîne (et non fonction TypeScript) :
 * le bundler ajoute des helpers qui n'existent pas dans le navigateur.
 */
const EXTRACT_CREATIVES_JS = `(() => {
  const found = new Map();
  for (const a of Array.from(document.querySelectorAll('a[href*="/creative/"]'))) {
    const href = a.getAttribute('href') || '';
    const adId = (href.split('/creative/')[1] || '').split(/[/?#]/)[0];
    if (!adId || found.has(adId)) continue;
    const card = a.closest('creative-preview') || a.parentElement;
    const advLink = card ? card.querySelector('a[href*="/advertiser/"]') : null;
    found.set(adId, {
      adId,
      advertiser: ((advLink && advLink.textContent) || '').trim(),
      creativeUrl: new URL(href, location.href).href,
    });
  }
  return Array.from(found.values());
})()`;

type DomainOutcome =
  | { kind: "ok"; creatives: Creative[]; screenshotKey: string | null }
  | { kind: "error"; message: string }
  | { kind: "blocked"; reason: string };

async function scrapeDomain(env: Env, page: Page, domain: string, day: string): Promise<DomainOutcome> {
  let html: string | null;
  try {
    html = await gotoContent(page, TRANSPARENCY_URL + encodeURIComponent(domain));
  } catch (e) {
    if (e instanceof BlockedError) return { kind: "blocked", reason: e.reason };
    return { kind: "error", message: errorMessage(e) };
  }
  if (html === null) {
    return { kind: "error", message: "page inaccessible" };
  }
  if (looksBlocked(html)) {
    return { kind: "blocked", reason: "CAPTCHA ou trafic inhabituel détecté" };
  }

  const screenshotKey = await saveScreenshot(env, page, `google/${domain}/${day}.png`);
  try {
    const creatives = (await page.evaluate(EXTRACT_CREATIVES_JS)) as Creative[];
    return { kind: "ok", creatives, screenshotKey };
  } catch (e) {
    return { kind: "error", message: `extraction : ${errorMessage(e)}` };
  }
}

async function toRow(c: Creative, domain: string, seenAt: string, screenshotKey: string | null): Promise<AdRow> {
  return {
    platform: "google",
    ad_id: c.adId,
    advertiser: c.advertiser || null,
    domain,
    creative_type: null,
    creative_url: c.creativeUrl || null,
    headline: null,
    body: null,
    cta: null,
    landing_url: null,
    first_seen: seenAt,
    last_seen: seenAt,
    days_active: 0,
    status: "unknown", // le Transparency Center ne donne pas la date de fin de diffusion
    is_winner: false,
    screenshot_key: screenshotKey,
    raw_data: JSON.stringify(c),
    content_hash: await hash(`google:${c.adId}`),
  };
}

export async function runGoogleScraper(env: Env): Promise<ScraperResult> {
  const result: ScraperResult = { scraper: "google", ok: true, inserted: 0, updated: 0, errors: [] };
  const domains = csv(env.TARGET_DOMAINS).slice(0, MAX_DOMAINS);
  const seenAt = nowIso();
  const day = seenAt.slice(0, 10);

  const outcomes: Array<{ domain: string; outcome: DomainOutcome }> = [];
  try {
    await withPage(env, async page => {
      for (const domain of domains) {
        const outcome = await scrapeDomain(env, page, domain, day);
        outcomes.push({ domain, outcome });
        if (outcome.kind === "blocked") break; // on s'arrête, pas de contournement
      }
    });
  } catch (e) {
    result.errors.push(`navigateur indisponible : ${errorMessage(e)}`);
  }

  const rows: AdRow[] = [];
  let total = 0;
  let blockedBy: { domain: string; reason: string } | undefined;
  for (const { domain, outcome } of outcomes) {
    if (outcome.kind === "blocked") {
      blockedBy = { domain, reason: outcome.reason };
      break;
    }
    if (outcome.kind === "error") {
      result.errors.push(`Google "${domain}" : ${outcome.message}`);
      continue;
    }
    total += outcome.creatives.length;
    for (const c of outcome.creatives) {
      rows.push(await toRow(c, domain, seenAt, outcome.screenshotKey));
    }
  }

  try {
    const { inserted, updated, newWinners } = await upsertAds(env, rows);
    result.inserted = inserted;
    result.updated = updated;
    await alertWinners(env, newWinners);
  } catch (e) {
    result.errors.push(`écriture D1 : ${errorMessage(e)}`);
  }

  if (blockedBy) {
    await createAlert(
      env,
      "scraper_blocked",
      "warn",
      `Google Ads Transparency bloqué sur ${blockedBy.domain} (${blockedBy.reason}) : scraper arrêté`,
      { domain: blockedBy.domain, reason: blockedBy.reason },
    );
    return { ...result, ok: false, skipped: "blocked" };
  }

  if (total === 0) {
    result.errors.push("aucune créa extraite — sélecteurs à revoir");
  }
  result.ok = result.errors.length === 0;
  return result;
}
