import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getLineClient } from '@/lib/line';
import { rtdb } from '@/lib/firebase';
import { getOwnerCredentials } from '@/lib/line-server';
import { extractExpenseDetailsDirect, extractMultipleReceipts } from '@/ai/direct-extract';
import { adminStorage } from '@/lib/firebase';
import { processExpenseNtaCheck } from '@/lib/nta-service';
import { i18n } from '@/ai/i18n';
import { logAudit } from '@/lib/audit';
import { handleLineTextMessage, saveUserPreference, learnFromExpense, suggestCcFromPatterns, detectAmountAnomaly, logInteraction } from '@/ai/line-ai-manager';
import { extractInviteHash } from '@/lib/hash-utils';

export async function POST(req: NextRequest, { params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId: webhookId } = await params;
  const body = await req.text();

  // DIAGNOSTIC: registra o hit do webhook (sem bloquear o fluxo)
  const diagRef = rtdb.ref(`debug_webhook/${webhookId}`).push();
  const diagId = diagRef.key;
  
  console.log(`\n--- WEBHOOK HIT: ${webhookId} (diag: ${diagId}) ---`);

  await diagRef.set({
    ts: Date.now(),
    stage: 'received',
    webhookId,
    bodyPreview: body.slice(0, 400),
  }).catch(() => {});

  try {
    let ownerData = await getOwnerCredentials(webhookId);


    if (!ownerData) {
      console.warn(`[webhook] Webhook ID NOT FOUND: ${webhookId}`);
      await rtdb.ref(`debug_webhook/${webhookId}/${diagId}/stage_no_owner`).set(Date.now()).catch(() => {});
      return new NextResponse('OK', { status: 200 });
    }

    const companyId = String(ownerData.ownerId || ownerData.id || '').replace(/[.#$[\]]/g, '_');
    if (!companyId) {
       console.error(`[webhook] FATAL: Could not resolve companyId for ${webhookId}`);
       return new NextResponse('OK', { status: 200 });
    }

    const channelAccessToken = ownerData.lineChannelAccessToken;
    
    if (!channelAccessToken) {
       console.error(`[webhook] FATAL: No Channel Access Token found for ${companyId}`);
       return new NextResponse('OK', { status: 200 });
    }

    console.log(`[webhook] RESOLVED: company=${companyId}, bot_token=${channelAccessToken.substring(0, 10)}...`);
    const lineClient = getLineClient(channelAccessToken);

    await rtdb.ref(`debug_webhook/${webhookId}/${diagId}/resolved`).set({
      companyId,
      ownerDataId: ownerData.id,
      ownerDataOwnerId: ownerData.ownerId || null,
      hasToken: !!channelAccessToken,
    }).catch(() => {});

    const payload = JSON.parse(body);
    const events = payload.events || [];
    await rtdb.ref(`debug_webhook/${webhookId}/${diagId}/events`).set({
      count: events.length,
      types: events.map((e: any) => e.type),
      userIds: events.map((e: any) => e.source?.userId || null),
      msgTypes: events.map((e: any) => e.message?.type || null),
    }).catch(() => {});
    if (events.length === 0) return NextResponse.json({ status: 'ok' });

    // Verifica se AI está ativa para este owner
    const aiConfigSnap = await rtdb.ref(`owner/${companyId}/aiConfig`).once('value');
    const aiConfig = aiConfigSnap.val() || {};
    const lineAiEnabled = !!aiConfig.lineAiEnabled;

    for (const event of events) {
      if (event.type !== 'message' && event.type !== 'follow' && event.type !== 'postback') continue;
      
      const { replyToken, source, type, message } = event;
      const userId = source?.userId;
      if (!userId) continue;

      const userRef = rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}`);
      const userSnap = await userRef.once('value');
      let userData = userSnap.val();

      // Buscar perfil do LINE para obter foto e nome
      let senderName = userData?.displayName || 'Unknown User';
      let photoUrl = userData?.photo || '';
      try {
        const profile = await lineClient.getProfile(userId);
        senderName = profile.displayName || senderName;
        photoUrl = profile.pictureUrl || photoUrl;
      } catch (e) {}

      if (!userData) {
        userData = { lineUserId: userId, displayName: senderName, photo: photoUrl, status: 0, ownerId: companyId, createdAt: new Date().toISOString() };
        await userRef.set(userData);
      } else {
        // Atualizar foto e nome se mudarem
        await userRef.update({ displayName: senderName, photo: photoUrl });
      }

      // Obter comportamento do usuário para idioma
      const behaviorSnap = await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/behavior`).once('value');
      const behavior = behaviorSnap.val() || {};
      const lang: import('@/ai/i18n').Lang = (behavior.preferredLang as import('@/ai/i18n').Lang) || 'ja';

      if (type === 'postback') {
        const data = new URLSearchParams(event.postback.data);
        const action = data.get('action');
        const expenseId = data.get('expenseId');
        if (!expenseId) continue;

        if (action === 'setpayment') {
          const paymentType = data.get('type') as string;
          await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).update({ paymentType });
          // Aprende preferência do usuário
          saveUserPreference(companyId, userId, { lastPaymentType: paymentType }).catch(() => {});
          const msg = paymentType === 'company' ? i18n('paymentCompany', lang) : i18n('paymentReimburse', lang);
          await logInteraction(companyId, userId, { role: 'user', text: `Action: Set Payment (${paymentType})` });
          await logInteraction(companyId, userId, { role: 'ai', text: msg });
          await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: msg }] });
          continue;
        } else if (action === 'cancel') {
          const expSnap = await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).once('value');
          if (!expSnap.exists()) {
             await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: i18n('alreadyProcessed', lang) }] }).catch(()=>{});
             continue;
          }
          await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).remove();
          await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/preferences/pendingExpenseId`).remove();
          const msg = i18n('cancelled', lang);
          await logInteraction(companyId, userId, { role: 'user', text: 'Action: Cancel Submission' });
          await logInteraction(companyId, userId, { role: 'ai', text: msg });
          await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: msg }] });
        } else if (action === 'setcc') {
          const ccId = data.get('ccId');
          const pId = data.get('pId');
          const ccName = data.get('ccName') || '選択された原価センター';
          // Buscar categoria da despesa para aprender padrão
          const expSnap = await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).once('value');
          const expData = expSnap.val();
          if (!expData || expData.status === 'processed') {
            await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: i18n('alreadyProcessed', lang) }] }).catch(()=>{});
            continue;
          }
          
          await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).update({
             costcenterId: ccId, costcenterName: ccName, projectId: pId, status: 'processed'
          });
          await logAudit({ ownerId: companyId, actor: { type: 'lineUser', id: userId, name: senderName }, action: 'update', entity: { type: 'expense', id: expenseId!, path: `owner_data/${companyId}/expenses/${expenseId}`, label: `¥${Number(expData.amount||0).toLocaleString()} ${expData.description||''}` }, before: expData, after: { ...expData, costcenterId: ccId, costcenterName: ccName, projectId: pId, status: 'processed' }, source: 'line_bot' });
          await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/preferences/pendingExpenseId`).remove();
          saveUserPreference(companyId, userId, { favoriteCcId: ccId || '', favoriteCcName: ccName || '' }).catch(() => {});
          // Aprender padrão: categoria → CC
          learnFromExpense(companyId, userId, {
            category: expData.category, amount: expData.amount,
            ccId: ccId || '', ccName: ccName || '', pId: pId || ''
          }).catch(() => {});
          
          const pNameSnap = await rtdb.ref(`owner_data/${companyId}/projects/${pId}/name`).once('value');
          const pName = pNameSnap.val() || 'Project';
          
          const msg = i18n('ccRegistered', lang, ccName, Number(expData.amount||0).toLocaleString(), expData.description||'---', expData.date||'', pName);
          await logInteraction(companyId, userId, { role: 'user', text: `Action: Select CC (${ccName})` });
          await logInteraction(companyId, userId, { role: 'ai', text: msg });

          await lineClient.replyMessage({ replyToken, messages: [{
            type: 'text',
            text: msg,
          }]});
        } else if (action === 'cancel_duplicate') {
          await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).remove();
          await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: i18n('cancelled', lang) }] }).catch(() => {});
        } else if (action === 'keep_duplicate') {
          // Mantém como pending_cc para o usuário vincular o CC normalmente
          await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).update({ status: 'pending_cc' });
          const availableCcs = await getAvailableCcs(companyId, userId, userData.lineUserId);
          if (availableCcs.length === 1) {
            const cc = availableCcs[0];
            await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).update({
              costcenterId: cc.ccId, costcenterName: cc.ccName, projectId: cc.pId, status: 'processed'
            });
            await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: i18n('autoAssigned', lang, cc.ccName) }] }).catch(() => {});
          } else {
            await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/preferences/pendingExpenseId`).set(expenseId);
            const dupExpSnap = await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).once('value');
            const dupExpData = dupExpSnap.val();
            const flexMsg = buildCcFlexMessage(availableCcs, expenseId, lang, dupExpData?.type || 'expense');
            await lineClient.replyMessage({ replyToken, messages: [
              { type: 'text', text: i18n('selectCC', lang) },
              flexMsg
            ] }).catch(() => {});
          }
        } else if (action === 'toggle_type') {
          const expSnap = await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).once('value');
          const expData = expSnap.val();
          if (!expData || expData.status === 'processed') {
            await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: i18n('alreadyProcessed', lang) }] }).catch(()=>{});
            continue;
          }
          
          let newType = 'expense';
          if (expData.type === 'expense') newType = 'income_amortization';
          else if (expData.type === 'income_amortization') newType = 'income_additive';
          else newType = 'expense';
          
          await rtdb.ref(`owner_data/${companyId}/expenses/${expenseId}`).update({ type: newType });
          
          const availableCcs = await getAvailableCcs(companyId, userId, userData.lineUserId);
          const flexMsg = buildCcFlexMessage(availableCcs, expenseId, lang, newType);
          await lineClient.replyMessage({ replyToken, messages: [flexMsg] });
        }
        continue;
      }

      // ── Evento follow: usuário adicionou o bot ──────────────────────────────
      if (type === 'follow') {
        // Se o usuário ainda não tem status 2 (ativo), orienta a enviar o código
        if (userData.status !== 2) {
          const followMsg = i18n('sendInviteCode', lang);
          await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: followMsg }] })
            .catch(() => lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: followMsg }] }).catch(() => {}));
        }
        continue;
      }

      if (type === 'message') {
        const text = (message.text || "").trim();
        const potentialHash = extractInviteHash(text);
        const hasPotentialHash = potentialHash !== null;

        await rtdb.ref(`debug_webhook/${webhookId}/${diagId}/msg`).set({
          userId, 
          msgType: message.type, 
          userStatus: userData.status ?? null, 
          companyId,
          text_preview: text.slice(0, 50),
          hasPotentialHash,
          potentialHash
        }).catch(() => {});

        // Comando especial de debug para o desenvolvedor identificar o ownerId
        if (text.toUpperCase().trim() === 'DEBUG_ID') {
          console.log(`[webhook] DEBUG_ID command received. companyId: ${companyId}, userId: ${userId}`);
          const debugMsg = `SUCESSO: Webhook Ativo!\n\nID do Bot: ${webhookId}\nID da Empresa: ${companyId}\nSeu ID de Usuário: ${userId}\nStatus Interno: ${userData.status}`;
          await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: debugMsg }] }).catch(err => {
            console.error('[webhook] Erro ao enviar DEBUG_ID:', err.message);
          });
          continue;
        }

        if (userData.status === 2 && message.type === 'text' && !hasPotentialHash) {
          // Exibe animação de "digitando" se for um usuário ativo enviando texto comum
          lineClient.showLoadingAnimation({ chatId: userId, loadingSeconds: 20 }).catch(() => {});
          await logInteraction(companyId, userId, { role: 'user', text });
          await rtdb.ref(`debug_webhook/${webhookId}/${diagId}/log_user_text`).set(Date.now()).catch(() => {});
        }

        if (hasPotentialHash && potentialHash) {
          console.log(`[webhook] Detectado potencial hash: ${potentialHash} de status: ${userData.status}`);
          if (userData.status === 2) {
            // Se já for status 2, só processa como hash se não houver texto ao redor (evita falso positivo com IDs de despesa)
            const isPureHash = text.toUpperCase().replace(/^#/, '') === potentialHash;
            if (isPureHash) {
              console.log(`[webhook] Usuário já ativo enviando hash puro. Ignorando.`);
              const alreadyRegMsg = i18n('alreadyRegistered', lang) || "既に登録されています。ハッシュコードの送信は不要です。";
              await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: alreadyRegMsg }] }).catch(err => {
                console.error('[webhook] Erro ao enviar alreadyRegistered:', err.message);
              });
              continue;
            }
          } else {
            // USUÁRIO NOVO OU PENDENTE ENVIANDO ALGO QUE PARECE UM HASH
            try {
              console.log(`[webhook] Iniciando processInviteHash para ${potentialHash}...`);
              await rtdb.ref(`debug_webhook/${webhookId}/${diagId}/hash_match`).set({ potentialHash, originalText: text, userStatus: userData.status }).catch(() => {});
              await processInviteHash(lineClient, companyId, userId, senderName, photoUrl, replyToken, potentialHash, lang);
              console.log(`[webhook] processInviteHash concluído.`);
              continue; 
            } catch (e: any) {
              console.error('[webhook] Critical error:', e);
              const errTxt = `⚠️ [TESTE_DEPLOY_2026] ESTA MENSAGEM FOI ALTERADA AGORA. Se você está vendo isso, o deploy funcionou.\n\nError: ${e.message || String(e)}`;
              
              // Tenta via reply, se falhar tenta via push
              await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: errTxt }] })
                .catch(() => lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: errTxt }] }).catch(() => {}));
              continue;
            }
          }
        }

        if (userData.status === 2) {
          if (message.type === 'image') {
            const base64Image = await getLineContentAsBase64(message.id, channelAccessToken);
            const photoDataUri = `data:image/jpeg;base64,${base64Image}`;
            
            // Upload immediately to log the interaction with image
            let interactionImageUrl = '';
            try {
              interactionImageUrl = await uploadBase64ToStorage(companyId, userId, base64Image, `${Date.now()}_log_input.jpg`);
              await logInteraction(companyId, userId, { role: 'user', imageUrl: interactionImageUrl });
            } catch {}

            // Confirma o webhook imediatamente (replyToken expira em ~30s)
            const aiProcMsg = i18n('aiProcessing', lang);
            await logInteraction(companyId, userId, { role: 'ai', text: aiProcMsg });
            await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: aiProcMsg }] }).catch(() => {});
            const multiInput = { photoDataUri, companyName: ownerData.companyName, apiKey: ownerData.googleGenAiApiKey };

            // Tenta extrair múltiplos recibos
            try {
              const multiResult = await extractMultipleReceipts(multiInput);
              if (multiResult.usage) await saveTokenUsage(companyId, multiResult.usage);

              if (multiResult.receipts.length > 1) {
                // Múltiplos recibos — processa cada um em paralelo e notifica com resumo
                await lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: `📋 ${multiResult.receipts.length}件のレシートを検出いたしました。\nそれぞれ個別に処理いたします。` }] }).catch(() => {});
                await Promise.all(multiResult.receipts.map((receipt, idx) =>
                  processExpenseFromReceipt(lineClient, companyId, userId, userData, photoDataUri, receipt, idx, multiResult.receipts.length, lang, behavior)
                ));
              } else if (multiResult.receipts.length === 1) {
                // 1 recibo — fluxo normal via processExpense
                await processExpense(lineClient, companyId, userId, userData, null, { photoDataUri, companyName: ownerData.companyName }, ownerData.googleGenAiApiKey, lineAiEnabled, lang, behavior);
              } else {
                await lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: i18n('notReceipt', lang) }] }).catch(() => {});
              }
            } catch {
              // Fallback para extração simples
              await processExpense(lineClient, companyId, userId, userData, null, { photoDataUri, companyName: ownerData.companyName }, ownerData.googleGenAiApiKey, lineAiEnabled, lang, behavior);
            }
          } else if (message.type === 'text') {
            // Verifica se usuário está aguardando seleção de CC (via texto/voz)
            const handled = await tryHandlePendingCcByText(lineClient, companyId, userId, userData, text, replyToken, lang);
            if (handled) continue;

            if (lineAiEnabled && ownerData.googleGenAiApiKey) {
              const aiResult = await handleLineTextMessage(text, {
                companyId, userId, userData, apiKey: ownerData.googleGenAiApiKey
              });
              if (aiResult.usage) await saveTokenUsage(companyId, aiResult.usage);
              await logInteraction(companyId, userId, { role: 'ai', text: aiResult.text });
              await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: aiResult.text }] });
            } else {
              await processExpense(lineClient, companyId, userId, userData, replyToken, { message: text, companyName: ownerData.companyName }, ownerData.googleGenAiApiKey, false, lang, behavior);
            }
          }
        } else {
          const msg = userData.status === 1 ? i18n('pendingApproval', lang) : i18n('sendInviteCode', lang);
          await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: msg }] })
            .catch(() => lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: msg }] }).catch(() => {}));
        }
      }
    }

    await rtdb.ref(`debug_webhook/${webhookId}/${diagId}/done`).set(Date.now()).catch(() => {});
    return NextResponse.json({ status: 'ok' });
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const errorStack = error?.stack || '';
    
    console.error('[webhook] FATAL ERROR:', errorMsg);
    
    // Log detalhado no Realtime Database para diagnósticos
    try {
      await rtdb.ref(`debug_webhook/${webhookId}/${diagId}/FATAL_ERROR`).set({
        timestamp: Date.now(),
        message: errorMsg,
        stack: errorStack.slice(0, 1500),
        webhookId,
        ownerResolved: !!ownerData
      });
    } catch {}

    // Tenta notificar o(s) usuário(s) afetado(s) para evitar silêncio total
    try {
      const ownerFallback = await getOwnerCredentials(webhookId);
      const fallbackToken = ownerFallback?.lineChannelAccessToken;
      if (fallbackToken) {
        const payload = JSON.parse(body);
        const events = payload.events || [];
        const lc = getLineClient(fallbackToken);
        for (const ev of events) {
          const uid = ev.source?.userId;
          if (uid) {
            await lc.pushMessage({ to: uid, messages: [{ type: 'text', text: `⚠️ 処理中にエラーが発生いたしました。\n\n[Fatal Error]: ${errorMsg}` }] }).catch(() => {});
          }
        }
      }
    } catch (innerErr) {
      console.error('[webhook] Error sending fallback notification:', innerErr);
    }
    return new NextResponse('OK', { status: 200 });
  }
}

async function processInviteHash(lineClient: any, companyId: string, userId: string, senderName: string, photoUrl: string, replyToken: string, hash: string, lang: import('@/ai/i18n').Lang) {
  // Log diagnóstico: início da função
  const diagRef = rtdb.ref(`debug_invite/${companyId}/${userId}`);
  await diagRef.set({ ts: Date.now(), hash, companyId, userId, stage: 'started' }).catch(() => {});

  // 1. Validar convite
  const invitesRef = rtdb.ref(`owner_data/${companyId}/invites`);
  let invitesSnap;
  try {
    await diagRef.update({ stage: 'query_start', path: `owner_data/${companyId}/invites`, hash }).catch(() => {});
    invitesSnap = await invitesRef.orderByChild('hash').equalTo(hash).once('value');
  } catch (err: any) {
    console.error('[processInviteHash] Query error:', err.message);
    await diagRef.update({ stage: 'query_error', error: err.message, stack: err.stack }).catch(() => {});
    throw new Error(`Database query failed: ${err.message}`);
  }

  await diagRef.update({ stage: 'queried', inviteExists: invitesSnap.exists(), hashQueried: hash }).catch(() => {});

  if (!invitesSnap.exists()) {
    await diagRef.update({ stage: 'not_found' }).catch(() => {});
    const msg = i18n('invalidCode', lang);
    await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: msg }] })
      .catch(() => lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: msg }] }).catch(() => {}));
    return;
  }

  let inviteKey: string | null = null;
  let inviteData: any = null;
  invitesSnap.forEach((child: any) => { 
    const val = child.val();
    if (!val.used) { inviteKey = child.key; inviteData = val; } 
  });

  await diagRef.update({ 
    stage: 'found_invite', 
    found: invitesSnap.exists(), 
    inviteKey, 
    inviteUsed: !inviteKey,
    debug_companyId: companyId
  }).catch(() => {});

  if (!inviteKey) {
    const msg = i18n('codeUsed', lang);
    await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: msg }] })
      .catch(() => lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: msg }] }).catch(() => {}));
    return;
  }

  const isManager = inviteData.role === 'manager';
  const inviteLang = (inviteData?.language as import('@/ai/i18n').Lang) || lang;

  // 2. Registrar usuário LINE
  try {
    const userDataUpdate = {
      ownerId: companyId,
      name: inviteData.inviteName || senderName,
      fullName: senderName,
      lineUserId: userId,
      photo: photoUrl || '',
      status: 2,
      updatedAt: new Date().toISOString()
    };
    await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}`).update(userDataUpdate);

    // Salva idioma e nivel de acesso
    await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/behavior`).update({
      autonomyLevel: isManager ? 'elevated' : 'standard',
      preferredLang: inviteLang,
      updatedAt: new Date().toISOString()
    });
  } catch (err: any) {
    await diagRef.update({ stage: 'user_registration_error', error: err.message }).catch(() => {});
    throw new Error(`User registration failed: ${err.message}`);
  }

  // 3. Vincular aos Cost Centers
  try {
    const costCenterIdsRaw = inviteData.costCenterIds;
    const costCenterIds: string[] = Array.isArray(costCenterIdsRaw) 
      ? costCenterIdsRaw 
      : (costCenterIdsRaw && typeof costCenterIdsRaw === 'object')
        ? Object.values(costCenterIdsRaw)
        : [];

    if (costCenterIds.length > 0) {
      const projectsSnap = await rtdb.ref(`owner_data/${companyId}/projects`).once('value');
      const projects = projectsSnap.val() || {};
      for (const [pId, pData] of Object.entries(projects) as [string, any][]) {
        if (!pData || typeof pData !== 'object' || !pData.costcenters) continue;
        for (const [ccId, ccVal] of Object.entries(pData.costcenters) as [string, any][]) {
          if (!costCenterIds.includes(ccId)) continue;
          const ccRef = rtdb.ref(`owner_data/${companyId}/projects/${pId}/costcenters/${ccId}`);
          
          let existingRaw = ccVal?.assignedLineUserIds || [];
          const existing: string[] = Array.isArray(existingRaw)
            ? existingRaw
            : (existingRaw && typeof existingRaw === 'object')
              ? Object.values(existingRaw)
              : [];

          if (!existing.includes(userId)) {
            await ccRef.update({ assignedLineUserIds: [...existing, userId] });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn('[webhook] Background CC assignment error:', err.message);
    await diagRef.update({ stage: 'cc_assignment_warning', error: err.message }).catch(() => {});
    // Não trava o processo se falhar o vínculo de CC, o registro principal já foi feito
  }

  // 4. Finalizar Convite e Log
  try {
    await rtdb.ref(`owner_data/${companyId}/invites/${inviteKey}`).update({ used: true, usedBy: userId, usedAt: new Date().toISOString() });
    
    await logAudit({ 
      ownerId: companyId, 
      actor: { type: 'lineUser', id: userId, name: senderName }, 
      action: 'create', 
      entity: { 
        type: 'lineUser', 
        id: userId, 
        path: `owner_data/${companyId}/lineUsers/${userId}`, 
        label: inviteData.inviteName || senderName 
      }, 
      after: { name: inviteData.inviteName, fullName: senderName, lineUserId: userId, status: 2 }, 
      source: 'line_bot', 
      metadata: { inviteHash: hash } 
    }).catch(() => {});
  } catch (err: any) {
    console.warn('[webhook] Audit/Invite update warning:', err.message);
  }

  const msg = isManager ? i18n('managerRegistered', inviteLang, inviteData.inviteName) : i18n('userRegistered', inviteLang, inviteData.inviteName);
  
  // Tenta responder imediatamente para não expirar o token
  await lineClient.replyMessage({ replyToken, messages: [{ type: 'text', text: msg }] })
    .catch(async (err: any) => {
      console.warn('[webhook] replyMessage falhou, tentando pushMessage:', err.message);
      await diagRef.update({ stage: 'reply_failed_using_push' }).catch(() => {});
      await lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: msg }] }).catch(() => {});
    });

  await logInteraction(companyId, userId, { role: 'ai', text: msg });
  await diagRef.update({ stage: 'done', completedAt: Date.now() }).catch(() => {});
}

/**
 * Registra interações detalhadas para consulta do administrador
 */
async function logInteraction(companyId: string, userId: string, data: { role: 'user' | 'ai' | 'system', text?: string, imageUrl?: string, metadata?: any }) {
  try {
    const logRef = rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/interactions`).push();
    await logRef.set({
      ...data,
      ts: Date.now(),
      createdAt: new Date().toISOString()
    });
    
    // Manter as últimas 100 interações para cada usuário
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
    console.error('[logInteraction] failed:', e);
  }
}

