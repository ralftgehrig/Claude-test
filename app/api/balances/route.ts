import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchLiveRates, convertToGBP } from '@/lib/currency';
import type { Currency } from '@/lib/types';

export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get('account_id');

  let query = supabase
    .from('balance_snapshots')
    .select('*')
    .order('snapshot_date', { ascending: false });

  if (accountId) query = query.eq('account_id', accountId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const body = await req.json();
  const { contribution_amount, ...snapshotBody } = body;

  let gbp_balance = snapshotBody.balance;
  let fx_rate = 1.0;

  if (snapshotBody.currency !== 'GBP') {
    try {
      const rates = await fetchLiveRates('GBP');
      fx_rate = rates[snapshotBody.currency as Currency] ?? 1;
      gbp_balance = convertToGBP(snapshotBody.balance, snapshotBody.currency, rates);
    } catch {
      if (snapshotBody.fx_rate) {
        fx_rate = snapshotBody.fx_rate;
        gbp_balance = snapshotBody.balance / snapshotBody.fx_rate;
      }
    }
  }

  const { data, error } = await supabase
    .from('balance_snapshots')
    .insert({ ...snapshotBody, gbp_balance, fx_rate })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (contribution_amount !== undefined && contribution_amount !== null && contribution_amount !== 0) {
    const contribGBP = contribution_amount / fx_rate;
    await supabase.from('contributions').insert({
      account_id: snapshotBody.account_id,
      contribution_date: snapshotBody.snapshot_date,
      amount: contribution_amount,
      currency: snapshotBody.currency,
      gbp_amount: contribGBP,
      notes: snapshotBody.notes,
    });
  }

  return NextResponse.json(data, { status: 201 });
}
