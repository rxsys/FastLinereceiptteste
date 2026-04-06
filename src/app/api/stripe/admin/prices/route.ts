import { NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const stripe = await getStripeInstance();
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    const params: any = { limit: 100, active: true };
    if (productId) params.product = productId;

    const prices = await stripe.prices.list(params);
    return NextResponse.json({ prices: prices.data });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await verifyAdminRequest(req);
    const stripe = await getStripeInstance();
    const { productId, amount, currency = 'jpy', interval = 'month', interval_count = 1 } = await req.json();

    if (!productId || !amount) {
      return NextResponse.json({ error: 'productId and amount are required' }, { status: 400 });
    }

    const price = await stripe.prices.create({
      product: productId,
      unit_amount: Number(amount),
      currency,
      recurring: { interval, interval_count: Number(interval_count) },
    });

    return NextResponse.json({ price });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await verifyAdminRequest(req);
    const stripe = await getStripeInstance();
    const { priceId, active } = await req.json();

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
    }

    const price = await stripe.prices.update(priceId, { active });
    return NextResponse.json({ price });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
