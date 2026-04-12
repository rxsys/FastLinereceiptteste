import { NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';

// Returns only public-safe Stripe data (price IDs, mode) — no secret keys
export async function GET() {
  try {
    const snap = await rtdb.ref('stripe_config/keys').get();
    if (!snap.exists()) return NextResponse.json({});

    const data = snap.val();
    // Only expose non-secret fields
    const { mode, testPriceId, livePriceId, receiptPriceId, memberPriceId, mypagePriceId } = data;

    return NextResponse.json(
      { mode, testPriceId, livePriceId, receiptPriceId, memberPriceId, mypagePriceId },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
