import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  const supabase = createClient();
  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get('source_id');

  let query = supabase.from('income_payments').select('*').order('payment_date', { ascending: false });
  if (sourceId) query = query.eq('income_source_id', sourceId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const body = await req.json();
  const { data, error } = await supabase.from('income_payments').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: Request) {
  const supabase = createClient();
  const { id } = await req.json();
  const { error } = await supabase.from('income_payments').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
