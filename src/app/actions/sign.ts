'use server';

import { rtdb, adminStorage } from '@/lib/firebase';
import { notifySignatureComplete } from './line-notify';

function parseToken(token: string) {
  // Formato: ${ownerId}_${userId}_${receiptId}
  // receiptId pode conter '_' (pushId RTDB usa charset -0-9A-Za-z_)
  const parts = token.split('_');
  if (parts.length < 3) return null;
  return {
    oId: parts[0],
    uId: parts[1],
    rId: parts.slice(2).join('_'),
  };
}

export async function getSignReceipt(token: string) {
  const parsed = parseToken(token);
  if (!parsed) return { success: false, error: 'Token inválido' };
  const { oId, uId, rId } = parsed;

  try {
    const [advSnap, ownerSnap, userSnap] = await Promise.all([
      rtdb.ref(`owner_data/${oId}/lineUsers/${uId}/wallet/advances/${rId}`).get(),
      rtdb.ref(`owner/${oId}`).get(),
      rtdb.ref(`owner_data/${oId}/lineUsers/${uId}`).get(),
    ]);
    if (!advSnap.exists()) return { success: false, error: 'Recibo não encontrado' };
    const ownerData = ownerSnap.val() || {};
    const userData = userSnap.val() || {};
    return {
      success: true,
      receipt: { ...advSnap.val(), oId, uId, rId },
      liffSignId: ownerData.liffSignId || null,
      ownerName: ownerData.name || '',
      userName: userData.name || userData.fullName || userData.displayName || '',
    };
  } catch (err: any) {
    console.error('[getSignReceipt] Error:', err);
    return { success: false, error: String(err?.message || err) };
  }
}

export async function saveSignature(token: string, dataUrl: string) {
  const parsed = parseToken(token);
  if (!parsed) return { success: false, error: 'Token inválido' };
  const { oId, uId, rId } = parsed;

  try {
    // 1. Validar recibo
    const advRef = rtdb.ref(`owner_data/${oId}/lineUsers/${uId}/wallet/advances/${rId}`);
    const snap = await advRef.get();
    if (!snap.exists()) return { success: false, error: 'Recibo não encontrado' };
    const receipt = snap.val();
    if (receipt.signed) return { success: false, error: 'Já assinado' };

    // 2. Upload para Storage via Admin SDK
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
    const filePath = `owners/${oId}/signatures/${rId}.png`;
    const file = adminStorage.bucket().file(filePath);
    await file.save(buffer, { contentType: 'image/png', resumable: false });
    await file.makePublic().catch(() => {});
    const signatureUrl = `https://storage.googleapis.com/${adminStorage.bucket().name}/${filePath}`;

    // 3. Atualizar RTDB
    const signedAt = new Date().toISOString();
    await advRef.update({ signed: true, signatureUrl, signedAt, status: 'signed' });

    // 4. Notificar LINE (buscar lineUserId do perfil)
    try {
      const userSnap = await rtdb.ref(`owner_data/${oId}/lineUsers/${uId}`).get();
      const lineUserId = userSnap.val()?.lineUserId || uId;
      if (typeof lineUserId === 'string' && lineUserId.startsWith('U')) {
        await notifySignatureComplete(oId, lineUserId, receipt.amount, receipt.description, signedAt);
      }
    } catch (notifyErr) {
      console.warn('[saveSignature] notify failed:', notifyErr);
    }

    return { success: true, signedAt };
  } catch (err: any) {
    console.error('[saveSignature] Error:', err);
    return { success: false, error: String(err?.message || err) };
  }
}
