/**
 * VEILLE ADS — scraper Meta via l'API officielle Ad Library (Graph API `ads_archive`).
 *
 * Pas de navigateur ici : l'API officielle est interrogée avec META_ACCESS_TOKEN.
 * Le token n'est jamais écrit dans les logs, les erreurs, les créa ni raw_data.
 */
import { createAlert, csv, hash, nowIso, type Env, type ScraperResult } from "../types";
import { alertWinners, upsertAds, type AdRow } from "./ads-store";

const GRAPH_URL = "https://graph.facebook.com/v21.0/ads_archive";
const FIELDS = [
  "id",
  "page_name",
  "ad_creative_bodies",
  "ad_creative_link_titles",
  "ad_creative_link_captions",
  "ad_snapshot_url",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
].join(",");
const PAGE_LIMIT = 50;
const MAX_PAGES = 3;
const DAY_MS = 86_400_000;
const DOMAIN_RE = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$/;

interface GraphAd {
  id: string;
  page_name?: string;
  ad_creative_bodies?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_captions?: string[];
  ad_snapshot_url?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string;
}

interface GraphResponse {
  data?: GraphAd[];
  paging?: { next?: string };
  error?: { message?: string };
}

/** Masque le token dans un texte destiné aux logs ou aux alertes. */
function redact(text: string): string {
  return text.replace(/access_token=[^&\s"']+/g, "access_token=***");
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Retire access_token d'une URL de snapshot (null si l'URL n'est pas exploitable). */
export function stripAccessToken(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    url.searchParams.delete("access_token");
    return url.toString();
  } catch {
    return null;
  }
}

/** Dates Graph au format « 2024-05-01T07:00:00+0000 » : on ajoute le ':' du fuseau pour Date.parse. */
function parseMetaDate(value: string | undefined): number {
  if (!value) return NaN;
  return Date.parse(value.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
}

function searchUrl(term: string, countries: string[], token: string): string {
  const params = new URLSearchParams({
    search_terms: term,
    ad_type: "ALL",
    ad_reached_countries: JSON.stringify(countries),
    ad_active_status: "ALL",
    fields: FIELDS,
    limit: String(PAGE_LIMIT),
    access_token: token,
  });
  return `${GRAPH_URL}?${params.toString()}`;
}

async function fetchGraphPage(
  url: string,
): Promise<{ ads: GraphAd[]; next?: string } | { error: string }> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    return { error: `réseau : ${redact(errorMessage(e))}` };
  }
  const body = (await res.json().catch(() => null)) as GraphResponse | null;
  if (!res.ok || body?.error) {
    const detail = body?.error?.message ? ` : ${redact(body.error.message).slice(0, 200)}` : "";
    return { error: `HTTP ${res.status}${detail}` };
  }
  return { ads: body?.data ?? [], next: body?.paging?.next };
}

async function toRow(ad: GraphAd, account: string, seenAt: string, winMinDays: number): Promise<AdRow> {
  const now = Date.now();
  const start = parseMetaDate(ad.ad_delivery_start_time);
  const stop = parseMetaDate(ad.ad_delivery_stop_time);
  const ended = Number.isFinite(stop) && stop <= now;
  const status = ended ? "inactive" : "active";
  const end = ended ? stop : now;
  const daysActive = Number.isFinite(start) ? Math.max(0, Math.floor((end - start) / DAY_MS)) : 0;
  const isWinner = status === "active" && daysActive >= winMinDays;

  const caption = ad.ad_creative_link_captions?.[0]?.trim().toLowerCase() || null;
  const domain = caption && DOMAIN_RE.test(caption) ? caption.replace(/^www\./, "") : null;
  const snapshot = stripAccessToken(ad.ad_snapshot_url);

  return {
    platform: "meta",
    ad_id: ad.id,
    advertiser: ad.page_name || account,
    domain,
    creative_type: null,
    creative_url: snapshot,
    headline: ad.ad_creative_link_titles?.[0] || null,
    body: ad.ad_creative_bodies?.[0] || null,
    cta: caption,
    landing_url: null,
    first_seen: Number.isFinite(start) ? new Date(start).toISOString() : seenAt,
    last_seen: seenAt,
    days_active: daysActive,
    status,
    is_winner: isWinner,
    screenshot_key: null,
    raw_data: JSON.stringify({ ...ad, ad_snapshot_url: snapshot }),
    content_hash: await hash(`meta:${ad.id}`),
  };
}

export async function runMetaScraper(env: Env): Promise<ScraperResult> {
  const result: ScraperResult = { scraper: "meta", ok: true, inserted: 0, updated: 0, errors: [] };

  const token = env.META_ACCESS_TOKEN;
  if (!token) {
    await createAlert(env, "scraper_not_configured", "info", "Scraper Meta non configuré : META_ACCESS_TOKEN manquant");
    return { ...result, ok: false, skipped: "META_ACCESS_TOKEN manquant" };
  }

  const countries = csv(env.META_AD_COUNTRIES || "FR");
  const winMinDays = Number(env.WINNING_AD_MIN_DAYS) || 7;
  const seenAt = nowIso();
  const rows: AdRow[] = [];

  for (const account of csv(env.TARGET_AD_ACCOUNTS)) {
    let next: string | undefined = searchUrl(account, countries, token);
    for (let page = 0; next && page < MAX_PAGES; page++) {
      const fetched = await fetchGraphPage(next);
      if ("error" in fetched) {
        result.errors.push(`Meta "${account}" : ${fetched.error}`);
        break;
      }
      for (const ad of fetched.ads) {
        rows.push(await toRow(ad, account, seenAt, winMinDays));
      }
      next = fetched.next;
    }
  }

  try {
    const { inserted, updated, newWinners } = await upsertAds(env, rows);
    result.inserted = inserted;
    result.updated = updated;
    await alertWinners(env, newWinners);
  } catch (e) {
    result.errors.push(`écriture D1 : ${redact(errorMessage(e))}`);
  }

  result.ok = result.errors.length === 0;
  return result;
}
