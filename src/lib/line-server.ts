import { rtdb } from './firebase';

export async function getOwnerCredentials(webhookId: string) {
  const poolRef = rtdb.ref('line_api_pool');
  const poolSnap = await poolRef.child(webhookId.toLowerCase()).get();
  
  if (poolSnap.exists()) {
    const poolData = poolSnap.val();
    const ownerId = poolData.ownerId;
    
    if (ownerId) {
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
    return { id: webhookId, ...poolData };
  }

  // Fallback: busca direta por ownerId
  const ownerSnap = await rtdb.ref(`owner/${webhookId}`).get();
  if (ownerSnap.exists()) {
    return { id: webhookId, ...ownerSnap.val() };
  }
  
  return null;
}
