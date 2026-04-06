import { NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe';

export async function GET(
  req: Request,
  { params }: { params: { priceId: string } }
) {
  try {
    const { priceId } = params;

    if (!priceId || priceId === 'undefined') {
      return NextResponse.json({ error: 'Price ID is required' }, { status: 400 });
    }

    const stripe = await getStripeInstance();
    const price = await stripe.prices.retrieve(priceId, {
      expand: ['product'],
    });

    const amount = price.unit_amount || 0;
    const currency = price.currency.toUpperCase();

    const formatter = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    });

    return NextResponse.json({
      priceId: price.id,
      amount: amount,
      currency: currency,
      formattedPrice: formatter.format(amount),
      productName: (price.product as any).name,
      interval: price.recurring?.interval || 'month'
    });
  } catch (error: any) {
    console.error('Error fetching price from Stripe:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
