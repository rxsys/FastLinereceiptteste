import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    await verifyAdminRequest(req);

    const configSnap = await rtdb.ref('stripe_config/keys').get();
    return NextResponse.json(configSnap.val() || {});
  } catch (error: any) {
    console.error('[Stripe Config GET] Error:', error);
    return new NextResponse(error.message || 'Internal Error', { status: error.status || 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await verifyAdminRequest(req);

    const body = await req.json();
    await rtdb.ref('stripe_config/keys').update({
      ...body,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    console.error('[Stripe Config POST] Error:', error);
    return new NextResponse(error.message || 'Internal Error', { status: error.status || 500 });
  }
}
