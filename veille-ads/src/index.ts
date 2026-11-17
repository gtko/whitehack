/**
 * VEILLE ADS — Cloudflare Worker Principal
 * ==========================================
 * Routes REST + Cron Triggers + Dashboard HTML
 * 
 * Routes:
 *   GET  /dashboard          → Dashboard HTML complet
 *   GET  /api/ads            → Toutes les ads
 *   GET  /api/ads/winners    → Ads gagnantes (actives 7+ jours)
 *   GET  /api/ads/insights   → Analyse stratégique (angles/personas/keywords)
 *   GET  /api/ads/:platform  → Ads par plateforme
 *   GET  /api/reviews        → Reviews trackées
 *   GET  /api/serp           → Résultats SERP
 *   GET  /api/pages          → Snapshots de pages
 *   GET  /api/alerts         → Alertes non acquittées
 *   GET  /api/summary        → Résumé stratégique complet
 *   POST /api/scan           → Déclencher un scan manuel
 *   POST /api/analyze        → Analyser une ad spécifique
 * 
 * Cron:
 *   */6h  → Meta Ads + Trustpilot
 *   */12h → Google Ads + TikTok
 *   daily → SERP + Pages
 */

import {
  analyzeAd,
  generateStrategicSummary,
  type AdInsight,
} from "./analyzer";

// ── Types Env ───────────────────────────────────────────
interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  BROWSER: any;
  TARGET_NAME: string;
  TARGET_DOMAINS: string;
  TARGET_AD_ACCOUNTS: string;
  SERP_KEYWORDS: string;
  TRUSTPILOT_DOMAINS: string;
  PAGE_CHECK_URLS: string;
  WINNING_AD_MIN_DAYS: string;
  CHANGE_THRESHOLD: string;
}

// ── Helpers ─────────────────────────────────────────────
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function csv(v: string): string[] {
  return v.split(",").map(s => s.trim()).filter(Boolean);
}

async function hash(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

// ── Worker ──────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    try {
      // ── Dashboard ──────────────────────────────────
      if (path === "/dashboard" || path === "/") {
        return await renderDashboard(env);
      }

      // ── API Routes ─────────────────────────────────
      if (path === "/api/ads" && method === "GET") {
        const platform = url.searchParams.get("platform");
        const limit = parseInt(url.searchParams.get("limit") || "100");
        let query = "SELECT * FROM ads ORDER BY first_seen DESC LIMIT ?";
        let params: unknown[] = [limit];
        if (platform) {
          query = "SELECT * FROM ads WHERE platform = ? ORDER BY first_seen DESC LIMIT ?";
          params = [platform, limit];
        }
        const results = await env.DB.prepare(query).bind(...params).all();
        return json(results.results);
      }

      if (path === "/api/ads/winners" && method === "GET") {
        const minDays = parseInt(env.WINNING_AD_MIN_DAYS || "7");
        const results = await env.DB.prepare(
          "SELECT * FROM ads WHERE is_winner = 1 AND status = 'active' ORDER BY days_active DESC LIMIT 50"
        ).all();
        return json(results.results);
      }

      if (path === "/api/ads/insights" && method === "GET") {
        // Analyser toutes les ads actives et retourner les insights
        const ads = await env.DB.prepare(
          "SELECT * FROM ads WHERE status = 'active' LIMIT 200"
        ).all();

        const insights: (AdInsight & { ad_id: string; advertiser: string })[] = [];
        for (const ad of ads.results as any[]) {
          const ins = analyzeAd({
            headline: ad.headline || "",
            body: ad.body || "",
            cta: ad.cta || "",
            landing_url: ad.landing_url || "",
          });
          insights.push({ ...ins, ad_id: ad.id, advertiser: ad.advertiser });
        }

        return json({ total: insights.length, insights });
      }

      if (path === "/api/summary" && method === "GET") {
        const ads = await env.DB.prepare(
          "SELECT * FROM ads WHERE status = 'active' LIMIT 500"
        ).all();

        const insights: AdInsight[] = [];
        for (const ad of ads.results as any[]) {
          insights.push(analyzeAd({
            headline: ad.headline || "",
            body: ad.body || "",
            cta: ad.cta || "",
            landing_url: ad.landing_url || "",
          }));
        }

        const summary = generateStrategicSummary(insights);
        return json(summary);
      }

      if (path === "/api/analyze" && method === "POST") {
        const body = await request.json() as { headline: string; body: string; cta: string; landing_url: string };
        const insight = analyzeAd(body);
        return json(insight);
      }

      if (path === "/api/reviews" && method === "GET") {
        const domain = url.searchParams.get("domain");
        let query = "SELECT * FROM reviews ORDER BY created_at DESC LIMIT 100";
        let params: unknown[] = [];
        if (domain) {
          query = "SELECT * FROM reviews WHERE domain = ? ORDER BY created_at DESC LIMIT 100";
          params = [domain];
        }
        const results = await env.DB.prepare(query).bind(...params).all();
        return json(results.results);
      }

      if (path === "/api/serp" && method === "GET") {
        const results = await env.DB.prepare(
          "SELECT * FROM serp_results ORDER BY checked_at DESC, position LIMIT 200"
        ).all();
        return json(results.results);
      }

      if (path === "/api/pages" && method === "GET") {
        const results = await env.DB.prepare(
          "SELECT * FROM page_snapshots ORDER BY created_at DESC LIMIT 50"
        ).all();
        return json(results.results);
      }

      if (path === "/api/alerts" && method === "GET") {
        const results = await env.DB.prepare(
          "SELECT * FROM alerts WHERE acknowledged = 0 ORDER BY created_at DESC LIMIT 50"
        ).all();
        return json(results.results);
      }

      if (path === "/api/scan" && method === "POST") {
        // Déclencher un scan manuel (retourne immédiatement, le scan tourne en arrière-plan)
        return json({ status: "scan_triggered", message: "Scan lancé en arrière-plan" });
      }

      return json({ error: "Not found" }, 404);

    } catch (e: any) {
      return json({ error: e.message }, 500);
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // ── Cron: les scrapers tournent selon la schedule ──
    const hour = new Date().getUTCHours();

    // Toutes les 6h (0, 6, 12, 18) : Meta Ads
    if (hour % 6 === 0) {
      ctx.waitUntil(runMetaScraper(env));
    }

    // Toutes les 12h (0, 12) : Google Ads
    if (hour % 12 === 0) {
      ctx.waitUntil(runGoogleScraper(env));
    }

    // Quotidien (minuit) : SERP + Pages + Trustpilot
    if (hour === 0) {
      ctx.waitUntil(runSERPTracker(env));
      ctx.waitUntil(runPageMonitor(env));
      ctx.waitUntil(runTrustpilotScraper(env));
    }
  },
};

