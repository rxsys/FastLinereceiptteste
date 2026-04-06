import { NextRequest, NextResponse } from 'next/server';
import { rtdb } from '@/lib/firebase';
import { callGemini } from '@/ai/line-ai-manager';

// Tokens gratuitos por mês por owner (sem tokenBalance configurado)
const FREE_TOKENS_PER_MONTH = 50000;

async function saveTokenUsage(ownerId: string, usage: { input: number; output: number; total: number }) {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const usageRef = rtdb.ref(`owner_data/${ownerId}/ai_usage/${month}`);
    const snap = await usageRef.get();
    const cur = snap.val() || { input: 0, output: 0, total: 0, requests: 0 };
    await usageRef.update({
      input: cur.input + usage.input,
      output: cur.output + usage.output,
      total: cur.total + usage.total,
      requests: cur.requests + 1,
      lastUpdated: new Date().toISOString()
    });

    // Debita do saldo de tokens comprados (se existir)
    const balanceRef = rtdb.ref(`owner/${ownerId}/tokenBalance`);
    const balSnap = await balanceRef.get();
    if (balSnap.exists() && balSnap.val() !== null) {
      const newBalance = Math.max(0, (balSnap.val() || 0) - usage.total);
      await balanceRef.set(newBalance);
    }

    // Acumula total histórico
    const usedRef = rtdb.ref(`owner/${ownerId}/tokenUsed`);
    const usedSnap = await usedRef.get();
    await usedRef.set((usedSnap.val() || 0) + usage.total);
  } catch {}
}

async function checkTokenQuota(ownerId: string): Promise<{ allowed: boolean; balance: number | null; usedThisMonth: number }> {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const [balSnap, usageSnap] = await Promise.all([
      rtdb.ref(`owner/${ownerId}/tokenBalance`).get(),
      rtdb.ref(`owner_data/${ownerId}/ai_usage/${month}/total`).get(),
    ]);

    const balance: number | null = balSnap.exists() ? balSnap.val() : null;
    const usedThisMonth: number = usageSnap.val() || 0;

    // Se tem saldo comprado: verifica saldo
    if (balance !== null) return { allowed: balance > 0, balance, usedThisMonth };

    // Sem saldo comprado: usa free tier mensal
    return { allowed: usedThisMonth < FREE_TOKENS_PER_MONTH, balance: null, usedThisMonth };
  } catch {
    return { allowed: true, balance: null, usedThisMonth: 0 };
  }
}

async function loadDashboardHistory(ownerId: string, userId: string): Promise<{ role: string; text: string; ts?: number }[]> {
  try {
    const snap = await rtdb.ref(`owner_data/${ownerId}/dashboardAiHistory/${userId}/messages`).get();
    return snap.val() || [];
  } catch { return []; }
}

async function saveDashboardHistory(
  ownerId: string,
  userId: string,
  messages: { role: string; text: string; ts?: number }[],
  summary: string,
  apiKey: string
) {
  try {
    let history = messages;
    let newSummary = summary;

    // Comprime quando passa de 20 mensagens
    if (history.length > 20) {
      const toCompress = history.slice(0, 12);
      const compressPrompt = `以下の管理画面での会話を3行以内で要約してください。重要な質問と回答を保持してください:\n${toCompress.map(h => `${h.role === 'user' ? 'U' : 'A'}: ${h.text}`).join('\n')}`;
      const res = await callGemini(compressPrompt, apiKey);
      newSummary = (summary ? summary + '\n' : '') + res.text;
      history = history.slice(12);
    }

    await rtdb.ref(`owner_data/${ownerId}/dashboardAiHistory/${userId}`).update({
      messages: history.slice(-20),
      summary: newSummary,
      lastUpdated: new Date().toISOString()
    });
  } catch {}
}

