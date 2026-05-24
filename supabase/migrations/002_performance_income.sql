-- Additive only — no drops, no modifications to existing data

CREATE TABLE IF NOT EXISTS income_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  income_source_id UUID NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  target_amount DECIMAL(15,2),
  actual_amount DECIMAL(15,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE income_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_all" ON income_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_income_payments_source ON income_payments(income_source_id, payment_date DESC);
