import { NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('key') !== 'fastline2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const action = url.searchParams.get('action');

  // Fix owner name: ?action=fix-owner&ownerId=xxx
  if (action === 'fix-owner') {
    const ownerId = url.searchParams.get('ownerId');
    if (!ownerId) return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 });

    const customName = url.searchParams.get('name');
    let name = customName;
    if (!name) {
      const userSnap = await rtdb.ref(`users/${ownerId}`).get();
      const userData = userSnap.val();
      name = userData?.displayName || userData?.companyName || 'Unknown';
    }

    await rtdb.ref(`owner/${ownerId}`).update({ name, companyName: name });
    await rtdb.ref(`users/${ownerId}`).update({ displayName: name });
    return NextResponse.json({ ok: true, ownerId, name });
  }

  // Assign LINE pool: ?action=assign-pool&ownerId=xxx
  if (action === 'assign-pool') {
    const ownerId = url.searchParams.get('ownerId');
    if (!ownerId) return NextResponse.json({ error: 'Missing ownerId' }, { status: 400 });

    const allPoolSnap = await rtdb.ref('line_api_pool').get();
    if (!allPoolSnap.exists()) return NextResponse.json({ error: 'No pool entries' });

    const allPool = allPoolSnap.val();
    const alreadyAssigned = Object.values(allPool).some((p: any) => p.ownerId === ownerId);
    if (alreadyAssigned) return NextResponse.json({ ok: true, message: 'Already assigned' });

    const availableEntry = Object.entries(allPool).find(([, p]: any) => p.status === 'available');
    if (!availableEntry) return NextResponse.json({ error: 'No available pool' });

    const [poolId] = availableEntry;
    const now = new Date().toISOString();
    await rtdb.ref(`line_api_pool/${poolId}`).update({ status: 'used', ownerId, assignedAt: now });
    return NextResponse.json({ ok: true, poolId, ownerId });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
