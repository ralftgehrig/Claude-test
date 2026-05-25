import { NextResponse } from 'next/server';

// Server-side proxy so the browser doesn't depend on reaching frankfurter.app directly.
// Cached for 1 hour at the CDN edge.
export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=GBP&to=USD,EUR,CAD,SGD',
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) throw new Error(`frankfurter: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data.rates ?? {});
  } catch (e) {
    // Return empty so the UI falls back to GBP values rather than crashing
    console.error('FX rate fetch failed:', e);
    return NextResponse.json({});
  }
}
