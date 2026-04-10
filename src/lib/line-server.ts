import { rtdb } from './firebase';

export async function getOwnerCredentials(webhookId: string) {
  const poolRef = rtdb.ref('line_api_pool');

  // Tenta chave exata primeiro (pushId RTDB preserva maiúsculas/minúsculas).
  // Fallbacks cobrem casos em que o caller passa um alias lowercased.
  const candidates = Array.from(new Set([webhookId, webhookId.toLowerCase()]));
  let poolData: any = null;
  let poolKey: string | null = null;
  for (const key of candidates) {
    const snap = await poolRef.child(key).get();
    if (snap.exists()) {
      poolData = snap.val();
      poolKey = key;
      break;
    }
  }

  // Se ainda não achou, tenta localizar via query pelo campo ownerId
  // (caso o pushId do pool seja diferente do ownerId).
  if (!poolData) {
    const querySnap = await poolRef.orderByChild('ownerId').equalTo(webhookId).limitToFirst(1).get();
    if (querySnap.exists()) {
      querySnap.forEach((child) => {
        poolData = child.val();
        poolKey = child.key;
        return true;
      });
    }
  }

  if (poolData) {
    const ownerId = poolData.ownerId || poolKey;
    const ownerSnap = await rtdb.ref(`owner/${ownerId}`).get();
    const ownerData = ownerSnap.val() || {};
    return {
      id: ownerId,
      ...ownerData,
      lineChannelAccessToken: poolData.lineChannelAccessToken,
      lineChannelSecret: poolData.lineChannelSecret,
      lineBasicId: poolData.lineBasicId,
      googleGenAiApiKey: poolData.googleGenAiApiKey || ownerData.googleGenAiApiKey
    };
  }

  // Fallback: busca direta por ownerId
  const ownerSnap = await rtdb.ref(`owner/${webhookId}`).get();
  if (ownerSnap.exists()) {
    return { id: webhookId, ...ownerSnap.val() };
  }

  return null;
}
