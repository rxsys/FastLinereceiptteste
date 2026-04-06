import { rtdb } from '@/lib/firebase';
import crypto from 'crypto';
import { type Lang, detectLang, resolveLang, parseLangInput, i18n, i18nLabels, i18nStatus, INTENT_KEYWORDS } from './i18n';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface LineAiContext {
  companyId: string;
  userId: string;
  userData: any;
  apiKey: string;
}

interface UserBehavior {
  customInstructions?: string;   // substitui prompt da empresa se preenchido
  preferredLang?: 'auto' | Lang;
  autonomyLevel?: 'standard' | 'elevated' | 'developer';
  linkedDashboardUid?: string;
  notes?: string;                // visível só no dashboard, usado como contexto
  autoAssignCC?: boolean;        // ativa atribuição automática de CC (default: true)
}

interface CategoryCcMapping {
  ccId: string;
  ccName: string;
  pId: string;
  count: number;            // quantas vezes essa categoria foi para esse CC
  lastUsed: string;         // ISO date
}

interface LearnedPatterns {
  categoryCcMap: Record<string, CategoryCcMapping>;  // ex: { "Food": { ccId, count } }
  usageStreak: {            // rastreia uso consecutivo do mesmo CC
    ccId: string;
    ccName: string;
    count: number;
  };
  avgAmountByCategory: Record<string, { total: number; count: number; avg: number }>;
  totalExpenses: number;
}

interface AiMemory {
  history: { role: string; text: string; ts?: number }[];
  summary: string;
  preferences: {
    lastPaymentType?: 'company' | 'reimbursement';
    favoriteCcId?: string;
    favoriteCcName?: string;
    interactionCount?: number;
    pendingExpenseId?: string;
  };
  behavior: UserBehavior;
  patterns: LearnedPatterns;
}

// Lang, detectLang, resolveLang importados de ./i18n

// ─── Memória e Behavior ───────────────────────────────────────────────────────

async function loadMemory(companyId: string, userId: string): Promise<AiMemory> {
  try {
    const snap = await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext`).get();
    const data = snap.val() || {};
    return {
      history: data.history || [],
      summary: data.summary || '',
      preferences: data.preferences || {},
      behavior: data.behavior || {},
      patterns: data.patterns || {
        categoryCcMap: {},
        usageStreak: { ccId: '', ccName: '', count: 0 },
        avgAmountByCategory: {},
        totalExpenses: 0
      }
    };
  } catch {
    return {
      history: [], summary: '', preferences: {}, behavior: {},
      patterns: { categoryCcMap: {}, usageStreak: { ccId: '', ccName: '', count: 0 }, avgAmountByCategory: {}, totalExpenses: 0 }
    };
  }
}

async function saveMemory(companyId: string, userId: string, memory: AiMemory, apiKey: string) {
  try {
    let { history, summary, preferences, behavior, patterns } = memory;
    if (history.length > 15) {
      const toCompress = history.slice(0, 10);
      const res = await callGemini(
        `Summarize this conversation in 3 lines, preserving user preferences and key facts:\n${toCompress.map(h => `${h.role}: ${h.text}`).join('\n')}`,
        apiKey
      );
      summary = (summary ? summary + '\n' : '') + res.text;
      history = history.slice(10);
    }
    await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext`).update({
      history: history.slice(-10), summary, preferences, behavior, patterns, lastUpdated: new Date().toISOString()
    });
  } catch (e) { console.warn('[saveMemory] failed:', (e as any)?.message); }
}

export async function saveUserPreference(companyId: string, userId: string, pref: { lastPaymentType?: string; favoriteCcId?: string; favoriteCcName?: string }) {
  try {
    const count = (await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/preferences/interactionCount`).get()).val() || 0;
    await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/preferences`).update({
      ...pref, interactionCount: count + 1, lastUpdated: new Date().toISOString()
    });
  } catch (e) { console.warn('[saveUserPreference] failed:', (e as any)?.message); }
}

/**
 * Aprende padrões do usuário automaticamente após cada despesa.
 * Atualiza: categoryCcMap, usageStreak, avgAmountByCategory
 */
