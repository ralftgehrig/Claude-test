import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('income_sources')
    .select(`
      *,
      family_member:family_members(*),
      vesting_events(*)
    `)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const body = await req.json();
  const { vesting_events, ...incomeData } = body;

  const { data: income, error } = await supabase
    .from('income_sources')
    .insert(incomeData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert vesting events if provided
  if (vesting_events?.length) {
    const events = vesting_events.map((e: Record<string, unknown>) => ({
      ...e,
      income_source_id: income.id,
    }));
    await supabase.from('vesting_events').insert(events);
  }

  return NextResponse.json(income, { status: 201 });
}
