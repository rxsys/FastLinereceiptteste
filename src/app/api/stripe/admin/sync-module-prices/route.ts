import { NextRequest, NextResponse } from 'next/server';
import { getStripeInstance, getStripeConfig } from '@/lib/stripe';
import { rtdb } from '@/lib/firebase';
import { verifyAdminRequest } from '@/lib/admin-auth';

// Mapeamento: valor em yenes → chave do módulo no RTDB
const MODULE_PRICE_MAP: Record<number, string> = {
  9900: 'receiptPriceId',
  9000: 'memberPriceId',
  99:   'mypagePriceId',
};

export async function POST(req: NextRequest) {
  try {
    await verifyAdminRequest(req);
    const stripe = await getStripeInstance();
    const config = await getStripeConfig();

    const prices = await stripe.prices.list({ limit: 100, active: true });

    const updates: Record<string, string> = {};
    for (const price of prices.data) {
      const amount = price.unit_amount ?? 0;
      const key = MODULE_PRICE_MAP[amount];
      if (key) updates[key] = price.id;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: false, message: 'Nenhum preço correspondente encontrado', mode: config?.mode });
    }

    await rtdb.ref('stripe_config/keys').update(updates);
    return NextResponse.json({ ok: true, updated: updates, mode: config?.mode });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: error.status ?? 500 });
  }
}