export async function POST(req: NextRequest) {
  try {
    const { message, ownerId, userId } = await req.json();
    if (!message || !ownerId || !userId) return NextResponse.json({ error: 'missing params' }, { status: 400 });

    // Busca dados em paralelo
    const [ownerSnap, aiConfigSnap, projectsSnap, historyData] = await Promise.all([
      rtdb.ref(`owner/${ownerId}`).get(),
      rtdb.ref(`owner/${ownerId}/aiConfig`).get(),
      rtdb.ref(`owner_data/${ownerId}/projects`).get(),
      rtdb.ref(`owner_data/${ownerId}/dashboardAiHistory/${userId}`).get(),
    ]);

    const ownerData = ownerSnap.val() || {};
    const aiConfig = aiConfigSnap.val() || {};
    const apiKey = ownerData.googleGenAiApiKey;

    if (!aiConfig.dashboardAiEnabled) return NextResponse.json({ error: 'AI desativada' }, { status: 403 });
    if (!apiKey) return NextResponse.json({ error: 'API key não configurada' }, { status: 400 });

    // Verifica quota de tokens
    const quota = await checkTokenQuota(ownerId);
    if (!quota.allowed) {
      return NextResponse.json({
        text: '今月のAIトークン使用量が上限に達しました。追加トークンをご購入いただくか、来月までお待ちください。',
        tokenLimitReached: true,
        balance: quota.balance,
        usedThisMonth: quota.usedThisMonth
      });
    }

    // Carrega histórico e summary do RTDB
    const savedData = historyData.val() || {};
    const persistedHistory: { role: string; text: string; ts?: number }[] = savedData.messages || [];
    const persistedSummary: string = savedData.summary || '';

    // Monta contexto de projetos
    const projects = projectsSnap.val() || {};
    const projectList = Object.entries(projects).map(([, p]: [string, any]) => {
      const ccs = p.costcenters ? Object.entries(p.costcenters).map(([, cc]: [string, any]) =>
        `  - ${cc.name} (¥${cc.totalValue || 0}使用${cc.budgetLimit ? ` / 予算¥${cc.budgetLimit}` : ''})`
      ).join('\n') : '';
      return `• ${p.name}${ccs ? '\n' + ccs : ''}`;
    }).join('\n');

    const expSnap = await rtdb.ref(`owner_data/${ownerId}/expenses`).orderByChild('status').equalTo('pending_cc').get();
    let pendingCount = 0;
    if (expSnap.exists()) expSnap.forEach(() => { pendingCount++; });

    // Constrói prompt com memória persistente
    const recentHistory = persistedHistory.slice(-8)
      .map(h => `${h.role === 'user' ? 'ユーザー' : 'AI'}: ${h.text}`).join('\n');

    const prompt = `あなたはFastLine経費管理システムのAIアシスタントです。管理者向けに丁寧な日本語で簡潔にお答えください（最大200文字）。

システム状況:
${projectList || 'プロジェクトなし'}
承認待ち経費: ${pendingCount}件
${persistedSummary ? `\n過去の会話の要約:\n${persistedSummary}` : ''}
${recentHistory ? `\n直近の会話:\n${recentHistory}` : ''}

ユーザー: ${message}
AI:`;

    const result = await callGemini(prompt, apiKey);

    // Persiste histórico atualizado e usa tokens
    const updatedHistory = [
      ...persistedHistory,
      { role: 'user', text: message, ts: Date.now() },
      { role: 'ai', text: result.text, ts: Date.now() }
    ];

    await Promise.all([
      result.usage ? saveTokenUsage(ownerId, result.usage) : Promise.resolve(),
      saveDashboardHistory(ownerId, userId, updatedHistory, persistedSummary, apiKey),
    ]);

    // Recarrega quota atualizada para retornar ao cliente
    const updatedQuota = await checkTokenQuota(ownerId);

    return NextResponse.json({
      text: result.text,
      usage: result.usage,
      tokenBalance: updatedQuota.balance,
      usedThisMonth: updatedQuota.usedThisMonth,
      freeLimit: updatedQuota.balance === null ? FREE_TOKENS_PER_MONTH : null
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
