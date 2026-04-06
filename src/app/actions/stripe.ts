
'use server';

import { getStripeInstance, getStripeConfig } from '@/lib/stripe';
import { headers } from 'next/headers';

/**
 * Cria uma sessão de checkout do Stripe usando o priceId configurado no Firestore.
 */
export async function createCheckoutSession(ownerId: string, ownerName: string) {
  const headerList = await headers();
  const host = headerList.get('host');
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https';
  const baseUrl = `${protocol}://${host}`;

  try {
    const [stripe, config] = await Promise.all([getStripeInstance(), getStripeConfig()]);

    const priceId = config?.mode === 'live' ? config?.livePriceId : config?.testPriceId;
    if (!priceId) throw new Error('Price ID not configured in Firestore stripe_config/keys');

    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${baseUrl}/dashboard?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/dashboard?status=cancel`,
      metadata: {
        ownerId,
      },
    });

    if (!session.url) {
      throw new Error('Could not create checkout session URL');
    }

    return session.url;
  } catch (error) {
    console.error('[StripeAction] Error creating session:', error);
    throw new Error('Falha ao iniciar o checkout do Stripe.');
  }
}

/**
 * Busca a lista de produtos do Stripe.
 */
export async function getStripeProducts() {
  try {
    const stripe = await getStripeInstance();
    const products = await stripe.products.list({
      limit: 100,
      expand: ['data.default_price'],
    });
    return products.data;
  } catch (error) {
    console.error('[StripeAction] Error listing products:', error);
    return [];
  }
}

/**
 * Cria um novo produto no Stripe.
 */
export async function createStripeProduct(name: string, description: string, amount: number, currency: string = 'jpy') {
  try {
    const stripe = await getStripeInstance();
    const product = await stripe.products.create({
      name,
      description,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: amount,
      currency: currency.toLowerCase(),
      recurring: { interval: 'month' },
    });

    // Atualiza o produto para ter esse preço como padrão
    await stripe.products.update(product.id, {
      default_price: price.id,
    });

    return { success: true, product };
  } catch (error: any) {
    console.error('[StripeAction] Error creating product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualiza um produto existente.
 */
export async function updateStripeProduct(productId: string, data: { name?: string, description?: string, active?: boolean }) {
  try {
    const stripe = await getStripeInstance();
    const product = await stripe.products.update(productId, data);
    return { success: true, product };
  } catch (error: any) {
    console.error('[StripeAction] Error updating product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Arquiva (desativa) um produto no Stripe.
 */
export async function archiveStripeProduct(productId: string) {
  try {
    const stripe = await getStripeInstance();
    const product = await stripe.products.update(productId, { active: false });
    return { success: true, product };
  } catch (error: any) {
    console.error('[StripeAction] Error archiving product:', error);
    return { success: false, error: error.message };
  }
}
