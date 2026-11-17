/**
 * VEILLE ADS — accès navigateur (Cloudflare Browser Rendering, Puppeteer).
 *
 * RÈGLE ÉTHIQUE : aucun contournement d'anti-bot. Pas de spoofing de User-Agent
 * ni de fingerprint, pas de résolution de CAPTCHA, pas de rotation pour échapper
 * aux blocages. Un blocage (CAPTCHA, « unusual traffic », 403, 429, page de
 * contrôle) est détecté, signalé et le scraper s'arrête.
 */
import puppeteer, { type Page } from "@cloudflare/puppeteer";
import type { Env } from "./types";

export type { Page };

const VIEWPORT = { width: 1366, height: 768 };

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
 * Charge `url` en un seul essai (timeout 15 s) et renvoie le HTML rendu, ou null si le chargement échoue.
 * Lève BlockedError sur HTTP 403/429 ou redirection vers une page de contrôle :
 * un blocage n'est pas réessayé.
 */
export async function gotoContent(page: Page, url: string, timeoutMs = 15000): Promise<string | null> {
  let status: number | undefined;
  try {
    const response = await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });
    status = response?.status();
  } catch (e) {
    console.warn(`[browser] chargement échoué : ${errorMessage(e)}`);
    return null;
  }
  if (status === 403 || status === 429) {
    throw new BlockedError(url, `HTTP ${status}`);
  }
  if (BLOCKED_URL.test(page.url())) {
    throw new BlockedError(url, "redirection vers une page de contrôle");
  }
  return await page.content();
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
