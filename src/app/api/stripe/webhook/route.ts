
import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance, getStripeConfig } from '@/lib/stripe';
import { rtdb } from '@/lib/firebase';
import type Stripe from 'stripe';

export async function POST(req: NextRequest) {
  let event: Stripe.Event;
  let stripe: Stripe;
  const now = new Date().toISOString();
  const logsRef = rtdb.ref('api_debug/stripe_webhook_logs');

  try {
    const config = await getStripeConfig();
    const stripeInstance = await getStripeInstance();
    stripe = stripeInstance;

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');
    const endpointSecret = config?.mode === 'live' ? config.liveWebhookSecret : config?.testWebhookSecret;

    if (!sig || !endpointSecret) {
      const msg = !sig ? 'Missing signature' : 'Missing endpoint secret';
      await logsRef.push({ t: now, m: msg, status: 'error' });
      return new NextResponse(msg, { status: 400 });
    }

    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    await logsRef.child(event.id).set({ t: now, type: event.type, step: 'received' });
  } catch (err: any) {
    console.error(`[StripeWebhook] Construction Error: ${err.message}`);
    await logsRef.push({ t: now, m: 'Construction Error', error: err.message });
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};
        const { ownerId, userId, moduleId = 'receipt' } = meta;
        
        await logsRef.child(event.id).update({ 
          step: 'processing_checkout',
          meta,
          customerId: session.customer 
        });

        if (!ownerId || !userId) {
          await logsRef.child(event.id).update({ step: 'error', m: 'Missing metadata' });
          break;
        }

        // 1. Buscar dados do user para nome da empresa
        let userData: any = {};
        try {
          const userSnap = await rtdb.ref(`users/${userId}`).get();
          userData = userSnap.val() || {};
        } catch (e: any) {
          await logsRef.child(event.id).update({ step: 'user_fetch_error', error: e.message });
        }

        const companyName = userData.displayName || userData.companyName || session.customer_details?.name || 'Unknown';

        // 2. Atualizar Owner
        try {
          const ownerUpdates: any = {
            stripeCustomerId: session.customer,
            subscriptionStatus: 'active',
            name: companyName,
            companyName,
            updatedAt: now,
          };

          if (session.subscription) {
            const sub = await stripe.subscriptions.retrieve(session.subscription as string);
            ownerUpdates.validUntil = new Date(sub.current_period_end * 1000).toISOString();
          }

          await rtdb.ref(`owner/${ownerId}`).update(ownerUpdates);
          await rtdb.ref(`owner/${ownerId}/subscriptions/${moduleId}`).set({
            status: 'active',
            id: session.subscription || 'manual',
            updatedAt: now,
          });
          await logsRef.child(event.id).update({ step: 'owner_updated', companyName });
        } catch (e: any) {
          await logsRef.child(event.id).update({ step: 'owner_error', error: e.message });
        }

        // 3. Atualizar Usuário para Manager
        try {
          await rtdb.ref(`users/${userId}`).update({
            status: 'active',
            role: userData.role === 'developer' ? 'developer' : 'manager',
            ownerId,
            updatedAt: now,
          });
          await logsRef.child(event.id).update({ step: 'user_upgraded' });
        } catch (e: any) {
          await logsRef.child(event.id).update({ step: 'user_error', error: e.message });
        }

        // 4. Pool do LINE — busca manual sem orderByChild para evitar erro de index
        try {
          const allPoolSnap = await rtdb.ref('line_api_pool').get();
          if (allPoolSnap.exists()) {
            const allPool = allPoolSnap.val();
            const alreadyAssigned = Object.values(allPool).some((p: any) => p.ownerId === ownerId);

            if (!alreadyAssigned) {
              const availableEntry = Object.entries(allPool).find(([, p]: any) => p.status === 'available');
              if (availableEntry) {
                const [poolId] = availableEntry;
                await rtdb.ref(`line_api_pool/${poolId}`).update({
                  status: 'used',
                  ownerId,
                  ownerName: companyName,
                  assignedAt: now,
                });
                await logsRef.child(event.id).update({ step: 'pool_assigned', poolId });
              } else {
                await logsRef.child(event.id).update({ step: 'pool_none_available' });
              }
            } else {
              await logsRef.child(event.id).update({ step: 'pool_already_assigned' });
            }
          }
        } catch (e: any) {
          await logsRef.child(event.id).update({ step: 'pool_error', error: e.message });
        }

        await logsRef.child(event.id).update({ step: 'completed' });
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const { ownerId, moduleId = 'receipt' } = sub.metadata || {};
        if (!ownerId) break;

        const isDeleted = event.type === 'customer.subscription.deleted';
        const internalStatus = isDeleted ? 'expired' : (sub.status === 'active' || sub.status === 'trialing' ? 'active' : 'grace');

        await rtdb.ref(`owner/${ownerId}`).update({ 
          subscriptionStatus: internalStatus, 
          updatedAt: now,
          validUntil: new Date(sub.current_period_end * 1000).toISOString()
        });
        await rtdb.ref(`owner/${ownerId}/subscriptions/${moduleId}`).update({ status: internalStatus, updatedAt: now });
        await logsRef.child(event.id).update({ step: 'subscription_updated', status: internalStatus });
        break;
      }
    }
  } catch (err: any) {
    await logsRef.child(event.id).update({ step: 'critical_error', error: err.message });
    return new NextResponse('Error', { status: 500 });
  }

  return NextResponse.json({ received: true });
}
