-- =============================================================================
-- Historical Balance Snapshot Import
-- Generated for: Ralf Gehrig family finance app (Supabase / PostgreSQL)
-- Run as: service role (bypasses RLS)
-- =============================================================================
-- Notes:
--   • All monetary values in GBP unless account currency is CAD.
--   • CAD accounts: gbp_balance = balance * 0.58 (approximate fx rate), fx_rate = 0.58
--   • GBP accounts: gbp_balance = balance, fx_rate = 1.0
--   • Zero-value snapshots are skipped (they represent closed/empty states).
--   • New accounts are created with is_active = FALSE unless stated otherwise.
--   • balance_snapshots has no unique constraint in the migration; we guard
--     against duplicates by deleting existing rows for the same
--     (account_id, snapshot_date) before inserting (idempotent re-runs).
-- =============================================================================

DO $$
DECLARE
  -- ── Family member IDs ──────────────────────────────────────────────────────
  v_ralf_id       UUID;
  v_shannon_id    UUID;

  -- ── Account IDs — existing ─────────────────────────────────────────────────
  v_acc_vanguard_isa      UUID;   -- ISA / Vanguard / Ralf
  v_acc_vanguard_sipp     UUID;   -- SIPP / Vanguard / Ralf
  v_acc_aviva_sipp        UUID;   -- SIPP / Aviva / Ralf
  v_acc_coinbase_btc      UUID;   -- Bitcoin / Coinbase / Ralf
  v_acc_cranleigh         UUID;   -- 14 Cranleigh Gardens / Ralf
  v_acc_std_life          UUID;   -- Pension Germany / Standard Life / Ralf
  v_acc_platinum          UUID;   -- Platinum 50g / Ralf
  v_acc_gold              UUID;   -- Gold 2oz / Ralf
  v_acc_xc90              UUID;   -- Volvo XC90 / Ralf
  v_acc_dsl_deposit       UUID;   -- DSL Deposit / Ralf
  v_acc_nutmeg_isa        UUID;   -- ISA / Nutmeg / Shannon
  v_acc_aviso             UUID;   -- Aviso Wealth RRSP / Aviso / Shannon

  -- ── Account IDs — new (created in this script) ────────────────────────────
  v_acc_aviva_sapient     UUID;   -- Aviva Sapient / Shannon / inactive
  v_acc_smartpension      UUID;   -- SmartPension / Shannon / inactive
  v_acc_nutmeg_ralf       UUID;   -- Nutmeg Ralf / Ralf / inactive
  v_acc_morgan_stanley    UUID;   -- Morgan Stanley / Ralf / inactive
  v_acc_frankfurt         UUID;   -- Frankfurt Trust / Ralf / inactive
  v_acc_questrade         UUID;   -- Questrade / Ralf / inactive / CAD
  v_acc_marcus            UUID;   -- Marcus Savings / Ralf / inactive
  v_acc_peugeot           UUID;   -- Peugeot 3008 / Ralf / inactive
  v_acc_honda             UUID;   -- Honda Civic / Ralf / inactive
  v_acc_rental_deposit    UUID;   -- Rental Deposit / Ralf / inactive
  v_acc_infosys_exp       UUID;   -- Infosys Expenses / Ralf / active
  v_acc_biz_accounts      UUID;   -- Various Business Accounts / Ralf / inactive
  v_acc_first_direct      UUID;   -- First Direct / Ralf / inactive
  v_acc_natwest           UUID;   -- Natwest / Ralf / inactive
  v_acc_ulster            UUID;   -- Ulster Bank / Ralf / inactive
  v_acc_tsb               UUID;   -- TSB / Ralf / inactive
  v_acc_lloyds            UUID;   -- Lloyds / Ralf / inactive
  v_acc_qtrade            UUID;   -- Qtrade / Shannon / active / CAD
  v_acc_barclays          UUID;   -- Barclays / Ralf / active

