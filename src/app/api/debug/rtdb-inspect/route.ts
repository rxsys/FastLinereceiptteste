import { NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    await verifyAdminRequest(req);
    
    const snap = await rtdb.ref('stripe_config/keys').get();
    const val = snap.val();
    
    if (!val) {
      return NextResponse.json({ error: 'Nenhum dado encontrado em stripe_config/keys' });
    }

    // Retorna apenas as chaves (nomes) e os 4 primeiros caracteres dos valores por segurança
    const inspection: Record<string, string> = {};
    Object.keys(val).forEach(k => {
      const v = val[k];
      inspection[k] = typeof v === 'string' ? `${v.substring(0, 4)}... (length: ${v.length})` : typeof v;
    });

    return NextResponse.json({
      path: 'stripe_config/keys',
      structure: inspection,
      raw_keys: Object.keys(val)
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
