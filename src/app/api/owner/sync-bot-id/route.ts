import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';

/**
 * Retorna o lineBasicId do bot do ambiente de TESTE.
 * No teste, o webhook é forçado para line_api_pool/fastline1, então
 * o QR também deve apontar para esse mesmo bot (alinha client ↔ webhook).
 */
export async function POST(req: NextRequest) {
  try {
    const { ownerId } = await req.json();
    if (!ownerId) {
      return NextResponse.json({ error: 'ownerId obrigatório' }, { status: 400 });
    }

    // Busca no pool o bot associado a este owner
    const poolSnap = await rtdb.ref('line_api_pool').orderByChild('ownerId').equalTo(ownerId).limitToFirst(1).get();
    
    let poolData = null;
    if (poolSnap.exists()) {
      poolSnap.forEach(c => { poolData = c.val(); });
    }

    if (!poolData) {
      return NextResponse.json({ error: 'Nenhum bot encontrado no pool para este ownerId' }, { status: 404 });
    }

    // Atualiza cache em owner se divergir
    const lineBasicId = poolData.lineBasicId;
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
