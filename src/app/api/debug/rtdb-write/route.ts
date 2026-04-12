import { NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';

export async function GET() {
  try {
    const testRef = rtdb.ref('api_debug/test_write');
    const now = new Date().toISOString();
    await testRef.set({
      last_test: now,
      message: "Se você vir isso, o servidor tem permissão de escrita!",
      env_check: {
        has_project_id: !!process.env.FIREBASE_PROJECT_ID,
        has_private_key: !!process.env.FIREBASE_PRIVATE_KEY
      }
    });
    return NextResponse.json({ ok: true, timestamp: now });
  } catch (error: any) {
    console.error('[Debug Write] Error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
