/**
 * VEILLE ADS — écriture des créas dans la table `ads` (upsert sur content_hash).
 * Partagé par les scrapers Meta et Google.
 */
import { createAlert, type Env } from "../types";

export interface AdRow {
  platform: "meta" | "google";
  ad_id: string;
  advertiser: string | null;
  domain: string | null;
  creative_type: string | null;
  creative_url: string | null;
  headline: string | null;
  body: string | null;
  cta: string | null;
  landing_url: string | null;
  first_seen: string;
  last_seen: string;
  days_active: number;
  status: string;
  is_winner: boolean;
  screenshot_key: string | null;
  raw_data: string | null;
  content_hash: string;
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  /** Créas devenues gagnantes lors de cet upsert (nouvelle insertion ou passage à gagnante). */
  newWinners: AdRow[];
}

const BATCH_SIZE = 50; // instructions par env.DB.batch
const LOOKUP_SIZE = 90; // paramètres liés par SELECT (limite D1 : 100)

const UPSERT_SQL = `INSERT INTO ads (platform, ad_id, advertiser, domain, creative_type, creative_url, headline, body, cta, landing_url, first_seen, last_seen, days_active, status, is_winner, screenshot_key, raw_data, content_hash)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(content_hash) DO UPDATE SET last_seen=excluded.last_seen, days_active=excluded.days_active, status=excluded.status, is_winner=excluded.is_winner`;

/** Hash -> is_winner, pour les créas déjà présentes en base. */
async function loadExisting(env: Env, hashes: string[]): Promise<Map<string, boolean>> {
  const found = new Map<string, boolean>();
  for (let i = 0; i < hashes.length; i += LOOKUP_SIZE) {
    const part = hashes.slice(i, i + LOOKUP_SIZE);
    const placeholders = part.map(() => "?").join(", ");
    const res = await env.DB.prepare(
      `SELECT content_hash, is_winner FROM ads WHERE content_hash IN (${placeholders})`,
    )
      .bind(...part)
      .all<{ content_hash: string; is_winner: number }>();
    for (const row of res.results) {
      found.set(row.content_hash, row.is_winner === 1);
    }
  }
  return found;
}

/**
 * Insère ou met à jour les créas. Compte les insertions et les mises à jour
 * d'après l'existence préalable en base ; les écritures partent en lots.
 */
export async function upsertAds(env: Env, input: AdRow[]): Promise<UpsertResult> {
  // Une même créa peut revenir via plusieurs termes de recherche : on garde la dernière occurrence.
  const rows = [...new Map(input.map(r => [r.content_hash, r] as const)).values()];
  const existing = await loadExisting(env, rows.map(r => r.content_hash));

  let inserted = 0;
  let updated = 0;
  const newWinners: AdRow[] = [];
  for (const r of rows) {
    const wasWinner = existing.get(r.content_hash);
    if (wasWinner === undefined) inserted++;
    else updated++;
    if (r.is_winner && wasWinner !== true) newWinners.push(r);
  }

  const statements = rows.map(r =>
    env.DB.prepare(UPSERT_SQL).bind(
      r.platform,
      r.ad_id,
      r.advertiser,
      r.domain,
      r.creative_type,
      r.creative_url,
      r.headline,
      r.body,
      r.cta,
      r.landing_url,
      r.first_seen,
      r.last_seen,
      r.days_active,
      r.status,
      r.is_winner ? 1 : 0,
      r.screenshot_key,
      r.raw_data,
      r.content_hash,
    ),
  );
  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    await env.DB.batch(statements.slice(i, i + BATCH_SIZE));
  }

  return { inserted, updated, newWinners };
}

/** Une alerte `winning_ad` (info) par créa devenue gagnante. */
export async function alertWinners(env: Env, winners: AdRow[]): Promise<void> {
  for (const w of winners) {
    await createAlert(
      env,
      "winning_ad",
      "info",
      `Nouvelle pub gagnante ${w.platform} : ${w.advertiser ?? "annonceur inconnu"} (${w.days_active} j)`,
      {
        platform: w.platform,
        ad_id: w.ad_id,
        advertiser: w.advertiser,
        domain: w.domain,
        days_active: w.days_active,
        creative_url: w.creative_url,
      },
    );
  }
}
