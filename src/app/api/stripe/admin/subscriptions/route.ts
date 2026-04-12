import { NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'all';
    const mode = (searchParams.get('mode') || undefined) as 'live' | 'test' | undefined;
    const stripe = await getStripeInstance(mode);

    // Stripe allows max 4 expand levels — 'data.items.data.price.product' has 5, so we expand
    // only up to price and fetch product names separately in a batch.
    const params: any = { limit: 100, expand: ['data.customer', 'data.items.data.price'] };
    if (status !== 'all') params.status = status;

    const subscriptions = await stripe.subscriptions.list(params);

    // Collect unique product IDs to fetch in one batch
    const productIds = new Set<string>();
    for (const sub of subscriptions.data) {
      const productId = sub.items.data[0]?.price?.product;
      if (typeof productId === 'string') productIds.add(productId);
    }

    // Fetch product names (one call per unique product — typically just 1)
    const productMap: Record<string, string> = {};
    await Promise.all(Array.from(productIds).map(async (pid) => {
      try {
        const p = await stripe.products.retrieve(pid);
        productMap[pid] = p.name;
      } catch { /* ignore, fallback to ID */ }
    }));

    const data = subscriptions.data.map(sub => {
      const customer = sub.customer as any;
      const item = sub.items.data[0];
      const price = item?.price as any;
      const productId = typeof price?.product === 'string' ? price.product : (price?.product as any)?.id;

      return {
        id: sub.id,
        status: sub.status,
        created: sub.created,
        current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end,
        cancel_at: (sub as any).cancel_at ?? null,
        canceled_at: (sub as any).canceled_at ?? null,
        ended_at: (sub as any).ended_at ?? null,
        trial_start: (sub as any).trial_start ?? null,
        trial_end: (sub as any).trial_end ?? null,
        billing_cycle_anchor: sub.billing_cycle_anchor,
        collection_method: sub.collection_method,
        latest_invoice: typeof sub.latest_invoice === 'string' ? sub.latest_invoice : (sub.latest_invoice as any)?.id ?? null,
        customer: {
          id: customer?.id,
          email: customer?.email || null,
          name: customer?.name || null,
          phone: customer?.phone || null,
        },
        product: {
          id: productId,
          name: productMap[productId] || 'Assinatura',
        },
        price: {
          id: price?.id,
          amount: price?.unit_amount,
          currency: price?.currency,
          interval: price?.recurring?.interval,
          interval_count: price?.recurring?.interval_count ?? 1,
        },
      };
    });

    const active = data.filter(s => s.status === 'active');
    const mrr = active.reduce((sum, s) => {
      const amount = s.price.amount || 0;
      const interval = s.price.interval;
      return sum + (interval === 'year' ? Math.round(amount / 12) : amount);
    }, 0);

    return NextResponse.json({ subscriptions: data, mrr, activeCount: active.length });
  } catch (error: any) {
    console.error('[stripe/admin/subscriptions] GET error:', error?.message, error?.type, error?.code);
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    await verifyAdminRequest(req);
    const stripe = await getStripeInstance();
    const { subscriptionId, action } = await req.json();

    if (!subscriptionId || !action) {
      return NextResponse.json({ error: 'subscriptionId and action are required' }, { status: 400 });
    }

    let result;
    if (action === 'cancel') {
      result = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    } else if (action === 'reactivate') {
      result = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: false });
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ subscription: result });
  } catch (error: any) {
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    await verifyAdminRequest(req);
    const { searchParams } = new URL(req.url);
    const subscriptionId = searchParams.get('subscriptionId');
    const mode = (searchParams.get('mode') || undefined) as 'live' | 'test' | undefined;
    
    if (!subscriptionId) {
      return NextResponse.json({ error: 'subscriptionId is required' }, { status: 400 });
    }

    const stripe = await getStripeInstance(mode);
    
    // Cancela e exclui a assinatura imediatamente
    const deletedSubscription = await stripe.subscriptions.cancel(subscriptionId);
    
    return NextResponse.json({ success: true, subscription: deletedSubscription });
  } catch (error: any) {
    console.error('[stripe/admin/subscriptions] DELETE error:', error?.message);
    const status = error.status ?? 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
