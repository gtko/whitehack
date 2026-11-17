# 🕵️ VEILLE ADS — Système de Veille Competitive sur Cloudflare Workers

> **Espionnage permanent** des pubs, reviews, SERP et landing pages d'un concurrent — avec **analyse stratégique automatique** (angles marketing, keywords, personas). 100% gratuit, 100% edge, 0€ de coût récurrent.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE WORKERS (EDGE)                          │
│                                                                      │
│  ┌─────────────┐   ┌─────────────┐   ┌──────────────┐               │
│  │  CRON       │   │  BROWSER    │   │  D1          │               │
│  │  TRIGGERS   │──▶│  RENDERING  │──▶│  (SQLite)    │               │
│  │  */6h */12h │   │  (Puppeteer)│   │  ads         │               │
│  │  daily      │   │  camoufflé  │   │  reviews     │               │
│  └─────────────┘   └─────────────┘   │  serp        │               │
│                                      │  pages       │               │
│  ┌─────────────┐                     │  alerts      │               │
│  │  ANALYZER   │◀────────────────────│  metrics     │               │
│  │  (NLP)      │                     └──────┬───────┘               │
│  │  Angles     │                            │                       │
│  │  Keywords   │                            ▼                       │
│  │  Personas   │                     ┌──────────────┐               │
│  └─────────────┘                     │  R2          │               │
│                                      │  Screenshots │               │
│  ┌─────────────┐                     └──────────────┘               │
│  │  KV         │                                                    │
│  │  Cache      │   ┌──────────────────────────────────┐            │
│  └─────────────┘   │  DASHBOARD HTML (Pages)           │            │
│                    │  • Angles marketing dominants     │            │
│                    │  • Personas ciblés                │            │
│                    │  • Keywords & thèmes              │            │
│                    │  • Contre-angles recommandés      │            │
│                    │  • Graphiques Chart.js            │            │
│                    └──────────────────────────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 L'Analyse Stratégique

Le module `analyzer.ts` déduit automatiquement depuis **chaque publicité** :

### 📐 Angles Marketing (35 types détectés)

| Catégorie | Angles |
|---|---|
| **Émotionnels** | `pain_point`, `fear`, `empathy`, `humor`, `nostalgia` |
| **Aspirationnels** | `aspiration`, `transformation`, `freedom`, `status`, `premium` |
| **Urgence/Rareté** | `urgency`, `scarcity`, `fomo`, `urgency_scarcity` |
| **Confiance** | `trust`, `authority`, `data_driven`, `social_proof`, `comparison` |
| **Convenience** | `convenience`, `beginner_friendly`, `accessibility` |
| **Éducatifs** | `education`, `curiosity`, `controversy`, `problem_solution` |
| **Business** | `savings`, `wealth`, `productivity`, `risk_reduction` |
| **Lifestyle** | `health`, `relationships`, `spirituality`, `appearance`, `community`, `entertainment` |

### 👥 Personas (50+ segments détectés)

| Catégorie | Personas |
|---|---|
| **Santé** | `health_conscious`, `weight_loss_seeker`, `chronic_pain`, `mental_health`, `sleep_issues` |
| **Relations** | `singles_dating`, `relationship_issues`, `recently_divorced`, `first_time_parent` |
| **Carrière** | `career_focused`, `job_seeker`, `entrepreneur`, `freelancer`, `small_business_owner` |
| **Finance** | `investor`, `retirement_planner`, `bargain_hunter`, `premium_buyer` |
| **Tech** | `tech_savvy`, `tech_beginner`, `content_creator`, `remote_worker` |
| **Lifestyle** | `creative`, `spiritual_seeker`, `adventurous`, `minimalist`, `luxury_lifestyle` |
| **Démographie** | `young_adult`, `middle_aged`, `senior`, `student`, `parent` |

### 🔍 Keywords & Thèmes

- **Top 20 keywords** par fréquence
- **12 thèmes sémantiques** : Santé, Beauté, Amour, Finance, Carrière, Éducation, Astrologie, Sécurité, Tech, Productivité, Lifestyle, Famille
- **8 déclencheurs émotionnels** : Peur, Urgence, Aspiration, Frustration, Curiosité, Confiance, Joie, Appartenance

### ⚡ Contre-Angles Recommandés

Le système analyse les angles dominants du concurrent et recommande automatiquement des **angles de contre-attaque** pour se différencier.

---

## 🚀 Déploiement

```bash
cd veille-ads

# 1. Installer les dépendances
npm install

# 2. Initialiser la base D1
wrangler d1 create veille-ads
wrangler d1 execute veille-ads --file=./schema.sql

# 3. Créer le bucket R2
wrangler r2 bucket create veille-ads-screenshots

# 4. Créer le namespace KV
wrangler kv namespace create KV

# 5. Configurer wrangler.toml avec les IDs obtenus

# 6. Déployer
wrangler deploy
```

