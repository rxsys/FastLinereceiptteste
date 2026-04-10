import { NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe';
import { db } from '@/lib/firebase';

export async function POST(req: Request) {
  try {
    const stripe = await getStripeInstance();
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userDoc = await db.collection('users').doc(userId).get();
    const customerId = userDoc.data()?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/cost`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
