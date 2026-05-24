import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// One-time historical import endpoint — DELETE AFTER USE
// Usage: GET /api/admin/import-historical?secret=rg-import-2026

const SECRET = 'rg-import-2026';

type Snap = { d: string; b: number; gb?: number }; // date, balance, gbp_balance (omit = same as b)

// All GBP unless noted. Skip zeros. 2024-31-23 corrected to 2024-12-31.
const DATA: Record<string, { snaps: Snap[]; cur?: string }> = {
  // ── Pension Germany (Standard Life DE) ─────────────────────────────────────
  'Pension Germany|Standard Life|ralf': { snaps: [
    { d: '2014-10-01', b: 8200 }, { d: '2016-04-01', b: 8000 }, { d: '2017-01-01', b: 13574.12 },
    { d: '2020-11-01', b: 20439 }, { d: '2021-02-17', b: 20527 }, { d: '2021-07-01', b: 21135 },
    { d: '2021-12-01', b: 22100 }, { d: '2022-11-05', b: 22100 }, { d: '2022-12-30', b: 22200 },
    { d: '2023-08-08', b: 21200 }, { d: '2023-12-30', b: 21200 }, { d: '2024-06-18', b: 21200 },
    { d: '2024-12-31', b: 21612.74 }, { d: '2025-07-15', b: 21000 }, { d: '2025-12-31', b: 24000 },
  ]},
  // ── Vanguard SIPP ──────────────────────────────────────────────────────────
  'Pension|Vanguard|ralf': { snaps: [
    { d: '2021-07-01', b: 20750 }, { d: '2021-12-01', b: 98560 }, { d: '2022-11-05', b: 86766 },
    { d: '2022-12-30', b: 84548.75 }, { d: '2023-08-08', b: 106700 }, { d: '2023-12-30', b: 113700 },
    { d: '2024-06-18', b: 146868 }, { d: '2024-12-31', b: 158663 }, { d: '2025-07-15', b: 231800 },
    { d: '2025-12-31', b: 256600 },
  ]},
  // ── Aviva SIPP ────────────────────────────────────────────────────────────
  'Pension|Aviva|ralf': { snaps: [
    { d: '2021-12-01', b: 1200 }, { d: '2022-11-05', b: 13000 }, { d: '2022-12-30', b: 14886.71 },
    { d: '2023-08-08', b: 26060 }, { d: '2023-12-30', b: 32200 }, { d: '2024-06-18', b: 43476 },
    { d: '2024-12-31', b: 56865 }, { d: '2025-07-15', b: 12000 }, { d: '2025-12-31', b: 25000 },
  ]},
  // ── Vanguard ISA (combined ISA+GIA historical) ────────────────────────────
  'ISA|Vanguard|ralf': { snaps: [
    { d: '2022-11-05', b: 19389 }, { d: '2022-12-30', b: 18892.97 }, { d: '2023-08-08', b: 42080 },
    { d: '2023-12-30', b: 71300 }, { d: '2024-06-18', b: 222443 }, { d: '2024-12-31', b: 240380 },
    { d: '2025-07-15', b: 268700 }, { d: '2025-12-31', b: 287000 },
  ]},
  // ── Bitcoin / Coinbase (combined crypto historical) ───────────────────────
  'Bitcoin|Coinbase|ralf': { snaps: [
    { d: '2020-11-01', b: 8000 }, { d: '2021-02-17', b: 20000 }, { d: '2021-07-01', b: 17000 },
    { d: '2021-12-01', b: 25300 }, { d: '2022-11-05', b: 12870 }, { d: '2022-12-30', b: 9500 },
    { d: '2023-08-08', b: 11700 }, { d: '2023-12-30', b: 22000 }, { d: '2024-06-18', b: 35000 },
    { d: '2024-12-31', b: 49400 }, { d: '2025-07-15', b: 58000 }, { d: '2025-12-31', b: 43000 },
  ]},
  // ── 14 Cranleigh Gardens (property) ──────────────────────────────────────
  '14 Cranleigh Gardens||ralf': { snaps: [
    { d: '2020-11-01', b: 330000 }, { d: '2021-02-17', b: 332000 }, { d: '2021-07-01', b: 430000 },
    { d: '2021-12-01', b: 540000 }, { d: '2022-11-05', b: 610000 }, { d: '2022-12-30', b: 600000 },
    { d: '2023-08-08', b: 600000 }, { d: '2023-12-30', b: 620000 }, { d: '2024-06-18', b: 640000 },
    { d: '2024-12-31', b: 650000 }, { d: '2025-07-15', b: 650000 }, { d: '2025-12-31', b: 650000 },
  ]},
  // ── Platinum 50g ──────────────────────────────────────────────────────────
  'Platinum 50g||ralf': { snaps: [
    { d: '2014-10-01', b: 1314.95 }, { d: '2016-04-01', b: 1184.98 }, { d: '2017-01-01', b: 1297.18 },
    { d: '2020-11-01', b: 1122 }, { d: '2021-02-17', b: 1350 }, { d: '2021-07-01', b: 1350 },
    { d: '2021-12-01', b: 1350 }, { d: '2022-11-05', b: 1550 }, { d: '2022-12-30', b: 1550 },
    { d: '2023-08-08', b: 1500 }, { d: '2023-12-30', b: 1500 }, { d: '2024-06-18', b: 1500 },
    { d: '2024-12-31', b: 1500 }, { d: '2025-07-15', b: 1600 }, { d: '2025-12-31', b: 2600 },
  ]},
  // ── Gold 2oz ──────────────────────────────────────────────────────────────
  'Gold 2oz||ralf': { snaps: [
    { d: '2014-10-01', b: 1447.66 }, { d: '2016-04-01', b: 1719.90 }, { d: '2017-01-01', b: 2167.44 },
    { d: '2020-11-01', b: 2917 }, { d: '2021-02-17', b: 2440 }, { d: '2021-07-01', b: 2440 },
    { d: '2021-12-01', b: 2440 }, { d: '2022-11-05', b: 3200 }, { d: '2022-12-30', b: 3200 },
    { d: '2023-08-08', b: 3000 }, { d: '2023-12-30', b: 3000 }, { d: '2024-06-18', b: 3000 },
    { d: '2024-12-31', b: 3000 }, { d: '2025-07-15', b: 5000 }, { d: '2025-12-31', b: 7000 },
  ]},
  // ── Volvo XC90 ────────────────────────────────────────────────────────────
  'Volvo XC90||ralf': { snaps: [
    { d: '2021-02-17', b: 21000 }, { d: '2021-07-01', b: 20000 }, { d: '2021-12-01', b: 19000 },
    { d: '2022-11-05', b: 19000 }, { d: '2022-12-30', b: 19000 }, { d: '2023-08-08', b: 19000 },
    { d: '2023-12-30', b: 18000 }, { d: '2024-06-18', b: 18000 }, { d: '2024-12-31', b: 17000 },
    { d: '2025-07-15', b: 17000 }, { d: '2025-12-31', b: 17000 },
  ]},
  // ── DSL Deposit ───────────────────────────────────────────────────────────
  'DSL Deposit||ralf': { snaps: [
    { d: '2014-10-01', b: 4000 }, { d: '2016-04-01', b: 4000 }, { d: '2017-01-01', b: 4000 },
    { d: '2020-11-01', b: 4000 }, { d: '2021-02-17', b: 4000 }, { d: '2021-07-01', b: 4000 },
    { d: '2021-12-01', b: 4000 }, { d: '2022-11-05', b: 4000 }, { d: '2022-12-30', b: 4000 },
    { d: '2023-08-08', b: 4000 }, { d: '2023-12-30', b: 4000 }, { d: '2024-06-18', b: 4000 },
    { d: '2024-12-31', b: 4000 }, { d: '2025-07-15', b: 4000 }, { d: '2025-12-31', b: 8000 },
  ]},
  // ── Nutmeg ISA (Shannon) ──────────────────────────────────────────────────
  'ISA|Nutmeg|shannon': { snaps: [
    { d: '2014-10-01', b: 8534 }, { d: '2016-04-01', b: 24180 }, { d: '2017-01-01', b: 27700 },
    { d: '2020-11-01', b: 20000 }, { d: '2021-07-01', b: 8500 }, { d: '2021-12-01', b: 9700 },
    { d: '2022-11-05', b: 8700 }, { d: '2022-12-30', b: 8700 }, { d: '2023-08-08', b: 9300 },
    { d: '2023-12-30', b: 9400 }, { d: '2024-06-18', b: 9400 }, { d: '2024-12-31', b: 11375 },
    { d: '2025-07-15', b: 11800 }, { d: '2025-12-31', b: 11800 },
  ]},
  // ── Aviso Wealth RRSP (Shannon, CAD) ─────────────────────────────────────
  'Aviso Wealth RRSP|Aviso|shannon': { cur: 'CAD', snaps: [
    { d: '2025-07-15', b: 1000, gb: 580 }, { d: '2025-12-31', b: 1000, gb: 580 },
  ]},
};

