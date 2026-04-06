// ─── Centralized i18n for LINE Bot AI ──────────────────────────────────────────
// Para adicionar um novo idioma:
// 1. Adicione o código no type Lang (ex: 'fr')
// 2. Adicione a detecção em LANG_PATTERNS
// 3. Adicione as traduções no objeto de cada seção
// 4. Todas as chaves faltantes usam fallback automático (en → ja)

export type Lang = 'ja' | 'pt' | 'en' | 'es' | 'zh' | 'ko' | 'vi';

// ─── Detecção de idioma por padrões de texto ──────────────────────────────────

const LANG_PATTERNS: { lang: Lang; pattern: RegExp }[] = [
  { lang: 'ja', pattern: /[ぁ-ん]|[ァ-ン]|[一-龯]/ },
  { lang: 'pt', pattern: /[àáâãéêíóôõúç]|ção|ões|você|obrigad/i },
  { lang: 'zh', pattern: /[\u4e00-\u9fff]{2,}/ },  // 2+ chinese chars (sem kana = não é JP)
  { lang: 'ko', pattern: /[\uac00-\ud7af]|[\u1100-\u11ff]/ },
  { lang: 'vi', pattern: /[ăâđêôơư]|nh[ậấ]|[ờừ]/i },
  { lang: 'es', pattern: /[ñ¿¡]|ción|iones|usted|gracias|hola/i },
];

export function detectLang(text: string): Lang {
  // JP detection first (has unique kana)
  if (/[ぁ-ん]|[ァ-ン]/.test(text)) return 'ja';
  // Then check all patterns
  for (const { lang, pattern } of LANG_PATTERNS) {
    if (lang === 'ja') continue; // already checked
    if (pattern.test(text)) return lang;
  }
  return 'ja'; // Default to Japanese if nothing detected
}

export function resolveLang(text: string, preferredLang?: string): Lang {
  if (preferredLang && preferredLang !== 'auto') return preferredLang as Lang;
  return detectLang(text);
}

export function parseLangInput(arg: string): Lang | 'auto' {
  const a = arg.toLowerCase();
  if (/ja|japonês|japanese|日本語/.test(a)) return 'ja';
  if (/pt|portugu/.test(a)) return 'pt';
  if (/en|english|inglês/.test(a)) return 'en';
  if (/es|español|espanhol|spanish/.test(a)) return 'es';
  if (/zh|中文|chinês|chinese/.test(a)) return 'zh';
  if (/ko|한국어|korean|coreano/.test(a)) return 'ko';
  if (/vi|tiếng việt|vietnam/.test(a)) return 'vi';
  return 'auto';
}

// ─── Intent detection keywords by language ────────────────────────────────────

export const INTENT_KEYWORDS = {
  report:         /レポート|報告|report|relatório|relatorio|informe|报告|보고서|báo cáo/i,
  company_report: /全社レポート|全体レポート|relatório geral|company report|informe general|全公司报告|전체 보고서|báo cáo toàn công ty/i,
  costcenter:     /センター|center|centro|原価|centro de costo|成本中心|비용 센터|trung tâm chi phí/i,
  balance:        /残高|予算|budget|saldo|orçamento|presupuesto|预算|예산|ngân sách/i,
  help:           /ヘルプ|help|ajuda|使い方|ayuda|帮助|도움말|trợ giúp/i,
  my_info:        /マイ情報|自分の情報|meus dados|minhas informações|my info|minha conta|mis datos|我的信息|내 정보|thông tin của tôi/i,
  set_lang:       /(?:言語|idioma|language|lang|idioma|语言|언어|ngôn ngữ)\s*[:：]\s*(.+)/i,
  set_instructions: /(?:カスタム指示|minhas instruções|my instructions|mis instrucciones|自定义指令|사용자 지시|hướng dẫn tùy chỉnh)\s*[:：]\s*(.+)/i,
  view_settings:  /設定確認|minhas configurações|my settings|mis configuraciones|我的设置|내 설정|cài đặt của tôi/i,
  invite:         /(?:招待コード|invite|convite|invitación|邀请码|초대 코드|mã mời)\s*[:：]\s*(.+)/i,
  pending_users:  /承認待ち|pendentes|pending users?|pendientes|待审批|승인 대기|chờ phê duyệt/i,
  approve_user:   /(?:承認|aprovar|approve|aprobar|批准|승인|phê duyệt)\s*[:：]\s*(.+)/i,
};

// ─── Translation system with fallback ─────────────────────────────────────────

type TranslationValue = string | ((...args: any[]) => string);
type TranslationEntry = Partial<Record<Lang, TranslationValue>>;

function t(entry: TranslationEntry, lang: Lang, ...args: any[]): string {
  const val = entry[lang] || entry['en'] || entry['ja'] || '';
  if (typeof val === 'function') return val(...args);
  return val;
}

// ─── All translations ─────────────────────────────────────────────────────────