BEGIN

  -- ===========================================================================
  -- STEP 1: Resolve family member IDs
  -- ===========================================================================
  SELECT id INTO v_ralf_id    FROM family_members WHERE name = 'Ralf'    LIMIT 1;
  SELECT id INTO v_shannon_id FROM family_members WHERE name = 'Shannon' LIMIT 1;

  IF v_ralf_id IS NULL THEN
    RAISE EXCEPTION 'Family member "Ralf" not found — abort.';
  END IF;
  IF v_shannon_id IS NULL THEN
    RAISE EXCEPTION 'Family member "Shannon" not found — abort.';
  END IF;

  RAISE NOTICE 'Resolved: Ralf = %, Shannon = %', v_ralf_id, v_shannon_id;

  -- ===========================================================================
  -- STEP 2: Resolve existing account IDs
  -- ===========================================================================

  -- ISA / Vanguard / Ralf
  SELECT id INTO v_acc_vanguard_isa
    FROM accounts
   WHERE family_member_id = v_ralf_id
     AND name = 'ISA'
     AND provider = 'Vanguard'
   LIMIT 1;
  IF v_acc_vanguard_isa IS NULL THEN
    RAISE EXCEPTION 'Account not found: ISA / Vanguard / Ralf';
  END IF;

  -- SIPP / Vanguard / Ralf
  SELECT id INTO v_acc_vanguard_sipp
    FROM accounts
   WHERE family_member_id = v_ralf_id
     AND name = 'SIPP'
     AND provider = 'Vanguard'
   LIMIT 1;
  IF v_acc_vanguard_sipp IS NULL THEN
    RAISE EXCEPTION 'Account not found: SIPP / Vanguard / Ralf';
  END IF;

  -- SIPP / Aviva / Ralf
  SELECT id INTO v_acc_aviva_sipp
    FROM accounts
   WHERE family_member_id = v_ralf_id
     AND name = 'SIPP'
     AND provider = 'Aviva'
   LIMIT 1;
  IF v_acc_aviva_sipp IS NULL THEN
    RAISE EXCEPTION 'Account not found: SIPP / Aviva / Ralf';
  END IF;

  -- Bitcoin / Coinbase / Ralf
  SELECT id INTO v_acc_coinbase_btc
    FROM accounts
   WHERE family_member_id = v_ralf_id
     AND name = 'Bitcoin'
     AND provider = 'Coinbase'
   LIMIT 1;
  IF v_acc_coinbase_btc IS NULL THEN
    RAISE EXCEPTION 'Account not found: Bitcoin / Coinbase / Ralf';
  END IF;

  -- 14 Cranleigh Gardens / Ralf (property — no provider needed)
  SELECT id INTO v_acc_cranleigh
    FROM accounts
   WHERE family_member_id = v_ralf_id
     AND name = '14 Cranleigh Gardens'
   LIMIT 1;
  IF v_acc_cranleigh IS NULL THEN
    RAISE EXCEPTION 'Account not found: 14 Cranleigh Gardens / Ralf';
  END IF;

  -- Pension Germany / Standard Life / Ralf
  SELECT id INTO v_acc_std_life
    FROM accounts
   WHERE family_member_id = v_ralf_id
     AND name = 'Pension Germany'
     AND provider = 'Standard Life'
   LIMIT 1;
  IF v_acc_std_life IS NULL THEN
    RAISE EXCEPTION 'Account not found: Pension Germany / Standard Life / Ralf';
  END IF;

  -- Platinum 50g / Ralf
  SELECT id INTO v_acc_platinum
    FROM accounts
   WHERE family_member_id = v_ralf_id
     AND name = 'Platinum 50g'
   LIMIT 1;
  IF v_acc_platinum IS NULL THEN
    RAISE EXCEPTION 'Account not found: Platinum 50g / Ralf';
  END IF;

  -- Gold 2oz / Ralf
  SELECT id INTO v_acc_gold
    FROM accounts
   WHERE family_member_id = v_ralf_id
     AND name = 'Gold 2oz'
   LIMIT 1;
  IF v_acc_gold IS NULL THEN
    RAISE EXCEPTION 'Account not found: Gold 2oz / Ralf';
  END IF;

  -- Volvo XC90 / Ralf
  SELECT id INTO v_acc_xc90
    FROM accounts
   WHERE family_member_id = v_ralf_id
     AND name = 'Volvo XC90'
   LIMIT 1;
  IF v_acc_xc90 IS NULL THEN
    RAISE EXCEPTION 'Account not found: Volvo XC90 / Ralf';
  END IF;

  -- DSL Deposit / Ralf
  SELECT id INTO v_acc_dsl_deposit
    FROM accounts
   WHERE family_member_id = v_ralf_id
     AND name = 'DSL Deposit'
   LIMIT 1;
  IF v_acc_dsl_deposit IS NULL THEN
    RAISE EXCEPTION 'Account not found: DSL Deposit / Ralf';
  END IF;

  -- ISA / Nutmeg / Shannon
  SELECT id INTO v_acc_nutmeg_isa
    FROM accounts
   WHERE family_member_id = v_shannon_id
     AND name = 'ISA'
     AND provider = 'Nutmeg'
   LIMIT 1;
  IF v_acc_nutmeg_isa IS NULL THEN
    RAISE EXCEPTION 'Account not found: ISA / Nutmeg / Shannon';
  END IF;

  -- Aviso Wealth RRSP / Aviso / Shannon
  SELECT id INTO v_acc_aviso
    FROM accounts
   WHERE family_member_id = v_shannon_id
     AND name = 'Aviso Wealth RRSP'
     AND provider = 'Aviso'
   LIMIT 1;
  IF v_acc_aviso IS NULL THEN
    RAISE EXCEPTION 'Account not found: Aviso Wealth RRSP / Aviso / Shannon';
  END IF;

  RAISE NOTICE 'All existing accounts resolved successfully.';

  -- ===========================================================================
  -- STEP 3: Create new (closed/legacy) accounts
  -- Each INSERT is guarded: skip if an account with same name+member already
  -- exists (so the script is safe to re-run).
  -- ===========================================================================

  -- ── Aviva Sapient — Shannon, pension, inactive ────────────────────────────
  SELECT id INTO v_acc_aviva_sapient
    FROM accounts
   WHERE family_member_id = v_shannon_id AND name = 'Aviva Sapient'
   LIMIT 1;
  IF v_acc_aviva_sapient IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_shannon_id, 'Aviva Sapient', 'pension', 'GBP', FALSE)
    RETURNING id INTO v_acc_aviva_sapient;
    RAISE NOTICE 'Created account: Aviva Sapient (Shannon)';
  ELSE
    RAISE NOTICE 'Account already exists: Aviva Sapient (Shannon)';
  END IF;

  -- ── SmartPension — Shannon, pension, inactive ─────────────────────────────
  SELECT id INTO v_acc_smartpension
    FROM accounts
   WHERE family_member_id = v_shannon_id AND name = 'SmartPension'
   LIMIT 1;
  IF v_acc_smartpension IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_shannon_id, 'SmartPension', 'pension', 'GBP', FALSE)
    RETURNING id INTO v_acc_smartpension;
    RAISE NOTICE 'Created account: SmartPension (Shannon)';
  ELSE
    RAISE NOTICE 'Account already exists: SmartPension (Shannon)';
  END IF;

  -- ── Nutmeg Ralf — Ralf, gia, inactive ────────────────────────────────────
  SELECT id INTO v_acc_nutmeg_ralf
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Nutmeg Ralf'
   LIMIT 1;
  IF v_acc_nutmeg_ralf IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Nutmeg Ralf', 'gia', 'GBP', FALSE)
    RETURNING id INTO v_acc_nutmeg_ralf;
    RAISE NOTICE 'Created account: Nutmeg Ralf (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Nutmeg Ralf (Ralf)';
  END IF;

  -- ── Morgan Stanley — Ralf, gia, inactive ─────────────────────────────────
  SELECT id INTO v_acc_morgan_stanley
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Morgan Stanley'
   LIMIT 1;
  IF v_acc_morgan_stanley IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Morgan Stanley', 'gia', 'GBP', FALSE)
    RETURNING id INTO v_acc_morgan_stanley;
    RAISE NOTICE 'Created account: Morgan Stanley (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Morgan Stanley (Ralf)';
  END IF;

  -- ── Frankfurt Trust — Ralf, gia, inactive ────────────────────────────────
  SELECT id INTO v_acc_frankfurt
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Frankfurt Trust'
   LIMIT 1;
  IF v_acc_frankfurt IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Frankfurt Trust', 'gia', 'GBP', FALSE)
    RETURNING id INTO v_acc_frankfurt;
    RAISE NOTICE 'Created account: Frankfurt Trust (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Frankfurt Trust (Ralf)';
  END IF;

  -- ── Questrade — Ralf, gia, inactive, CAD ─────────────────────────────────
  SELECT id INTO v_acc_questrade
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Questrade'
   LIMIT 1;
  IF v_acc_questrade IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Questrade', 'gia', 'CAD', FALSE)
    RETURNING id INTO v_acc_questrade;
    RAISE NOTICE 'Created account: Questrade (Ralf, CAD)';
  ELSE
    RAISE NOTICE 'Account already exists: Questrade (Ralf)';
  END IF;

  -- ── Marcus Savings — Ralf, savings, inactive ──────────────────────────────
  SELECT id INTO v_acc_marcus
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Marcus Savings'
   LIMIT 1;
  IF v_acc_marcus IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Marcus Savings', 'savings', 'GBP', FALSE)
    RETURNING id INTO v_acc_marcus;
    RAISE NOTICE 'Created account: Marcus Savings (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Marcus Savings (Ralf)';
  END IF;

  -- ── Peugeot 3008 — Ralf, other, inactive ─────────────────────────────────
  SELECT id INTO v_acc_peugeot
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Peugeot 3008'
   LIMIT 1;
  IF v_acc_peugeot IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Peugeot 3008', 'other', 'GBP', FALSE)
    RETURNING id INTO v_acc_peugeot;
    RAISE NOTICE 'Created account: Peugeot 3008 (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Peugeot 3008 (Ralf)';
  END IF;

  -- ── Honda Civic — Ralf, other, inactive ──────────────────────────────────
  SELECT id INTO v_acc_honda
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Honda Civic'
   LIMIT 1;
  IF v_acc_honda IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Honda Civic', 'other', 'GBP', FALSE)
    RETURNING id INTO v_acc_honda;
    RAISE NOTICE 'Created account: Honda Civic (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Honda Civic (Ralf)';
  END IF;

  -- ── Rental Deposit — Ralf, other, inactive ────────────────────────────────
  SELECT id INTO v_acc_rental_deposit
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Rental Deposit'
   LIMIT 1;
  IF v_acc_rental_deposit IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Rental Deposit', 'other', 'GBP', FALSE)
    RETURNING id INTO v_acc_rental_deposit;
    RAISE NOTICE 'Created account: Rental Deposit (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Rental Deposit (Ralf)';
  END IF;

  -- ── Infosys Expenses — Ralf, other, ACTIVE ───────────────────────────────
  SELECT id INTO v_acc_infosys_exp
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Infosys Expenses'
   LIMIT 1;
  IF v_acc_infosys_exp IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Infosys Expenses', 'other', 'GBP', TRUE)
    RETURNING id INTO v_acc_infosys_exp;
    RAISE NOTICE 'Created account: Infosys Expenses (Ralf, active)';
  ELSE
    RAISE NOTICE 'Account already exists: Infosys Expenses (Ralf)';
  END IF;

  -- ── Various Business Accounts — Ralf, current, inactive ──────────────────
  -- (XLS name "Various business accounts"; user listed as "Various Business Accounts")
  SELECT id INTO v_acc_biz_accounts
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Various Business Accounts'
   LIMIT 1;
  IF v_acc_biz_accounts IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Various Business Accounts', 'current', 'GBP', FALSE)
    RETURNING id INTO v_acc_biz_accounts;
    RAISE NOTICE 'Created account: Various Business Accounts (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Various Business Accounts (Ralf)';
  END IF;

  -- ── First Direct — Ralf, current, inactive ────────────────────────────────
  SELECT id INTO v_acc_first_direct
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'First Direct'
   LIMIT 1;
  IF v_acc_first_direct IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'First Direct', 'current', 'GBP', FALSE)
    RETURNING id INTO v_acc_first_direct;
    RAISE NOTICE 'Created account: First Direct (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: First Direct (Ralf)';
  END IF;

  -- ── Natwest — Ralf, current, inactive ─────────────────────────────────────
  SELECT id INTO v_acc_natwest
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Natwest'
   LIMIT 1;
  IF v_acc_natwest IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Natwest', 'current', 'GBP', FALSE)
    RETURNING id INTO v_acc_natwest;
    RAISE NOTICE 'Created account: Natwest (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Natwest (Ralf)';
  END IF;

  -- ── Ulster Bank — Ralf, current, inactive ─────────────────────────────────
  SELECT id INTO v_acc_ulster
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Ulster Bank'
   LIMIT 1;
  IF v_acc_ulster IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Ulster Bank', 'current', 'GBP', FALSE)
    RETURNING id INTO v_acc_ulster;
    RAISE NOTICE 'Created account: Ulster Bank (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Ulster Bank (Ralf)';
  END IF;

  -- ── TSB — Ralf, current, inactive ─────────────────────────────────────────
  SELECT id INTO v_acc_tsb
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'TSB'
   LIMIT 1;
  IF v_acc_tsb IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'TSB', 'current', 'GBP', FALSE)
    RETURNING id INTO v_acc_tsb;
    RAISE NOTICE 'Created account: TSB (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: TSB (Ralf)';
  END IF;

  -- ── Lloyds — Ralf, current, inactive ──────────────────────────────────────
  SELECT id INTO v_acc_lloyds
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Lloyds'
   LIMIT 1;
  IF v_acc_lloyds IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Lloyds', 'current', 'GBP', FALSE)
    RETURNING id INTO v_acc_lloyds;
    RAISE NOTICE 'Created account: Lloyds (Ralf)';
  ELSE
    RAISE NOTICE 'Account already exists: Lloyds (Ralf)';
  END IF;

  -- ── Qtrade — Shannon, gia, ACTIVE, CAD ───────────────────────────────────
  SELECT id INTO v_acc_qtrade
    FROM accounts
   WHERE family_member_id = v_shannon_id AND name = 'Qtrade'
   LIMIT 1;
  IF v_acc_qtrade IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_shannon_id, 'Qtrade', 'gia', 'CAD', TRUE)
    RETURNING id INTO v_acc_qtrade;
    RAISE NOTICE 'Created account: Qtrade (Shannon, active, CAD)';
  ELSE
    RAISE NOTICE 'Account already exists: Qtrade (Shannon)';
  END IF;

  -- ── Barclays — Ralf, current, ACTIVE ─────────────────────────────────────
  -- Not in original DB list; create it as active current account
  SELECT id INTO v_acc_barclays
    FROM accounts
   WHERE family_member_id = v_ralf_id AND name = 'Barclays'
   LIMIT 1;
  IF v_acc_barclays IS NULL THEN
    INSERT INTO accounts (id, family_member_id, name, account_type, currency, is_active)
    VALUES (gen_random_uuid(), v_ralf_id, 'Barclays', 'current', 'GBP', TRUE)
    RETURNING id INTO v_acc_barclays;
    RAISE NOTICE 'Created account: Barclays (Ralf, active)';
  ELSE
    RAISE NOTICE 'Account already exists: Barclays (Ralf)';
  END IF;

  RAISE NOTICE 'All accounts ready. Beginning snapshot inserts...';

  -- ===========================================================================
  -- STEP 4: Insert balance snapshots
  --
  -- Pattern for each account:
  --   DELETE existing rows for these exact dates (idempotent), then INSERT.
  --   Zero values are skipped per instructions.
  --   GBP accounts: gbp_balance = balance, fx_rate = 1.0
  --   CAD accounts: gbp_balance = ROUND(balance * 0.58, 2), fx_rate = 0.58
  -- ===========================================================================

  -- ---------------------------------------------------------------------------
  -- Pension Germany / Standard Life / Ralf
  -- Source XLS: "Standard Life DE"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Pension Germany (Standard Life, Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_std_life
     AND snapshot_date IN (
       '2014-10-01','2016-04-01','2017-01-01','2020-11-01','2021-02-17',
       '2021-07-01','2021-12-01','2022-11-05','2022-12-30','2023-08-08',
       '2023-12-30','2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_std_life, '2014-10-01',  8200.00,    'GBP',  8200.00,    1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2016-04-01',  8000.00,    'GBP',  8000.00,    1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2017-01-01',  13574.12,   'GBP',  13574.12,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2020-11-01',  20439.00,   'GBP',  20439.00,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2021-02-17',  20527.00,   'GBP',  20527.00,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2021-07-01',  21135.00,   'GBP',  21135.00,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2021-12-01',  22100.00,   'GBP',  22100.00,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2022-11-05',  22100.00,   'GBP',  22100.00,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2022-12-30',  22200.00,   'GBP',  22200.00,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2023-08-08',  21200.00,   'GBP',  21200.00,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2023-12-30',  21200.00,   'GBP',  21200.00,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2024-06-18',  21200.00,   'GBP',  21200.00,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2024-12-31',  21612.74,   'GBP',  21612.74,   1.0, 'XLS import: Standard Life DE (was labelled 2024-31-23, corrected to 2024-12-31)'),
    (gen_random_uuid(), v_acc_std_life, '2025-07-15',  21000.00,   'GBP',  21000.00,   1.0, 'XLS import: Standard Life DE'),
    (gen_random_uuid(), v_acc_std_life, '2025-12-31',  24000.00,   'GBP',  24000.00,   1.0, 'XLS import: Standard Life DE');

  -- ---------------------------------------------------------------------------
  -- Aviva Sapient / Shannon (NEW account, inactive)
  -- Source XLS: "Aviva Sapient"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Aviva Sapient (Shannon)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_aviva_sapient
     AND snapshot_date IN (
       '2014-10-01','2016-04-01','2017-01-01','2020-11-01','2021-02-17'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_aviva_sapient, '2014-10-01',  8800.00,  'GBP',  8800.00,  1.0, 'XLS import: Aviva Sapient'),
    (gen_random_uuid(), v_acc_aviva_sapient, '2016-04-01',  8850.00,  'GBP',  8850.00,  1.0, 'XLS import: Aviva Sapient'),
    (gen_random_uuid(), v_acc_aviva_sapient, '2017-01-01',  12500.00, 'GBP',  12500.00, 1.0, 'XLS import: Aviva Sapient'),
    (gen_random_uuid(), v_acc_aviva_sapient, '2020-11-01',  12719.00, 'GBP',  12719.00, 1.0, 'XLS import: Aviva Sapient'),
    (gen_random_uuid(), v_acc_aviva_sapient, '2021-02-17',  14626.00, 'GBP',  14626.00, 1.0, 'XLS import: Aviva Sapient');

  -- ---------------------------------------------------------------------------
  -- SmartPension / Shannon (NEW account, inactive)
  -- Source XLS: "SmartPension"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: SmartPension (Shannon)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_smartpension
     AND snapshot_date IN ('2020-11-01','2021-02-17','2021-07-01');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_smartpension, '2020-11-01',  41278.00, 'GBP',  41278.00, 1.0, 'XLS import: SmartPension'),
    (gen_random_uuid(), v_acc_smartpension, '2021-02-17',  47725.00, 'GBP',  47725.00, 1.0, 'XLS import: SmartPension'),
    (gen_random_uuid(), v_acc_smartpension, '2021-07-01',  59832.00, 'GBP',  59832.00, 1.0, 'XLS import: SmartPension');

  -- ---------------------------------------------------------------------------
  -- SIPP / Vanguard / Ralf
  -- Source XLS: "Vanguard UK"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: SIPP Vanguard (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_vanguard_sipp
     AND snapshot_date IN (
       '2021-07-01','2021-12-01','2022-11-05','2022-12-30','2023-08-08',
       '2023-12-30','2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_vanguard_sipp, '2021-07-01',  20750.00,  'GBP',  20750.00,  1.0, 'XLS import: Vanguard UK'),
    (gen_random_uuid(), v_acc_vanguard_sipp, '2021-12-01',  98560.00,  'GBP',  98560.00,  1.0, 'XLS import: Vanguard UK'),
    (gen_random_uuid(), v_acc_vanguard_sipp, '2022-11-05',  86766.00,  'GBP',  86766.00,  1.0, 'XLS import: Vanguard UK'),
    (gen_random_uuid(), v_acc_vanguard_sipp, '2022-12-30',  84548.75,  'GBP',  84548.75,  1.0, 'XLS import: Vanguard UK'),
    (gen_random_uuid(), v_acc_vanguard_sipp, '2023-08-08',  106700.00, 'GBP',  106700.00, 1.0, 'XLS import: Vanguard UK'),
    (gen_random_uuid(), v_acc_vanguard_sipp, '2023-12-30',  113700.00, 'GBP',  113700.00, 1.0, 'XLS import: Vanguard UK'),
    (gen_random_uuid(), v_acc_vanguard_sipp, '2024-06-18',  146868.00, 'GBP',  146868.00, 1.0, 'XLS import: Vanguard UK'),
    (gen_random_uuid(), v_acc_vanguard_sipp, '2024-12-31',  158663.00, 'GBP',  158663.00, 1.0, 'XLS import: Vanguard UK'),
    (gen_random_uuid(), v_acc_vanguard_sipp, '2025-07-15',  231800.00, 'GBP',  231800.00, 1.0, 'XLS import: Vanguard UK'),
    (gen_random_uuid(), v_acc_vanguard_sipp, '2025-12-31',  256600.00, 'GBP',  256600.00, 1.0, 'XLS import: Vanguard UK');

  -- ---------------------------------------------------------------------------
  -- SIPP / Aviva / Ralf
  -- Source XLS: "Aviva Infosys"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: SIPP Aviva (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_aviva_sipp
     AND snapshot_date IN (
       '2021-12-01','2022-11-05','2022-12-30','2023-08-08',
       '2023-12-30','2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_aviva_sipp, '2021-12-01',  1200.00,   'GBP',  1200.00,   1.0, 'XLS import: Aviva Infosys'),
    (gen_random_uuid(), v_acc_aviva_sipp, '2022-11-05',  13000.00,  'GBP',  13000.00,  1.0, 'XLS import: Aviva Infosys'),
    (gen_random_uuid(), v_acc_aviva_sipp, '2022-12-30',  14886.71,  'GBP',  14886.71,  1.0, 'XLS import: Aviva Infosys'),
    (gen_random_uuid(), v_acc_aviva_sipp, '2023-08-08',  26060.00,  'GBP',  26060.00,  1.0, 'XLS import: Aviva Infosys'),
    (gen_random_uuid(), v_acc_aviva_sipp, '2023-12-30',  32200.00,  'GBP',  32200.00,  1.0, 'XLS import: Aviva Infosys'),
    (gen_random_uuid(), v_acc_aviva_sipp, '2024-06-18',  43476.00,  'GBP',  43476.00,  1.0, 'XLS import: Aviva Infosys'),
    (gen_random_uuid(), v_acc_aviva_sipp, '2024-12-31',  56865.00,  'GBP',  56865.00,  1.0, 'XLS import: Aviva Infosys'),
    (gen_random_uuid(), v_acc_aviva_sipp, '2025-07-15',  12000.00,  'GBP',  12000.00,  1.0, 'XLS import: Aviva Infosys'),
    (gen_random_uuid(), v_acc_aviva_sipp, '2025-12-31',  25000.00,  'GBP',  25000.00,  1.0, 'XLS import: Aviva Infosys');

  -- ---------------------------------------------------------------------------
  -- ISA / Nutmeg / Shannon
  -- Source XLS: "Nutmeg Shannon"
  -- Note: 2021-02-17 value is 0 — skipped per instructions.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: ISA Nutmeg (Shannon)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_nutmeg_isa
     AND snapshot_date IN (
       '2014-10-01','2016-04-01','2017-01-01','2020-11-01',
       '2021-07-01','2021-12-01','2022-11-05','2022-12-30','2023-08-08',
       '2023-12-30','2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_nutmeg_isa, '2014-10-01',  8534.00,  'GBP',  8534.00,  1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2016-04-01',  24180.00, 'GBP',  24180.00, 1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2017-01-01',  27700.00, 'GBP',  27700.00, 1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2020-11-01',  20000.00, 'GBP',  20000.00, 1.0, 'XLS import: Nutmeg Shannon'),
    -- 2021-02-17: 0 — SKIPPED (zero value)
    (gen_random_uuid(), v_acc_nutmeg_isa, '2021-07-01',  8500.00,  'GBP',  8500.00,  1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2021-12-01',  9700.00,  'GBP',  9700.00,  1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2022-11-05',  8700.00,  'GBP',  8700.00,  1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2022-12-30',  8700.00,  'GBP',  8700.00,  1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2023-08-08',  9300.00,  'GBP',  9300.00,  1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2023-12-30',  9400.00,  'GBP',  9400.00,  1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2024-06-18',  9400.00,  'GBP',  9400.00,  1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2024-12-31',  11375.00, 'GBP',  11375.00, 1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2025-07-15',  11800.00, 'GBP',  11800.00, 1.0, 'XLS import: Nutmeg Shannon'),
    (gen_random_uuid(), v_acc_nutmeg_isa, '2025-12-31',  11800.00, 'GBP',  11800.00, 1.0, 'XLS import: Nutmeg Shannon');

  -- ---------------------------------------------------------------------------
  -- Nutmeg Ralf / Ralf (NEW account, inactive)
  -- Source XLS: "Nutmeg Ralf"
  -- Note: 2024-06-18 value is 0 — skipped per instructions.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Nutmeg Ralf (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_nutmeg_ralf
     AND snapshot_date IN (
       '2014-10-01','2016-04-01','2017-01-01','2020-11-01','2021-02-17',
       '2021-07-01','2021-12-01','2022-11-05','2022-12-30','2023-08-08','2023-12-30'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2014-10-01',  18657.00,  'GBP',  18657.00,  1.0, 'XLS import: Nutmeg Ralf'),
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2016-04-01',  42140.00,  'GBP',  42140.00,  1.0, 'XLS import: Nutmeg Ralf'),
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2017-01-01',  49500.00,  'GBP',  49500.00,  1.0, 'XLS import: Nutmeg Ralf'),
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2020-11-01',  92000.00,  'GBP',  92000.00,  1.0, 'XLS import: Nutmeg Ralf'),
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2021-02-17',  94400.00,  'GBP',  94400.00,  1.0, 'XLS import: Nutmeg Ralf'),
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2021-07-01',  115500.00, 'GBP',  115500.00, 1.0, 'XLS import: Nutmeg Ralf'),
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2021-12-01',  124300.00, 'GBP',  124300.00, 1.0, 'XLS import: Nutmeg Ralf'),
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2022-11-05',  112600.00, 'GBP',  112600.00, 1.0, 'XLS import: Nutmeg Ralf'),
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2022-12-30',  112871.00, 'GBP',  112871.00, 1.0, 'XLS import: Nutmeg Ralf'),
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2023-08-08',  119000.00, 'GBP',  119000.00, 1.0, 'XLS import: Nutmeg Ralf'),
    (gen_random_uuid(), v_acc_nutmeg_ralf, '2023-12-30',  125000.00, 'GBP',  125000.00, 1.0, 'XLS import: Nutmeg Ralf');
    -- 2024-06-18: 0 — SKIPPED (zero value, account closed)

  -- ---------------------------------------------------------------------------
  -- Morgan Stanley / Ralf (NEW account, inactive)
  -- Source XLS: "Morgan Stanley"
  -- Note: 2021-02-17=0 and 2024-06-18=0 — both skipped.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Morgan Stanley (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_morgan_stanley
     AND snapshot_date IN (
       '2020-11-01','2021-07-01','2021-12-01',
       '2022-11-05','2022-12-30','2023-08-08','2023-12-30'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_morgan_stanley, '2020-11-01',  11609.00, 'GBP',  11609.00, 1.0, 'XLS import: Morgan Stanley'),
    -- 2021-02-17: 0 — SKIPPED (zero value)
    (gen_random_uuid(), v_acc_morgan_stanley, '2021-07-01',  16205.00, 'GBP',  16205.00, 1.0, 'XLS import: Morgan Stanley'),
    (gen_random_uuid(), v_acc_morgan_stanley, '2021-12-01',  18800.00, 'GBP',  18800.00, 1.0, 'XLS import: Morgan Stanley'),
    (gen_random_uuid(), v_acc_morgan_stanley, '2022-11-05',  29800.00, 'GBP',  29800.00, 1.0, 'XLS import: Morgan Stanley'),
    (gen_random_uuid(), v_acc_morgan_stanley, '2022-12-30',  27400.00, 'GBP',  27400.00, 1.0, 'XLS import: Morgan Stanley'),
    (gen_random_uuid(), v_acc_morgan_stanley, '2023-08-08',  23500.00, 'GBP',  23500.00, 1.0, 'XLS import: Morgan Stanley'),
    (gen_random_uuid(), v_acc_morgan_stanley, '2023-12-30',  26500.00, 'GBP',  26500.00, 1.0, 'XLS import: Morgan Stanley');
    -- 2024-06-18: 0 — SKIPPED (zero value, account closed)

  -- ---------------------------------------------------------------------------
  -- Platinum 50g / Ralf (existing account, type other)
  -- Source XLS: "Platinum 50g"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Platinum 50g (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_platinum
     AND snapshot_date IN (
       '2014-10-01','2016-04-01','2017-01-01','2020-11-01','2021-02-17',
       '2021-07-01','2021-12-01','2022-11-05','2022-12-30','2023-08-08',
       '2023-12-30','2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_platinum, '2014-10-01',  1314.95, 'GBP',  1314.95, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2016-04-01',  1184.98, 'GBP',  1184.98, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2017-01-01',  1297.18, 'GBP',  1297.18, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2020-11-01',  1122.00, 'GBP',  1122.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2021-02-17',  1350.00, 'GBP',  1350.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2021-07-01',  1350.00, 'GBP',  1350.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2021-12-01',  1350.00, 'GBP',  1350.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2022-11-05',  1550.00, 'GBP',  1550.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2022-12-30',  1550.00, 'GBP',  1550.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2023-08-08',  1500.00, 'GBP',  1500.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2023-12-30',  1500.00, 'GBP',  1500.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2024-06-18',  1500.00, 'GBP',  1500.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2024-12-31',  1500.00, 'GBP',  1500.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2025-07-15',  1600.00, 'GBP',  1600.00, 1.0, 'XLS import: Platinum 50g'),
    (gen_random_uuid(), v_acc_platinum, '2025-12-31',  2600.00, 'GBP',  2600.00, 1.0, 'XLS import: Platinum 50g');

  -- ---------------------------------------------------------------------------
  -- Gold 2oz / Ralf (existing account, type other)
  -- Source XLS: "Gold 2oz"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Gold 2oz (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_gold
     AND snapshot_date IN (
       '2014-10-01','2016-04-01','2017-01-01','2020-11-01','2021-02-17',
       '2021-07-01','2021-12-01','2022-11-05','2022-12-30','2023-08-08',
       '2023-12-30','2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_gold, '2014-10-01',  1447.66, 'GBP',  1447.66, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2016-04-01',  1719.90, 'GBP',  1719.90, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2017-01-01',  2167.44, 'GBP',  2167.44, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2020-11-01',  2917.00, 'GBP',  2917.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2021-02-17',  2440.00, 'GBP',  2440.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2021-07-01',  2440.00, 'GBP',  2440.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2021-12-01',  2440.00, 'GBP',  2440.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2022-11-05',  3200.00, 'GBP',  3200.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2022-12-30',  3200.00, 'GBP',  3200.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2023-08-08',  3000.00, 'GBP',  3000.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2023-12-30',  3000.00, 'GBP',  3000.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2024-06-18',  3000.00, 'GBP',  3000.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2024-12-31',  3000.00, 'GBP',  3000.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2025-07-15',  5000.00, 'GBP',  5000.00, 1.0, 'XLS import: Gold 2oz'),
    (gen_random_uuid(), v_acc_gold, '2025-12-31',  7000.00, 'GBP',  7000.00, 1.0, 'XLS import: Gold 2oz');

  -- ---------------------------------------------------------------------------
  -- Bitcoin / Coinbase / Ralf (existing account, type crypto)
  -- Source XLS: "Crypto" (combined; all imported into this account)
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Bitcoin Coinbase (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_coinbase_btc
     AND snapshot_date IN (
       '2020-11-01','2021-02-17','2021-07-01','2021-12-01','2022-11-05',
       '2022-12-30','2023-08-08','2023-12-30','2024-06-18','2024-12-31',
       '2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_coinbase_btc, '2020-11-01',  8000.00,  'GBP',  8000.00,  1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2021-02-17',  20000.00, 'GBP',  20000.00, 1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2021-07-01',  17000.00, 'GBP',  17000.00, 1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2021-12-01',  25300.00, 'GBP',  25300.00, 1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2022-11-05',  12870.00, 'GBP',  12870.00, 1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2022-12-30',  9500.00,  'GBP',  9500.00,  1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2023-08-08',  11700.00, 'GBP',  11700.00, 1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2023-12-30',  22000.00, 'GBP',  22000.00, 1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2024-06-18',  35000.00, 'GBP',  35000.00, 1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2024-12-31',  49400.00, 'GBP',  49400.00, 1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2025-07-15',  58000.00, 'GBP',  58000.00, 1.0, 'XLS import: Crypto (combined, all imported here)'),
    (gen_random_uuid(), v_acc_coinbase_btc, '2025-12-31',  43000.00, 'GBP',  43000.00, 1.0, 'XLS import: Crypto (combined, all imported here)');

  -- ---------------------------------------------------------------------------
  -- Frankfurt Trust / Ralf (NEW account, inactive)
  -- Source XLS: "Frankfurt Trust"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Frankfurt Trust (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_frankfurt
     AND snapshot_date IN ('2014-10-01','2016-04-01');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_frankfurt, '2014-10-01',  4400.00,  'GBP',  4400.00,  1.0, 'XLS import: Frankfurt Trust'),
    (gen_random_uuid(), v_acc_frankfurt, '2016-04-01',  4686.67,  'GBP',  4686.67,  1.0, 'XLS import: Frankfurt Trust');

  -- ---------------------------------------------------------------------------
  -- Questrade / Ralf (NEW account, inactive, currency CAD)
  -- Source XLS: "Questrade"
  -- fx_rate approximation: 0.58 (CAD to GBP)
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Questrade (Ralf, CAD)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_questrade
     AND snapshot_date IN ('2014-10-01','2016-04-01','2017-01-01');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_questrade, '2014-10-01',  1800.00,  'CAD',  ROUND(1800.00  * 0.58, 2),  0.58, 'XLS import: Questrade'),
    (gen_random_uuid(), v_acc_questrade, '2016-04-01',  1633.02,  'CAD',  ROUND(1633.02  * 0.58, 2),  0.58, 'XLS import: Questrade'),
    (gen_random_uuid(), v_acc_questrade, '2017-01-01',  2128.40,  'CAD',  ROUND(2128.40  * 0.58, 2),  0.58, 'XLS import: Questrade');

  -- ---------------------------------------------------------------------------
  -- Marcus Savings / Ralf (NEW account, inactive)
  -- Source XLS: "Marcus Savings"
  -- Note: 2023-12-30=0 and 2024-06-18=0 — both skipped.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Marcus Savings (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_marcus
     AND snapshot_date IN ('2023-08-08');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_marcus, '2023-08-08',  25000.00, 'GBP',  25000.00, 1.0, 'XLS import: Marcus Savings');
    -- 2023-12-30: 0 — SKIPPED
    -- 2024-06-18: 0 — SKIPPED

  -- ---------------------------------------------------------------------------
  -- ISA / Vanguard / Ralf (existing account)
  -- Source XLS: "Vanguard ISA and GIA Ralf" — combined balance imported entirely
  -- into this ISA account. GIA (Vanguard) gets no historical snapshots.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: ISA Vanguard (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_vanguard_isa
     AND snapshot_date IN (
       '2022-11-05','2022-12-30','2023-08-08','2023-12-30',
       '2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_vanguard_isa, '2022-11-05',  19389.00,  'GBP',  19389.00,  1.0, 'XLS import: Vanguard ISA and GIA Ralf (combined)'),
    (gen_random_uuid(), v_acc_vanguard_isa, '2022-12-30',  18892.97,  'GBP',  18892.97,  1.0, 'XLS import: Vanguard ISA and GIA Ralf (combined)'),
    (gen_random_uuid(), v_acc_vanguard_isa, '2023-08-08',  42080.00,  'GBP',  42080.00,  1.0, 'XLS import: Vanguard ISA and GIA Ralf (combined)'),
    (gen_random_uuid(), v_acc_vanguard_isa, '2023-12-30',  71300.00,  'GBP',  71300.00,  1.0, 'XLS import: Vanguard ISA and GIA Ralf (combined)'),
    (gen_random_uuid(), v_acc_vanguard_isa, '2024-06-18',  222443.00, 'GBP',  222443.00, 1.0, 'XLS import: Vanguard ISA and GIA Ralf (combined)'),
    (gen_random_uuid(), v_acc_vanguard_isa, '2024-12-31',  240380.00, 'GBP',  240380.00, 1.0, 'XLS import: Vanguard ISA and GIA Ralf (combined)'),
    (gen_random_uuid(), v_acc_vanguard_isa, '2025-07-15',  268700.00, 'GBP',  268700.00, 1.0, 'XLS import: Vanguard ISA and GIA Ralf (combined)'),
    (gen_random_uuid(), v_acc_vanguard_isa, '2025-12-31',  287000.00, 'GBP',  287000.00, 1.0, 'XLS import: Vanguard ISA and GIA Ralf (combined)');

  -- ---------------------------------------------------------------------------
  -- Aviso Wealth RRSP / Aviso / Shannon (existing account, currency CAD)
  -- Source XLS: "Aviso Wealth RRSP Shannon"
  -- Values are CAD; gbp_balance = balance * 0.58
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Aviso Wealth RRSP (Shannon, CAD)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_aviso
     AND snapshot_date IN ('2025-07-15','2025-12-31');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_aviso, '2025-07-15',  1000.00, 'CAD',  ROUND(1000.00 * 0.58, 2),  0.58, 'XLS import: Aviso Wealth RRSP Shannon (CAD)'),
    (gen_random_uuid(), v_acc_aviso, '2025-12-31',  1000.00, 'CAD',  ROUND(1000.00 * 0.58, 2),  0.58, 'XLS import: Aviso Wealth RRSP Shannon (CAD)');

  -- ---------------------------------------------------------------------------
  -- Qtrade / Shannon (NEW account, active, currency CAD)
  -- Source XLS: "Qtrade / Vanguard Shannon"
  -- Values are CAD; gbp_balance = balance * 0.58
  -- Note: 2016-04-01 value 324.12 — small but non-zero, include it.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Qtrade (Shannon, CAD)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_qtrade
     AND snapshot_date IN ('2014-10-01','2016-04-01','2025-07-15','2025-12-31');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_qtrade, '2014-10-01',  361.91,   'CAD',  ROUND(361.91   * 0.58, 2),  0.58, 'XLS import: Qtrade / Vanguard Shannon (CAD)'),
    (gen_random_uuid(), v_acc_qtrade, '2016-04-01',  324.12,   'CAD',  ROUND(324.12   * 0.58, 2),  0.58, 'XLS import: Qtrade / Vanguard Shannon (CAD)'),
    (gen_random_uuid(), v_acc_qtrade, '2025-07-15',  15000.00, 'CAD',  ROUND(15000.00 * 0.58, 2),  0.58, 'XLS import: Qtrade / Vanguard Shannon (CAD)'),
    (gen_random_uuid(), v_acc_qtrade, '2025-12-31',  20000.00, 'CAD',  ROUND(20000.00 * 0.58, 2),  0.58, 'XLS import: Qtrade / Vanguard Shannon (CAD)');

  -- ---------------------------------------------------------------------------
  -- 14 Cranleigh Gardens / Ralf (existing account, type property)
  -- Source XLS: "House Equity"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: 14 Cranleigh Gardens (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_cranleigh
     AND snapshot_date IN (
       '2020-11-01','2021-02-17','2021-07-01','2021-12-01','2022-11-05',
       '2022-12-30','2023-08-08','2023-12-30','2024-06-18','2024-12-31',
       '2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_cranleigh, '2020-11-01',  330000.00, 'GBP',  330000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2021-02-17',  332000.00, 'GBP',  332000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2021-07-01',  430000.00, 'GBP',  430000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2021-12-01',  540000.00, 'GBP',  540000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2022-11-05',  610000.00, 'GBP',  610000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2022-12-30',  600000.00, 'GBP',  600000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2023-08-08',  600000.00, 'GBP',  600000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2023-12-30',  620000.00, 'GBP',  620000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2024-06-18',  640000.00, 'GBP',  640000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2024-12-31',  650000.00, 'GBP',  650000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2025-07-15',  650000.00, 'GBP',  650000.00, 1.0, 'XLS import: House Equity'),
    (gen_random_uuid(), v_acc_cranleigh, '2025-12-31',  650000.00, 'GBP',  650000.00, 1.0, 'XLS import: House Equity');

  -- ---------------------------------------------------------------------------
  -- DSL Deposit / Ralf (existing account, type other)
  -- Source XLS: "DSL Deposit"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: DSL Deposit (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_dsl_deposit
     AND snapshot_date IN (
       '2014-10-01','2016-04-01','2017-01-01','2020-11-01','2021-02-17',
       '2021-07-01','2021-12-01','2022-11-05','2022-12-30','2023-08-08',
       '2023-12-30','2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_dsl_deposit, '2014-10-01',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2016-04-01',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2017-01-01',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2020-11-01',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2021-02-17',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2021-07-01',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2021-12-01',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2022-11-05',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2022-12-30',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2023-08-08',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2023-12-30',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2024-06-18',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2024-12-31',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2025-07-15',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: DSL Deposit'),
    (gen_random_uuid(), v_acc_dsl_deposit, '2025-12-31',  8000.00, 'GBP',  8000.00, 1.0, 'XLS import: DSL Deposit');

  -- ---------------------------------------------------------------------------
  -- Peugeot 3008 / Ralf (NEW account, inactive)
  -- Source XLS: "Peugeot 3008"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Peugeot 3008 (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_peugeot
     AND snapshot_date IN ('2016-04-01','2017-01-01','2020-11-01');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_peugeot, '2016-04-01',  5000.00, 'GBP',  5000.00, 1.0, 'XLS import: Peugeot 3008'),
    (gen_random_uuid(), v_acc_peugeot, '2017-01-01',  5000.00, 'GBP',  5000.00, 1.0, 'XLS import: Peugeot 3008'),
    (gen_random_uuid(), v_acc_peugeot, '2020-11-01',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: Peugeot 3008');

  -- ---------------------------------------------------------------------------
  -- Honda Civic / Ralf (NEW account, inactive)
  -- Source XLS: "Honda Civic"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Honda Civic (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_honda
     AND snapshot_date IN ('2014-10-01','2016-04-01','2017-01-01');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_honda, '2014-10-01',  3600.00, 'GBP',  3600.00, 1.0, 'XLS import: Honda Civic'),
    (gen_random_uuid(), v_acc_honda, '2016-04-01',  3200.00, 'GBP',  3200.00, 1.0, 'XLS import: Honda Civic'),
    (gen_random_uuid(), v_acc_honda, '2017-01-01',  3200.00, 'GBP',  3200.00, 1.0, 'XLS import: Honda Civic');

  -- ---------------------------------------------------------------------------
  -- Rental Deposit / Ralf (NEW account, inactive)
  -- Source XLS: "Rental Deposit"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Rental Deposit (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_rental_deposit
     AND snapshot_date IN ('2014-10-01','2016-04-01','2017-01-01');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_rental_deposit, '2014-10-01',  2300.00, 'GBP',  2300.00, 1.0, 'XLS import: Rental Deposit'),
    (gen_random_uuid(), v_acc_rental_deposit, '2016-04-01',  2300.00, 'GBP',  2300.00, 1.0, 'XLS import: Rental Deposit'),
    (gen_random_uuid(), v_acc_rental_deposit, '2017-01-01',  2300.00, 'GBP',  2300.00, 1.0, 'XLS import: Rental Deposit');

  -- ---------------------------------------------------------------------------
  -- Infosys Expenses / Ralf (NEW account, active)
  -- Source XLS: "Infosys Expenses"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Infosys Expenses (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_infosys_exp
     AND snapshot_date IN (
       '2022-11-05','2022-12-30','2023-08-08','2023-12-30',
       '2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_infosys_exp, '2022-11-05',  8000.00, 'GBP',  8000.00, 1.0, 'XLS import: Infosys Expenses'),
    (gen_random_uuid(), v_acc_infosys_exp, '2022-12-30',  8000.00, 'GBP',  8000.00, 1.0, 'XLS import: Infosys Expenses'),
    (gen_random_uuid(), v_acc_infosys_exp, '2023-08-08',  8000.00, 'GBP',  8000.00, 1.0, 'XLS import: Infosys Expenses'),
    (gen_random_uuid(), v_acc_infosys_exp, '2023-12-30',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: Infosys Expenses'),
    (gen_random_uuid(), v_acc_infosys_exp, '2024-06-18',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: Infosys Expenses'),
    (gen_random_uuid(), v_acc_infosys_exp, '2024-12-31',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: Infosys Expenses'),
    (gen_random_uuid(), v_acc_infosys_exp, '2025-07-15',  4000.00, 'GBP',  4000.00, 1.0, 'XLS import: Infosys Expenses'),
    (gen_random_uuid(), v_acc_infosys_exp, '2025-12-31',  1000.00, 'GBP',  1000.00, 1.0, 'XLS import: Infosys Expenses');

  -- ---------------------------------------------------------------------------
  -- Volvo XC90 / Ralf (existing account, type other)
  -- Source XLS: "XC90"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Volvo XC90 (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_xc90
     AND snapshot_date IN (
       '2021-02-17','2021-07-01','2021-12-01','2022-11-05','2022-12-30',
       '2023-08-08','2023-12-30','2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_xc90, '2021-02-17',  21000.00, 'GBP',  21000.00, 1.0, 'XLS import: XC90'),
    (gen_random_uuid(), v_acc_xc90, '2021-07-01',  20000.00, 'GBP',  20000.00, 1.0, 'XLS import: XC90'),
    (gen_random_uuid(), v_acc_xc90, '2021-12-01',  19000.00, 'GBP',  19000.00, 1.0, 'XLS import: XC90'),
    (gen_random_uuid(), v_acc_xc90, '2022-11-05',  19000.00, 'GBP',  19000.00, 1.0, 'XLS import: XC90'),
    (gen_random_uuid(), v_acc_xc90, '2022-12-30',  19000.00, 'GBP',  19000.00, 1.0, 'XLS import: XC90'),
    (gen_random_uuid(), v_acc_xc90, '2023-08-08',  19000.00, 'GBP',  19000.00, 1.0, 'XLS import: XC90'),
    (gen_random_uuid(), v_acc_xc90, '2023-12-30',  18000.00, 'GBP',  18000.00, 1.0, 'XLS import: XC90'),
    (gen_random_uuid(), v_acc_xc90, '2024-06-18',  18000.00, 'GBP',  18000.00, 1.0, 'XLS import: XC90'),
    (gen_random_uuid(), v_acc_xc90, '2024-12-31',  17000.00, 'GBP',  17000.00, 1.0, 'XLS import: XC90'),
    (gen_random_uuid(), v_acc_xc90, '2025-07-15',  17000.00, 'GBP',  17000.00, 1.0, 'XLS import: XC90'),
    (gen_random_uuid(), v_acc_xc90, '2025-12-31',  17000.00, 'GBP',  17000.00, 1.0, 'XLS import: XC90');

  -- ---------------------------------------------------------------------------
  -- Barclays / Ralf (NEW account, active, current)
  -- Source XLS: "Barclays"
  -- Note: 2021-02-17=0 — skipped.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Barclays (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_barclays
     AND snapshot_date IN (
       '2020-11-01','2021-07-01','2021-12-01','2022-11-05','2022-12-30',
       '2023-08-08','2023-12-30','2024-06-18','2024-12-31','2025-07-15','2025-12-31'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_barclays, '2020-11-01',  3000.00,  'GBP',  3000.00,  1.0, 'XLS import: Barclays'),
    -- 2021-02-17: 0 — SKIPPED
    (gen_random_uuid(), v_acc_barclays, '2021-07-01',  9000.00,  'GBP',  9000.00,  1.0, 'XLS import: Barclays'),
    (gen_random_uuid(), v_acc_barclays, '2021-12-01',  5000.00,  'GBP',  5000.00,  1.0, 'XLS import: Barclays'),
    (gen_random_uuid(), v_acc_barclays, '2022-11-05',  20000.00, 'GBP',  20000.00, 1.0, 'XLS import: Barclays'),
    (gen_random_uuid(), v_acc_barclays, '2022-12-30',  20000.00, 'GBP',  20000.00, 1.0, 'XLS import: Barclays'),
    (gen_random_uuid(), v_acc_barclays, '2023-08-08',  13000.00, 'GBP',  13000.00, 1.0, 'XLS import: Barclays'),
    (gen_random_uuid(), v_acc_barclays, '2023-12-30',  1000.00,  'GBP',  1000.00,  1.0, 'XLS import: Barclays'),
    (gen_random_uuid(), v_acc_barclays, '2024-06-18',  2500.00,  'GBP',  2500.00,  1.0, 'XLS import: Barclays'),
    (gen_random_uuid(), v_acc_barclays, '2024-12-31',  18000.00, 'GBP',  18000.00, 1.0, 'XLS import: Barclays'),
    (gen_random_uuid(), v_acc_barclays, '2025-07-15',  5000.00,  'GBP',  5000.00,  1.0, 'XLS import: Barclays'),
    (gen_random_uuid(), v_acc_barclays, '2025-12-31',  5000.00,  'GBP',  5000.00,  1.0, 'XLS import: Barclays');

  -- ---------------------------------------------------------------------------
  -- Various Business Accounts / Ralf (NEW account, inactive, current)
  -- Source XLS: "Various business accounts"
  -- Note: 2016-04-01=0, 2017-01-01=0 — skipped.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Various Business Accounts (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_biz_accounts
     AND snapshot_date IN (
       '2014-10-01','2022-11-05','2022-12-30','2023-08-08','2023-12-30','2024-06-18'
     );

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_biz_accounts, '2014-10-01',  40000.00, 'GBP',  40000.00, 1.0, 'XLS import: Various business accounts'),
    -- 2016-04-01: 0 — SKIPPED
    -- 2017-01-01: 0 — SKIPPED
    (gen_random_uuid(), v_acc_biz_accounts, '2022-11-05',  1500.00,  'GBP',  1500.00,  1.0, 'XLS import: Various business accounts'),
    (gen_random_uuid(), v_acc_biz_accounts, '2022-12-30',  1500.00,  'GBP',  1500.00,  1.0, 'XLS import: Various business accounts'),
    (gen_random_uuid(), v_acc_biz_accounts, '2023-08-08',  500.00,   'GBP',  500.00,   1.0, 'XLS import: Various business accounts'),
    (gen_random_uuid(), v_acc_biz_accounts, '2023-12-30',  500.00,   'GBP',  500.00,   1.0, 'XLS import: Various business accounts'),
    (gen_random_uuid(), v_acc_biz_accounts, '2024-06-18',  500.00,   'GBP',  500.00,   1.0, 'XLS import: Various business accounts');

  -- ---------------------------------------------------------------------------
  -- First Direct / Ralf (NEW account, inactive, current)
  -- Source XLS: "first direct"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: First Direct (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_first_direct
     AND snapshot_date IN ('2023-08-08','2023-12-30','2024-06-18','2024-12-31');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_first_direct, '2023-08-08',  2800.00, 'GBP',  2800.00, 1.0, 'XLS import: first direct'),
    (gen_random_uuid(), v_acc_first_direct, '2023-12-30',  500.00,  'GBP',  500.00,  1.0, 'XLS import: first direct'),
    (gen_random_uuid(), v_acc_first_direct, '2024-06-18',  500.00,  'GBP',  500.00,  1.0, 'XLS import: first direct'),
    (gen_random_uuid(), v_acc_first_direct, '2024-12-31',  500.00,  'GBP',  500.00,  1.0, 'XLS import: first direct');

  -- ---------------------------------------------------------------------------
  -- Natwest / Ralf (NEW account, inactive, current)
  -- Source XLS: "Natwest"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Natwest (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_natwest
     AND snapshot_date IN ('2023-08-08','2023-12-30','2024-06-18','2024-12-31');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_natwest, '2023-08-08',  1000.00, 'GBP',  1000.00, 1.0, 'XLS import: Natwest'),
    (gen_random_uuid(), v_acc_natwest, '2023-12-30',  200.00,  'GBP',  200.00,  1.0, 'XLS import: Natwest'),
    (gen_random_uuid(), v_acc_natwest, '2024-06-18',  200.00,  'GBP',  200.00,  1.0, 'XLS import: Natwest'),
    (gen_random_uuid(), v_acc_natwest, '2024-12-31',  500.00,  'GBP',  500.00,  1.0, 'XLS import: Natwest');

  -- ---------------------------------------------------------------------------
  -- Ulster Bank / Ralf (NEW account, inactive, current)
  -- Source XLS: "Ulster"
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Ulster Bank (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_ulster
     AND snapshot_date IN ('2023-08-08','2023-12-30','2024-06-18');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_ulster, '2023-08-08',  3000.00, 'GBP',  3000.00, 1.0, 'XLS import: Ulster Bank'),
    (gen_random_uuid(), v_acc_ulster, '2023-12-30',  60.00,   'GBP',  60.00,   1.0, 'XLS import: Ulster Bank'),
    (gen_random_uuid(), v_acc_ulster, '2024-06-18',  60.00,   'GBP',  60.00,   1.0, 'XLS import: Ulster Bank');

  -- ---------------------------------------------------------------------------
  -- TSB / Ralf (NEW account, inactive, current)
  -- Source XLS: "TSB"
  -- Note: 2023-12-30=0 and 2024-06-18=0 — both skipped.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: TSB (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_tsb
     AND snapshot_date IN ('2023-08-08');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_tsb, '2023-08-08',  200.00, 'GBP',  200.00, 1.0, 'XLS import: TSB');
    -- 2023-12-30: 0 — SKIPPED
    -- 2024-06-18: 0 — SKIPPED

  -- ---------------------------------------------------------------------------
  -- Lloyds / Ralf (NEW account, inactive, current)
  -- Source XLS: "Lloyds"
  -- Note: 2023-12-30=0 and 2024-06-18=0 — both skipped.
  -- ---------------------------------------------------------------------------
  RAISE NOTICE 'Importing: Lloyds (Ralf)...';

  DELETE FROM balance_snapshots
   WHERE account_id = v_acc_lloyds
     AND snapshot_date IN ('2023-08-08');

  INSERT INTO balance_snapshots (id, account_id, snapshot_date, balance, currency, gbp_balance, fx_rate, notes)
  VALUES
    (gen_random_uuid(), v_acc_lloyds, '2023-08-08',  5200.00, 'GBP',  5200.00, 1.0, 'XLS import: Lloyds');
    -- 2023-12-30: 0 — SKIPPED
    -- 2024-06-18: 0 — SKIPPED

  -- ===========================================================================
  -- DONE
  -- ===========================================================================
  RAISE NOTICE '========================================================';
  RAISE NOTICE 'Historical balance import complete.';
  RAISE NOTICE 'Accounts created (new): Aviva Sapient, SmartPension, Nutmeg Ralf, Morgan Stanley, Frankfurt Trust, Questrade, Marcus Savings, Peugeot 3008, Honda Civic, Rental Deposit, Infosys Expenses, Various Business Accounts, First Direct, Natwest, Ulster Bank, TSB, Lloyds, Qtrade, Barclays';
  RAISE NOTICE 'Snapshots inserted for all listed accounts.';
  RAISE NOTICE '========================================================';

END $$;
