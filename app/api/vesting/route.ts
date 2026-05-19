import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const upcoming = searchParams.get('upcoming');

  let query = supabase
    .from('vesting_events')
    .select(`*, income_source:income_sources(*, family_member:family_members(*))`)
    .order('vest_date');

  if (upcoming === 'true') {
    query = query.gte('vest_date', new Date().toISOString().split('T')[0]).eq('is_vested', false);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const supabase = createClient();
  const { id, ...body } = await req.json();

  const { data, error } = await supabase
    .from('vesting_events')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
