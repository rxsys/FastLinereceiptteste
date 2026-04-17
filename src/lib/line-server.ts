import { rtdb } from './firebase';

/**
 * Resolve credenciais LINE a partir do webhookId da URL.
 *
 * Regra única: o pool entry DEVE ter `ownerId` definido. Sem isso, o bot
 * ainda não está atribuído a nenhuma empresa e qualquer escrita seria órfã.
 *
 * Estratégias (na ordem):
 *   1. webhookId == pool.ownerId  (caso padrão: URL usa o ownerId)
 *   2. webhookId == poolPushId e pool.ownerId setado (URL legada)
 *   3. webhookId == ownerId direto (owner existe mas sem pool — flow antigo)
 *
 * Retorna null em qualquer situação ambígua para evitar gravar dados sob
 * um identificador errado.
 */
export async function getOwnerCredentials(webhookId: string) {
  const poolRef = rtdb.ref('line_api_pool');

  // 1) Lookup por campo ownerId (indexado).
  let poolData: any = null;
  const querySnap = await poolRef.orderByChild('ownerId').equalTo(webhookId).limitToFirst(1).get();
  if (querySnap.exists()) {
    querySnap.forEach((child) => {
      poolData = child.val();
      return true;
    });
  }

  // 2) Fallback: webhookId é o poolPushId — só honra se já foi atribuído a um owner.
  if (!poolData) {
    const candidates = Array.from(new Set([webhookId, webhookId.toLowerCase()]));
    for (const key of candidates) {
      const snap = await poolRef.child(key).get();
      if (snap.exists() && snap.val()?.ownerId) {
        poolData = snap.val();
        break;
      }
    }
  }

  if (poolData && poolData.ownerId) {
    const ownerId = poolData.ownerId;
    const ownerSnap = await rtdb.ref(`owner/${ownerId}`).get();
    const ownerData = ownerSnap.val() || {};
    return {
      id: ownerId,
      ...ownerData,
      ownerId,
      lineChannelAccessToken: poolData.lineChannelAccessToken,
      lineChannelSecret: poolData.lineChannelSecret,
      lineBasicId: poolData.lineBasicId,
      googleGenAiApiKey: poolData.googleGenAiApiKey || ownerData.googleGenAiApiKey,
    };
  }

  // 3) Fallback final: owner antigo com credenciais no próprio doc (sem pool).
  const ownerSnap = await rtdb.ref(`owner/${webhookId}`).get();
  if (ownerSnap.exists()) {
    const ownerData = ownerSnap.val();
    if (ownerData.lineChannelAccessToken) {
      return { id: webhookId, ownerId: webhookId, ...ownerData };
    }
  }

  return null;
}
