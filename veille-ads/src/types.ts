/**
 * VEILLE ADS — types partagés entre le Worker et les scrapers.
 */
import type { BrowserWorker } from "@cloudflare/puppeteer";

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  BROWSER: BrowserWorker;

  // Variables (wrangler.toml [vars])
  TARGET_NAME: string;
  TARGET_DOMAINS: string;
  TARGET_AD_ACCOUNTS: string;
  SERP_KEYWORDS: string;
  TRUSTPILOT_DOMAINS: string;
  PAGE_CHECK_URLS: string;
  WINNING_AD_MIN_DAYS: string;
  CHANGE_THRESHOLD: string;
  META_AD_COUNTRIES?: string; // ex. "FR,DE" (l'API Ad Library ne couvre que les pubs diffusées dans l'UE hors politique)

  // Secrets (wrangler secret put) — optionnels : un scraper sans son secret crée une alerte et s'arrête
  ADMIN_TOKEN?: string;
  META_ACCESS_TOKEN?: string;
  SERP_API_KEY?: string; // clé Serper.dev (https://google.serper.dev/search)
}

export type ScraperName = "meta" | "google" | "trustpilot" | "serp" | "pages";

/** Résultat renvoyé par chaque scraper (loggé et renvoyé par POST /api/scan). */
export interface ScraperResult {
  scraper: ScraperName;
  ok: boolean;
  inserted: number;
  updated: number;
  skipped?: string; // raison si le scraper n'a pas tourné (secret manquant, page bloquée…)
  errors: string[];
}

export type Scraper = (env: Env) => Promise<ScraperResult>;

export function csv(v: string | undefined): string[] {
  return (v || "").split(",").map(s => s.trim()).filter(Boolean);
}

/** SHA-256 tronqué à 16 hex (même format que l'existant). */
export async function hash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

/** Crée une alerte dans la table `alerts`. */
export async function createAlert(
  env: Env,
  alertType: string,
  severity: "info" | "warn" | "critical",
  message: string,
  data?: unknown,
): Promise<void> {
  await env.DB.prepare("INSERT INTO alerts (alert_type, severity, message, data) VALUES (?, ?, ?, ?)")
    .bind(alertType, severity, message, data === undefined ? null : JSON.stringify(data))
    .run();
}

export function nowIso(): string {
  return new Date().toISOString();
}
