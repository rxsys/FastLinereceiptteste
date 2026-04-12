
import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance, getStripeConfig } from '@/lib/stripe';
import { rtdb } from '@/lib/firebase';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  let stripe: Stripe;
  const now = new Date().toISOString();

  console.log('[StripeWebhook] Received request');

  try {
    const config = await getStripeConfig();
    const stripeInstance = await getStripeInstance();
    stripe = stripeInstance;

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const endpointSecret = config?.mode === 'live' ? config.liveWebhookSecret : config?.testWebhookSecret;

    console.log(`[StripeWebhook] Mode: ${config?.mode}, Secret configured: ${!!endpointSecret}`);

    if (!sig) return new NextResponse('Missing stripe-signature', { status: 400 });
    if (!endpointSecret) {
      console.error('[StripeWebhook] Webhook secret not found in config');
      return new NextResponse('Webhook secret not configured', { status: 500 });
    }

    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    console.log(`[StripeWebhook] Event constructed: ${event.type} (${event.id})`);
  } catch (err: any) {
    console.error(`[StripeWebhook] Construction Error: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Deduplicação
  try {
    const dedupRef = rtdb.ref(`webhook_events/${event.id}`);
    const snap = await dedupRef.get();
    if (snap.exists()) {
      console.log(`[StripeWebhook] Duplicate event ignored: ${event.id}`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    await dedupRef.set({ type: event.type, receivedAt: now });
  } catch (err: any) {
    console.error(`[StripeWebhook] Dedup failed: ${err.message}`);
    // Continuamos mesmo se o dedup falhar para não perder a venda
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { ownerId, userId, moduleId = 'receipt' } = session.metadata || {};
        
        console.log(`[StripeWebhook] Checkout Meta: user=${userId}, owner=${ownerId}, module=${moduleId}`);

        if (!ownerId || !userId) {
          console.error('[StripeWebhook] Missing critical metadata: userId or ownerId');
          break;
        }

        // 1. Obter dados atuais
        const [userSnap, ownerSnap] = await Promise.all([
          rtdb.ref(`users/${userId}`).get(),
          rtdb.ref(`owner/${ownerId}`).get(),
        ]);

        const userData = userSnap.val() || {};
        const ownerData = ownerSnap.val() || {};
        const companyName = userData.displayName || userData.companyName || ownerData.companyName || ownerData.name || 'Nova Empresa';

        console.log(`[StripeWebhook] Processing for ${companyName}`);

        // 2. Determinar validade
        let validUntil: string | null = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            validUntil = new Date(sub.current_period_end * 1000).toISOString();
            console.log(`[StripeWebhook] Subscription valid until: ${validUntil}`);
          } catch (e) {
            console.error('[StripeWebhook] Error retrieving sub details:', e);
          }
        }

        // 3. Atualizar/Criar Owner
        const ownerUpdates: any = {
          stripeCustomerId: session.customer,
          subscriptionStatus: 'active',
          companyName,
          name: companyName,
          updatedAt: now,
          lastPaymentFailedAt: null,
          graceUntil: null,
        };
        if (validUntil) ownerUpdates.validUntil = validUntil;

        await rtdb.ref(`owner/${ownerId}`).update(ownerUpdates);
        await rtdb.ref(`owner/${ownerId}/subscriptions/${moduleId}`).set({
          status: 'active',
          id: session.subscription || 'manual',
          updatedAt: now,
        });
        console.log(`[StripeWebhook] Owner ${ownerId} updated`);

        // 4. Transformar User em Manager
        await rtdb.ref(`users/${userId}`).update({
          status: 'active',
          role: userData.role === 'developer' ? 'developer' : 'manager',
          ownerId,
          updatedAt: now,
        });
        console.log(`[StripeWebhook] User ${userId} upgraded to manager`);

        // 5. Vincular LINE API Pool (Se não tiver uma)
        try {
          const poolAssignedSnap = await rtdb.ref('line_api_pool').orderByChild('ownerId').equalTo(ownerId).limitToFirst(1).get();
          if (!poolAssignedSnap.exists()) {
            console.log('[StripeWebhook] Searching for available LINE API pool...');
            const availableSnap = await rtdb.ref('line_api_pool').orderByChild('status').equalTo('available').limitToFirst(1).get();
            if (availableSnap.exists()) {
              const pools = availableSnap.val();
              const poolId = Object.keys(pools)[0];
              await rtdb.ref(`line_api_pool/${poolId}`).update({
                status: 'used',
                ownerId,
                ownerName: companyName,
                assignedAt: now,
              });
              console.log(`[StripeWebhook] LINE pool ${poolId} assigned to ${ownerId}`);
            } else {
              console.warn('[StripeWebhook] No available LINE API pools found');
            }
          } else {
            console.log('[StripeWebhook] Owner already has a LINE API pool assigned');
          }
        } catch (poolErr) {
          console.error('[StripeWebhook] Error assigning LINE pool:', poolErr);
        }

        console.log(`[StripeWebhook] Full checkout processing completed for ${ownerId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const { ownerId, moduleId = 'receipt' } = sub.metadata || {};
        if (!ownerId) break;

        const validUntil = new Date(sub.current_period_end * 1000).toISOString();
        const status = sub.status;
        let internalStatus = 'expired';

        if (status === 'active' || status === 'trialing') internalStatus = 'active';
        else if (status === 'past_due') internalStatus = 'grace';

        const updates: any = { subscriptionStatus: internalStatus, updatedAt: now, validUntil };
        if (internalStatus === 'active') {
          updates.graceUntil = null;
          updates.lastPaymentFailedAt = null;
        } else if (internalStatus === 'grace') {
          updates.graceUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        }

        await rtdb.ref(`owner/${ownerId}`).update(updates);
        await rtdb.ref(`owner/${ownerId}/subscriptions/${moduleId}`).update({ status: internalStatus, updatedAt: now });
        console.log(`[StripeWebhook] Sub updated for ${ownerId}: ${status} -> ${internalStatus}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const { ownerId, moduleId = 'receipt' } = sub.metadata || {};
        if (!ownerId) break;

        await rtdb.ref(`owner/${ownerId}`).update({
          subscriptionStatus: 'expired',
          updatedAt: now,
          graceUntil: null
        });
        await rtdb.ref(`owner/${ownerId}/subscriptions/${moduleId}`).update({ status: 'expired', updatedAt: now });
        console.log(`[StripeWebhook] Sub deleted for ${ownerId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id;
        if (!customerId) break;

        const ownerSnap = await rtdb.ref('owner').orderByChild('stripeCustomerId').equalTo(customerId).limitToFirst(1).get();
        if (ownerSnap.exists()) {
          const ownerId = Object.keys(ownerSnap.val())[0];
          await rtdb.ref(`owner/${ownerId}`).update({
            subscriptionStatus: 'grace',
            graceUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            lastPaymentFailedAt: now,
            updatedAt: now
          });
          console.log(`[StripeWebhook] Payment failed for owner ${ownerId}`);
        }
        break;
      }

      default:
        console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`[StripeWebhook] Processing Error (${event!.type}): ${err.message}`);
    return new NextResponse('Internal Webhook Processing Error', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
