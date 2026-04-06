import { NextResponse } from 'next/server';
import { getStripeInstance, getStripeConfig } from '@/lib/stripe';

export async function GET() {
  try {
    const [stripe, config] = await Promise.all([getStripeInstance(), getStripeConfig()]);

    const priceId = config?.mode === 'live' ? config?.livePriceId : config?.testPriceId;
    if (!priceId) {
      return NextResponse.json({ error: 'Price ID not configured' }, { status: 500 });
    }

    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });

    const amount = price.unit_amount || 0;
    const formatter = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });

    return NextResponse.json({
      priceId: price.id,
      amount,
      currency: price.currency.toUpperCase(),
      formattedPrice: formatter.format(amount),
      productName: (price.product as any).name,
      interval: price.recurring?.interval || 'month',
    });
  } catch (error: any) {
    console.error('Error fetching current price:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
