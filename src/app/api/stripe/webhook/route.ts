
import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance, getStripeConfig } from '@/lib/stripe';
import { rtdb } from '@/lib/firebase';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  let stripe: Stripe;

  try {
    const [s, config] = await Promise.all([getStripeInstance(), getStripeConfig()]);
    stripe = s;

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const endpointSecret = config?.mode === 'live' ? config.liveWebhookSecret : config?.testWebhookSecret;

    if (!sig) return new NextResponse('Missing stripe-signature', { status: 400 });
    if (!endpointSecret) return new NextResponse('Webhook secret not configured', { status: 500 });

    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`[StripeWebhook] ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Deduplicação
  const dedupRef = rtdb.ref(`webhook_events/${event.id}`);
  try {
    const snap = await dedupRef.get();
    if (snap.exists()) return NextResponse.json({ received: true, duplicate: true });
    await dedupRef.set({ type: event.type, receivedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error(`[StripeWebhook] Dedup failed: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { ownerId, userId, moduleId = 'receipt' } = session.metadata || {};
        if (!ownerId) { console.error('[StripeWebhook] missing ownerId'); break; }

        const now = new Date().toISOString();

        // Fetch existing data
        const [userSnap, ownerSnap] = await Promise.all([
          userId ? rtdb.ref(`users/${userId}`).get() : Promise.resolve(null),
          rtdb.ref(`owner/${ownerId}`).get(),
        ]);
        const userData = userSnap?.val() || {};
        const ownerData = ownerSnap?.val() || {};
        const companyName = userData.displayName || userData.companyName || ownerData.companyName || ownerData.name || 'Unknown';

        // Subscription period
        let validUntil: string | null = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            validUntil = new Date(sub.current_period_end * 1000).toISOString();
          } catch { /* ignore */ }
        }

        // Create/update owner
        await rtdb.ref(`owner/${ownerId}`).update({
          stripeCustomerId: session.customer,
          subscriptionStatus: 'active',
          companyName,
          name: companyName,
          ...(validUntil && { validUntil }),
          graceUntil: null,
          lastPaymentFailedAt: null,
          updatedAt: now,
        });
        await rtdb.ref(`owner/${ownerId}/subscriptions/${moduleId}`).set({
          status: 'active',
          id: session.subscription,
          updatedAt: now,
        });

        // Update user: role=manager, status=active, ownerId
        if (userId) {
          await rtdb.ref(`users/${userId}`).update({
            status: 'active',
            role: userData.role === 'developer' ? 'developer' : 'manager',
            ownerId,
            updatedAt: now,
          });
        }

        // Link LINE API pool
        const poolSnap = await rtdb.ref('line_api_pool').orderByChild('ownerId').equalTo(ownerId).limitToFirst(1).get();
        if (!poolSnap.exists()) {
          const availableSnap = await rtdb.ref('line_api_pool').orderByChild('status').equalTo('available').limitToFirst(1).get();
          if (availableSnap.exists()) {
            const [poolId, poolData] = Object.entries(availableSnap.val())[0] as [string, any];
            await rtdb.ref(`line_api_pool/${poolId}`).update({
              status: 'used', ownerId, ownerName: companyName, assignedAt: now,
            });
            console.log(`[StripeWebhook] LINE pool assigned: ${poolId} → ${ownerId}`);
          }
        }

        console.log(`[StripeWebhook] Checkout OK: owner=${ownerId} module=${moduleId} user=${userId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const { ownerId, moduleId = 'receipt' } = sub.metadata || {};
        if (!ownerId) break;

        const validUntil = new Date(sub.current_period_end * 1000).toISOString();
        const now = new Date().toISOString();
        let internalStatus: string;
        const extra: Record<string, any> = { validUntil };

        if (sub.status === 'active' || sub.status === 'trialing') {
          internalStatus = 'active';
          extra.graceUntil = null;
          extra.lastPaymentFailedAt = null;
        } else if (sub.status === 'past_due') {
          internalStatus = 'grace';
          extra.graceUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          internalStatus = 'expired';
          extra.graceUntil = null;
        }

        await rtdb.ref(`owner/${ownerId}`).update({ subscriptionStatus: internalStatus, updatedAt: now, ...extra });
        await rtdb.ref(`owner/${ownerId}/subscriptions/${moduleId}`).update({ status: internalStatus, updatedAt: now });

        console.log(`[StripeWebhook] Sub updated: owner=${ownerId} ${sub.status}→${internalStatus}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const { ownerId, moduleId = 'receipt' } = sub.metadata || {};
        if (!ownerId) break;

        const now = new Date().toISOString();
        await rtdb.ref(`owner/${ownerId}`).update({
          subscriptionStatus: 'expired',
          validUntil: new Date(sub.current_period_end * 1000).toISOString(),
          graceUntil: null,
          updatedAt: now,
        });
        await rtdb.ref(`owner/${ownerId}/subscriptions/${moduleId}`).update({ status: 'expired', updatedAt: now });

        console.log(`[StripeWebhook] Sub deleted: owner=${ownerId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id;
        if (!customerId) break;

        // Find owner by stripeCustomerId
        const allOwners = await rtdb.ref('owner').orderByChild('stripeCustomerId').equalTo(customerId).limitToFirst(1).get();
        if (!allOwners.exists()) {
          console.warn(`[StripeWebhook] payment_failed: owner not found for customer=${customerId}`);
          break;
        }

        const [failedOwnerId] = Object.keys(allOwners.val());
        const now = new Date().toISOString();
        await rtdb.ref(`owner/${failedOwnerId}`).update({
          subscriptionStatus: 'grace',
          graceUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          lastPaymentFailedAt: now,
          updatedAt: now,
        });

        console.log(`[StripeWebhook] Payment failed: owner=${failedOwnerId}`);
        break;
      }

      default:
        console.log(`[StripeWebhook] Unhandled: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`[StripeWebhook] Error ${event.id}: ${err.message}`);
    return new NextResponse('Webhook processing error', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
