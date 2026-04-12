import { NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';
import { getApps } from 'firebase-admin/app';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== 'fastline2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const app = getApps()[0];
    const appOptions = app?.options || {};

    // Check what's in the root
    const rootSnap = await rtdb.ref('/').get();
    const rootKeys = rootSnap.exists() ? Object.keys(rootSnap.val()) : [];

    // Try to find users
    const usersSnap = await rtdb.ref('users').limitToFirst(3).get();
    const usersPreview = usersSnap.exists() ? Object.keys(usersSnap.val()) : [];

    return NextResponse.json({
      adminDbUrl: (appOptions as any).databaseURL || 'auto',
      projectId: (appOptions as any).projectId || 'auto',
      rootKeys,
      usersPreview,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Debug Write] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
