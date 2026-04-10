
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
export async function notifyWalletCredit(ownerId: string, lineUserId: string, amount: number, description: string, signUrl?: string) {
  try {
    const ownerData = await getOwnerCredentials(ownerId);
    if (!ownerData) return { success: false, error: 'Owner not found' };

    const accessToken = ownerData.lineChannelAccessToken;
    if (!accessToken) return { success: false, error: 'Access token missing' };

    const lineClient = getLineClient(accessToken);
    const desc = description?.trim() ? `\n摘要：${description.trim()}` : '';

    console.log(`[NotifyWalletCredit] Iniciando envio para ${lineUserId} | URL: ${signUrl}`);

    if (signUrl) {
      // Mensagem Flex Formal para Recibo
      try {
        await lineClient.pushMessage({
          to: lineUserId,
          messages: [
            {
              type: 'flex',
              altText: '【重要】領収書への署名依頼',
              contents: {
                type: 'bubble',
                header: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [{ type: 'text', text: '領収書 (デジタル)', weight: 'bold', color: '#ffffff', size: 'sm' }],
                  backgroundColor: '#0f172a'
                },
                body: {
                  type: 'box',
                  layout: 'vertical',
                  contents: [
                    { type: 'text', text: 'お振込み内容の確認', weight: 'bold', size: 'xl', color: '#111827' },
                    {
                      type: 'box',
                      layout: 'vertical',
                      margin: 'lg',
                      spacing: 'sm',
                      contents: [
                        {
                          type: 'box',
                          layout: 'baseline',
                          spacing: 'sm',
                          contents: [
                            { type: 'text', text: '金額', color: '#aaaaaa', size: 'sm', flex: 1 },
                            { type: 'text', text: `¥${amount.toLocaleString('ja-JP')}`, wrap: true, color: '#111827', size: 'md', weight: 'bold', flex: 4 }
                          ]
                        },
                        {
                          type: 'box',
                          layout: 'baseline',
                          spacing: 'sm',
                          contents: [
                            { type: 'text', text: '摘要', color: '#aaaaaa', size: 'sm', flex: 1 },
                            { type: 'text', text: description || '---', wrap: true, color: '#111827', size: 'sm', flex: 4 }
                          ]
                        }
                      ]
                    },
                    { type: 'text', text: '上記内容をご確認いただき、以下のボタンより署名をお願いいたします。', color: '#666666', size: 'xs', wrap: true, margin: 'xl' }
                  ]
                },
                footer: {
                  type: 'box',
                  layout: 'vertical',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'button',
                      style: 'primary',
                      height: 'sm',
                      color: '#2563eb',
                      action: { type: 'uri', label: '確認・署名する', uri: signUrl }
                    }
                  ]
                }
              }
            }
          ]
        });
        console.log('[NotifyWalletCredit] Flex Message enviada com sucesso');
      } catch (flexErr: any) {
        console.error('[NotifyWalletCredit] Erro ao enviar Flex:', flexErr.response?.data || flexErr);
        throw flexErr;
      }
    } else {
      // Fallback para mensagem de texto simples
      await lineClient.pushMessage({
        to: lineUserId,
        messages: [
          {
            type: 'text',
            text: `💰 会社よりお振込みがございました。\n金額：¥${amount.toLocaleString('ja-JP')}${desc}\n\nご不明な点がございましたら、担当者までお問い合わせくださいませ。`
          }
        ]
      });
      console.log('[NotifyWalletCredit] Texto simples enviado');
    }

    return { success: true };
  } catch (error: any) {
    console.error('[NotifyWalletCredit] Global Error:', error?.response?.data || error);
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
