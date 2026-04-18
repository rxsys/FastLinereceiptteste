
'use server';

import { getLineClient } from '@/lib/line';
import { db, rtdb } from '@/lib/firebase';
import { getOwnerCredentials } from '@/lib/line-server';
import { translations } from '@/lib/translations';

/**
 * Helper para registrar interações
 */
async function logInteraction(companyId: string, userId: string, data: { role: 'user' | 'ai' | 'system', text?: string, imageUrl?: string, metadata?: any }) {
  try {
    const logRef = rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/interactions`).push();
    await logRef.set({
      ...data,
      ts: Date.now(),
      createdAt: new Date().toISOString()
    });
    
    // Limits interactions to 100 max length
    const snap = await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/interactions`).once('value');
    if (snap.numChildren() > 100) {
      const keys: string[] = [];
      snap.forEach(c => { keys.push(c.key!); });
      const toDelete = keys.slice(0, keys.length - 100);
      for (const k of toDelete) {
        await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/interactions/${k}`).remove();
      }
    }
  } catch (e) {
    console.error('[logInteraction action] failed:', e);
  }
}

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

    await logInteraction(ownerId, lineId, { role: 'system', text: approvalMessage });

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
export async function notifyWalletCredit(
  ownerId: string,
  lineUserId: string,
  amount: number,
  description: string,
  signUrl?: string,
  opts?: { userName?: string; createdAt?: string }
) {
  try {
    const ownerData = await getOwnerCredentials(ownerId);
    if (!ownerData) return { success: false, error: 'Owner not found' };

    const accessToken = ownerData.lineChannelAccessToken;
    if (!accessToken) return { success: false, error: 'Access token missing' };

    const lineClient = getLineClient(accessToken);
    const desc = description?.trim() ? `\n但し書き：${description.trim()}` : '';

    // Formatar data 発行日 estilo japonês
    const issuedAt = opts?.createdAt ? new Date(opts.createdAt) : new Date();
    const issuedStr = `${issuedAt.getFullYear()}年${String(issuedAt.getMonth() + 1).padStart(2, '0')}月${String(issuedAt.getDate()).padStart(2, '0')}日`;
    const userName = opts?.userName || '';
    const ownerName = ownerData.name || '';

    console.log(`[NotifyWalletCredit] Iniciando envio para ${lineUserId} | URL: ${signUrl}`);

    if (signUrl) {
      // Flex Message no estilo 領収書 tradicional japonês
      try {
        await lineClient.pushMessage({
          to: lineUserId,
          messages: [
            {
              type: 'flex',
              altText: '【領収書】署名のお願い',
              contents: {
                type: 'bubble',
                size: 'mega',
                header: {
                  type: 'box',
                  layout: 'vertical',
                  backgroundColor: '#0f172a',
                  paddingAll: 'lg',
                  contents: [
                    { type: 'text', text: '領収書', weight: 'bold', color: '#ffffff', size: 'xxl', align: 'center' },
                    { type: 'text', text: 'RECEIPT', color: '#94a3b8', size: 'xs', align: 'center', margin: 'sm' }
                  ]
                },
                body: {
                  type: 'box',
                  layout: 'vertical',
                  paddingAll: 'xl',
                  spacing: 'md',
                  contents: [
                    // 宛名 + 発行日
                    {
                      type: 'box',
                      layout: 'horizontal',
                      contents: [
                        {
                          type: 'box',
                          layout: 'vertical',
                          flex: 3,
                          contents: [
                            { type: 'text', text: '宛名', size: 'xxs', color: '#94a3b8' },
                            { type: 'text', text: `${userName || '—'} 様`, size: 'md', weight: 'bold', color: '#0f172a', wrap: true }
                          ]
                        },
                        {
                          type: 'box',
                          layout: 'vertical',
                          flex: 2,
                          contents: [
                            { type: 'text', text: '発行日', size: 'xxs', color: '#94a3b8', align: 'end' },
                            { type: 'text', text: issuedStr, size: 'sm', weight: 'bold', color: '#0f172a', align: 'end' }
                          ]
                        }
                      ]
                    },
                    { type: 'separator', margin: 'md', color: '#cbd5e1' },
                    // 金額
                    {
                      type: 'box',
                      layout: 'vertical',
                      margin: 'md',
                      spacing: 'xs',
                      contents: [
                        { type: 'text', text: '金　額', size: 'xxs', color: '#94a3b8', align: 'center' },
                        { type: 'text', text: `¥ ${amount.toLocaleString('ja-JP')} -`, size: 'xxl', weight: 'bold', color: '#0f172a', align: 'center' }
                      ]
                    },
                    { type: 'separator', margin: 'md', color: '#cbd5e1' },
                    // 但し書き
                    {
                      type: 'box',
                      layout: 'vertical',
                      margin: 'md',
                      spacing: 'xs',
                      contents: [
                        { type: 'text', text: '但し書き', size: 'xxs', color: '#94a3b8' },
                        { type: 'text', text: description || '—', size: 'sm', color: '#334155', wrap: true },
                        { type: 'text', text: '上記金額、正に領収いたしました。', size: 'xxs', color: '#94a3b8', margin: 'sm' }
                      ]
                    },
                    { type: 'separator', margin: 'md', color: '#cbd5e1' },
                    // 発行者
                    {
                      type: 'box',
                      layout: 'vertical',
                      margin: 'md',
                      spacing: 'xs',
                      contents: [
                        { type: 'text', text: '発行者', size: 'xxs', color: '#94a3b8' },
                        { type: 'text', text: ownerName || '—', size: 'sm', weight: 'bold', color: '#0f172a', wrap: true }
                      ]
                    },
                    {
                      type: 'text',
                      text: '下のボタンから内容を確認し、署名をお願いいたします。',
                      size: 'xxs',
                      color: '#64748b',
                      wrap: true,
                      margin: 'lg',
                      align: 'center'
                    }
                  ]
                },
                footer: {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'sm',
                  paddingAll: 'lg',
                  contents: [
                    {
                      type: 'button',
                      style: 'primary',
                      height: 'sm',
                      color: '#0f172a',
                      action: { type: 'uri', label: '確認・署名する', uri: signUrl }
                    }
                  ]
                }
              }
            }
          ]
        });
        console.log('[NotifyWalletCredit] Flex Message enviada com sucesso');
        
        const flexLogText = `[署名のお願い] \n宛名: ${userName}\n金額: ¥${amount.toLocaleString('ja-JP')}\n但し書き: ${description || '—'}\n発行者: ${ownerName}`;
        await logInteraction(ownerId, lineUserId, { role: 'system', text: flexLogText });
      } catch (flexErr: any) {
        console.error('[NotifyWalletCredit] Erro ao enviar Flex:', flexErr.response?.data || flexErr);
        throw flexErr;
      }
    } else {
      // Fallback para mensagem de texto simples
      const textMsg = `💰 会社よりお振込みがございました。\n金額：¥${amount.toLocaleString('ja-JP')}${desc}\n\nご不明な点がございましたら、担当者までお問い合わせくださいませ。`;
      await lineClient.pushMessage({
        to: lineUserId,
        messages: [
          {
            type: 'text',
            text: textMsg
          }
        ]
      });
      console.log('[NotifyWalletCredit] Texto simples enviado');
      await logInteraction(ownerId, lineUserId, { role: 'system', text: textMsg });
    }

    return { success: true };
  } catch (error: any) {
    const details = error?.originalError?.response?.data
      || error?.response?.data
      || error?.message
      || String(error);
    const msg = typeof details === 'string' ? details : JSON.stringify(details);
    console.error('[NotifyWalletCredit] Global Error:', msg, error);
    return { success: false, error: msg };
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
  amount: number,
  date?: string,
  projectName?: string,
  costCenterName?: string,
  rejectReason?: string,
  requireResubmission?: boolean
) {
  try {
    const ownerData = await getOwnerCredentials(ownerId);
    if (!ownerData) return { success: false, error: 'Owner not found' };
    const accessToken = ownerData.lineChannelAccessToken;
    if (!accessToken) return { success: false, error: 'Access token missing' };

    const lineClient = getLineClient(accessToken);

    const statusEmoji = reviewStatus === 'approved' ? '✅' : reviewStatus === 'rejected' ? '❌' : '🔍';
    const statusLabel = 
      reviewStatus === 'approved' ? '受取済み (承認)' : 
      reviewStatus === 'rejected' ? '否認 (却下)' : 
      '審査中';

    let statusDetail = '現在、領収書の内容を確認しております。';
    if (reviewStatus === 'approved') {
      statusDetail = '領収書が受理されました。ありがとうございます。';
    } else if (reviewStatus === 'rejected') {
      statusDetail = '申し訳ございませんが、領収書を受理できませんでした。内容をご確認ください。';
      if (rejectReason) statusDetail += `\n\n【否認理由】\n${rejectReason}`;
      if (requireResubmission) statusDetail += '\n\n【お願い】\nお手数ですが、領収書の写真を再度撮影し、このトーク画面に送信し直してください。';
    }

    const extraInfo = (date || projectName || costCenterName)
      ? `\n📅 日付：${date || '—'}\n📁 プロジェクト：${projectName || '—'}\n🏢 センター：${costCenterName || '—'}`
      : '';


    const fullMessage = `${statusEmoji} 領収書の確認状況が変わりました。\n\nステータス：${statusLabel}\n${statusDetail}\n\n📝 内容：${description || '—'}\n💰 金額：¥${amount.toLocaleString('ja-JP')}${extraInfo}`;

    await lineClient.pushMessage({
      to: lineUserId,
      messages: [{
        type: 'text',
        text: fullMessage
      }]
    });

    await logInteraction(ownerId, lineUserId, { role: 'system', text: fullMessage });

    return { success: true };
  } catch (error) {
    console.error('[NotifyReviewStatus] Error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Server Action para confirmar ao usuário LINE que a assinatura foi recebida.
 */
export async function notifySignatureComplete(
  ownerId: string,
  lineUserId: string,
  amount: number,
  description: string,
  signedAt: string
) {
  try {
    const ownerData = await getOwnerCredentials(ownerId);
    if (!ownerData) return { success: false, error: 'Owner not found' };

    const accessToken = ownerData.lineChannelAccessToken;
    if (!accessToken) return { success: false, error: 'Access token missing' };

    const lineClient = getLineClient(accessToken);

    const dateStr = new Date(signedAt).toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

    await lineClient.pushMessage({
      to: lineUserId,
      messages: [
        {
          type: 'flex',
          altText: '✅ 署名が完了しました',
          contents: {
            type: 'bubble',
            header: {
              type: 'box',
              layout: 'vertical',
              backgroundColor: '#064e3b',
              contents: [
                { type: 'text', text: '✅ 署名完了', weight: 'bold', color: '#ffffff', size: 'sm' }
              ]
            },
            body: {
              type: 'box',
              layout: 'vertical',
              spacing: 'md',
              contents: [
                { type: 'text', text: '領収書への署名が確認されました', weight: 'bold', size: 'md', color: '#111827', wrap: true },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'lg',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'box', layout: 'baseline', spacing: 'sm',
                      contents: [
                        { type: 'text', text: '金額', color: '#6b7280', size: 'sm', flex: 2 },
                        { type: 'text', text: `¥${amount.toLocaleString('ja-JP')}`, weight: 'bold', color: '#111827', size: 'sm', flex: 5 }
                      ]
                    },
                    {
                      type: 'box', layout: 'baseline', spacing: 'sm',
                      contents: [
                        { type: 'text', text: '摘要', color: '#6b7280', size: 'sm', flex: 2 },
                        { type: 'text', text: description || '—', color: '#111827', size: 'sm', flex: 5, wrap: true }
                      ]
                    },
                    {
                      type: 'box', layout: 'baseline', spacing: 'sm',
                      contents: [
                        { type: 'text', text: '署名日時', color: '#6b7280', size: 'sm', flex: 2 },
                        { type: 'text', text: dateStr, color: '#111827', size: 'sm', flex: 5, wrap: true }
                      ]
                    }
                  ]
                }
              ]
            },
            footer: {
              type: 'box',
              layout: 'vertical',
              contents: [
                { type: 'text', text: 'このメッセージは自動送信です', color: '#9ca3af', size: 'xs', align: 'center' }
              ]
            }
          }
        }
      ]
    });

    const textMsg = `✅ 署名完了\n領収書への署名が確認されました\n\n金額: ¥${amount.toLocaleString('ja-JP')}\n摘要: ${description || '—'}\n署名日時: ${dateStr}`;
    await logInteraction(ownerId, lineUserId, { role: 'system', text: textMsg });

    return { success: true };
  } catch (error) {
    console.error('[NotifySignatureComplete] Error:', error);
    return { success: false, error: String(error) };
  }
}
