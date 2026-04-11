import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

/**
 * GET /api/debug/webhook-log?webhookId=XXX[&limit=20]
 * Retorna os N hits mais recentes gravados pelo webhook do LINE.
 */
export async function GET(req: NextRequest) {
  const webhookId = req.nextUrl.searchParams.get('webhookId');
  const limit = Number(req.nextUrl.searchParams.get('limit') || '20');

  if (!webhookId) {
    return NextResponse.json({ error: 'webhookId required' }, { status: 400 });
  }

  try {
    const snap = await rtdb.ref(`debug_webhook/${webhookId}`).get();

    const list: any[] = [];
    snap.forEach((child) => {
      list.push({ _key: child.key, ...child.val() });
    });
    list.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const trimmed = list.slice(0, limit);

    return NextResponse.json({ webhookId, count: trimmed.length, total: list.length, hits: trimmed });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
