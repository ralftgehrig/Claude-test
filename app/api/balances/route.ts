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

  // Fetch live rates and compute GBP equivalent if not GBP
  let gbp_balance = body.balance;
  let fx_rate = 1.0;

  if (body.currency !== 'GBP') {
    try {
      const rates = await fetchLiveRates('GBP');
      fx_rate = rates[body.currency as Currency] ?? 1;
      gbp_balance = convertToGBP(body.balance, body.currency, rates);
    } catch {
      // Fall back to manual rate if provided
      if (body.fx_rate) {
        fx_rate = body.fx_rate;
        gbp_balance = body.balance / body.fx_rate;
      }
    }
  }

  const { data, error } = await supabase
    .from('balance_snapshots')
    .insert({ ...body, gbp_balance, fx_rate })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Also record as a contribution if flagged
  if (body.contribution_amount !== undefined) {
    const contribGBP = body.contribution_amount / fx_rate;
    await supabase.from('contributions').insert({
      account_id: body.account_id,
      contribution_date: body.snapshot_date,
      amount: body.contribution_amount,
      currency: body.currency,
      gbp_amount: contribGBP,
      notes: body.notes,
    });
  }

  return NextResponse.json(data, { status: 201 });
}
