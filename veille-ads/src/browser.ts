/**
 * VEILLE ADS — Cloudflare Browser Rendering Engine
 * 
 * Utilise l'API Browser Rendering de Cloudflare (Puppeteer-compatible)
 * pour scraper avec un navigateur camoufflé en edge.
 * 
 * Anti-détection: viewport rotation, UA spoofing, delays humains,
 * screenshot capture, HTML extraction.
 */

export interface BrowserPage {
  goto(url: string, opts?: { waitUntil?: string; timeout?: number }): Promise<void>;
  content(): Promise<string>;
  evaluate<T>(fn: string | (() => T)): Promise<T>;
  screenshot(opts?: { fullPage?: boolean }): Promise<Uint8Array>;
  $(selector: string): Promise<ElementHandle | null>;
  $$(selector: string): Promise<ElementHandle[]>;
  close(): Promise<void>;
}

export interface ElementHandle {
  textContent(): Promise<string | null>;
  getAttribute(name: string): Promise<string | null>;
  click(): Promise<void>;
}

export interface BrowserEnv {
  BROWSER: any; // Cloudflare Browser Rendering binding
  KV: KVNamespace;
  R2: R2Bucket;
}

const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1440, height: 900 },
  { width: 1366, height: 768 },
  { width: 2560, height: 1440 },
];

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Ouvre un navigateur Cloudflare avec fingerprint rotatif.
 */
export async function launchBrowser(env: BrowserEnv): Promise<BrowserPage> {
  const viewport = randomItem(VIEWPORTS);
  const ua = randomItem(USER_AGENTS);

  const browser = await env.BROWSER.launch();
  const page = await browser.newPage();

  // Appliquer le fingerprint
  await page.setViewport(viewport);
  await page.setUserAgent(ua);

  // Injecter des headers humains
  await page.setExtraHTTPHeaders({
    "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="131", "Google Chrome";v="131"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Upgrade-Insecure-Requests": "1",
  });

  return page as BrowserPage;
}

/**
 * Navigation avec retry et délai humain.
 */
export async function safeGoto(
  page: BrowserPage,
  url: string,
  maxRetries = 3
): Promise<string | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
      // Délai humain aléatoire
      await sleep(1500 + Math.random() * 2500);
      return await page.content();
    } catch (e) {
      console.warn(`[ENGINE] goto ${url} attempt ${i + 1} failed: ${e}`);
      await sleep(3000 * (i + 1));
    }
  }
  return null;
}

/**
 * Scroll humain pour lazy-loading.
 */
export async function humanScroll(page: BrowserPage, times = 3): Promise<void> {
  for (let i = 0; i < times; i++) {
    await page.evaluate(`
      window.scrollBy({ top: ${300 + Math.random() * 500}, behavior: 'smooth' })
    `);
    await sleep(800 + Math.random() * 1200);
  }
}

/**
 * Screenshot sauvegardé dans R2.
 */
export async function saveScreenshot(
  env: BrowserEnv,
  page: BrowserPage,
  key: string
): Promise<string | null> {
  try {
    const screenshot = await page.screenshot({ fullPage: true });
    await env.R2.put(key, screenshot, {
      httpMetadata: { contentType: "image/png" },
    });
    return key;
  } catch (e) {
    console.warn(`[ENGINE] screenshot failed: ${e}`);
    return null;
  }
}

/**
 * Extrait le texte visible d'une page.
 */
export async function extractText(page: BrowserPage): Promise<string> {
  return page.evaluate(`
    () => document.body?.innerText || document.body?.textContent || ''
  `) as Promise<string>;
}

/**
 * Extrait les prix d'un texte avec regex.
 */
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

/**
 * Calcule le hash SHA-256 d'un contenu (Web Crypto).
 */
export async function contentHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}
