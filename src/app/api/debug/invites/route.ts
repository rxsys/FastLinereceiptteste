import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  const snap = await db.collection('invites').limit(20).get();
  const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return NextResponse.json(docs);
}