async function saveTokenUsage(companyId: string, usage: { input: number, output: number, total: number }) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const usageRef = rtdb.ref(`owner_data/${companyId}/ai_usage/${currentMonth}`);
    const snap = await usageRef.once('value');
    const currentData = snap.val() || { input: 0, output: 0, total: 0, requests: 0 };
    
    await usageRef.update({
      input: currentData.input + usage.input,
      output: currentData.output + usage.output,
      total: currentData.total + usage.total,
      requests: currentData.requests + 1,
      lastUpdated: new Date().toISOString()
    });

    const globalRef = rtdb.ref(`ai_usage_global/${currentMonth}`);
    const gSnap = await globalRef.once('value');
    const gData = gSnap.val() || { input: 0, output: 0, total: 0, requests: 0 };
    await globalRef.update({
      input: gData.input + usage.input,
      output: gData.output + usage.output,
      total: gData.total + usage.total,
      requests: gData.requests + 1,
      lastUpdated: new Date().toISOString()
    });
  } catch (e) {}
}

// ── Upload de imagem para Firebase Storage (Admin SDK) ────────────────────────
async function uploadBase64ToStorage(companyId: string, userId: string, base64: string, filename: string): Promise<string> {
  const bucket = adminStorage.bucket();
  const path = `owners/${companyId}/expenses/${userId}/${filename}`;
  const file = bucket.file(path);
  const buffer = Buffer.from(base64, 'base64');
  await file.save(buffer, { metadata: { contentType: 'image/jpeg' }, resumable: false });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

// ── Crop de uma região da imagem com jimp ──────────────────────────────────────
async function cropReceiptRegion(base64: string, bbox: [number, number, number, number]): Promise<string | null> {
  try {
    const Jimp = (await import('jimp')).default;
    const buffer = Buffer.from(base64, 'base64');
    const img = await Jimp.read(buffer);
    const W = img.getWidth();
    const H = img.getHeight();
    const [yMin, xMin, yMax, xMax] = bbox;
    // bbox em escala 0-1000 → pixels
    const x = Math.floor((xMin / 1000) * W);
    const y = Math.floor((yMin / 1000) * H);
    const w = Math.max(10, Math.floor(((xMax - xMin) / 1000) * W));
    const h = Math.max(10, Math.floor(((yMax - yMin) / 1000) * H));
    const cropped = img.crop(x, y, w, h);
    const jpegBuffer = await cropped.getBufferAsync(Jimp.MIME_JPEG);
    return jpegBuffer.toString('base64');
  } catch (e) {
    console.warn('[crop] jimp error:', e);
    return null;
  }
}

// ── Processa um recibo extraído (para fluxo de múltiplos recibos) ───────────
async function processExpenseFromReceipt(
  lineClient: any, companyId: string, userId: string, userData: any,
  photoDataUri: string, receipt: import('@/ai/direct-extract').ExtractedReceipt,
  index: number, total: number,
  lang: import('@/ai/i18n').Lang, behavior: any
) {
  const push = (messages: any[]) => lineClient.pushMessage({ to: userId, messages }).catch((e: any) => console.error('[push-multi] erro:', e?.message));
  try {
    const amount = Number(receipt.amount) || 0;
    const date = receipt.date || new Date().toISOString().split('T')[0];
    const category = receipt.category || 'Miscellaneous';
    const senderName = userData?.fullName || userData?.name || 'User';
    const ts = Date.now();

    // Upload: tenta recortar a região do recibo, senão usa imagem original
    let imageUrl: string | null = null;
    const rawBase64 = photoDataUri.split(',')[1] || photoDataUri;
    try {
      let uploadBase64 = rawBase64;
      if (receipt.bbox && total > 1) {
        const cropped = await cropReceiptRegion(rawBase64, receipt.bbox);
        if (cropped) uploadBase64 = cropped;
      }
      imageUrl = await uploadBase64ToStorage(companyId, userId, uploadBase64, `${ts}_receipt_${index + 1}.jpg`);
    } catch (uploadErr) {
      console.warn('[upload] falhou, salvando sem imagem:', uploadErr);
    }

    const duplicate = await findDuplicateExpense(companyId, amount, date, receipt.description || '');
    const newExpRef = rtdb.ref(`owner_data/${companyId}/expenses`).push();
    const expenseId = newExpRef.key;

    await newExpRef.set({
      type: receipt.transactionType || 'expense',
      userId, ownerId: companyId,
      projectId: userData?.projectId || 'unassigned',
      senderName, amount, description: receipt.description || 'LINE Expense',
      category, date, createdAt: new Date().toISOString(),
      imageUrl,
      status: duplicate ? 'duplicate_pending' : 'pending_cc',
      registrationNumber: receipt.registrationNumber || '', ntaStatus: 'pending',
      ...(duplicate ? { duplicateFlag: true, duplicateOf: duplicate.id } : {}),
    });

    if (receipt.registrationNumber && expenseId) {
      processExpenseNtaCheck(companyId, expenseId, receipt.registrationNumber).catch(console.error);
    }

    const regNum = receipt.registrationNumber ? `\n🔖 ${receipt.registrationNumber}` : '';
    const summaryLine = `${index + 1}/${total} ${i18n('aiReadResult', lang, amount.toLocaleString(), receipt.description || '---', `${date}${regNum}`)}`;

    if (duplicate) {
      const isSelf = duplicate.userId === userId;
      const alertText = isSelf ? i18n('duplicateSelf', lang, fmtDT(duplicate.createdAt)) : i18n('duplicateOther', lang, duplicate.senderName, fmtDT(duplicate.createdAt));
      await push([{ type: 'text', text: `${summaryLine}\n\n${alertText}` }, buildDuplicateFlexMessage(expenseId!, lang)]);
      return;
    }

    const availableCcs = await getAvailableCcs(companyId, userId, userData.lineUserId);
    const finalMsg = `${summaryLine}\n\n${i18n('selectCC', lang)}`;
    await logInteraction(companyId, userId, { 
      role: 'ai', 
      text: finalMsg, 
      metadata: { amount, date, description: receipt.description, registrationNumber: receipt.registrationNumber } 
    });

    if (expenseId && availableCcs.length > 0) {
      await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/preferences/pendingExpenseId`).set(expenseId);
      const ccFlex = buildCcFlexMessage(availableCcs, expenseId!, lang, receipt.transactionType || 'expense');
      await push([{ type: 'text', text: summaryLine }, ccFlex]);
    } else {
      await push([{ type: 'text', text: summaryLine }]);
    }
  } catch (e: any) {
    console.error('[processExpenseFromReceipt] error:', e?.message);
    const errText = `⚠️ レシート ${index + 1}/${total} の処理中にエラーが発生いたしました。`;
    await logInteraction(companyId, userId, { role: 'system', text: errText });
    await push([{ type: 'text', text: errText }]);
  }
}

async function processExpense(lineClient: any, companyId: string, userId: string, userData: any, replyToken: string | null, input: any, apiKey?: string, lineAiEnabled = false, lang: import('@/ai/i18n').Lang = 'en', behavior: any = {}) {
  // Sempre usa pushMessage para o resultado (garante entrega independente do replyToken)
  const push = (messages: any[]) => lineClient.pushMessage({ to: userId, messages }).catch((e: any) => console.error('[push] erro:', e?.message));
  const safeReply = async (lc: any, rt: string | null, uid: string, msgs: any[]) => {
    if (rt) return lc.replyMessage({ replyToken: rt, messages: msgs }).catch(() => push(msgs));
    return push(msgs);
  };

  if (!apiKey) {
    await safeReply(lineClient, replyToken, userId, [{ type: 'text', text: i18n('noApiKey', lang) }]);
    return;
  }

  try {
    const result = await extractExpenseDetailsDirect({ ...input, apiKey });
    const details = result.data;

    if (result.usage) {
      await saveTokenUsage(companyId, result.usage);
    }

    const amount = Number(details?.amount) || 0;
    const date = details?.date || new Date().toISOString().split('T')[0];
    const category = details?.category || 'Miscellaneous';
    const detectedType = details?.transactionType || 'expense';

    // ── Verificação de duplicidade ────────────────────────────────────────────
    const duplicate = await findDuplicateExpense(companyId, amount, date, details?.description || '');

    const newExpRef = rtdb.ref(`owner_data/${companyId}/expenses`).push();
    const expenseId = newExpRef.key;

    // Upload imagem para Storage (evita armazenar base64 no RTDB)
    let imageUrl: string | null = null;
    if (input.photoDataUri) {
      try {
        const rawBase64 = input.photoDataUri.split(',')[1] || input.photoDataUri;
        imageUrl = await uploadBase64ToStorage(companyId, userId, rawBase64, `${Date.now()}_receipt.jpg`);
      } catch (uploadErr) {
        console.warn('[upload] single receipt falhou:', uploadErr);
      }
    }

    const expensePayload = {
      type: detectedType, userId, ownerId: companyId, projectId: userData?.projectId || 'unassigned', senderName: userData?.fullName || userData?.name || 'User',
      amount, description: details?.description || 'LINE Expense', category,
      date, createdAt: new Date().toISOString(), imageUrl,
      status: duplicate ? 'duplicate_pending' : (amount > 0 ? 'pending_cc' : 'error'),
      registrationNumber: details?.registrationNumber || "", ntaStatus: 'pending',
      ...(duplicate ? { duplicateFlag: true, duplicateOf: duplicate.id } : {}),
    };
    await newExpRef.set(expensePayload);
    await logAudit({ ownerId: companyId, actor: { type: 'lineUser', id: userId, name: userData?.fullName || userData?.name || 'User' }, action: 'create', entity: { type: 'expense', id: expenseId!, path: `owner_data/${companyId}/expenses/${expenseId}`, label: `¥${amount.toLocaleString()} ${details?.description || ''}` }, after: expensePayload, source: 'line_bot' });

    if (details?.registrationNumber && expenseId) {
      processExpenseNtaCheck(companyId, expenseId, details.registrationNumber).catch(console.error);
    }

    // Resumo lido pelo AI (usado em duplicata e no fluxo normal)
    const regNum = details?.registrationNumber ? `\n🔖 ${details.registrationNumber}` : '';
    const summaryTextEarly = i18n('aiReadResult', lang, amount.toLocaleString(), details?.description || '---', `${date}${regNum}`);

    // ── Fluxo de duplicata ────────────────────────────────────────────────────
    if (duplicate) {
      const isSelf = duplicate.userId === userId;
      const dupDateTime = fmtDT(duplicate.createdAt);
      const alertText = isSelf
        ? i18n('duplicateSelf', lang, dupDateTime)
        : i18n('duplicateOther', lang, duplicate.senderName, dupDateTime);
      const flexDup = buildDuplicateFlexMessage(expenseId!, lang);
      await push([{ type: 'text', text: `${summaryTextEarly}\n\n${alertText}` }, flexDup]);
      return;
    }

    const availableCcs = await getAvailableCcs(companyId, userId, userData.lineUserId);

    // Carregar behavior para verificar autoAssignCC
    let autoAssignEnabled = true;
    try {
      const behaviorSnap = await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/behavior/autoAssignCC`).once('value');
      const val = behaviorSnap.val();
      if (val === false) autoAssignEnabled = false; // só desativa se explicitamente false
    } catch {}

    // Carregar padrões aprendidos do usuário
    let userPatterns;
    try {
      const pSnap = await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/patterns`).once('value');
      userPatterns = pSnap.val() || { categoryCcMap: {}, usageStreak: { ccId: '', ccName: '', count: 0 }, avgAmountByCategory: {}, totalExpenses: 0 };
    } catch {
      userPatterns = { categoryCcMap: {}, usageStreak: { ccId: '', ccName: '', count: 0 }, avgAmountByCategory: {}, totalExpenses: 0 };
    }

    // Verificar anomalia de valor
    const anomaly = detectAmountAnomaly(userPatterns, category, amount);

    const anomalyNote = anomaly.isAnomaly ? `\n${anomaly.message}` : '';
    const summaryText = i18n('aiReadResult', lang, amount.toLocaleString(), details?.description || '---', `${date}${regNum}${anomalyNote}`);

    if (availableCcs.length === 0) {
      console.log('[processExpense] Nenhum CC disponível para userId:', userId);
      await safeReply(lineClient, replyToken, userId, [{
        type: 'text',
        text: `${summaryText}\n\n${i18n('noCCWebhook', lang)}`
      }]);
      return;
    }

    // Helper: alerta de orçamento após atribuição de CC
    const checkBudgetAlert = async (ccId: string, pId: string, newAmount: number): Promise<string> => {
      try {
        const ccSnap = await rtdb.ref(`owner_data/${companyId}/projects/${pId}/costcenters/${ccId}`).once('value');
        const ccData = ccSnap.val();
        if (!ccData?.budgetLimit || ccData.budgetLimit <= 0) return '';
        const used = (Number(ccData.totalValue) || 0) + newAmount;
        const pct = Math.round((used / ccData.budgetLimit) * 100);
        if (pct >= 100) return i18n('budgetOver100', lang, pct, used.toLocaleString(), Number(ccData.budgetLimit).toLocaleString());
        if (pct >= 80) return i18n('budgetWarning80', lang, pct, used.toLocaleString(), Number(ccData.budgetLimit).toLocaleString());
      } catch {}
      return '';
    };

    // Sempre perguntar ao usuário, mesmo que só tenha 1 CC
    const suggestion = suggestCcFromPatterns(userPatterns, category, availableCcs);
    if (expenseId && availableCcs.length > 0) {
      await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/preferences/pendingExpenseId`).set(expenseId);
    }

    let suggestionHint = '';
    if (suggestion && (suggestion.confidence === 'high' || suggestion.confidence === 'medium')) {
      suggestionHint = `\n${i18n('recommend', lang)}: ${suggestion.ccName}`;
    }

    const ccFlex = buildCcFlexMessage(availableCcs, expenseId!, lang, detectedType);
    const finalMsg = `${summaryText}\n\n${i18n('selectCC', lang)}${suggestionHint}`;
    
    await logInteraction(companyId, userId, { 
      role: 'ai', 
      text: finalMsg, 
      metadata: { amount, date, description: details?.description, type: detectedType } 
    });

    await push([
      { type: 'text', text: finalMsg },
      ccFlex
    ]);
  } catch (e: any) {
    console.error('[processExpense] error:', e?.message || e);
    const errMsg = e?.message?.includes('AI Failure')
      ? `${i18n('aiError', lang)}\n(${e.message.substring(0, 80)})`
      : `${i18n('processError', lang)}\n(${String(e?.message || e).substring(0, 80)})`;
    await lineClient.pushMessage({ to: userId, messages: [{ type: 'text', text: errMsg }] }).catch(() => {});
  }
}

