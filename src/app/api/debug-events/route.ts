import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET(req: Request) {
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    
    const events = await stripe.events.list({ limit: 5 });
    const parsedEvents = events.data.map(e => ({
      data: new Date(e.created * 1000).toLocaleString(),
      type: e.type,
      id: e.id
    }));

    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    const parsedWebhooks = webhooks.data.map(w => ({
      url: w.url,
      events: w.enabled_events,
      status: w.status,
      secret: w.secret ? w.secret.substring(0, 10) + '...' : null
    }));

    return NextResponse.json({ events: parsedEvents, webhooks: parsedWebhooks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
