/**
 * Barrel des scrapers : exporte chaque scraper et le registre SCRAPERS
 * utilisé par le Worker (src/index.ts) pour les crons et POST /api/scan.
 */
import type { Scraper, ScraperName } from "../types";
import { runMetaScraper } from "./meta";
import { runGoogleScraper } from "./google";
import { runTrustpilotScraper } from "./trustpilot";
import { runSERPTracker } from "./serp";
import { runPageMonitor } from "./pages";

export { runMetaScraper, runGoogleScraper, runTrustpilotScraper, runSERPTracker, runPageMonitor };

export const SCRAPERS: Record<ScraperName, Scraper> = {
  meta: runMetaScraper,
  google: runGoogleScraper,
  trustpilot: runTrustpilotScraper,
  serp: runSERPTracker,
  pages: runPageMonitor,
};
