import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';
import { adminAuth } from '@/lib/admin-auth';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new NextResponse('Unauthorized', { status: 401 });

    const decodedToken = await adminAuth.verifyIdToken(authHeader.split('Bearer ')[1]);
    const userSnap = await rtdb.ref(`users/${decodedToken.uid}`).get();
    const userData = userSnap.val();

    if (userData?.role !== 'developer') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const configSnap = await rtdb.ref('stripe_config/keys').get();
    return NextResponse.json(configSnap.val() || {});
  } catch (error) {
    return new NextResponse('Internal Error', { status: 500 });
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
