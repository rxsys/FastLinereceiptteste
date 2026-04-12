import { NextResponse } from 'next/server';
import { getStripeInstance, getStripeConfig } from '@/lib/stripe';

export async function POST(req: Request) {
  try {
    const [stripe, config] = await Promise.all([getStripeInstance(), getStripeConfig()]);
    const { userId, ownerId, email, priceId: clientPriceId, moduleId } = await req.json();

    if (!userId || !ownerId) {
      return NextResponse.json({ error: 'User ID and Owner ID are required' }, { status: 400 });
    }

    const publishableKey = config?.mode === 'live'
      ? config.livePublishableKey
      : config?.testPublishableKey;

    if (!publishableKey) {
      return NextResponse.json({ error: 'Stripe publishable key not found.' }, { status: 500 });
    }

    // Use module-specific price from config; fall back to generic or client-supplied
    const modulePriceMap: Record<string, string> = {
      receipt: config?.receiptPriceId,
      member: config?.memberPriceId,
      mypage: config?.mypagePriceId,
    };
    const configPriceId = modulePriceMap[moduleId] || (config?.mode === 'live' ? config?.livePriceId : config?.testPriceId);
    const priceId = configPriceId || clientPriceId;

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID not configured' }, { status: 500 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        metadata: {
          ownerId,
          moduleId: moduleId || 'basic'
        }
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/cost?checkout=success&module=${moduleId || ''}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cost?checkout=cancel`,
      locale: 'ja',
      customer_email: email,
      client_reference_id: userId,
      metadata: {
        userId,
        ownerId,
        moduleId: moduleId || 'basic',
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url, publishableKey });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
