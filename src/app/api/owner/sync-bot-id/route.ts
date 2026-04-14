import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';

/**
 * Sincroniza o lineBasicId do line_api_pool para o owner/{ownerId}.
 * Chamado automaticamente pelo client quando o owner não possui lineBasicId.
 * Usa Admin SDK (sem restrição de regras de segurança).
 */
export async function POST(req: NextRequest) {
  try {
    const { ownerId } = await req.json();
    if (!ownerId) {
      return NextResponse.json({ error: 'ownerId obrigatório' }, { status: 400 });
    }

    // Verificar se o owner já tem lineBasicId
    const ownerSnap = await rtdb.ref(`owner/${ownerId}`).get();
    if (ownerSnap.exists() && ownerSnap.val().lineBasicId) {
      return NextResponse.json({ lineBasicId: ownerSnap.val().lineBasicId, source: 'owner' });
    }

    // Buscar no pool pelo ownerId
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

    // Gravar no owner para que leituras futuras não dependam do pool
    await rtdb.ref(`owner/${ownerId}`).update({ lineBasicId });

    return NextResponse.json({ lineBasicId, source: 'pool_synced' });
  } catch (error: any) {
    console.error('[sync-bot-id] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