---

## 📖 Routes API

| Route | Méthode | Description |
|---|---|---|
| `/dashboard` | GET | Dashboard HTML complet avec graphiques |
| `/api/ads` | GET | Toutes les ads trackées |
| `/api/ads/winners` | GET | Ads gagnantes (actives 7+ jours) |
| `/api/ads/insights` | GET | **Analyse stratégique complète** |
| `/api/ads/:platform` | GET | Ads par plateforme (meta, google, tiktok) |
| `/api/summary` | GET | **Résumé stratégique agrégé** |
| `/api/reviews` | GET | Reviews Trustpilot trackées |
| `/api/serp` | GET | Positions Google SERP |
| `/api/pages` | GET | Snapshots de pages (changements) |
| `/api/alerts` | GET | Alertes non acquittées |
| `/api/analyze` | POST | Analyser une ad spécifique (JSON body) |
| `/api/scan` | POST | Déclencher un scan manuel |

---

## 📊 Exemple de sortie `/api/summary`

```json
{
  "dominant_angles": [
    { "angle": "pain_point", "count": 23, "percentage": 35 },
    { "angle": "urgency", "count": 15, "percentage": 23 },
    { "angle": "social_proof", "count": 12, "percentage": 18 },
    { "angle": "savings", "count": 8, "percentage": 12 },
    { "angle": "trust", "count": 5, "percentage": 8 }
  ],
  "dominant_personas": [
    { "persona": "weight_loss_seeker", "count": 20, "percentage": 31 },
    { "persona": "health_conscious", "count": 15, "percentage": 23 },
    { "persona": "young_adult", "count": 10, "percentage": 15 }
  ],
  "dominant_themes": ["Santé / Bien-être", "Beauté / Apparence"],
  "top_keywords": ["weight", "loss", "trial", "free", "guaranteed", "results"],
  "recommended_counter_angles": [
    "Utiliser aspiration + transformation (positif vs négatif)",
    "Utiliser trust + risk_reduction (rassurer vs effrayer)",
    "Tester curiosity_gap (angle non exploité)",
    "Tester education (positionner comme expert)"
  ]
}
```

---

## ⏰ Cron Schedule

| Fréquence | Tâche | Scrapers |
|---|---|---|
| `0 */6 * * *` | Toutes les 6h | Meta Ad Library, Trustpilot |
| `0 */12 * * *` | Toutes les 12h | Google Ads Transparency, TikTok |
| `0 0 * * *` | Quotidien (minuit) | SERP Tracker, Page Monitor |

---

## 🔧 Stack Technique

| Composant | Service Cloudflare | Coût |
|---|---|---|
| **Compute** | Workers (edge) | Gratuit (100K req/jour) |
| **Browser** | Browser Rendering (Puppeteer) | Gratuit (10K req/mois) |
| **Database** | D1 (SQLite edge) | Gratuit (5GB) |
| **Storage** | R2 (screenshots) | Gratuit (10GB) |
| **Cache** | KV | Gratuit (1GB) |
| **Scheduler** | Cron Triggers | Gratuit |
| **Dashboard** | Workers (HTML) | Gratuit |
| **Total** | — | **0€/mois** |

---

## 📁 Structure

```
veille-ads/
├── wrangler.toml          # Config Cloudflare Workers
├── package.json           # Dépendances
├── tsconfig.json          # TypeScript config
├── schema.sql             # D1 database schema
├── README.md              # Documentation
└── src/
    ├── index.ts           # Worker principal (routes + cron)
    ├── analyzer.ts        # Analyse stratégique (angles/keywords/personas)
    └── browser.ts         # Browser Rendering wrapper (anti-détection)
```

---

## 🔒 Anti-détection

| Technique | Implémentation |
|---|---|
| **Browser Rendering** | Cloudflare Browser Rendering (IPs edge partagées) |
| **Fingerprint rotation** | UA, viewport, timezone, locale aléatoires |
| **Headers humains** | Accept-Language, Sec-Ch-Ua, etc. |
| **Délais aléatoires** | 1.5-4s entre chaque navigation |
| **Screenshots R2** | Vérification visuelle sans markup |
| **Retry automatique** | Restart avec nouveau fingerprint sur erreur |

---

## 🆓 Comparaison Coûts

| Alternative SaaS | Prix | Ce système |
|---|---|---|
| AdSpy + SEMrush + PiPiADS | $376/mo | 0€ |
| Visualping + ReviewTrackers | $149/mo | 0€ |
| Multilogin + Bright Data | $599/mo | 0€ |
| **Total** | **$1,124/mo** | **0€/mois** |
