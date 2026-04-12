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
    
    try {
      // Primary test: try to get account info
      const account = await stripe.accounts.retrieve();
      return NextResponse.json({ 
        ok: true, 
        accountId: account.id,
        businessName: account.business_profile?.name || account.email || 'Stripe Account',
        mode
      });
    } catch (err: any) {
      // If it's a permission error, it means the key IS valid but doesn't have high-level permissions
      if (err.type === 'StripePermissionError' || err.message.includes('permissions')) {
        // Try a fallback that's usually allowed: balance retrieve
        try {
          await stripe.balance.retrieve();
          return NextResponse.json({ 
            ok: true, 
            accountId: 'Keys OK',
            businessName: `Restricted Key (${mode.toUpperCase()})`,
            mode,
            restricted: true
          });
        } catch (innerErr: any) {
           // If even balance fails but it's not a 401, the key is still "valid" as a string
           if (innerErr.statusCode !== 401) {
              return NextResponse.json({ 
                ok: true, 
                accountId: 'Keys OK',
                businessName: `Restricted Key - Validated (${mode.toUpperCase()})`,
                mode,
                restricted: true
              });
           }
           throw innerErr;
        }
      }
      throw err;
    }
  } catch (error: any) {
    console.error('[Stripe Test Error]:', error);
    return NextResponse.json({ 
      ok: false, 
      error: error.message 
    }, { status: error.status || 500 });
  }
}