async function getLineContentAsBase64(messageId: string, token: string): Promise<string> {
  const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, { headers: { 'Authorization': `Bearer ${token}` } });
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

async function getAvailableCcs(companyId: string, userId: string, lineUserId?: string) {
  const projectsSnap = await rtdb.ref(`owner_data/${companyId}/projects`).once('value');
  const projects = projectsSnap.val() || {};
  const assigned: { pId: string; ccId: string; ccName: string; pName: string }[] = [];
  const all: { pId: string; ccId: string; ccName: string; pName: string }[] = [];

  Object.entries(projects).forEach(([pId, pData]: [string, any]) => {
    if (pData.costcenters) {
      Object.entries(pData.costcenters).forEach(([ccId, ccData]: [string, any]) => {
        const cc = { pId, ccId, ccName: ccData.name, pName: pData.name };
        all.push(cc);
        const assignedIds: string[] = ccData.assignedLineUserIds || [];
        if (assignedIds.includes(userId) || (lineUserId && assignedIds.includes(lineUserId))) {
          assigned.push(cc);
        }
      });
    }
  });

  // Se o usuário tem CCs específicos atribuídos, usa eles. Caso contrário, mostra todos.
  return assigned.length > 0 ? assigned : all;
}

function buildCcFlexMessage(availableCcs: { pId: string; ccId: string; ccName: string; pName: string }[], expenseId: string, lang: import('@/ai/i18n').Lang, currentType: string = 'expense'): any {
  const byProject: Record<string, { pId: string; ccs: typeof availableCcs }> = {};
  availableCcs.forEach(cc => {
    if (!byProject[cc.pName]) byProject[cc.pName] = { pId: cc.pId, ccs: [] };
    byProject[cc.pName].ccs.push(cc);
  });

  const bodyContents: any[] = [];
  
  // Customizações de Cores e Textos baseado no Type
  let headerText = i18n('headerExpense', lang);
  let headerColor = '#f43f5e'; // Rose-500
  let toggleText = i18n('btnToggleAmortization', lang);
  
  if (currentType === 'income_amortization') {
    headerText = i18n('headerAmortization', lang);
    headerColor = '#10b981'; // Emerald-500
    toggleText = i18n('btnToggleAdditive', lang);
  } else if (currentType === 'income_additive') {
    headerText = i18n('headerAdditive', lang);
    headerColor = '#3b82f6'; // Blue-500
    toggleText = i18n('btnToggleExpense', lang);
  }

  // Header Toggle Button
  bodyContents.push({
    type: 'box',
    layout: 'vertical',
    backgroundColor: headerColor,
    paddingAll: '12px',
    cornerRadius: '12px',
    margin: 'sm',
    contents: [
      { type: 'text', text: headerText, weight: 'bold', size: 'sm', color: '#ffffff', align: 'center' }
    ]
  });
  
  bodyContents.push({
    type: 'button',
    action: {
      type: 'postback',
      label: toggleText,
      data: `action=toggle_type&expenseId=${expenseId}`,
      displayText: i18n('typeChanged', lang)
    },
    style: 'secondary',
    height: 'sm',
    margin: 'md'
  });

  bodyContents.push({ type: 'separator', margin: 'lg' });
  
  Object.entries(byProject).forEach(([pName, data]) => {
     bodyContents.push({ type: 'text', text: `📁 ${pName}`, weight: 'bold', size: 'sm', color: '#64748b', margin: 'md' });
     data.ccs.forEach(cc => {
        bodyContents.push({
           type: 'button',
           action: {
             type: 'postback',
             label: cc.ccName.substring(0, 20),
             data: `action=setcc&expenseId=${expenseId}&ccId=${cc.ccId}&pId=${cc.pId}&ccName=${encodeURIComponent(cc.ccName.substring(0, 30))}`,
             displayText: `${cc.ccName}`
           },
           style: 'secondary',
           height: 'sm',
           margin: 'sm'
        });
     });
  });

  bodyContents.push({ type: 'separator', margin: 'lg' });
  bodyContents.push({
     type: 'button',
     action: {
       type: 'postback',
       label: i18n('btnCancel', lang),
       data: `action=cancel&expenseId=${expenseId}`,
       displayText: i18n('cancelled', lang)
     },
     style: 'primary',
     color: '#ef4444',
     height: 'sm',
     margin: 'lg'
  });

  return {
    type: 'flex',
    altText: i18n('altSelectCc', lang),
    contents: {
       type: 'bubble',
       size: 'mega',
       body: {
         type: 'box',
         layout: 'vertical',
         paddingAll: '15px',
         contents: bodyContents
       }
    }
  };
}