// ── New accounts to create (if they don't exist) ──────────────────────────────
const NEW_ACCOUNTS = [
  { name: 'Aviva Sapient',          type: 'pension',  provider: 'Aviva',    owner: 'shannon', active: false, cur: 'GBP',
    snaps: [{ d:'2014-10-01',b:8800},{d:'2016-04-01',b:8850},{d:'2017-01-01',b:12500},{d:'2020-11-01',b:12719},{d:'2021-02-17',b:14626}]},
  { name: 'SmartPension',           type: 'pension',  provider: null,       owner: 'shannon', active: false, cur: 'GBP',
    snaps: [{d:'2020-11-01',b:41278},{d:'2021-02-17',b:47725},{d:'2021-07-01',b:59832}]},
  { name: 'Nutmeg Ralf',            type: 'gia',      provider: 'Nutmeg',   owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2014-10-01',b:18657},{d:'2016-04-01',b:42140},{d:'2017-01-01',b:49500},{d:'2020-11-01',b:92000},{d:'2021-02-17',b:94400},{d:'2021-07-01',b:115500},{d:'2021-12-01',b:124300},{d:'2022-11-05',b:112600},{d:'2022-12-30',b:112871},{d:'2023-08-08',b:119000},{d:'2023-12-30',b:125000}]},
  { name: 'Morgan Stanley',         type: 'gia',      provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2020-11-01',b:11609},{d:'2021-07-01',b:16205},{d:'2021-12-01',b:18800},{d:'2022-11-05',b:29800},{d:'2022-12-30',b:27400},{d:'2023-08-08',b:23500},{d:'2023-12-30',b:26500}]},
  { name: 'Frankfurt Trust',        type: 'gia',      provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2014-10-01',b:4400},{d:'2016-04-01',b:4686.67}]},
  { name: 'Questrade',              type: 'gia',      provider: 'Questrade',owner: 'ralf',   active: false, cur: 'CAD',
    snaps: [{d:'2014-10-01',b:1800,gb:1044},{d:'2016-04-01',b:1633.02,gb:947},{d:'2017-01-01',b:2128.40,gb:1234}]},
  { name: 'Marcus Savings',         type: 'savings',  provider: 'Marcus',   owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2023-08-08',b:25000}]},
  { name: 'Qtrade',                 type: 'gia',      provider: 'Qtrade',   owner: 'shannon', active: true, cur: 'CAD',
    snaps: [{d:'2014-10-01',b:361.91,gb:210},{d:'2016-04-01',b:324.12,gb:188},{d:'2025-07-15',b:15000,gb:8700},{d:'2025-12-31',b:20000,gb:11600}]},
  { name: 'Barclays',              type: 'current',   provider: 'Barclays', owner: 'ralf',   active: true,  cur: 'GBP',
    snaps: [{d:'2020-11-01',b:3000},{d:'2021-07-01',b:9000},{d:'2021-12-01',b:5000},{d:'2022-11-05',b:20000},{d:'2022-12-30',b:20000},{d:'2023-08-08',b:13000},{d:'2023-12-30',b:1000},{d:'2024-06-18',b:2500},{d:'2024-12-31',b:18000},{d:'2025-07-15',b:5000},{d:'2025-12-31',b:5000}]},
  { name: 'Infosys Expenses',       type: 'other',    provider: 'Infosys',  owner: 'ralf',   active: true,  cur: 'GBP',
    snaps: [{d:'2022-11-05',b:8000},{d:'2022-12-30',b:8000},{d:'2023-08-08',b:8000},{d:'2023-12-30',b:4000},{d:'2024-06-18',b:4000},{d:'2024-12-31',b:4000},{d:'2025-07-15',b:4000},{d:'2025-12-31',b:1000}]},
  { name: 'Peugeot 3008',           type: 'other',    provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2016-04-01',b:5000},{d:'2017-01-01',b:5000},{d:'2020-11-01',b:4000}]},
  { name: 'Honda Civic',            type: 'other',    provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2014-10-01',b:3600},{d:'2016-04-01',b:3200},{d:'2017-01-01',b:3200}]},
  { name: 'Rental Deposit',         type: 'other',    provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2014-10-01',b:2300},{d:'2016-04-01',b:2300},{d:'2017-01-01',b:2300}]},
  { name: 'Business Accounts',      type: 'current',  provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2014-10-01',b:40000},{d:'2022-11-05',b:1500},{d:'2022-12-30',b:1500},{d:'2023-08-08',b:500},{d:'2023-12-30',b:500},{d:'2024-06-18',b:500}]},
  { name: 'First Direct',           type: 'current',  provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2023-08-08',b:2800},{d:'2023-12-30',b:500},{d:'2024-06-18',b:500},{d:'2024-12-31',b:500}]},
  { name: 'Natwest',                type: 'current',  provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2023-08-08',b:1000},{d:'2023-12-30',b:200},{d:'2024-06-18',b:200},{d:'2024-12-31',b:500}]},
  { name: 'Ulster Bank',            type: 'current',  provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2023-08-08',b:3000},{d:'2023-12-30',b:60},{d:'2024-06-18',b:60}]},
  { name: 'TSB',                    type: 'current',  provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2023-08-08',b:200}]},
  { name: 'Lloyds',                 type: 'current',  provider: null,       owner: 'ralf',   active: false, cur: 'GBP',
    snaps: [{d:'2023-08-08',b:5200}]},
];

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get('secret') !== SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient();
  const log: string[] = [];
  let snapCount = 0;
  let acctCreated = 0;
  const errors: string[] = [];

  // ── 1. Resolve family members ──────────────────────────────────────────────
  const { data: members, error: membersError } = await supabase.from('family_members').select('id, name');
  if (membersError) {
    return NextResponse.json({ error: 'DB error fetching family_members', detail: membersError.message }, { status: 500 });
  }
  if (!members || members.length === 0) {
    return NextResponse.json({ error: 'family_members table is empty or inaccessible' }, { status: 500 });
  }
  const ralf = members.find(m => m.name.toLowerCase() === 'ralf');
  const shannon = members.find(m => m.name.toLowerCase() === 'shannon');
  if (!ralf || !shannon) {
    return NextResponse.json({
      error: 'Could not find family members Ralf / Shannon in DB',
      found_names: members.map(m => m.name),
    }, { status: 500 });
  }
  log.push(`✓ Ralf: ${ralf.id}  Shannon: ${shannon.id}`);

  const memberIdFor = (owner: string) => owner === 'ralf' ? ralf.id : shannon.id;

  // ── 2. Helper: insert snapshots ────────────────────────────────────────────
  const insertSnaps = async (accountId: string, snaps: Snap[], cur: string, label: string) => {
    const dates = snaps.map(s => s.d);
    await supabase.from('balance_snapshots').delete()
      .eq('account_id', accountId).in('snapshot_date', dates);
    const rows = snaps.map(s => ({
      account_id: accountId,
      balance: s.b,
      currency: cur,
      gbp_balance: s.gb ?? s.b,
      fx_rate: s.gb ? parseFloat((s.gb / s.b).toFixed(6)) : 1.0,
      snapshot_date: s.d,
      notes: `XLS import: ${label}`,
    }));
    const { error } = await supabase.from('balance_snapshots').insert(rows);
    if (error) { errors.push(`${label}: ${error.message}`); }
    else { snapCount += rows.length; log.push(`  ↳ ${rows.length} snapshots for ${label}`); }
  };

  // ── 3. Process existing accounts ───────────────────────────────────────────
  for (const [key, { snaps, cur }] of Object.entries(DATA)) {
    const [name, provider, owner] = key.split('|');
    const memberId = memberIdFor(owner);

    let q = supabase.from('accounts').select('id').eq('name', name).eq('family_member_id', memberId);
    if (provider) q = q.eq('provider', provider);
    const { data: acctData, error: acctErr } = await q.limit(1).maybeSingle();

    if (acctErr || !acctData) {
      errors.push(`Account not found: "${name}" (provider: "${provider}", owner: ${owner})`);
      continue;
    }
    log.push(`✓ Found: ${name}${provider ? '/' + provider : ''}/${owner}`);
    await insertSnaps(acctData.id, snaps, cur ?? 'GBP', name);
  }

  // ── 4. Create new accounts + insert their snapshots ────────────────────────
  for (const acct of NEW_ACCOUNTS) {
    const memberId = memberIdFor(acct.owner);

    // Check if already exists
    let eq = supabase.from('accounts').select('id').eq('name', acct.name).eq('family_member_id', memberId);
    const { data: existing } = await eq.limit(1).maybeSingle();

    let accountId: string;
    if (existing) {
      accountId = existing.id;
      log.push(`↩ Already exists: ${acct.name}/${acct.owner}`);
    } else {
      const insert: Record<string, unknown> = {
        family_member_id: memberId,
        name: acct.name,
        account_type: acct.type,
        currency: acct.cur,
        is_active: acct.active,
        is_liability: false,
      };
      if (acct.provider) insert.provider = acct.provider;
      const { data: created, error: createErr } = await supabase
        .from('accounts').insert(insert).select('id').single();
      if (createErr || !created) {
        errors.push(`Create failed: ${acct.name} — ${createErr?.message}`);
        continue;
      }
      accountId = created.id;
      acctCreated++;
      log.push(`✚ Created: ${acct.name}/${acct.owner}`);
    }

    await insertSnaps(accountId, acct.snaps as Snap[], acct.cur, acct.name);
  }

  return NextResponse.json({
    ok: errors.length === 0,
    accounts_created: acctCreated,
    snapshots_inserted: snapCount,
    errors,
    log,
  }, { status: 200 });
}