const TRANSLATIONS = {
  // ── Reports ──
  report: {
    ja: (total: number, count: number, ccList: string) => `📊 今月のご利用状況\n\n💰 合計金額: ¥${total.toLocaleString()}\n📋 件数: ${count}件\n\n📁 担当プロジェクト:\n${ccList || '担当センターなし'}`,
    pt: (total: number, count: number, ccList: string) => `📊 Resumo do mês\n\n💰 Total: ¥${total.toLocaleString()}\n📋 Lançamentos: ${count}\n\n📁 Projetos:\n${ccList || 'Sem centro de custo'}`,
    en: (total: number, count: number, ccList: string) => `📊 Monthly Summary\n\n💰 Total: ¥${total.toLocaleString()}\n📋 Entries: ${count}\n\n📁 Projects:\n${ccList || 'No cost center assigned'}`,
    es: (total: number, count: number, ccList: string) => `📊 Resumen del mes\n\n💰 Total: ¥${total.toLocaleString()}\n📋 Registros: ${count}\n\n📁 Proyectos:\n${ccList || 'Sin centro de costo'}`,
    zh: (total: number, count: number, ccList: string) => `📊 本月概况\n\n💰 总额: ¥${total.toLocaleString()}\n📋 条目: ${count}\n\n📁 项目:\n${ccList || '未分配成本中心'}`,
    ko: (total: number, count: number, ccList: string) => `📊 이번 달 요약\n\n💰 합계: ¥${total.toLocaleString()}\n📋 건수: ${count}\n\n📁 프로젝트:\n${ccList || '비용 센터 미배정'}`,
    vi: (total: number, count: number, ccList: string) => `📊 Tóm tắt tháng\n\n💰 Tổng: ¥${total.toLocaleString()}\n📋 Số mục: ${count}\n\n📁 Dự án:\n${ccList || 'Chưa gán trung tâm chi phí'}`,
  } as TranslationEntry,

  companyReport: {
    ja: (total: number, count: number, pending: number) => `📊 【全社レポート】今月\n\n💰 合計金額: ¥${total.toLocaleString()}\n📋 件数: ${count}件\n⏳ CC未割当: ${pending}件`,
    pt: (total: number, count: number, pending: number) => `📊 【Relatório Geral】Este mês\n\n💰 Total: ¥${total.toLocaleString()}\n📋 Lançamentos: ${count}\n⏳ Sem CC: ${pending}`,
    en: (total: number, count: number, pending: number) => `📊 【Company Report】This month\n\n💰 Total: ¥${total.toLocaleString()}\n📋 Entries: ${count}\n⏳ Unassigned: ${pending}`,
    es: (total: number, count: number, pending: number) => `📊 【Informe General】Este mes\n\n💰 Total: ¥${total.toLocaleString()}\n📋 Registros: ${count}\n⏳ Sin CC: ${pending}`,
    zh: (total: number, count: number, pending: number) => `📊 【公司报告】本月\n\n💰 总额: ¥${total.toLocaleString()}\n📋 条目: ${count}\n⏳ 未分配: ${pending}`,
    ko: (total: number, count: number, pending: number) => `📊 【전체 보고서】이번 달\n\n💰 합계: ¥${total.toLocaleString()}\n📋 건수: ${count}\n⏳ 미배정: ${pending}`,
    vi: (total: number, count: number, pending: number) => `📊 【Báo cáo công ty】Tháng này\n\n💰 Tổng: ¥${total.toLocaleString()}\n📋 Số mục: ${count}\n⏳ Chưa gán: ${pending}`,
  } as TranslationEntry,

  // ── Status / Simple messages ──
  noCC: {
    ja: '⚠️ 担当の原価センターが割り当てられておりません。\n管理者までお問い合わせくださいませ。',
    pt: '⚠️ Nenhum centro de custo atribuído a você.',
    en: '⚠️ No cost center assigned to you.',
    es: '⚠️ No tiene centro de costo asignado.',
    zh: '⚠️ 您没有分配的成本中心。',
    ko: '⚠️ 배정된 비용 센터가 없습니다.',
    vi: '⚠️ Bạn chưa được gán trung tâm chi phí nào.',
  },
  noPermission: {
    ja: '🔒 この操作を実行する権限がございません。',
    pt: '🔒 Você não tem permissão para esta operação.',
    en: '🔒 You do not have permission for this operation.',
    es: '🔒 No tiene permiso para esta operación.',
    zh: '🔒 您没有执行此操作的权限。',
    ko: '🔒 이 작업을 수행할 권한이 없습니다.',
    vi: '🔒 Bạn không có quyền thực hiện thao tác này.',
  },
  settingsSaved: {
    ja: '✅ 設定を保存しました。',
    pt: '✅ Configurações salvas.',
    en: '✅ Settings saved.',
    es: '✅ Configuración guardada.',
    zh: '✅ 设置已保存。',
    ko: '✅ 설정이 저장되었습니다.',
    vi: '✅ Cài đặt đã được lưu.',
  },
  noPending: {
    ja: '✅ 承認待ちのユーザーはいません。',
    pt: '✅ Nenhum usuário aguardando aprovação.',
    en: '✅ No users awaiting approval.',
    es: '✅ No hay usuarios pendientes de aprobación.',
    zh: '✅ 没有等待审批的用户。',
    ko: '✅ 승인 대기 중인 사용자가 없습니다.',
    vi: '✅ Không có người dùng nào đang chờ phê duyệt.',
  },
  userNotFound: {
    ja: '⚠️ ユーザーが見つかりませんでした。',
    pt: '⚠️ Usuário não encontrado.',
    en: '⚠️ User not found.',
    es: '⚠️ Usuario no encontrado.',
    zh: '⚠️ 未找到用户。',
    ko: '⚠️ 사용자를 찾을 수 없습니다.',
    vi: '⚠️ Không tìm thấy người dùng.',
  },
  over: { ja: ' ⚠️超過', pt: ' ⚠️超過', en: ' ⚠️ Over', es: ' ⚠️ Excedido', zh: ' ⚠️ 超额', ko: ' ⚠️ 초과', vi: ' ⚠️ Vượt' },

  // ── Functions with args ──
  inviteCreated: {
    ja: (name: string, hash: string) => `✅ 招待コードを発行しました！\n\n👤 対象: ${name}\n🔑 コード: #${hash}\n\n上記のコードをLINEチャットで送るよう案内してください。`,
    pt: (name: string, hash: string) => `✅ Código de convite gerado!\n\n👤 Para: ${name}\n🔑 Código: #${hash}\n\nPeça ao usuário para enviar este código no chat do LINE.`,
    en: (name: string, hash: string) => `✅ Invite code generated!\n\n👤 For: ${name}\n🔑 Code: #${hash}\n\nAsk the user to send this code in the LINE chat.`,
    es: (name: string, hash: string) => `✅ ¡Código de invitación generado!\n\n👤 Para: ${name}\n🔑 Código: #${hash}\n\nPida al usuario que envíe este código en el chat de LINE.`,
    zh: (name: string, hash: string) => `✅ 邀请码已生成！\n\n👤 对象: ${name}\n🔑 代码: #${hash}\n\n请让用户在LINE聊天中发送此代码。`,
    ko: (name: string, hash: string) => `✅ 초대 코드가 생성되었습니다!\n\n👤 대상: ${name}\n🔑 코드: #${hash}\n\n사용자에게 LINE 채팅에서 이 코드를 보내도록 안내하세요.`,
    vi: (name: string, hash: string) => `✅ Mã mời đã được tạo!\n\n👤 Cho: ${name}\n🔑 Mã: #${hash}\n\nYêu cầu người dùng gửi mã này trong cuộc trò chuyện LINE.`,
  } as TranslationEntry,

  pendingUsers: {
    ja: (list: string) => `⏳ 承認待ちユーザー\n\n${list}\n\n「承認: [名前]」で承認できます。`,
    pt: (list: string) => `⏳ Usuários aguardando aprovação\n\n${list}\n\nDigite "aprovar: [nome]" para aprovar.`,
    en: (list: string) => `⏳ Users awaiting approval\n\n${list}\n\nType "approve: [name]" to approve.`,
    es: (list: string) => `⏳ Usuarios pendientes\n\n${list}\n\nEscriba "aprobar: [nombre]" para aprobar.`,
    zh: (list: string) => `⏳ 待审批用户\n\n${list}\n\n输入"批准: [姓名]"来批准。`,
    ko: (list: string) => `⏳ 승인 대기 사용자\n\n${list}\n\n"승인: [이름]"을 입력하여 승인하세요.`,
    vi: (list: string) => `⏳ Người dùng đang chờ\n\n${list}\n\nNhập "phê duyệt: [tên]" để phê duyệt.`,
  } as TranslationEntry,

  approved: {
    ja: (name: string) => `✅ ${name}さんを承認しました。`,
    pt: (name: string) => `✅ ${name} foi aprovado com sucesso.`,
    en: (name: string) => `✅ ${name} has been approved.`,
    es: (name: string) => `✅ ${name} ha sido aprobado.`,
    zh: (name: string) => `✅ ${name} 已被批准。`,
    ko: (name: string) => `✅ ${name}님이 승인되었습니다.`,
    vi: (name: string) => `✅ ${name} đã được phê duyệt.`,
  } as TranslationEntry,

  settingsView: {
    ja: (lang: string, instr: string, level: string) => `⚙️ あなたの現在の設定\n\n🌐 言語: ${lang}\n🎭 カスタム指示: ${instr}\n👑 権限: ${level}`,
    pt: (lang: string, instr: string, level: string) => `⚙️ Suas configurações atuais\n\n🌐 Idioma: ${lang}\n🎭 Instruções: ${instr}\n👑 Nível: ${level}`,
    en: (lang: string, instr: string, level: string) => `⚙️ Your current settings\n\n🌐 Language: ${lang}\n🎭 Instructions: ${instr}\n👑 Level: ${level}`,
    es: (lang: string, instr: string, level: string) => `⚙️ Tu configuración actual\n\n🌐 Idioma: ${lang}\n🎭 Instrucciones: ${instr}\n👑 Nivel: ${level}`,
    zh: (lang: string, instr: string, level: string) => `⚙️ 您的当前设置\n\n🌐 语言: ${lang}\n🎭 自定义指令: ${instr}\n👑 权限: ${level}`,
    ko: (lang: string, instr: string, level: string) => `⚙️ 현재 설정\n\n🌐 언어: ${lang}\n🎭 사용자 지시: ${instr}\n👑 권한: ${level}`,
    vi: (lang: string, instr: string, level: string) => `⚙️ Cài đặt hiện tại\n\n🌐 Ngôn ngữ: ${lang}\n🎭 Hướng dẫn: ${instr}\n👑 Cấp: ${level}`,
  } as TranslationEntry,

  // ── Help ──
  help: {
    ja: `🤖 FastLine AIアシスタント\n\n📸 レシートの写真を送信 → 自動登録\n📊「レポート」→ 今月のご利用状況\n📁「センター」→ 担当センター一覧\n💰「残高」→ 予算残高のご確認\n👤「マイ情報」→ ご登録情報の確認\n\n⚙️ 個人設定:\n「言語: 日本語」→ 返答言語を設定\n「カスタム指示: ...」→ AIの応答スタイルを設定\n「設定確認」→ 現在の設定をご確認\n\nご不明な点はお気軽にお申しつけくださいませ。`,
    pt: `🤖 Assistente FastLine AI\n\n📸 Foto do recibo → registro automático\n📊 "relatório" → resumo do mês\n📁 "centro" → seus centros de custo\n💰 "saldo" → saldo orçamentário\n👤 "meus dados" → todas suas informações\n\n⚙️ Configurações pessoais:\n"idioma: português" → fixar idioma\n"minhas instruções: ..." → personalizar IA\n"minhas configurações" → ver configurações\n\nPode perguntar qualquer coisa!`,
    en: `🤖 FastLine AI Assistant\n\n📸 Receipt photo → auto logging\n📊 "report" → monthly summary\n📁 "center" → your cost centers\n💰 "budget" → budget balance\n👤 "my info" → all your information\n\n⚙️ Personal settings:\n"language: english" → lock language\n"my instructions: ..." → customize AI\n"my settings" → view settings\n\nFeel free to ask anything!`,
    es: `🤖 Asistente FastLine AI\n\n📸 Foto del recibo → registro automático\n📊 "informe" → resumen del mes\n📁 "centro" → centros de costo\n💰 "presupuesto" → saldo presupuestario\n👤 "mis datos" → toda tu información\n\n⚙️ Configuración:\n"idioma: español" → fijar idioma\n"mis instrucciones: ..." → personalizar IA\n"mis configuraciones" → ver configuración\n\n¡Pregunta lo que quieras!`,
    zh: `🤖 FastLine AI助手\n\n📸 发送收据照片 → 自动登记\n📊 "报告" → 本月概况\n📁 "中心" → 成本中心列表\n💰 "预算" → 预算余额\n👤 "我的信息" → 查看所有信息\n\n⚙️ 个人设置:\n"语言: 中文" → 固定语言\n"自定义指令: ..." → 个性化AI\n"我的设置" → 查看设置\n\n随时提问！`,
    ko: `🤖 FastLine AI 어시스턴트\n\n📸 영수증 사진 → 자동 등록\n📊 "보고서" → 월간 요약\n📁 "센터" → 비용 센터 목록\n💰 "예산" → 예산 잔액\n👤 "내 정보" → 모든 정보 보기\n\n⚙️ 개인 설정:\n"언어: 한국어" → 언어 고정\n"사용자 지시: ..." → AI 맞춤 설정\n"내 설정" → 설정 보기\n\n무엇이든 물어보세요!`,
    vi: `🤖 Trợ lý FastLine AI\n\n📸 Ảnh hóa đơn → đăng ký tự động\n📊 "báo cáo" → tóm tắt tháng\n📁 "trung tâm" → danh sách TTCP\n💰 "ngân sách" → số dư ngân sách\n👤 "thông tin của tôi" → xem tất cả\n\n⚙️ Cài đặt cá nhân:\n"ngôn ngữ: tiếng việt" → cố định ngôn ngữ\n"hướng dẫn: ..." → tùy chỉnh AI\n"cài đặt của tôi" → xem cài đặt\n\nHỏi bất cứ điều gì!`,
  },
  helpElevated: {
    ja: `\n\n👑 管理者向けコマンド:\n「招待コード: [名前]」→ 招待コードの発行\n「承認待ち」→ 承認待ちユーザーの一覧\n「承認: [名前]」→ ユーザーの承認\n「全社レポート」→ 全社の経費レポートの確認`,
    pt: `\n\n👑 Comandos de gestão:\n"convite: [nome]" → gerar código de convite\n"pendentes" → usuários aguardando aprovação\n"aprovar: [nome]" → aprovar usuário\n"relatório geral" → relatório de toda empresa`,
    en: `\n\n👑 Management commands:\n"invite: [name]" → generate invite code\n"pending" → users awaiting approval\n"approve: [name]" → approve user\n"company report" → full company report`,
    es: `\n\n👑 Comandos de gestión:\n"invitación: [nombre]" → generar código\n"pendientes" → usuarios pendientes\n"aprobar: [nombre]" → aprobar usuario\n"informe general" → informe de toda la empresa`,
    zh: `\n\n👑 管理命令:\n"邀请码: [姓名]" → 生成邀请码\n"待审批" → 待审批用户\n"批准: [姓名]" → 批准用户\n"全公司报告" → 全公司费用报告`,
    ko: `\n\n👑 관리자 명령:\n"초대 코드: [이름]" → 초대 코드 생성\n"승인 대기" → 대기 중인 사용자\n"승인: [이름]" → 사용자 승인\n"전체 보고서" → 전체 비용 보고서`,
    vi: `\n\n👑 Lệnh quản lý:\n"mã mời: [tên]" → tạo mã mời\n"chờ phê duyệt" → người dùng đang chờ\n"phê duyệt: [tên]" → phê duyệt\n"báo cáo toàn công ty" → báo cáo toàn bộ`,
  },

  // ── Webhook system messages ──
  aiProcessing:    { ja: '🌟 ただいまAIがレシートを読み取っております。\nしばらくお待ちくださいませ。', pt: '🌟 A IA está lendo o recibo...\nAguarde um momento.', en: '🌟 AI is reading your receipt...\nPlease wait.', es: '🌟 La IA está leyendo el recibo...\nEspere un momento.', zh: '🌟 AI正在读取收据...\n请稍候。', ko: '🌟 AI가 영수증을 읽고 있습니다...\n잠시만 기다려 주세요.', vi: '🌟 AI đang đọc hóa đơn...\nVui lòng đợi.' },
  noApiKey:        { ja: '⚠️ AI APIキーが設定されておりません。\n管理者までお問い合わせくださいませ。', pt: '⚠️ Chave da API de IA não configurada. Contate o administrador.', en: '⚠️ AI API key not configured. Please contact admin.', es: '⚠️ Clave API de IA no configurada. Contacte al administrador.', zh: '⚠️ AI API密钥未配置。请联系管理员。', ko: '⚠️ AI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.', vi: '⚠️ Chưa cấu hình API AI. Vui lòng liên hệ quản trị viên.' },
  pendingApproval: { ja: '⏳ 現在、承認待ちの状態でございます。\n管理者の承認をお待ちくださいませ。', pt: '⏳ Aguardando aprovação.', en: '⏳ Awaiting approval.', es: '⏳ Esperando aprobación.', zh: '⏳ 等待审批。', ko: '⏳ 승인 대기 중입니다.', vi: '⏳ Đang chờ phê duyệt.' },
  sendInviteCode:  { ja: '⚠️ ご利用いただくには、招待コードをご送信くださいませ。', pt: '⚠️ Envie o código de convite.', en: '⚠️ Please send your invite code.', es: '⚠️ Envíe su código de invitación.', zh: '⚠️ 请发送邀请码。', ko: '⚠️ 초대 코드를 보내주세요.', vi: '⚠️ Vui lòng gửi mã mời.' },
  invalidCode:     { ja: '⚠️ 無効なコードでございます。\n正しい招待コードをご確認くださいませ。', pt: '⚠️ Código inválido.', en: '⚠️ Invalid code.', es: '⚠️ Código inválido.', zh: '⚠️ 无效代码。', ko: '⚠️ 유효하지 않은 코드입니다.', vi: '⚠️ Mã không hợp lệ.' },
  codeUsed:        { ja: '⚠️ このコードはすでに使用済みでございます。', pt: '⚠️ Código já utilizado.', en: '⚠️ Code already used.', es: '⚠️ Código ya utilizado.', zh: '⚠️ 代码已使用。', ko: '⚠️ 이미 사용된 코드입니다.', vi: '⚠️ Mã đã được sử dụng.' },
  alreadyProcessed: { ja: '⚠️ こちらの経費はすでに処理済みでございます。', pt: '⚠️ Esta despesa já foi processada.', en: '⚠️ This expense has already been processed.', es: '⚠️ Este gasto ya fue procesado.', zh: '⚠️ 此费用已处理。', ko: '⚠️ 이 비용은 이미 처리되었습니다.', vi: '⚠️ Chi phí này đã được xử lý.' },
  genericError:    { ja: '⚠️ 処理中にエラーが発生いたしました。\nしばらく経ってから再度お試しくださいませ。', pt: '⚠️ Ocorreu um erro. Tente novamente mais tarde.', en: '⚠️ An error occurred. Please try again later.', es: '⚠️ Ocurrió un error. Intente de nuevo más tarde.', zh: '⚠️ 发生错误。请稍后重试。', ko: '⚠️ 오류가 발생했습니다. 나중에 다시 시도하세요.', vi: '⚠️ Đã xảy ra lỗi. Vui lòng thử lại sau.' },
  ccRegistered: {
    ja: (ccName: string, amount: string, desc: string, date: string, pName: string) => `✅ 登録が完了いたしました。\n📁 ${pName} / ${ccName} に記録いたしました。\n💰 ¥${amount}\n📝 ${desc}\n📅 ${date}`,
    pt: (ccName: string, amount: string, desc: string, date: string, pName: string) => `✅ Registrado!\n📁 Salvo em: ${pName} / ${ccName}.\n💰 ¥${amount}\n📝 ${desc}\n📅 ${date}`,
    en: (ccName: string, amount: string, desc: string, date: string, pName: string) => `✅ Registered!\n📁 Saved to: ${pName} / ${ccName}.\n💰 ¥${amount}\n📝 ${desc}\n📅 ${date}`,
    es: (ccName: string, amount: string, desc: string, date: string, pName: string) => `✅ ¡Registrado!\n📁 Guardado en: ${pName} / ${ccName}.\n💰 ¥${amount}\n📝 ${desc}\n📅 ${date}`,
    zh: (ccName: string, amount: string, desc: string, date: string, pName: string) => `✅ 已登记！\n📁 保存到: ${pName} / ${ccName}。\n💰 ¥${amount}\n📝 ${desc}\n📅 ${date}`,
    ko: (ccName: string, amount: string, desc: string, date: string, pName: string) => `✅ 등록 완료!\n📁 ${pName} / ${ccName}에 저장되었습니다.\n💰 ¥${amount}\n📝 ${desc}\n📅 ${date}`,
    vi: (ccName: string, amount: string, desc: string, date: string, pName: string) => `✅ Đã đăng ký!\n📁 Đã lưu vào: ${pName} / ${ccName}.\n💰 ¥${amount}\n📝 ${desc}\n📅 ${date}`,
  } as TranslationEntry,
  cancelled:       { ja: '🗑️ キャンセルいたしました。', pt: '🗑️ Cancelado.', en: '🗑️ Cancelled.', es: '🗑️ Cancelado.', zh: '🗑️ 已取消。', ko: '🗑️ 취소되었습니다.', vi: '🗑️ Đã hủy.' },
  paymentCompany:  { ja: '🏢 会社払いとして記録いたしました。', pt: '🏢 Registrado como pagamento da empresa.', en: '🏢 Recorded as company payment.', es: '🏢 Registrado como pago de empresa.', zh: '🏢 已记录为公司付款。', ko: '🏢 회사 결제로 기록되었습니다.', vi: '🏢 Đã ghi nhận là thanh toán công ty.' },
  paymentReimburse: { ja: '💳 立替払いとして記録いたしました。\n後ほど精算のお手続きをお忘れなくお願いいたします。', pt: '💳 Registrado como reembolso. Não esqueça de solicitar a restituição.', en: '💳 Recorded as reimbursement. Don\'t forget to claim it.', es: '💳 Registrado como reembolso. No olvide reclamarlo.', zh: '💳 已记录为报销。请别忘了申请。', ko: '💳 환급으로 기록되었습니다. 청구를 잊지 마세요.', vi: '💳 Đã ghi nhận là hoàn trả. Đừng quên yêu cầu.' },
  btnCompany: { ja: '🏢 会社払い', pt: '🏢 Cartão da Empresa', en: '🏢 Company Paid', es: '🏢 Pago por Empresa', zh: '🏢 公司支付', ko: '🏢 회사 결제', vi: '🏢 Công ty thanh toán' },
  btnReimburse: { ja: '💳 立替払い', pt: '💳 Reembolso / Dinheiro', en: '💳 Reimbursement', es: '💳 Reembolso', zh: '💳 个人垫付', ko: '💳 개인 결제(환급)', vi: '💳 Hoàn trả cá nhân' },
  noCCWebhook:     { ja: '⚠️ 担当の原価センターが割り当てられておりません。\n管理者までご連絡くださいませ。', pt: '⚠️ Sem centro de custo atribuído. Contate o administrador.', en: '⚠️ No cost center assigned. Please contact admin.', es: '⚠️ Sin centro de costo asignado. Contacte al administrador.', zh: '⚠️ 未分配成本中心。请联系管理员。', ko: '⚠️ 비용 센터가 배정되지 않았습니다. 관리자에게 문의하세요.', vi: '⚠️ Chưa được gán trung tâm chi phí. Vui lòng liên hệ quản trị viên.' },
  selectCC:        { ja: '📁 登録する原価センターをお選びくださいませ。', pt: '📁 Em qual centro de custo registrar?', en: '📁 Which cost center?', es: '📁 ¿En qué centro de costo?', zh: '📁 选择成本中心：', ko: '📁 어느 비용 센터에 등록하시겠습니까?', vi: '📁 Chọn trung tâm chi phí:' },
  aiReadResult: {
    ja: (amount: string, desc: string, date: string) => `✅ AIによる読み取りが完了いたしました。\n💰 金額：¥${amount}\n📝 内容：${desc}\n📅 日付：${date}`,
    pt: (amount: string, desc: string, date: string) => `✅ IA leu o recibo!\n💰 Valor: ¥${amount}\n📝 Descrição: ${desc}\n📅 Data: ${date}`,
    en: (amount: string, desc: string, date: string) => `✅ AI read the receipt!\n💰 Amount: ¥${amount}\n📝 Description: ${desc}\n📅 Date: ${date}`,
    es: (amount: string, desc: string, date: string) => `✅ ¡IA leyó el recibo!\n💰 Monto: ¥${amount}\n📝 Descripción: ${desc}\n📅 Fecha: ${date}`,
    zh: (amount: string, desc: string, date: string) => `✅ AI已读取收据！\n💰 金额: ¥${amount}\n📝 描述: ${desc}\n📅 日期: ${date}`,
    ko: (amount: string, desc: string, date: string) => `✅ AI가 영수증을 읽었습니다!\n💰 금액: ¥${amount}\n📝 내용: ${desc}\n📅 날짜: ${date}`,
    vi: (amount: string, desc: string, date: string) => `✅ AI đã đọc hóa đơn!\n💰 Số tiền: ¥${amount}\n📝 Mô tả: ${desc}\n📅 Ngày: ${date}`,
  } as TranslationEntry,
  autoAssigned: {
    ja: (ccName: string) => `✅ 原価センター「${ccName}」へ自動的に登録いたしました。`,
    pt: (ccName: string) => `✅ 📁 Registrado automaticamente em ${ccName}.`,
    en: (ccName: string) => `✅ 📁 Auto-registered to ${ccName}.`,
    es: (ccName: string) => `✅ 📁 Registrado automáticamente en ${ccName}.`,
    zh: (ccName: string) => `✅ 📁 已自动登记到 ${ccName}。`,
    ko: (ccName: string) => `✅ 📁 ${ccName}에 자동 등록되었습니다.`,
    vi: (ccName: string) => `✅ 📁 Đã tự động đăng ký vào ${ccName}.`,
  } as TranslationEntry,
  patternAssigned: {
    ja: (ccName: string) => `🧠 過去のご利用履歴をもとに、原価センター「${ccName}」へ自動的に登録いたしました。`,
    pt: (ccName: string) => `🧠 Baseado no padrão aprendido, registrado em 📁 ${ccName}.`,
    en: (ccName: string) => `🧠 Based on learned pattern, auto-registered to 📁 ${ccName}.`,
    es: (ccName: string) => `🧠 Basado en patrón aprendido, registrado en 📁 ${ccName}.`,
    zh: (ccName: string) => `🧠 基于学习到的模式，自动登记到 📁 ${ccName}。`,
    ko: (ccName: string) => `🧠 학습 패턴에 기반하여 📁 ${ccName}에 자동 등록되었습니다.`,
    vi: (ccName: string) => `🧠 Dựa trên mẫu đã học, đã tự động đăng ký vào 📁 ${ccName}.`,
  } as TranslationEntry,
  recommend:       { ja: '💡 おすすめの原価センター', pt: '💡 Recomendado', en: '💡 Recommended', es: '💡 Recomendado', zh: '💡 推荐', ko: '💡 추천', vi: '💡 Đề xuất' },
  budgetWarning80: {
    ja: (pct: number, used: string, limit: string) => `\n\n⚠️ 予算の残りがわずかとなっております。\n使用率：${pct}%（¥${used} / 上限 ¥${limit}）`,
    en: (pct: number, used: string, limit: string) => `\n\n⚠️ Budget almost full: ${pct}% (¥${used} / ¥${limit})`,
    pt: (pct: number, used: string, limit: string) => `\n\n⚠️ Orçamento quase esgotado: ${pct}% (¥${used} / ¥${limit})`,
    es: (pct: number, used: string, limit: string) => `\n\n⚠️ Presupuesto casi agotado: ${pct}% (¥${used} / ¥${limit})`,
    zh: (pct: number, used: string, limit: string) => `\n\n⚠️ 预算即将用尽: ${pct}% (¥${used} / ¥${limit})`,
    ko: (pct: number, used: string, limit: string) => `\n\n⚠️ 예산 거의 소진: ${pct}% (¥${used} / ¥${limit})`,
    vi: (pct: number, used: string, limit: string) => `\n\n⚠️ Ngân sách gần hết: ${pct}% (¥${used} / ¥${limit})`,
  } as TranslationEntry,
  budgetOver100: {
    ja: (pct: number, used: string, limit: string) => `\n\n🚨 予算上限を超過いたしました。\n使用率：${pct}%（¥${used} / 上限 ¥${limit}）`,
    en: (pct: number, used: string, limit: string) => `\n\n🚨 Budget exceeded! ${pct}% (¥${used} / ¥${limit})`,
    pt: (pct: number, used: string, limit: string) => `\n\n🚨 Orçamento excedido! ${pct}% (¥${used} / ¥${limit})`,
    es: (pct: number, used: string, limit: string) => `\n\n🚨 ¡Presupuesto excedido! ${pct}% (¥${used} / ¥${limit})`,
    zh: (pct: number, used: string, limit: string) => `\n\n🚨 预算超额！ ${pct}% (¥${used} / ¥${limit})`,
    ko: (pct: number, used: string, limit: string) => `\n\n🚨 예산 초과! ${pct}% (¥${used} / ¥${limit})`,
    vi: (pct: number, used: string, limit: string) => `\n\n🚨 Vượt ngân sách! ${pct}% (¥${used} / ¥${limit})`,
  } as TranslationEntry,
  aiError:         { ja: '⚠️ AIが画像を正常に読み取ることができませんでした。\nお手数ですが、鮮明な写真を再度お送りくださいませ。', pt: '⚠️ A IA não conseguiu ler a imagem. Envie uma foto mais nítida.', en: '⚠️ AI could not read the image. Please send a clearer photo.', es: '⚠️ La IA no pudo leer la imagen. Envíe una foto más clara.', zh: '⚠️ AI无法读取图片。请发送更清晰的照片。', ko: '⚠️ AI가 이미지를 읽을 수 없습니다. 더 선명한 사진을 보내주세요.', vi: '⚠️ AI không thể đọc hình ảnh. Vui lòng gửi ảnh rõ hơn.' },
  processError:    { ja: '⚠️ 処理中にエラーが発生いたしました。\nお手数ですが、再度お試しくださいませ。', pt: '⚠️ Erro durante o processamento. Tente novamente.', en: '⚠️ An error occurred. Please try again.', es: '⚠️ Error durante el procesamiento. Intente de nuevo.', zh: '⚠️ 处理过程中发生错误。请重试。', ko: '⚠️ 처리 중 오류가 발생했습니다. 다시 시도하세요.', vi: '⚠️ Đã xảy ra lỗi khi xử lý. Vui lòng thử lại.' },

  // ── MyInfo labels ──
  myInfo: {
    ja: { title: '👤 マイ情報', name: '名前', statusL: 'ステータス', level: '権限', lang: '言語', projects: 'プロジェクト・CC', ai: 'AI学習状況', totalExp: '登録経費数', favCC: 'よく使うCC', topCat: 'カテゴリ別平均', noProject: '担当プロジェクトなし', noPattern: 'まだ学習データがありません', autoAssign: '自動CC割当' },
    pt: { title: '👤 Meus Dados', name: 'Nome', statusL: 'Status', level: 'Nível', lang: 'Idioma', projects: 'Projetos e CCs', ai: 'Aprendizado da IA', totalExp: 'Despesas registradas', favCC: 'CC mais usado', topCat: 'Média por categoria', noProject: 'Sem projetos vinculados', noPattern: 'Sem dados de aprendizado ainda', autoAssign: 'Auto-assign CC' },
    en: { title: '👤 My Info', name: 'Name', statusL: 'Status', level: 'Level', lang: 'Language', projects: 'Projects & CCs', ai: 'AI Learning', totalExp: 'Total expenses', favCC: 'Most used CC', topCat: 'Avg by category', noProject: 'No projects assigned', noPattern: 'No learning data yet', autoAssign: 'Auto-assign CC' },
    es: { title: '👤 Mis Datos', name: 'Nombre', statusL: 'Estado', level: 'Nivel', lang: 'Idioma', projects: 'Proyectos y CCs', ai: 'Aprendizaje IA', totalExp: 'Gastos registrados', favCC: 'CC más usado', topCat: 'Promedio por categoría', noProject: 'Sin proyectos asignados', noPattern: 'Sin datos de aprendizaje', autoAssign: 'Auto-asignar CC' },
    zh: { title: '👤 我的信息', name: '姓名', statusL: '状态', level: '权限', lang: '语言', projects: '项目和CC', ai: 'AI学习', totalExp: '总费用', favCC: '最常用CC', topCat: '分类平均', noProject: '未分配项目', noPattern: '暂无学习数据', autoAssign: '自动分配CC' },
    ko: { title: '👤 내 정보', name: '이름', statusL: '상태', level: '권한', lang: '언어', projects: '프로젝트 & CC', ai: 'AI 학습', totalExp: '총 비용', favCC: '자주 사용 CC', topCat: '카테고리별 평균', noProject: '배정 프로젝트 없음', noPattern: '학습 데이터 없음', autoAssign: '자동 CC 배정' },
    vi: { title: '👤 Thông Tin', name: 'Tên', statusL: 'Trạng thái', level: 'Cấp', lang: 'Ngôn ngữ', projects: 'Dự án & CC', ai: 'Học AI', totalExp: 'Tổng chi phí', favCC: 'CC thường dùng', topCat: 'TB theo loại', noProject: 'Chưa gán dự án', noPattern: 'Chưa có dữ liệu', autoAssign: 'Tự động gán CC' },
  } as Record<Lang, Record<string, string>>,

  userStatus: {
    0: { ja: '未登録', pt: 'Não registrado', en: 'Not registered', es: 'No registrado', zh: '未注册', ko: '미등록', vi: 'Chưa đăng ký' },
    1: { ja: '承認待ち', pt: 'Aguardando aprovação', en: 'Pending approval', es: 'Pendiente', zh: '待审批', ko: '승인 대기', vi: 'Chờ phê duyệt' },
    2: { ja: 'アクティブ ✅', pt: 'Ativo ✅', en: 'Active ✅', es: 'Activo ✅', zh: '活跃 ✅', ko: '활성 ✅', vi: 'Hoạt động ✅' },
  } as Record<number, Record<string, string>>,

  // ── CC list headers ──
  ccListHeader: {
    ja: '📁 担当プロジェクト・原価センター一覧', pt: '📁 Seus projetos e centros de custo', en: '📁 Your projects & cost centers',
    es: '📁 Sus proyectos y centros de costo', zh: '📁 您的项目和成本中心', ko: '📁 프로젝트 및 비용 센터', vi: '📁 Dự án & trung tâm chi phí',
  },
  balanceHeader: {
    ja: '💰 予算残高\n\n', pt: '💰 Saldo orçamentário\n\n', en: '💰 Budget balance\n\n',
    es: '💰 Saldo presupuestario\n\n', zh: '💰 预算余额\n\n', ko: '💰 예산 잔액\n\n', vi: '💰 Số dư ngân sách\n\n',
  },

  // ── Registration messages ──
  managerRegistered: {
    ja: (name: string) => `✅ ${name}様、管理者としての登録が完了いたしました。\nどうぞご利用くださいませ。`,
    pt: (name: string) => `✅ ${name}, registrado como gerente!\nVocê já pode usar.`,
    en: (name: string) => `✅ ${name}, registered as manager!\nYou can start using it now.`,
    es: (name: string) => `✅ ${name}, ¡registrado como gerente!\nYa puede comenzar a usar.`,
    zh: (name: string) => `✅ ${name}，已注册为管理员！\n现在可以使用了。`,
    ko: (name: string) => `✅ ${name}님, 관리자로 등록되었습니다!\n바로 사용 가능합니다.`,
    vi: (name: string) => `✅ ${name}, đã đăng ký làm quản lý!\nBạn có thể sử dụng ngay.`,
  } as TranslationEntry,
  userRegistered: {
    ja: (name: string) => `✅ ${name}様、登録が完了いたしました。\nレシートのお写真をお送りいただくと、AIが自動で読み取りいたします。`,
    pt: (name: string) => `✅ ${name}, registro concluído!\nVocê já pode enviar fotos de recibos.`,
    en: (name: string) => `✅ ${name}, registration complete!\nYou can now send receipt photos.`,
    es: (name: string) => `✅ ${name}, ¡registro completado!\nYa puede enviar fotos de recibos.`,
    zh: (name: string) => `✅ ${name}，注册完成！\n现在您可以发送收据照片了。`,
    ko: (name: string) => `✅ ${name}님, 등록이 완료되었습니다!\n이제 영수증 사진을 보낼 수 있습니다.`,
    vi: (name: string) => `✅ ${name}, đăng ký hoàn tất!\nBạn có thể gửi ảnh hóa đơn ngay bây giờ.`,
  } as TranslationEntry,

  // ── Duplicate detection ──
  duplicateSelf: {
    ja: (dt: string) => `⚠️ 重複の可能性がございます\n\n${dt} にご本人様が同じレシートをすでにご送信されております。\n\nキャンセルされますか？それとも両方保存して後ほどご確認されますか？`,
    pt: (dt: string) => `⚠️ Possível duplicata\n\nVocê já enviou este recibo em ${dt}.\n\nCancelar ou manter ambos para análise?`,
    en: (dt: string) => `⚠️ Possible duplicate\n\nYou already submitted this receipt on ${dt}.\n\nCancel or keep both for review?`,
    es: (dt: string) => `⚠️ Posible duplicado\n\nYa envió este recibo el ${dt}.\n\n¿Cancelar o mantener ambos?`,
    zh: (dt: string) => `⚠️ 可能重复\n\n您已于 ${dt} 提交了相同的收据。\n\n取消还是保留两者以供审查？`,
    ko: (dt: string) => `⚠️ 중복 가능성\n\n${dt}에 동일한 영수증을 이미 제출했습니다.\n\n취소 또는 두 개 모두 보관?`,
    vi: (dt: string) => `⚠️ Có thể trùng lặp\n\nBạn đã gửi hóa đơn này vào ${dt}.\n\nHủy hay giữ cả hai để xem xét?`,
  } as TranslationEntry,
  duplicateOther: {
    ja: (name: string, dt: string) => `⚠️ 重複の可能性がございます\n\n${dt} に ${name}様がすでに同じレシートをご登録されております。\n\nキャンセルされますか？それとも両方保存して後ほど確認のうえ処理されますか？`,
    pt: (name: string, dt: string) => `⚠️ Possível duplicata\n\n${name} já registrou este recibo em ${dt}.\n\nCancelar ou manter ambos para análise posterior?`,
    en: (name: string, dt: string) => `⚠️ Possible duplicate\n\n${name} already registered this receipt on ${dt}.\n\nCancel or keep both for later review?`,
    es: (name: string, dt: string) => `⚠️ Posible duplicado\n\n${name} ya registró este recibo el ${dt}.\n\n¿Cancelar o mantener ambos para revisión?`,
    zh: (name: string, dt: string) => `⚠️ 可能重复\n\n${name} 已于 ${dt} 登记了相同收据。\n\n取消还是保留两者供后续审查？`,
    ko: (name: string, dt: string) => `⚠️ 중복 가능성\n\n${name}님이 ${dt}에 동일한 영수증을 이미 등록했습니다.\n\n취소 또는 두 개 모두 보관?`,
    vi: (name: string, dt: string) => `⚠️ Có thể trùng lặp\n\n${name} đã đăng ký hóa đơn này vào ${dt}.\n\nHủy hay giữ cả hai để xem xét sau?`,
  } as TranslationEntry,
};

// ─── Public API ───────────────────────────────────────────────────────────────

/** Get a translated string. Falls back to en → ja if missing. */
export function i18n(key: keyof typeof TRANSLATIONS, lang: Lang, ...args: any[]): string {
  const entry = TRANSLATIONS[key];
  if (!entry) return `[missing: ${key}]`;
  return t(entry as TranslationEntry, lang, ...args);
}

/** Get a record of labels (for MyInfo, etc.) */
export function i18nLabels(key: 'myInfo', lang: Lang): Record<string, string> {
  const entry = TRANSLATIONS[key] as Record<Lang, Record<string, string>>;
  return entry[lang] || entry['en'] || entry['ja'];
}

/** Get user status text */
export function i18nStatus(statusCode: number, lang: Lang): string {
  const entry = TRANSLATIONS.userStatus[statusCode] || TRANSLATIONS.userStatus[0];
  return entry[lang] || entry['en'] || entry['ja'];
}

export { TRANSLATIONS };
