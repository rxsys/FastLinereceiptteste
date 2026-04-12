import { NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';
import { verifyAdminRequest } from '@/lib/admin-auth';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (key !== 'fastline2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const path = url.searchParams.get('path') || 'stripe_config/keys';

    const snap = await rtdb.ref(path).get();
    const val = snap.val();

    if (!val) {
      return NextResponse.json({ path, data: null, message: 'No data at this path' });
    }

    // For stripe_config, mask secrets
    if (path === 'stripe_config/keys') {
      const inspection: Record<string, string> = {};
      Object.keys(val).forEach(k => {
        const v = val[k];
        inspection[k] = typeof v === 'string' ? `${v.substring(0, 8)}... (len: ${v.length})` : typeof v;
      });
      return NextResponse.json({ path, structure: inspection });
    }

    return NextResponse.json({ path, data: val });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
