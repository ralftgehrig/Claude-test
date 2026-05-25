import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchLiveRates, convertToGBP } from '@/lib/currency';
import type { Currency } from '@/lib/types';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const body = await req.json();

  let gbp_balance = body.balance;
  let fx_rate = 1.0;

  if (body.currency && body.currency !== 'GBP') {
    try {
      const rates = await fetchLiveRates('GBP');
      fx_rate = rates[body.currency as Currency] ?? 1;
      gbp_balance = convertToGBP(body.balance, body.currency, rates);
    } catch {
      if (body.fx_rate) {
        fx_rate = body.fx_rate;
        gbp_balance = body.balance / body.fx_rate;
      }
    }
  }

  const { data, error } = await supabase
    .from('balance_snapshots')
    .update({ ...body, gbp_balance, fx_rate })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { error } = await supabase.from('balance_snapshots').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
