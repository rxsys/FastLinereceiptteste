import { NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') || undefined) as 'live' | 'test' | undefined;
    const stripe = await getStripeInstance(mode);
    const products = await stripe.products.list({ limit: 100 });
    const prices = await stripe.prices.list({ limit: 100 });

    const data = products.data.map(product => ({
      id: product.id,
      name: product.name,
      description: product.description,
      active: product.active,
      created: product.created,
      metadata: product.metadata,
      prices: prices.data
        .filter(p => p.product === product.id)
        .map(p => ({
          id: p.id,
          amount: p.unit_amount,
          currency: p.currency,
          interval: p.recurring?.interval,
          interval_count: p.recurring?.interval_count,
          active: p.active,
        })),
    }));

    return NextResponse.json({ products: data });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    await verifyAdminRequest(req);
    const stripe = await getStripeInstance();
    const { name, description, amount, currency = 'jpy', interval = 'month' } = await req.json();

    if (!name || !amount) {
      return NextResponse.json({ error: 'name and amount are required' }, { status: 400 });
    }

    const product = await stripe.products.create({ name, description: description || '' });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Number(amount),
      currency,
      recurring: { interval },
    });

    return NextResponse.json({ product, price });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await verifyAdminRequest(req);
    const stripe = await getStripeInstance();
    const { productId, name, description, active } = await req.json();

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const updated: any = {};
    if (name !== undefined) updated.name = name;
    if (description !== undefined) updated.description = description;
    if (active !== undefined) updated.active = active;

    const product = await stripe.products.update(productId, updated);
    return NextResponse.json({ product });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