// ── Formata data/hora para mensagens LINE ──────────────────────────────────────
function fmtDT(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ── Verifica duplicidade de recibo ─────────────────────────────────────────────
async function findDuplicateExpense(companyId: string, amount: number, date: string, description: string): Promise<{ id: string; senderName: string; createdAt: string; userId: string } | null> {
  if (!amount || amount <= 0) return null;

  const norm = (s: string) => s.toLowerCase().replace(/[\s\W]/g, '').trim();
  const normDate = (d: string) => d?.replace(/\//g, '-').substring(0, 10) || '';
  const targetDesc = norm(description);
  const targetDate = normDate(date);

  // Busca por amount (indexed) — fallback para full-scan se falhar
  let snap: any;
  try {
    snap = await rtdb.ref(`owner_data/${companyId}/expenses`).orderByChild('amount').equalTo(amount).get();
  } catch {
    snap = await rtdb.ref(`owner_data/${companyId}/expenses`).limitToLast(500).get();
  }
  if (!snap?.exists()) return null;

  let found: any = null;
  snap.forEach((child: any) => {
    if (found) return;
    const exp = child.val();
    // Ignora rejeitados, duplicatas já marcadas e o próprio registro
    if (exp.reviewStatus === 'rejected') return;
    if (exp.duplicateFlag) return;
    if (Number(exp.amount) !== amount) return;

    // Verifica data (aceita diferença de até 1 dia para fusos)
    const expDate = normDate(exp.date || '');
    if (targetDate && expDate && Math.abs(
      new Date(targetDate).getTime() - new Date(expDate).getTime()
    ) > 86400000) return;

    // Verifica similaridade de descrição
    const expDesc = norm(exp.description || '');
    const minLen = Math.min(targetDesc.length, expDesc.length);
    const compareLen = Math.min(10, minLen);
    if (compareLen < 2) return;

    const similar =
      targetDesc.substring(0, compareLen) === expDesc.substring(0, compareLen) ||
      (targetDesc.length >= 6 && expDesc.includes(targetDesc.substring(0, 6))) ||
      (expDesc.length >= 6 && targetDesc.includes(expDesc.substring(0, 6)));

    if (similar) {
      found = { id: child.key, senderName: exp.senderName || '不明', createdAt: exp.createdAt, userId: exp.userId };
    }
  });

  return found;
}

// ── Flex de confirmação de duplicata ──────────────────────────────────────────
function buildDuplicateFlexMessage(expenseId: string, lang: import('@/ai/i18n').Lang): any {
  return {
    type: 'flex',
    altText: i18n('altSelectCc', lang),
    contents: {
      type: 'bubble',
      size: 'kilo',
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '15px',
        spacing: 'md',
        contents: [
          {
            type: 'button',
            action: { type: 'postback', label: i18n('duplicateCancel', lang), data: `action=cancel_duplicate&expenseId=${expenseId}`, displayText: i18n('cancelled', lang) },
            style: 'primary',
            color: '#ef4444',
            height: 'sm',
          },
          {
            type: 'button',
            action: { type: 'postback', label: i18n('duplicateKeep', lang), data: `action=keep_duplicate&expenseId=${expenseId}`, displayText: i18n('btnKeepBoth', lang) },
            style: 'secondary',
            height: 'sm',
          },
        ],
      },
    },
  };
}

// Tenta vincular CC por texto digitado/falado quando há pendingExpenseId
async function tryHandlePendingCcByText(
  lineClient: any, companyId: string, userId: string, userData: any,
  text: string, replyToken: string, lang: import('@/ai/i18n').Lang
): Promise<boolean> {
  const snap = await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/preferences/pendingExpenseId`).get();
  const pendingExpenseId = snap.val();
  if (!pendingExpenseId) return false;

  const availableCcs = await getAvailableCcs(companyId, userId, userData.lineUserId);
  const normalized = text.toLowerCase().trim();
  const matched = availableCcs.find(cc =>
    cc.ccName.toLowerCase().includes(normalized) || normalized.includes(cc.ccName.toLowerCase())
  );
  if (!matched) return false;

  await rtdb.ref(`owner_data/${companyId}/expenses/${pendingExpenseId}`).update({
    costcenterId: matched.ccId, costcenterName: matched.ccName, projectId: matched.pId, status: 'processed'
  });
  await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/preferences/pendingExpenseId`).remove();
  saveUserPreference(companyId, userId, { favoriteCcId: matched.ccId, favoriteCcName: matched.ccName }).catch(() => {});
  // Aprender padrão da seleção por texto/voz
  const expSnap2 = await rtdb.ref(`owner_data/${companyId}/expenses/${pendingExpenseId}`).get();
  const expData2 = expSnap2.val() || {};
  learnFromExpense(companyId, userId, {
    category: expData2.category, amount: expData2.amount,
    ccId: matched.ccId, ccName: matched.ccName, pId: matched.pId
  }).catch(() => {});

  await lineClient.replyMessage({ replyToken, messages: [{
    type: 'text',
    text: i18n('ccRegistered', lang, matched.ccName)
  }]});
  return true;
}
