-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Family members ───────────────────────────────────────────────────────────
CREATE TABLE family_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  date_of_birth DATE,
  relationship TEXT NOT NULL CHECK (relationship IN ('self', 'spouse', 'child')),
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Accounts ─────────────────────────────────────────────────────────────────
CREATE TABLE accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  provider TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN (
    'isa','jisa','gia','pension','sipp','current','savings',
    'crypto','property','mortgage','credit_card','loan','rsu','espp','other'
  )),
  currency TEXT NOT NULL DEFAULT 'GBP',
  is_liability BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Balance snapshots ────────────────────────────────────────────────────────
CREATE TABLE balance_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  balance DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL,
  gbp_balance DECIMAL(15,2) NOT NULL,
  fx_rate DECIMAL(12,8) NOT NULL DEFAULT 1.0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Latest snapshot per account (materialised as a view)
CREATE VIEW latest_snapshots AS
SELECT DISTINCT ON (account_id)
  *
FROM balance_snapshots
ORDER BY account_id, snapshot_date DESC, created_at DESC;

-- ─── Contributions ────────────────────────────────────────────────────────────
-- Used for Modified Dietz return calculation (separate from balance snapshots)
CREATE TABLE contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contribution_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,          -- positive = in, negative = withdrawal
  currency TEXT NOT NULL,
  gbp_amount DECIMAL(15,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Income sources ───────────────────────────────────────────────────────────
CREATE TABLE income_sources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  employer TEXT,
  income_type TEXT NOT NULL CHECK (income_type IN (
    'salary','bonus','rsu','espp','dividend','rental','freelance','pension_income','other'
  )),
  frequency TEXT CHECK (frequency IN ('monthly','quarterly','annual','one_off','on_vesting')),
  gross_amount DECIMAL(15,2),
  currency TEXT NOT NULL DEFAULT 'GBP',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RSU / stock vesting events ───────────────────────────────────────────────
CREATE TABLE vesting_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  vest_date DATE NOT NULL,
  shares DECIMAL(15,4) NOT NULL,
  grant_price DECIMAL(12,4),
  estimated_value_per_share DECIMAL(12,4),
  currency TEXT NOT NULL DEFAULT 'USD',
  total_estimated_value DECIMAL(15,2),
  is_vested BOOLEAN NOT NULL DEFAULT FALSE,
  actual_value DECIMAL(15,2),
  tax_withheld DECIMAL(15,2),
  net_proceeds DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Scenarios ────────────────────────────────────────────────────────────────
CREATE TABLE scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_baseline BOOLEAN NOT NULL DEFAULT FALSE,
  assumptions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Exchange rate cache ───────────────────────────────────────────────────────
CREATE TABLE exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL DEFAULT 'GBP',
  rate DECIMAL(12,8) NOT NULL,
  rate_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_currency, to_currency, rate_date)
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_balance_snapshots_account_date ON balance_snapshots(account_id, snapshot_date DESC);
CREATE INDEX idx_contributions_account_date ON contributions(account_id, contribution_date DESC);
CREATE INDEX idx_vesting_events_date ON vesting_events(vest_date);
CREATE INDEX idx_exchange_rates_lookup ON exchange_rates(from_currency, to_currency, rate_date DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- All tables are protected: only authenticated users can access data.
-- This is a single-family app so no per-user row filtering is needed beyond auth.
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE income_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE vesting_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can read/write all rows
CREATE POLICY "auth_all" ON family_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON accounts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON balance_snapshots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON contributions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON income_sources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON vesting_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON scenarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON exchange_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── Seed data: default scenarios ────────────────────────────────────────────
INSERT INTO scenarios (name, description, is_baseline, assumptions) VALUES
(
  'Baseline',
  'Current trajectory — no major changes',
  TRUE,
  '{
    "horizon_years": 30,
    "monthly_net_savings": 3000,
    "savings_growth_rate": 0.02,
    "inflation_rate": 0.025,
    "returns": {
      "equity": 0.07,
      "pension": 0.065,
      "property": 0.04,
      "cash": 0.04,
      "crypto": 0.15,
      "debt": 0
    },
    "volatility": {
      "equity": 0.15,
      "pension": 0.12,
      "property": 0.08,
      "cash": 0.005,
      "crypto": 0.60
    },
    "events": [],
    "simulation_type": "deterministic"
  }'
),
(
  'Early Retirement at 55',
  'Stop working at 55, draw down at 4% rule annually',
  FALSE,
  '{
    "horizon_years": 40,
    "monthly_net_savings": 3000,
    "savings_growth_rate": 0.02,
    "inflation_rate": 0.025,
    "returns": {
      "equity": 0.07,
      "pension": 0.065,
      "property": 0.04,
      "cash": 0.04,
      "crypto": 0.15,
      "debt": 0
    },
    "volatility": {
      "equity": 0.15,
      "pension": 0.12,
      "property": 0.08,
      "cash": 0.005,
      "crypto": 0.60
    },
    "events": [
      { "year": 20, "amount": -60000, "label": "Retirement: annual drawdown starts", "type": "retirement" }
    ],
    "simulation_type": "deterministic"
  }'
),
(
  'Kids University',
  'Two university costs at ages 18',
  FALSE,
  '{
    "horizon_years": 25,
    "monthly_net_savings": 3000,
    "savings_growth_rate": 0.02,
    "inflation_rate": 0.025,
    "returns": {
      "equity": 0.07,
      "pension": 0.065,
      "property": 0.04,
      "cash": 0.04,
      "crypto": 0.15,
      "debt": 0
    },
    "volatility": {
      "equity": 0.15,
      "pension": 0.12,
      "property": 0.08,
      "cash": 0.005,
      "crypto": 0.60
    },
    "events": [
      { "year": 10, "amount": -60000, "label": "Child 1 university (3 years)", "type": "education" },
      { "year": 13, "amount": -60000, "label": "Child 2 university (3 years)", "type": "education" }
    ],
    "simulation_type": "deterministic"
  }'
),
(
  'Inheritance',
  'Receive inheritance',
  FALSE,
  '{
    "horizon_years": 30,
    "monthly_net_savings": 3000,
    "savings_growth_rate": 0.02,
    "inflation_rate": 0.025,
    "returns": {
      "equity": 0.07,
      "pension": 0.065,
      "property": 0.04,
      "cash": 0.04,
      "crypto": 0.15,
      "debt": 0
    },
    "volatility": {
      "equity": 0.15,
      "pension": 0.12,
      "property": 0.08,
      "cash": 0.005,
      "crypto": 0.60
    },
    "events": [
      { "year": 8, "amount": 200000, "label": "Inheritance received", "type": "inheritance" }
    ],
    "simulation_type": "deterministic"
  }'
);
