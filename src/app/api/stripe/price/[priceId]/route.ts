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
    console.error(`[Stripe Price GET] Error for ID ${params.priceId}:`, {
      message: error.message,
      type: error.type,
      statusCode: error.statusCode,
      code: error.code
    });
    return NextResponse.json({ 
      error: error.message,
      type: error.type,
      code: error.code
    }, { status: error.statusCode || 500 });
  }
}
