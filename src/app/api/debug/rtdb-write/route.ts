import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico: tenta escrever em audit_logs, owner_data/.../interactions e
 * retorna o resultado de cada operação para identificar falhas silenciosas.
 *
 * Uso: /api/debug/rtdb-write?ownerId=XXX&userId=Uyyy
 */
export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get('ownerId');
  const userId = req.nextUrl.searchParams.get('userId');

  const result: any = {
    ownerId,
    userId,
    env: {
      hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
      hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
      gcpProject: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT || null,
    },
    tests: {},
  };

  // Teste 1: write em /debug_ping (deve funcionar se admin estiver ok)
  try {
    const pingRef = rtdb.ref('debug_ping').push();
    await pingRef.set({ ts: Date.now(), ua: req.headers.get('user-agent') || '' });
    result.tests.debug_ping = { ok: true, key: pingRef.key };
  } catch (e: any) {
    result.tests.debug_ping = { ok: false, error: e?.message || String(e) };
  }

  if (ownerId) {
    // Teste 2: write em audit_logs/{ownerId}
    try {
      const auditRef = rtdb.ref(`audit_logs/${ownerId}`).push();
      await auditRef.set({
        timestamp: new Date().toISOString(),
        actor: { type: 'system', id: 'diag', name: 'diagnostic' },
        action: 'create',
        entity: { type: 'owner', id: ownerId, path: 'diag', label: 'diagnostic test' },
        source: 'api',
        metadata: { diagnostic: true },
      });
      result.tests.audit_logs = { ok: true, key: auditRef.key };
    } catch (e: any) {
      result.tests.audit_logs = { ok: false, error: e?.message || String(e) };
    }

    if (userId) {
      // Teste 3: write em owner_data/{ownerId}/lineUsers/{userId}/interactions
      try {
        const intRef = rtdb
          .ref(`owner_data/${ownerId}/lineUsers/${userId}/interactions`)
          .push();
        await intRef.set({
          role: 'system',
          text: '[DIAGNOSTIC] RTDB write test',
          ts: Date.now(),
        });
        result.tests.interactions = { ok: true, key: intRef.key };
      } catch (e: any) {
        result.tests.interactions = { ok: false, error: e?.message || String(e) };
      }

      // Teste 4: read back as snapshot count
      try {
        const snap = await rtdb
          .ref(`owner_data/${ownerId}/lineUsers/${userId}/interactions`)
          .get();
        result.tests.interactions_read = {
          ok: true,
          count: snap.numChildren(),
        };
      } catch (e: any) {
        result.tests.interactions_read = { ok: false, error: e?.message || String(e) };
      }

      // Teste 5: verify user node exists
      try {
        const snap = await rtdb.ref(`owner_data/${ownerId}/lineUsers/${userId}`).get();
        result.tests.user_exists = {
          ok: true,
          exists: snap.exists(),
          keys: snap.exists() ? Object.keys(snap.val() || {}) : [],
        };
      } catch (e: any) {
        result.tests.user_exists = { ok: false, error: e?.message || String(e) };
      }
    }
  }

  return NextResponse.json(result, { status: 200 });
}
