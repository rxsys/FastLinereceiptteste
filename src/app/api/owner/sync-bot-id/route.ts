import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';

/**
 * Resolve o lineBasicId sempre via line_api_pool (fonte canônica).
 * Atualiza o cache em owner/{ownerId}.lineBasicId se divergir.
 * Usa Admin SDK (sem restrição de regras de segurança).
 */
export async function POST(req: NextRequest) {
  try {
    const { ownerId } = await req.json();
    if (!ownerId) {
      return NextResponse.json({ error: 'ownerId obrigatório' }, { status: 400 });
    }

    // Buscar SEMPRE no pool (evita cache desatualizado em owner.lineBasicId)
    const poolSnap = await rtdb.ref('line_api_pool').get();
    if (!poolSnap.exists()) {
      return NextResponse.json({ error: 'line_api_pool vazio' }, { status: 404 });
    }

    const poolData = poolSnap.val();
    let lineBasicId: string | null = null;

    for (const [poolId, entry] of Object.entries(poolData) as [string, any][]) {
      if ((entry.ownerId === ownerId || poolId === ownerId) && entry.lineBasicId) {
        lineBasicId = entry.lineBasicId;
        break;
      }
    }

    if (!lineBasicId) {
      return NextResponse.json({ error: 'Bot não encontrado no pool para este owner' }, { status: 404 });
    }

    // Atualiza o cache em owner apenas se divergir
    const ownerSnap = await rtdb.ref(`owner/${ownerId}`).get();
    const currentCached = ownerSnap.exists() ? ownerSnap.val().lineBasicId : null;
    if (currentCached !== lineBasicId) {
      await rtdb.ref(`owner/${ownerId}`).update({ lineBasicId });
    }

    return NextResponse.json({ lineBasicId, source: 'pool' });
  } catch (error: any) {
    console.error('[sync-bot-id] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
