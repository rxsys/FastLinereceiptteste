
import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance, getStripeConfig } from '@/lib/stripe';
import { db } from '@/lib/firebase';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  let event: Stripe.Event;

  try {
    const [stripe, config] = await Promise.all([
      getStripeInstance(),
      getStripeConfig(),
    ]);

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const endpointSecret = config?.mode === 'live' 
      ? config.liveWebhookSecret 
      : config?.testWebhookSecret;

    if (!sig) {
      return new NextResponse('Webhook Error: stripe-signature header missing', { status: 400 });
    }
    if (!endpointSecret) {
        console.error('[StripeWebhook] Webhook secret is not configured in Firestore!');
        return new NextResponse('Webhook Error: server misconfiguration', { status: 500 });
    }

    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);

  } catch (err: any) {
    console.error(`[StripeWebhook] Event construction failed: ${err.message}`);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Deduplicação de eventos
  const eventRef = db.collection('webhook_events').doc(event.id);
  try {
    const doc = await eventRef.get();
    if (doc.exists) {
      console.log(`[StripeWebhook] Duplicate event ignored: ${event.id}`);
      return NextResponse.json({ received: true, duplicate: true });
    }
    await eventRef.set({ type: event.type, receivedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error(`[StripeWebhook] Deduplication check failed: ${err.message}`);
  }

  // Tratamento de eventos
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { ownerId, userId, moduleId = 'receipt' } = session.metadata || {};

        if (!ownerId) {
          console.error('[StripeWebhook] checkout.session.completed missing ownerId');
          break;
        }

        const now = new Date().toISOString();

        // 1. Fetch user/owner data to get companyName
        const [userSnap, ownerSnap] = await Promise.all([
          userId ? db.collection('users').doc(userId).get() : Promise.resolve(null),
          db.collection('owner').doc(ownerId).get(),
        ]);
        const companyName =
          userSnap?.data()?.companyName ||
          ownerSnap?.data()?.companyName ||
          ownerSnap?.data()?.name ||
          'Unknown';

        // 2. Update owner: subscription active + validUntil from subscription period end
        let validUntil: string | null = null;
        if (session.subscription) {
          try {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            validUntil = new Date(sub.current_period_end * 1000).toISOString();
          } catch (e) {
            console.warn('[StripeWebhook] Could not retrieve subscription for validUntil');
          }
        }

        await db.collection('owner').doc(ownerId).set({
          stripeCustomerId: session.customer,
          subscriptionStatus: 'active',
          companyName,
          name: companyName,
          ...(validUntil && { validUntil }),
          graceUntil: null,
          lastPaymentFailedAt: null,
          updatedAt: now,
        }, { merge: true });
        await db.collection('owner').doc(ownerId).update({
          [`subscriptions.${moduleId}`]: {
            status: 'active',
            id: session.subscription,
            updatedAt: now,
          },
        });

        // 3. Update user: role=manager, status=active, ownerId (so user management query works)
        if (userId) {
          await db.collection('users').doc(userId).set({
            status: 'active',
            role: 'manager',
            ownerId: ownerId,
            updatedAt: now,
          }, { merge: true });
        }

        // 4. Link an available line_api_pool key (skip if already linked)
        const alreadyLinked = await db.collection('line_api_pool')
          .where('ownerId', '==', ownerId)
          .limit(1)
          .get();

        if (alreadyLinked.empty) {
          const availablePool = await db.collection('line_api_pool')
            .where('status', '==', 'available')
            .limit(1)
            .get();

          if (!availablePool.empty) {
            const poolDoc = availablePool.docs[0];
            await poolDoc.ref.update({
              status: 'used',
              ownerId,
              ownerName: companyName,
              assignedAt: now,
            });
            console.log(`[StripeWebhook] LINE API pool key assigned: pool=${poolDoc.id} owner=${ownerId}`);
          } else {
            console.warn(`[StripeWebhook] No available LINE API pool keys for owner=${ownerId}`);
          }
        } else {
          console.log(`[StripeWebhook] LINE API pool key already linked for owner=${ownerId}`);
        }

        console.log(`[StripeWebhook] Checkout completed: owner=${ownerId} module=${moduleId} user=${userId} company=${companyName}`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const { ownerId, moduleId = 'receipt' } = sub.metadata || {};
        if (!ownerId) break;

        const status = sub.status;
        const periodEnd = sub.current_period_end;
        const validUntil = new Date(periodEnd * 1000).toISOString();
        const now = new Date().toISOString();

        let internalStatus: string;
        let extraFields: Record<string, any> = { validUntil };

        if (status === 'active' || status === 'trialing') {
          internalStatus = 'active';
          extraFields.graceUntil = null;
          extraFields.lastPaymentFailedAt = null;
        } else if (status === 'past_due') {
          // Grace period: 3 days from now before blocking access
          internalStatus = 'grace';
          extraFields.graceUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        } else {
          internalStatus = 'expired';
          extraFields.graceUntil = null;
        }

        await db.collection('owner').doc(ownerId).set({
          subscriptionStatus: internalStatus,
          updatedAt: now,
          ...extraFields,
        }, { merge: true });
        await db.collection('owner').doc(ownerId).update({
          [`subscriptions.${moduleId}`]: { status: internalStatus, updatedAt: now },
        });

        console.log(`[StripeWebhook] Subscription updated: owner=${ownerId} stripe=${status} internal=${internalStatus}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const { ownerId, moduleId = 'receipt' } = sub.metadata || {};
        if (!ownerId) break;

        const validUntil = new Date(sub.current_period_end * 1000).toISOString();

        await db.collection('owner').doc(ownerId).set({
          subscriptionStatus: 'expired',
          validUntil,
          graceUntil: null,
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        await db.collection('owner').doc(ownerId).update({
          [`subscriptions.${moduleId}`]: { status: 'expired', updatedAt: new Date().toISOString() },
        });

        console.log(`[StripeWebhook] Subscription deleted: owner=${ownerId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.id;
        if (!customerId) break;

        // Find owner by stripeCustomerId
        const ownerSnap = await db.collection('owner')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (ownerSnap.empty) {
          console.warn(`[StripeWebhook] invoice.payment_failed: owner not found for customer=${customerId}`);
          break;
        }

        const ownerDoc = ownerSnap.docs[0];
        const failedOwnerId = ownerDoc.id;
        const graceUntil = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
        const now = new Date().toISOString();

        await ownerDoc.ref.set({
          subscriptionStatus: 'grace',
          graceUntil,
          lastPaymentFailedAt: now,
          updatedAt: now,
        }, { merge: true });

        console.log(`[StripeWebhook] Payment failed: owner=${failedOwnerId} graceUntil=${graceUntil}`);
        break;
      }

      default:
        console.log(`[StripeWebhook] Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`[StripeWebhook] Error processing event ${event.id}: ${err.message}`);
    return new NextResponse('Webhook processing error', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
