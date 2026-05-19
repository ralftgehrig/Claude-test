import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildNetWorthTimeSeries } from '@/lib/calculations/net-worth';
import type { Account, BalanceSnapshot } from '@/lib/types';

export async function GET() {
  const supabase = createClient();

  const [{ data: accounts }, { data: snapshots }] = await Promise.all([
    supabase.from('accounts').select('*'),
    supabase.from('balance_snapshots').select('*').order('snapshot_date'),
  ]);

  if (!accounts || !snapshots) {
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }

  const series = buildNetWorthTimeSeries(accounts as Account[], snapshots as BalanceSnapshot[]);
  return NextResponse.json(series);
}
