import { NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';
import { getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    if (key !== 'fastline2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const mode = url.searchParams.get('mode');
    
    if (mode === 'line_debug') {
      const webhookLogs = await rtdb.ref('debug_webhook').limitToLast(10).get();
      const inviteLogs = await rtdb.ref('debug_invite').limitToLast(10).get();
      const pool = await rtdb.ref('line_api_pool').get();
      
      return NextResponse.json({
        ts: new Date().toISOString(),
        webhookLogs: webhookLogs.val(),
        inviteLogs: inviteLogs.val(),
        poolSummary: pool.exists() ? Object.keys(pool.val()).map(k => ({ id: k, name: pool.val()[k].name, owner: pool.val()[k].ownerId })) : []
      });
    }

    const path = url.searchParams.get('path') || 'stripe_config/keys';
    const dbUrl = url.searchParams.get('db');

    // Use alternative DB URL if provided
    const db = dbUrl ? getDatabase(getApps()[0], dbUrl) : rtdb;

    const snap = await db.ref(path).get();
    const val = snap.val();

    if (!val) {
      return NextResponse.json({ path, dbUrl: dbUrl || 'default', data: null, message: 'No data at this path' });
    }

    // For stripe_config, mask secrets
    if (path === 'stripe_config/keys') {
      const inspection: Record<string, string> = {};
      Object.keys(val).forEach(k => {
        const v = val[k];
        inspection[k] = typeof v === 'string' ? `${v.substring(0, 8)}... (len: ${v.length})` : typeof v;
      });
      return NextResponse.json({ path, dbUrl: dbUrl || 'default', structure: inspection });
    }

    return NextResponse.json({ path, dbUrl: dbUrl || 'default', data: val });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
