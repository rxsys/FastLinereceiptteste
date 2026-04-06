import { NextResponse } from 'next/server';
import { invalidateStripeConfigCache } from '@/lib/stripe';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function POST(req: Request) {
  try {
    await verifyAdminRequest(req);
    invalidateStripeConfigCache();
    return NextResponse.json({ ok: true, message: 'Stripe config cache invalidated.' });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
