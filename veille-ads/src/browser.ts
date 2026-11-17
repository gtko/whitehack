/**
 * VEILLE ADS — accès navigateur (Cloudflare Browser Rendering, Puppeteer).
 *
 * RÈGLE ÉTHIQUE : aucun contournement d'anti-bot. Pas de spoofing de User-Agent
 * ni de fingerprint, pas de résolution de CAPTCHA, pas de rotation pour échapper
 * aux blocages. Un blocage (CAPTCHA, « unusual traffic », 403, 429, page de
 * contrôle) est détecté, signalé et le scraper s'arrête.
 */
import puppeteer, { type Page } from "@cloudflare/puppeteer";
import { hash, type Env } from "./types";

export type { Page };

const VIEWPORT = { width: 1366, height: 768 };
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 3000;

/** Marqueurs de blocage recherchés dans le HTML visible (scripts et styles exclus). */
const BLOCK_MARKERS: RegExp[] = [/captcha/i, /unusual traffic/i, /\/sorry\//i, /access denied/i];

/** Redirections vers une page de contrôle ou de consentement bloquant. */
const BLOCKED_URL = /\/sorry\/|consent\.google\./i;

/** Levée quand une page refuse l'accès : le scraper doit s'arrêter, sans contournement. */
export class BlockedError extends Error {
  readonly url: string;
  readonly reason: string;

  constructor(url: string, reason: string) {
    super(`accès bloqué (${reason})`);
    this.name = "BlockedError";
    this.url = url;
    this.reason = reason;
  }
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Ouvre une page Browser Rendering, exécute `fn`, puis ferme le navigateur
 * (même en cas d'erreur).
 */
export async function withPage<T>(env: Env, fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    return await fn(page);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/**
 * Charge `url` et renvoie le HTML rendu, ou null après 2 essais échoués.
 * Lève BlockedError sur HTTP 403/429 ou redirection vers une page de contrôle :
 * un blocage n'est pas réessayé.
 */
export async function gotoContent(page: Page, url: string, timeoutMs = 30000): Promise<string | null> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let status: number | undefined;
    try {
      const response = await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
      status = response?.status();
    } catch (e) {
      console.warn(`[browser] chargement essai ${attempt}/${MAX_ATTEMPTS} échoué : ${errorMessage(e)}`);
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
      continue;
    }
    if (status === 403 || status === 429) {
      throw new BlockedError(url, `HTTP ${status}`);
    }
    if (BLOCKED_URL.test(page.url())) {
      throw new BlockedError(url, "redirection vers une page de contrôle");
    }
    return await page.content();
  }
  return null;
}

/**
 * Détecte une page de blocage (CAPTCHA, trafic inhabituel, accès refusé).
 * Les balises script et style sont ignorées pour éviter les faux positifs
 * (un bundle JavaScript peut citer « captcha » sans qu'il y ait de blocage).
 */
export function looksBlocked(html: string): boolean {
  const visible = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  return BLOCK_MARKERS.some(re => re.test(visible));
}

/** Capture pleine page en PNG, stockée dans R2. Renvoie la clé ou null. */
export async function saveScreenshot(env: Env, page: Page, key: string): Promise<string | null> {
  try {
    const png = await page.screenshot({ fullPage: true, type: "png" });
    await env.R2.put(key, png, { httpMetadata: { contentType: "image/png" } });
    return key;
  } catch (e) {
    console.warn(`[browser] capture ${key} échouée : ${errorMessage(e)}`);
    return null;
  }
}

/** Texte visible d'une page. */
export async function extractText(page: Page): Promise<string> {
  return (await page.evaluate("document.body?.innerText || document.body?.textContent || ''")) as string;
}

/** Prix détectés dans un texte (regex). */
export function extractPrices(text: string): string[] {
  const patterns = [
    /[\d]+[.,][\d]+\s*[€$£]/g,
    /[\$€£]\s*[\d]+[.,][\d]*/g,
    /[\d]+\s*€/g,
    /[\d]+\s*\/\s*(?:month|mois|week|semaine|4 weeks|4 semaines)/gi,
  ];
  const prices = new Set<string>();
  for (const p of patterns) {
    const matches = text.match(p) || [];
    matches.forEach(m => prices.add(m.trim()));
  }
  return Array.from(prices);
}

/** Empreinte SHA-256 tronquée à 16 hex. */
export function contentHash(text: string): Promise<string> {
  return hash(text);
}
