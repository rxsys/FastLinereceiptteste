
'use server';

import { getLineClient } from '@/lib/line';
import { db } from '@/lib/firebase';
import { getOwnerCredentials } from '@/lib/line-server';
import { translations } from '@/lib/translations';

/**
 * Server Action para notificar o usuário quando seu status é aprovado.
 */
export async function notifyUserApproval(ownerId: string, lineId: string, lang: string = 'ja') {
  try {
    const ownerData = await getOwnerCredentials(ownerId);
    
    if (!ownerData) return { success: false, error: 'Owner not found' };

    const accessToken = ownerData.lineChannelAccessToken;
    if (!accessToken) return { success: false, error: 'Access token missing' };

    const lineClient = getLineClient(accessToken);
    const t = (translations as any)[lang] || translations.ja;
    const approvalMessage = t.line?.approvalMsg || translations.ja.line.approvalMsg;

    await lineClient.pushMessage({
      to: lineId,
      messages: [
        {
          type: 'text',
          text: approvalMessage
        }
      ]
    });

    // Auditoria
    await db.collection('logs').add({
      action: 'SEND_APPROVAL_NOTIFY',
      ownerId: ownerId,
      details: `送信先: ${lineId} | オーナー: ${ownerData.name}`,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    console.error('[NotifyApproval] Error:', error);
    return { success: false, error: 'Failed to send notification' };
  }
}

/**
 * Server Action para notificar o usuário LINE quando a empresa adiciona crédito na carteira.
 */
export async function notifyWalletCredit(ownerId: string, lineUserId: string, amount: number, description: string) {
  try {
    const ownerData = await getOwnerCredentials(ownerId);
    if (!ownerData) return { success: false, error: 'Owner not found' };

    const accessToken = ownerData.lineChannelAccessToken;
    if (!accessToken) return { success: false, error: 'Access token missing' };

    const lineClient = getLineClient(accessToken);

    const desc = description?.trim() ? `\n摘要：${description.trim()}` : '';
    await lineClient.pushMessage({
      to: lineUserId,
      messages: [
        {
          type: 'text',
          text: `💰 会社よりお振込みがございました。\n金額：¥${amount.toLocaleString('ja-JP')}${desc}\n\nご不明な点がございましたら、担当者までお問い合わせくださいませ。`
        }
      ]
    });

    return { success: true };
  } catch (error) {
    console.error('[NotifyWalletCredit] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Server Action para notificar o usuário LINE quando o status do recibo muda.
 */
export async function notifyReviewStatus(
  ownerId: string,
  lineUserId: string,
  reviewStatus: 'reviewing' | 'approved' | 'rejected',
  description: string,
  amount: number
) {
  try {
    const ownerData = await getOwnerCredentials(ownerId);
    if (!ownerData) return { success: false, error: 'Owner not found' };
    const accessToken = ownerData.lineChannelAccessToken;
    if (!accessToken) return { success: false, error: 'Access token missing' };

    const lineClient = getLineClient(accessToken);

    const statusText =
      reviewStatus === 'approved' ? '✅ 受取済み — 領収書が受理されました。' :
      reviewStatus === 'rejected' ? '❌ 否認 — 領収書が受理されませんでした。ご確認をお願いいたします。' :
      '🔍 審査中 — 領収書を確認しております。';

    await lineClient.pushMessage({
      to: lineUserId,
      messages: [{
        type: 'text',
        text: `📄 領収書ステータスが更新されました。\n\n${statusText}\n\n店舗名：${description || '—'}\n金額：¥${amount.toLocaleString('ja-JP')}`
      }]
    });

    return { success: true };
  } catch (error) {
    console.error('[NotifyReviewStatus] Error:', error);
    return { success: false, error: String(error) };
  }
}