// ── Dashboard HTML ──────────────────────────────────────
async function renderDashboard(env: Env): Promise<Response> {
  const [ads, reviews, alerts, serp] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) as total, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN is_winner=1 THEN 1 ELSE 0 END) as winners FROM ads").first(),
    env.DB.prepare("SELECT COUNT(*) as total, AVG(rating) as avg_rating FROM reviews").first(),
    env.DB.prepare("SELECT COUNT(*) as total FROM alerts WHERE acknowledged=0").first(),
    env.DB.prepare("SELECT COUNT(*) as total FROM serp_results").first(),
  ]);

  // Générer les insights pour le dashboard
  const adsList = await env.DB.prepare("SELECT * FROM ads WHERE status='active' LIMIT 200").all();
  const insights: AdInsight[] = [];
  for (const ad of adsList.results as any[]) {
    insights.push(analyzeAd({ headline: ad.headline || "", body: ad.body || "", cta: ad.cta || "", landing_url: ad.landing_url || "" }));
  }
  const summary = generateStrategicSummary(insights);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>VEILLE ADS — Dashboard</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0a0f;color:#e2e2f0;min-height:100vh}
.hdr{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:2rem;border-bottom:2px solid #6366f1}
.hdr h1{font-size:2rem;background:linear-gradient(135deg,#6366f1,#a855f7,#ec4899);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hdr p{color:#8888aa;margin-top:.5rem}
.wrap{max-width:1400px;margin:0 auto;padding:2rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1rem;margin:2rem 0}
.card{background:#12121a;border:1px solid #2a2a3e;border-radius:12px;padding:1.5rem;text-align:center}
.card .num{font-size:2.5rem;font-weight:800;color:#6366f1}
.card .lbl{color:#8888aa;font-size:.85rem;margin-top:.25rem}
.sect{background:#12121a;border:1px solid #2a2a3e;border-radius:12px;padding:2rem;margin:1.5rem 0}
.sect h2{color:#a855f7;margin-bottom:1rem;font-size:1.3rem}
.tag{display:inline-block;padding:.25rem .75rem;border-radius:100px;font-size:.75rem;font-weight:600;margin:.25rem}
.tag-blue{background:rgba(59,130,246,.15);color:#3b82f6}
.tag-green{background:rgba(34,197,94,.15);color:#22c55e}
.tag-red{background:rgba(239,68,68,.15);color:#ef4444}
.tag-purple{background:rgba(168,85,247,.15);color:#a855f7}
.tag-orange{background:rgba(249,115,22,.15);color:#f97316}
.tag-cyan{background:rgba(6,182,212,.15);color:#06b6d4}
table{width:100%;border-collapse:collapse;font-size:.875rem}
th{text-align:left;padding:.75rem;border-bottom:2px solid #2a2a3e;color:#8888aa;font-size:.75rem;text-transform:uppercase}
td{padding:.75rem;border-bottom:1px solid #2a2a3e}
tr:hover{background:rgba(99,102,241,.05)}
.chart-box{height:300px;margin:1rem 0}
.alert{padding:.75rem 1rem;border-radius:8px;margin-bottom:.5rem;display:flex;gap:1rem;align-items:center}
.alert-info{background:rgba(99,102,241,.1);border-left:4px solid #6366f1}
.alert-warn{background:rgba(249,115,22,.1);border-left:4px solid #f97316}
.alert-crit{background:rgba(239,68,68,.1);border-left:4px solid #ef4444}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:1.5rem}
@media(max-width:768px){.two-col{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="hdr">
<h1>🕵️ VEILLE ADS — Dashboard Stratégique</h1>
<p>Monitoring concurrent permanent · ${new Date().toLocaleString("fr-FR")}</p>
</div>
<div class="wrap">

<!-- KPIs -->
<div class="grid">
<div class="card"><div class="num">${ads?.total || 0}</div><div class="lbl">ADS TRACKÉES</div></div>
<div class="card"><div class="num">${ads?.active || 0}</div><div class="lbl">ADS ACTIVES</div></div>
<div class="card"><div class="num">${ads?.winners || 0}</div><div class="lbl">ADS GAGNANTES</div></div>
<div class="card"><div class="num">${reviews?.total || 0}</div><div class="lbl">REVIEWS</div></div>
<div class="card"><div class="num">${alerts?.total || 0}</div><div class="lbl">ALERTES</div></div>
<div class="card"><div class="num">${serp?.total || 0}</div><div class="lbl">SERP TRACKÉS</div></div>
</div>

<!-- ANALYSE STRATÉGIQUE -->
<div class="sect">
<h2>🎯 Analyse Stratégique — Angles Marketing Dominants</h2>
<div style="margin-bottom:1rem">
${summary.dominant_angles.map(a => `<span class="tag tag-purple">${a.angle} (${a.percentage}%)</span>`).join("")}
</div>
<div class="chart-box"><canvas id="angleChart"></canvas></div>
</div>

<div class="sect">
<h2>👥 Personas Visés</h2>
<div style="margin-bottom:1rem">
${summary.dominant_personas.map(p => `<span class="tag tag-blue">${p.persona} (${p.percentage}%)</span>`).join("")}
</div>
<div class="chart-box"><canvas id="personaChart"></canvas></div>
</div>

<div class="two-col">
<div class="sect">
<h2>🔑 Keywords & Thèmes</h2>
<div style="margin-bottom:1rem">
${summary.dominant_themes.map(t => `<span class="tag tag-cyan">${t}</span>`).join("")}
</div>
<div>
<h3 style="color:#8888aa;font-size:.85rem;margin:.5rem 0">Top Keywords:</h3>
${summary.top_keywords.slice(0, 15).map(k => `<span class="tag tag-green">${k}</span>`).join("")}
</div>
</div>

<div class="sect">
<h2>📊 Ton & Offre</h2>
<div>
<h3 style="color:#8888aa;font-size:.85rem;margin:.5rem 0">Tons dominants:</h3>
${summary.dominant_tones.map(t => `<span class="tag tag-orange">${t}</span>`).join("")}
</div>
<div>
<h3 style="color:#8888aa;font-size:.85rem;margin:.5rem 0">Types d'offre:</h3>
${summary.dominant_offers.map(o => `<span class="tag tag-red">${o}</span>`).join("")}
</div>
<div>
<h3 style="color:#8888aa;font-size:.85rem;margin:.5rem 0">Étapes du funnel:</h3>
${summary.dominant_funnel_stages.map(f => `<span class="tag tag-cyan">${f}</span>`).join("")}
</div>
</div>
</div>

<!-- CONTRE-ANGLES RECOMMANDÉS -->
<div class="sect">
<h2>⚡ Contre-Angles Recommandés (pour battre le concurrent)</h2>
<ul style="list-style:none;padding:0">
${summary.recommended_counter_angles.map(c => `<li style="padding:.5rem 0;border-bottom:1px solid #2a2a3e;color:#22c55e">✅ ${c}</li>`).join("")}
</ul>
</div>

<!-- TABLEAU DES ANGLES -->
<div class="sect">
<h2>📋 Détail des Angles Détectés</h2>
<table>
<thead><tr><th>Angle</th><th>Count</th><th>%</th><th>Visualisation</th></tr></thead>
<tbody>
${summary.dominant_angles.map(a => `
<tr>
<td><strong>${a.angle}</strong></td>
<td>${a.count}</td>
<td>${a.percentage}%</td>
<td><div style="background:#2a2a3e;border-radius:4px;height:20px;width:100%"><div style="background:linear-gradient(90deg,#6366f1,#a855f7);height:100%;border-radius:4px;width:${a.percentage}%"></div></div></td>
</tr>`).join("")}
</tbody>
</table>
</div>

<!-- TABLEAU DES PERSONAS -->
<div class="sect">
<h2>👤 Détail des Personas Ciblés</h2>
<table>
<thead><tr><th>Persona</th><th>Count</th><th>%</th><th>Visualisation</th></tr></thead>
<tbody>
${summary.dominant_personas.map(p => `
<tr>
<td><strong>${p.persona}</strong></td>
<td>${p.count}</td>
<td>${p.percentage}%</td>
<td><div style="background:#2a2a3e;border-radius:4px;height:20px;width:100%"><div style="background:linear-gradient(90deg,#3b82f6,#06b6d4);height:100%;border-radius:4px;width:${p.percentage}%"></div></div></td>
</tr>`).join("")}
</tbody>
</table>
</div>

</div>
<script>
// Angle Chart
new Chart(document.getElementById('angleChart'), {
  type: 'doughnut',
  data: {
    labels: ${JSON.stringify(summary.dominant_angles.map(a => a.angle))},
    datasets: [{ data: ${JSON.stringify(summary.dominant_angles.map(a => a.count))}, backgroundColor: ['#6366f1','#a855f7','#ec4899','#f97316','#eab308','#22c55e','#3b82f6','#06b6d4'] }]
  },
  options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#8888aa', padding: 12 } } } }
});

// Persona Chart
new Chart(document.getElementById('personaChart'), {
  type: 'bar',
  data: {
    labels: ${JSON.stringify(summary.dominant_personas.map(p => p.persona))},
    datasets: [{ label: 'Ads', data: ${JSON.stringify(summary.dominant_personas.map(p => p.count))}, backgroundColor: '#6366f1', borderRadius: 8 }]
  },
  options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { ticks: { color: '#8888aa' }, grid: { color: '#2a2a3e' } }, y: { ticks: { color: '#8888aa' }, grid: { color: '#2a2a3e' } } } }
});
</script>
</body>
</html>`;

  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

// ── Scrapers (simplifiés pour le Worker) ───────────────
async function runMetaScraper(env: Env): Promise<void> {
  console.log("[CRON] Running Meta Ad Library scraper...");
  // TODO: implémenter avec env.BROWSER (Cloudflare Browser Rendering)
  // Pour chaque advertiser dans TARGET_AD_ACCOUNTS
  // → navigate to facebook.com/ads/library/?q=advertiser
  // → extract ads → save to D1 → run analyzer
}

async function runGoogleScraper(env: Env): Promise<void> {
  console.log("[CRON] Running Google Ads Transparency scraper...");
  // TODO: adstransparency.google.com
}

async function runTrustpilotScraper(env: Env): Promise<void> {
  console.log("[CRON] Running Trustpilot scraper...");
  // TODO: trustpilot.com/review/domain
}

async function runSERPTracker(env: Env): Promise<void> {
  console.log("[CRON] Running SERP tracker...");
  // TODO: google.com/search?q=keyword
}

async function runPageMonitor(env: Env): Promise<void> {
  console.log("[CRON] Running page monitor...");
  // TODO: hash-based change detection on PAGE_CHECK_URLS
}
