import Stripe from 'stripe';
import { rtdb } from '@/lib/firebase';

// Config cache with TTL (30 seconds) to avoid stale mode/key issues
let stripeConfigCache: { data: any; fetchedAt: number } | null = null;
const CONFIG_TTL_MS = 30_000;

async function getStripeConfig() {
  const now = Date.now();
  if (stripeConfigCache && now - stripeConfigCache.fetchedAt < CONFIG_TTL_MS) {
    return stripeConfigCache.data;
  }
  try {
    const configSnap = await rtdb.ref('stripe_config/keys').get();
    if (configSnap.exists()) {
      const data = configSnap.val();
      stripeConfigCache = { data, fetchedAt: now };
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error fetching Stripe config from RTDB:", error);
    return null;
  }
}

// Never cache the Stripe instance — always build from fresh config so mode switches take effect immediately
async function getStripeInstance(modeOverride?: 'live' | 'test'): Promise<Stripe> {
  const config = await getStripeConfig();
  const mode = modeOverride || config?.mode || 'test';
  const secretKey = mode === 'live' ? config?.liveSecretKey : config?.testSecretKey;

  if (!secretKey) {
    throw new Error(`Stripe secret key not found for mode "${mode}". Check Realtime Database stripe_config/keys.`);
  }

  return new Stripe(secretKey, {
    apiVersion: '2024-04-10',
    appInfo: {
      name: 'Fast LINE Expense Bot',
      version: '1.7.24',
    },
  });
}

function invalidateStripeConfigCache() {
  stripeConfigCache = null;
}

export { getStripeInstance, getStripeConfig, invalidateStripeConfigCache };
