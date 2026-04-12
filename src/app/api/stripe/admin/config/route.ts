import { NextRequest, NextResponse } from 'next/server';
import { rtdb, auth } from '@/lib/firebase';
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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new NextResponse('Unauthorized', { status: 401 });

    const decodedToken = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    const userSnap = await rtdb.ref(`users/${decodedToken.uid}`).get();
    const userData = userSnap.val();

    if (userData?.role !== 'developer') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const body = await req.json();
    await rtdb.ref('stripe_config/keys').update({
      ...body,
      updatedAt: new Date().toISOString()
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
  }
}
