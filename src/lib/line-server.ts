import { rtdb } from './firebase';

export async function getOwnerCredentials(webhookId: string) {
  const poolRef = rtdb.ref('line_api_pool');

  console.log(`[line-server] Resolving credentials for webhookId: ${webhookId}`);

  // 1. Tenta busca direta no pool (ID como chave)
  const candidates = Array.from(new Set([webhookId, webhookId.toLowerCase(), webhookId.toUpperCase()]));
  let poolData: any = null;
  let poolKey: string | null = null;
  
  for (const key of candidates) {
    const snap = await poolRef.child(key).get();
    if (snap.exists()) {
      poolData = snap.val();
      poolKey = key;
      console.log(`[line-server] Found in pool by key: ${key}`);
      break;
    }
  }

  // 2. Se não achou, tenta localizar no pool via campo 'ownerId'
  if (!poolData) {
    const querySnap = await poolRef.orderByChild('ownerId').equalTo(webhookId).limitToFirst(1).get();
    if (querySnap.exists()) {
      querySnap.forEach((child) => {
        poolData = child.val();
        poolKey = child.key;
        console.log(`[line-server] Found in pool by ownerId field: ${child.key}`);
      });
    }
  }

  if (poolData) {
    const ownerId = poolData.ownerId || poolKey;
    const ownerSnap = await rtdb.ref(`owner/${ownerId}`).get();
    const ownerData = ownerSnap.val() || {};
    
    if (!ownerSnap.exists()) {
       console.warn(`[line-server] Bot found in pool (${poolKey}) but Owner record (${ownerId}) is missing!`);
    }

    return {
      id: ownerId,
      ...ownerData,
      lineChannelAccessToken: poolData.lineChannelAccessToken,
      lineChannelSecret: poolData.lineChannelSecret,
      lineBasicId: poolData.lineBasicId,
      googleGenAiApiKey: poolData.googleGenAiApiKey || ownerData.googleGenAiApiKey
    };
  }

  // 3. Fallback: Se não existe no pool, tenta buscar direto no owner
  console.log(`[line-server] Not found in pool, trying direct owner lookup: ${webhookId}`);
  const ownerSnap = await rtdb.ref(`owner/${webhookId}`).get();
  if (ownerSnap.exists()) {
    return { id: webhookId, ...ownerSnap.val() };
  }

  console.error(`[line-server] FATAL: Could not resolve any owner/bot for ID: ${webhookId}`);
  return null;
}
