import { NextResponse } from 'next/server';
import { getStripeInstance } from '@/lib/stripe';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get('mode') || 'test') as 'live' | 'test';
    
    // getStripeInstance will fetch keys from RTDB and throw if missing
    const stripe = await getStripeInstance(mode);
    
    // Simple retrieve to test connectivity and key validity
    const account = await stripe.accounts.retrieve();
    
    return NextResponse.json({ 
      ok: true, 
      accountId: account.id,
      businessName: account.business_profile?.name || account.email || 'Stripe Account',
      mode
    });
  } catch (error: any) {
    console.error('[Stripe Test Error]:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: error.status || 500 });
  }
}