export async function learnFromExpense(
  companyId: string,
  userId: string,
  expense: { category?: string; amount?: number; ccId?: string; ccName?: string; pId?: string }
) {
  try {
    const memory = await loadMemory(companyId, userId);
    const patterns = memory.patterns;

    // 1. Atualizar categoryCcMap
    if (expense.category && expense.ccId) {
      patterns.categoryCcMap[expense.category] = {
        ccId: expense.ccId,
        ccName: expense.ccName || '',
        pId: expense.pId || '',
        count: (patterns.categoryCcMap[expense.category]?.count || 0) + 1,
        lastUsed: new Date().toISOString()
      };
    }

    // 2. Atualizar usageStreak
    if (expense.ccId) {
      if (patterns.usageStreak.ccId === expense.ccId) {
        patterns.usageStreak.count++;
      } else {
        patterns.usageStreak = { ccId: expense.ccId, ccName: expense.ccName || '', count: 1 };
      }
    }

    // 3. Atualizar média por categoria
    if (expense.category && expense.amount) {
      const cat = expense.category;
      const existing = patterns.avgAmountByCategory[cat] || { total: 0, count: 0, avg: 0 };
      existing.total += expense.amount;
      existing.count += 1;
      existing.avg = Math.round(existing.total / existing.count);
      patterns.avgAmountByCategory[cat] = existing;
    }

    patterns.totalExpenses = (patterns.totalExpenses || 0) + 1;

    await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/patterns`).update(patterns);
  } catch (e) { console.warn('[learnFromExpense] failed:', (e as any)?.message); }
}

/**
 * Sugere CC com base nos padrões aprendidos.
 * Retorna o CC sugerido ou null se não há padrão claro.
 */
export function suggestCcFromPatterns(
  patterns: LearnedPatterns,
  category: string | undefined,
  availableCcs: { ccId: string; ccName: string; pId: string }[]
): { ccId: string; ccName: string; pId: string; confidence: 'high' | 'medium' | 'low' } | null {
  // 1. Verificar streak forte (5+ usos consecutivos do mesmo CC)
  if (patterns.usageStreak.count >= 5) {
    const match = availableCcs.find(cc => cc.ccId === patterns.usageStreak.ccId);
    if (match) return { ...match, confidence: 'high' };
  }

  // 2. Verificar categoryCcMap (3+ usos da mesma categoria → mesmo CC)
  if (category && patterns.categoryCcMap[category]) {
    const mapping = patterns.categoryCcMap[category];
    if (mapping.count >= 3) {
      const match = availableCcs.find(cc => cc.ccId === mapping.ccId);
      if (match) return { ...match, confidence: mapping.count >= 5 ? 'high' : 'medium' };
    }
  }

  // 3. Verificar CC favorito geral (>70% dos usos)
  const totalExpenses = patterns.totalExpenses || 0;
  if (totalExpenses >= 3 && patterns.usageStreak.count / totalExpenses > 0.7) {
    const match = availableCcs.find(cc => cc.ccId === patterns.usageStreak.ccId);
    if (match) return { ...match, confidence: 'medium' };
  }

  return null;
}

/**
 * Detecta se o valor é anômalo para a categoria.
 */
export function detectAmountAnomaly(
  patterns: LearnedPatterns,
  category: string | undefined,
  amount: number
): { isAnomaly: boolean; avgAmount: number; message?: string } {
  if (!category || !patterns.avgAmountByCategory[category]) {
    return { isAnomaly: false, avgAmount: 0 };
  }
  const stats = patterns.avgAmountByCategory[category];
  if (stats.count < 3) return { isAnomaly: false, avgAmount: stats.avg };

  const ratio = amount / stats.avg;
  if (ratio > 3) {
    return {
      isAnomaly: true, avgAmount: stats.avg,
      message: `⚠️ この金額 (¥${amount.toLocaleString()}) は${category}カテゴリの平均 (¥${stats.avg.toLocaleString()}) の${Math.round(ratio)}倍です。`
    };
  }
  return { isAnomaly: false, avgAmount: stats.avg };
}

export async function saveUserBehavior(companyId: string, userId: string, behavior: Partial<UserBehavior>) {
  try {
    await rtdb.ref(`owner_data/${companyId}/lineUsers/${userId}/aiContext/behavior`).update({
      ...behavior, updatedAt: new Date().toISOString()
    });
  } catch (e) { console.warn('[saveUserBehavior] failed:', (e as any)?.message); }
}

// ─── Gemini ───────────────────────────────────────────────────────────────────

export async function callGemini(prompt: string, apiKey: string): Promise<{ text: string; usage?: { input: number; output: number; total: number } }> {
  const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
      );
      if (!res.ok) continue;
      const json = await res.json();
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const usage = json.usageMetadata ? {
        input: json.usageMetadata.promptTokenCount || 0,
        output: json.usageMetadata.candidatesTokenCount || 0,
        total: json.usageMetadata.totalTokenCount || 0,
      } : undefined;
      return { text, usage };
    } catch {}
  }
  return { text: 'AI is temporarily unavailable. Please try again.' };
}

// ─── Contexto de projetos/CCs ─────────────────────────────────────────────────

async function getUserContext(companyId: string, userId: string, lineUserId?: string) {
  const projectsSnap = await rtdb.ref(`owner_data/${companyId}/projects`).get();
  const projects = projectsSnap.val() || {};
  const userCCs: { pId: string; ccId: string; ccName: string; pName: string; totalValue?: number; budgetLimit?: number }[] = [];
  Object.entries(projects).forEach(([pId, pData]: [string, any]) => {
    if (pData.costcenters) {
      Object.entries(pData.costcenters).forEach(([ccId, ccData]: [string, any]) => {
        const assigned: string[] = ccData.assignedLineUserIds || [];
        if (assigned.includes(userId) || (lineUserId && assigned.includes(lineUserId))) {
          userCCs.push({ pId, ccId, ccName: ccData.name, pName: pData.name, totalValue: ccData.totalValue || 0, budgetLimit: ccData.budgetLimit || 0 });
        }
      });
    }
  });
  return { projects, userCCs };
}

// I18N centralizado em ./i18n.ts — usar i18n(key, lang, ...args)

// ─── Detecção de intenção ─────────────────────────────────────────────────────

type Intent =
  | 'report' | 'company_report' | 'costcenter' | 'balance' | 'help'
  | 'invite' | 'pending_users' | 'approve_user'
  | 'set_lang' | 'set_instructions' | 'view_settings'
  | 'my_info'
  | 'unknown';

function detectIntent(text: string): { intent: Intent; arg?: string } {
  const txt = text.trim();

  // Autoconfiguração
  const langMatch = txt.match(INTENT_KEYWORDS.set_lang);
  if (langMatch) return { intent: 'set_lang', arg: langMatch[1].trim() };

  const instrMatch = txt.match(INTENT_KEYWORDS.set_instructions);
  if (instrMatch) return { intent: 'set_instructions', arg: instrMatch[1].trim() };

  if (INTENT_KEYWORDS.view_settings.test(txt)) return { intent: 'view_settings' };
  if (INTENT_KEYWORDS.my_info.test(txt)) return { intent: 'my_info' };

  // Relatórios (company_report antes de report para evitar match parcial)
  if (INTENT_KEYWORDS.company_report.test(txt)) return { intent: 'company_report' };
  if (INTENT_KEYWORDS.report.test(txt)) return { intent: 'report' };
  if (INTENT_KEYWORDS.costcenter.test(txt)) return { intent: 'costcenter' };
  if (INTENT_KEYWORDS.balance.test(txt)) return { intent: 'balance' };
  if (INTENT_KEYWORDS.help.test(txt)) return { intent: 'help' };

  // Gestão (elevated)
  const inviteMatch = txt.match(INTENT_KEYWORDS.invite);
  if (inviteMatch) return { intent: 'invite', arg: inviteMatch[1].trim() };
  if (INTENT_KEYWORDS.pending_users.test(txt)) return { intent: 'pending_users' };
  const approveMatch = txt.match(INTENT_KEYWORDS.approve_user);
  if (approveMatch) return { intent: 'approve_user', arg: approveMatch[1].trim() };

  return { intent: 'unknown' };
}

// ─── Handlers padrão ─────────────────────────────────────────────────────────

async function handleReport(ctx: LineAiContext, userCCs: any[], lang: Lang): Promise<string> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const expSnap = await rtdb.ref(`owner_data/${ctx.companyId}/expenses`).orderByChild('userId').equalTo(ctx.userId).get();
  let total = 0; let count = 0;
  if (expSnap.exists()) expSnap.forEach(c => { const e = c.val(); if (e.date?.startsWith(currentMonth)) { total += Number(e.amount) || 0; count++; } });
  return i18n('report', lang, total, count, userCCs.map(cc => `・${cc.pName} / ${cc.ccName}`).join('\n'));
}

function handleCostCenterList(userCCs: any[], lang: Lang): string {
  if (!userCCs.length) return i18n('noCC', lang);

  // Agrupar por projeto
  const byProject: Record<string, typeof userCCs> = {};
  userCCs.forEach(cc => {
    if (!byProject[cc.pName]) byProject[cc.pName] = [];
    byProject[cc.pName].push(cc);
  });

  const sections = Object.entries(byProject).map(([pName, ccs]) => {
    const ccLines = ccs.map(cc => {
      const used = Number(cc.totalValue) || 0;
      const limit = Number(cc.budgetLimit) || 0;
      let budgetInfo = '';
      if (limit > 0) {
        const pct = Math.round((used / limit) * 100);
        const bar = pct >= 100 ? '🔴' : pct >= 80 ? '🟡' : '🟢';
        budgetInfo = `\n    ${bar} ¥${used.toLocaleString()} / ¥${limit.toLocaleString()} (${pct}%)`;
      }
      return `  ・${cc.ccName}${budgetInfo}`;
    }).join('\n');
    return `📂 ${pName}\n${ccLines}`;
  }).join('\n\n');

  return `${i18n('ccListHeader', lang)}\n\n${sections}`;
}

function handleBalance(userCCs: any[], lang: Lang): string {
  if (!userCCs.length) return i18n('noCC', lang);
  return i18n('balanceHeader', lang) + userCCs.map(cc => {
    const used = Number(cc.totalValue) || 0; const limit = Number(cc.budgetLimit) || 0;
    const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
    return `・${cc.ccName}\n  ¥${used.toLocaleString()} / ¥${limit.toLocaleString()} (${pct}%)${used > limit ? i18n('over', lang) : ''}`;
  }).join('\n');
}

// ─── Handler: informações completas do usuário ─────────────────────────────────

async function handleMyInfo(
  ctx: LineAiContext,
  userCCs: { pId: string; ccId: string; ccName: string; pName: string; totalValue?: number; budgetLimit?: number }[],
  memory: AiMemory,
  lang: Lang
): Promise<string> {
  const userName = ctx.userData?.fullName || ctx.userData?.name || ctx.userData?.displayName || 'User';
  const status = i18nStatus(ctx.userData?.status ?? 0, lang);
  const behavior = memory.behavior || {};
  const patterns = memory.patterns || { categoryCcMap: {}, usageStreak: { ccId: '', ccName: '', count: 0 }, avgAmountByCategory: {}, totalExpenses: 0 };

  const l = i18nLabels('myInfo', lang);

  // Seção: perfil
  let msg = `${l.title}\n\n`;
  msg += `📛 ${l.name}: ${userName}\n`;
  msg += `📌 ${l.statusL}: ${status}\n`;
  msg += `👑 ${l.level}: ${behavior.autonomyLevel || 'standard'}\n`;
  msg += `🌐 ${l.lang}: ${behavior.preferredLang || 'auto'}\n`;
  msg += `🤖 ${l.autoAssign}: ${behavior.autoAssignCC === false ? 'OFF' : 'ON'}\n`;

  // Seção: projetos e CCs
  msg += `\n━━━━━━━━━━━━━━━\n📁 ${l.projects}\n\n`;
  if (userCCs.length === 0) {
    msg += `${l.noProject}\n`;
  } else {
    const byProject: Record<string, typeof userCCs> = {};
    userCCs.forEach(cc => {
      if (!byProject[cc.pName]) byProject[cc.pName] = [];
      byProject[cc.pName].push(cc);
    });
    Object.entries(byProject).forEach(([pName, ccs]) => {
      msg += `📂 ${pName}\n`;
      ccs.forEach(cc => {
        const used = Number(cc.totalValue) || 0;
        const limit = Number(cc.budgetLimit) || 0;
        msg += `  ・${cc.ccName}`;
        if (limit > 0) {
          const pct = Math.round((used / limit) * 100);
          const bar = pct >= 100 ? '🔴' : pct >= 80 ? '🟡' : '🟢';
          msg += `\n    ${bar} ¥${used.toLocaleString()} / ¥${limit.toLocaleString()} (${pct}%)`;
        }
        msg += '\n';
      });
    });
  }

  // Seção: aprendizado da IA
  msg += `\n━━━━━━━━━━━━━━━\n🧠 ${l.ai}\n\n`;
  if (patterns.totalExpenses === 0) {
    msg += `${l.noPattern}\n`;
  } else {
    msg += `📊 ${l.totalExp}: ${patterns.totalExpenses}\n`;
    if (patterns.usageStreak.ccName && patterns.usageStreak.count >= 2) {
      msg += `⭐ ${l.favCC}: ${patterns.usageStreak.ccName} (${patterns.usageStreak.count}x)\n`;
    }
    const cats = Object.entries(patterns.avgAmountByCategory)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);
    if (cats.length > 0) {
      msg += `\n📋 ${l.topCat}:\n`;
      cats.forEach(([cat, stats]) => {
        msg += `  ・${cat}: ¥${stats.avg.toLocaleString()} (${stats.count}x)\n`;
      });
    }
  }

  return msg.trim();
}

// ─── Handlers de autoconfiguração ────────────────────────────────────────────

// parseLang importado de ./i18n como parseLangInput

// ─── Handlers elevated ───────────────────────────────────────────────────────

async function handleGenerateInvite(companyId: string, requestedByUserId: string, inviteName: string, lang: Lang): Promise<string> {
  const hash = crypto.randomBytes(4).toString('hex').toUpperCase();
  const inviteRef = rtdb.ref(`owner_data/${companyId}/invites`).push();
  await inviteRef.set({
    hash, inviteName, used: false,
    createdAt: new Date().toISOString(),
    createdByLineUserId: requestedByUserId
  });
  return i18n('inviteCreated', lang, inviteName, hash);
}

async function handlePendingUsers(companyId: string, lang: Lang): Promise<string> {
  const snap = await rtdb.ref(`owner_data/${companyId}/lineUsers`).get();
  const pending: string[] = [];
  if (snap.exists()) {
    snap.forEach(child => {
      const u = child.val();
      if (u.status === 1) pending.push(`・${u.displayName || u.name || '名前未設定'}`);
    });
  }
  if (!pending.length) return i18n('noPending', lang);
  return i18n('pendingUsers', lang, pending.join('\n'));
}

async function handleApproveUser(companyId: string, nameQuery: string, lang: Lang): Promise<string> {
  const snap = await rtdb.ref(`owner_data/${companyId}/lineUsers`).get();
  let found = false;
  if (snap.exists()) {
    for (const child of Object.values(snap.val() as Record<string, any>)) {
      const displayName: string = child.displayName || child.name || '';
      if (displayName.toLowerCase().includes(nameQuery.toLowerCase()) && child.status === 1) {
        // Find the key
        let targetKey = '';
        snap.forEach(c => { if ((c.val().displayName || c.val().name || '').toLowerCase().includes(nameQuery.toLowerCase())) targetKey = c.key!; });
        if (targetKey) {
          await rtdb.ref(`owner_data/${companyId}/lineUsers/${targetKey}`).update({ status: 2, approvedAt: new Date().toISOString() });
          found = true;
        }
        break;
      }
    }
  }
  return found ? i18n('approved', lang, nameQuery) : i18n('userNotFound', lang);
}

async function handleCompanyReport(companyId: string, lang: Lang): Promise<string> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const snap = await rtdb.ref(`owner_data/${companyId}/expenses`).get();
  let total = 0; let count = 0; let pending = 0;
  if (snap.exists()) snap.forEach(c => {
    const e = c.val();
    if (e.date?.startsWith(currentMonth)) { total += Number(e.amount) || 0; count++; if (!e.costcenterId) pending++; }
  });
  return i18n('companyReport', lang, total, count, pending);
}

// ─── Entrada principal ────────────────────────────────────────────────────────

export async function handleLineTextMessage(
  text: string,
  ctx: LineAiContext
): Promise<{ text: string; usage?: { input: number; output: number; total: number } }> {
  const { intent, arg } = detectIntent(text);
  const memory = await loadMemory(ctx.companyId, ctx.userId);
  const behavior = memory.behavior || {};
  const lang = resolveLang(text, behavior.preferredLang);
  const isElevated = behavior.autonomyLevel === 'elevated' || behavior.autonomyLevel === 'developer';

  // ── Autoconfiguração (qualquer usuário) ──
  if (intent === 'set_lang') {
    const newLang = parseLangInput(arg || '');
    await saveUserBehavior(ctx.companyId, ctx.userId, { preferredLang: newLang });
    return { text: i18n('settingsSaved', lang) };
  }
  if (intent === 'set_instructions') {
    await saveUserBehavior(ctx.companyId, ctx.userId, { customInstructions: arg });
    return { text: i18n('settingsSaved', lang) };
  }
  if (intent === 'view_settings') {
    const instrPreview = behavior.customInstructions ? behavior.customInstructions.substring(0, 60) + '...' : '-';
    return { text: i18n('settingsView', lang, behavior.preferredLang || 'auto', instrPreview, behavior.autonomyLevel || 'standard') };
  }

  // ── Respostas fixas padrão ──
  const { projects, userCCs } = await getUserContext(ctx.companyId, ctx.userId, ctx.userData?.lineUserId);
  if (intent === 'report') return { text: await handleReport(ctx, userCCs, lang) };
  if (intent === 'costcenter') return { text: handleCostCenterList(userCCs, lang) };
  if (intent === 'balance') return { text: handleBalance(userCCs, lang) };
  if (intent === 'my_info') return { text: await handleMyInfo(ctx, userCCs, memory, lang) };
  if (intent === 'help') return { text: i18n('help', lang) + (isElevated ? i18n('helpElevated', lang) : '') };

  if (intent === 'invite') {
    if (!isElevated) return { text: i18n('noPermission', lang) };
    if (!arg) return { text: i18n('noPermission', lang) };
    return { text: await handleGenerateInvite(ctx.companyId, ctx.userId, arg, lang) };
  }
  if (intent === 'pending_users') {
    if (!isElevated) return { text: i18n('noPermission', lang) };
    return { text: await handlePendingUsers(ctx.companyId, lang) };
  }
  if (intent === 'approve_user') {
    if (!isElevated) return { text: i18n('noPermission', lang) };
    return { text: await handleApproveUser(ctx.companyId, arg || '', lang) };
  }
  if (intent === 'company_report') {
    if (!isElevated) return { text: i18n('noPermission', lang) };
    return { text: await handleCompanyReport(ctx.companyId, lang) };
  }

  // ── Pergunta livre → Gemini com contexto personalizado ──
  const [aiConfigSnap, globalPromptSnap] = await Promise.all([
    rtdb.ref(`owner/${ctx.companyId}/aiConfig/systemPrompt`).get(),
    rtdb.ref('developer/aiConfig/lineSystemPrompt').get(),
  ]);
  const companySystemPrompt = aiConfigSnap.val() || '';
  const globalSystemPrompt = globalPromptSnap.val() || '';

  // Prompt composicional: base + custom instructions como complemento
  const defaultPrompt = `You are FastLine AI Assistant — smart, friendly, and creative, specialized in expense management.
- Always reply in the same language the user writes in (Japanese, Portuguese, English, etc.)
- Expense & receipt questions → answer professionally
- General questions, calculations, small talk → help naturally and creatively
- Adapt response length to the question`;
  const basePrompt = companySystemPrompt || globalSystemPrompt || defaultPrompt;
  const customLayer = behavior.customInstructions
    ? `\n[User custom instructions]\n${behavior.customInstructions}`
    : '';
  const systemPrompt = `${basePrompt}${customLayer}`;

  // Enriquecer prompt com padrões aprendidos
  const patterns = memory.patterns || { categoryCcMap: {}, usageStreak: { ccId: '', ccName: '', count: 0 }, avgAmountByCategory: {}, totalExpenses: 0 };
  const patternInsights: string[] = [];
  if (patterns.totalExpenses > 0) {
    patternInsights.push(`Total expenses registered: ${patterns.totalExpenses}`);
  }
  if (patterns.usageStreak.count >= 3) {
    patternInsights.push(`Current CC streak: ${patterns.usageStreak.ccName} (${patterns.usageStreak.count} consecutive)`);
  }
  const topCategories = Object.entries(patterns.avgAmountByCategory)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 3)
    .map(([cat, stats]) => `${cat}: avg ¥${stats.avg.toLocaleString()} (${stats.count}x)`);
  if (topCategories.length > 0) {
    patternInsights.push(`Top categories: ${topCategories.join(', ')}`);
  }
  const patternContext = patternInsights.length > 0
    ? `\n[Learned user patterns]\n${patternInsights.join('\n')}`
    : '';

  const ccContext = userCCs.map(cc => `${cc.pName}/${cc.ccName}`).join(', ') || 'none';
  const prefContext = memory.preferences.lastPaymentType
    ? `Preferred payment: ${memory.preferences.lastPaymentType}`
    : '';
    
  let managementContext = '';
  if (isElevated) {
    let dashboardReport = `[ELEVATED ACCESS - FULL DASHBOARD MANIPULATION & OVERVIEW PERMITTED]\nYou have manager rights. You can answer questions about the current financial balance and expenses for the entire company.\n\n[DASHBOARD TOTALS]\n`;
    Object.entries(projects).forEach(([pId, pData]: [string, any]) => {
      dashboardReport += `- Project: ${pData.name}\n`;
      if (pData.costcenters) {
        Object.entries(pData.costcenters).forEach(([ccId, cc]: [string, any]) => {
           dashboardReport += `   * CC: ${cc.name} (ID: ${ccId}) | Budget Limit: ¥${cc.budgetLimit || 0} | Total Expenses (Gasto): ¥${cc.totalValue || 0} | Total Income (Entradas): ¥${cc.totalIncome || 0}\n`;
        });
      }
    });
    
    // PSEUDO TOOL CALLING DEFINITIONS
    const actionsBlock = `\n[ACTION COMMANDS]
You can execute actions on the dashboard by outputting a JSON trigger. If the manager asks you to execute something, output exactly:
To create an invite for an employee:
[[CREATE_INVITE: {"name": "Employee Name", "costCenterIds": ["ID1", "ID2"]}]]

If you use an action, you must provide a nice human readable text before or after the JSON telling the manager that the action was executed. Do not show the JSON to the user, it will be parsed internally.`;

    managementContext = `\n${dashboardReport}\n${actionsBlock}\n`;
  }
  
  const notesContext = behavior.notes ? `\n[Manager notes: ${behavior.notes}]` : '';

  const prompt = `${systemPrompt}${managementContext}${notesContext}${patternContext}

[User info]
Name: ${ctx.userData?.name || ctx.userData?.fullName || 'User'}
Cost centers: ${ccContext}
${prefContext}
${memory.summary ? `[Conversation summary]\n${memory.summary}` : ''}
${memory.history.length > 0 ? `[Recent messages]\n${memory.history.slice(-6).map(h => `${h.role === 'user' ? 'User' : 'AI'}: ${h.text}`).join('\n')}` : ''}

User: ${text}
AI:`;

  let result = await callGemini(prompt, ctx.apiKey);
  
  // -- PSEUDO TOOL PARSER --
  const inviteMatch = result.text.match(/\[\[CREATE_INVITE:\s*({.*?})\s*\]\]/s);
  if (inviteMatch && isElevated) {
     try {
       const data = JSON.parse(inviteMatch[1]);
       const hash = require('crypto').randomBytes(4).toString('hex').toUpperCase();
       
       await rtdb.ref(`owner_data/${ctx.companyId}/invites`).push().set({
         hash, 
         inviteName: data.name || 'User', 
         costCenterIds: data.costCenterIds || [],
         used: false,
         createdAt: new Date().toISOString(),
         createdByLineUserId: ctx.userId
       });
       
       result.text = result.text.replace(inviteMatch[0], `\n🎟️ [SYSTEM ACTION] Convite gerado com o código: #${hash}`);
     } catch(e) { console.error('Error parsing CREATE_INVITE:', e); }
  }

  const updatedMemory: AiMemory = {
    ...memory,
    history: [...memory.history, { role: 'user', text, ts: Date.now() }, { role: 'ai', text: result.text, ts: Date.now() }]
  };
  await saveMemory(ctx.companyId, ctx.userId, updatedMemory, ctx.apiKey);
  return result;
}

// ─── Quick reply de pagamento ─────────────────────────────────────────────────

export function buildPaymentTypeQuickReply(expenseId: string, lang: import('@/ai/i18n').Lang) {
  const lblCompany = i18n('btnCompany', lang);
  const lblReimburse = i18n('btnReimburse', lang);
  return {
    items: [
      { type: 'action', action: { type: 'postback', label: lblCompany, data: `action=setpayment&expenseId=${expenseId}&type=company`, displayText: lblCompany } },
      { type: 'action', action: { type: 'postback', label: lblReimburse, data: `action=setpayment&expenseId=${expenseId}&type=reimbursement`, displayText: lblReimburse } }
    ]
  };
}
