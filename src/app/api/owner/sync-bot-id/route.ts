import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';

/**
 * Retorna o lineBasicId do bot do ambiente de TESTE.
 * No teste, o webhook é forçado para line_api_pool/fastline1, então
 * o QR também deve apontar para esse mesmo bot (alinha client ↔ webhook).
 */
const TEST_POOL_KEY = 'fastline1';

export async function POST(req: NextRequest) {
  try {
    const { ownerId } = await req.json();
    if (!ownerId) {
      return NextResponse.json({ error: 'ownerId obrigatório' }, { status: 400 });
    }

    // Busca direto no pool do teste (mesma chave que o webhook usa)
    const poolSnap = await rtdb.ref(`line_api_pool/${TEST_POOL_KEY}`).get();
    if (!poolSnap.exists()) {
      return NextResponse.json({ error: `line_api_pool/${TEST_POOL_KEY} não existe` }, { status: 404 });
    }

    const poolData = poolSnap.val();
    const lineBasicId: string | null = poolData?.lineBasicId || null;

    if (!lineBasicId) {
      return NextResponse.json({ error: 'lineBasicId ausente no pool do teste' }, { status: 404 });
    }

    // Atualiza cache em owner se divergir
    const ownerSnap = await rtdb.ref(`owner/${ownerId}`).get();
    const currentCached = ownerSnap.exists() ? ownerSnap.val().lineBasicId : null;
    if (currentCached !== lineBasicId) {
      await rtdb.ref(`owner/${ownerId}`).update({ lineBasicId });
    }

    return NextResponse.json({ lineBasicId, source: `pool/${TEST_POOL_KEY}` });
  } catch (error: any) {
    console.error('[sync-bot-id] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
