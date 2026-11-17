-- ═══════════════════════════════════════════════════════════
-- VEILLE ADS — D1 Schema (Cloudflare SQLite Edge)
-- ═══════════════════════════════════════════════════════════

-- ADS (Meta, Google, TikTok, LinkedIn, Native)
CREATE TABLE IF NOT EXISTS ads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  ad_id TEXT,
  advertiser TEXT,
  domain TEXT,
  creative_type TEXT,
  creative_url TEXT,
  headline TEXT,
  body TEXT,
  cta TEXT,
  landing_url TEXT,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  days_active INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  is_winner INTEGER DEFAULT 0,
  screenshot_key TEXT,
  raw_data TEXT,
  content_hash TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ads_platform ON ads(platform);
CREATE INDEX IF NOT EXISTS idx_ads_domain ON ads(domain);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_winner ON ads(is_winner);
CREATE INDEX IF NOT EXISTS idx_ads_hash ON ads(content_hash);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT NOT NULL,
  domain TEXT NOT NULL,
  author TEXT,
  rating INTEGER,
  title TEXT,
  body TEXT,
  review_date TEXT,
  response TEXT,
  verified INTEGER DEFAULT 0,
  review_hash TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reviews_domain ON reviews(domain);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- SERP RESULTS
CREATE TABLE IF NOT EXISTS serp_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL,
  position INTEGER,
  url TEXT,
  title TEXT,
  snippet TEXT,
  domain TEXT,
  is_ad INTEGER DEFAULT 0,
  is_target INTEGER DEFAULT 0,
  checked_at TEXT NOT NULL,
  serp_hash TEXT UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_serp_keyword ON serp_results(keyword);
CREATE INDEX IF NOT EXISTS idx_serp_target ON serp_results(is_target);

-- PAGE SNAPSHOTS
CREATE TABLE IF NOT EXISTS page_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT,
  content_hash TEXT,
  text_content TEXT,
  screenshot_key TEXT,
  prices TEXT,
  changes_detected TEXT,
  change_pct REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pages_url ON page_snapshots(url);
CREATE INDEX IF NOT EXISTS idx_pages_hash ON page_snapshots(content_hash);

-- ALERTS
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  message TEXT NOT NULL,
  data TEXT,
  acknowledged INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alerts_ack ON alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);

-- METRICS (daily rollup)
CREATE TABLE IF NOT EXISTS metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  platform TEXT,
  total_ads INTEGER DEFAULT 0,
  active_ads INTEGER DEFAULT 0,
  winning_ads INTEGER DEFAULT 0,
  new_ads INTEGER DEFAULT 0,
  removed_ads INTEGER DEFAULT 0,
  avg_rating REAL DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_metrics_date ON metrics(date);
