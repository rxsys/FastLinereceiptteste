'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const languages = [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
];

const content: Record<string, any> = {
  ja: {
    back: 'トップに戻る',
    login: 'ログイン',
    badge: '💴 コスト管理モジュール — 稼働中',
    hero: '経費管理を、もっとシンプルに。',
    heroAccent: 'もっとシンプルに。',
    heroDesc: 'LINEで領収書を送るだけ。AIが自動読み取り・国税庁認証・重複検知まで完全自動化。複数プロジェクトの予算と実績をリアルタイムで一元管理します。',
    ctaPrimary: '無料で始める',
    ctaSecondary: '機能一覧を見る',
    featuresLabel: '主な機能',
    featuresTitle: 'コスト管理モジュールの全機能',
    workflowLabel: 'ワークフロー',
    workflowTitle: '領収書提出から承認まで',
    integrationsLabel: '統合予定',
    integrationsTitle: '他モジュールと連携予定',
    integrationsDesc: 'コスト管理は単独でも強力ですが、他のFastLineモジュールと統合することで経営全体を一元管理できます。',
    ctaTitle: '今すぐ無料でお試しください',
    ctaDesc: 'クレジットカード不要。LINEアカウントがあればすぐに始められます。',
    highlights: [
      'LINEだけで完結する経費申請フロー',
      'AIによる領収書自動読み取り（精度99%）',
      '国税庁リアルタイム認証',
      '重複・不正防止の多層チェック',
      '予算超過時の自動アラーム',
      '複数プロジェクト・現場の同時管理',
    ],
    features: [
      { icon: '💬', title: 'LINE連携', desc: '現場からLINEで領収書を撮影して送信するだけ。アプリのインストール不要。スマートフォン一台で完結します。' },
      { icon: '🏛️', title: '国税庁（NTA）適格請求書認証', desc: 'インボイス制度に完全対応。登録番号（Tナンバー）をAIが自動抽出し、国税庁のAPIでリアルタイム認証。' },
      { icon: '📊', title: 'データエクスポート・会計レポート', desc: '会計ソフト向けCSVエクスポートに対応。月次・プロジェクト別・コストセンター別など多様なフォーマットで出力できます。' },
      { icon: '🗂️', title: '複数プロジェクト・コスト管理', desc: '複数の現場・プロジェクトを同時に管理可能。各プロジェクトに複数のコストセンターを紐づけ、予算と実績を分離して追跡できます。' },
      { icon: '🔐', title: 'アクセス権限管理', desc: 'LINEユーザーは自分が割り当てられたプロジェクトとコストセンターのみ閲覧・操作可能。情報漏洩リスクを排除した厳格な権限設計です。' },
      { icon: '🤖', title: 'LINE上のAIアシスタント', desc: 'LINEチャット上でAIがユーザーの質問に応答。残高照会・月次レポート・コストセンター確認などをチャット一問で完結。多言語対応。' },
      { icon: '🔍', title: '重複検知・監査', desc: '同一金額・同一日付の領収書を自動検出してアラートを表示。ワンクリックで否認処理が可能です。' },
      { icon: '📈', title: '予算対実績・リアルタイム管理', desc: 'プロジェクトごとに予算上限を設定。上限超過時には担当者へ自動アラームを送信します。' },
      { icon: '⚖️', title: '精算管理（ユーザー負担 vs 会社負担）', desc: '立替と会社直払いを記録。ユーザー別・プロジェクト別に精算収支バランスシートを自動生成します。' },
      { icon: '👤', title: 'マネージャーアカウント', desc: 'マネージャー権限ユーザーはLINEから全ユーザー情報の閲覧・登録・完全なレポート取得が可能です。' },
      { icon: '📉', title: 'グラフ・ビジュアル分析', desc: 'カテゴリ別・コストセンター別・月別の支出をインタラクティブグラフで可視化。異常値を一目で把握できます。' },
      { icon: '🗄️', title: '領収書の保存・管理', desc: '撮影した領収書画像はFirebase Storageに安全保存。いつでも原本画像を確認でき、税務調査にも対応可能です。' },
      { icon: '🔗', title: '他モジュールとの統合', desc: '「スタッフ管理」「協力会社管理」「勤怠管理」と統合予定。コスト管理が人事・労務データと紐づき経営全体を可視化します。' },
    ],
    flow: [
      { icon: '📸', label: 'LINEで撮影・送信' },
      { icon: '🤖', label: 'AIが自動読み取り' },
      { icon: '🏛️', label: 'NTA認証・重複検知' },
      { icon: '✅', label: '管理者が承認' },
      { icon: '📊', label: '集計・レポート出力' },
    ],
    integrations: [
      { icon: '👥', name: 'スタッフ管理', status: '開発中' },
      { icon: '🏢', name: '協力会社管理', status: '開発中' },
      { icon: '⏱️', name: '勤怠管理（LINE）', status: '開発中' },
      { icon: '📋', name: 'Career（採用・人事）', status: '近日公開' },
      { icon: '🆔', name: 'ID管理', status: '近日公開' },
    ],
  },
  en: {
    back: 'Back to Top',
    login: 'Login',
    badge: '💴 COST MANAGEMENT MODULE — ACTIVE',
    hero: 'Expense management, made simple.',
    heroAccent: 'made simple.',
    heroDesc: 'Just send receipts via LINE. AI auto-reads, NTA verification, duplicate detection — fully automated. Manage budgets vs actuals across multiple projects in real time.',
    ctaPrimary: 'Start for free',
    ctaSecondary: 'View features',
    featuresLabel: 'Features',
    featuresTitle: 'Everything in the Cost Management Module',
    workflowLabel: 'Workflow',
    workflowTitle: 'From receipt to approval',
    integrationsLabel: 'Upcoming Integrations',
    integrationsTitle: 'Connects with other modules',
    integrationsDesc: 'Cost Management is powerful on its own, but integrating with other FastLine modules gives you full business visibility.',
    ctaTitle: 'Try it free today',
    ctaDesc: 'No credit card required. Get started with just a LINE account.',
    highlights: [
      'Complete expense flow via LINE',
      '99% AI receipt recognition',
      'NTA real-time authentication',
      'Multi-layer duplicate prevention',
      'Auto alarm on budget overrun',
      'Manage multiple projects simultaneously',
    ],
    features: [
      { icon: '💬', title: 'LINE Integration', desc: 'Take a photo of your receipt and send it via LINE. No app installation needed. Everything done from your smartphone.' },
      { icon: '🏛️', title: 'NTA Invoice Authentication', desc: 'Fully compliant with Japan\'s invoice system. AI extracts the registration number (T-number) and verifies it with the NTA API in real time.' },
      { icon: '📊', title: 'Data Export & Accounting Reports', desc: 'CSV export for accounting software. Export by month, project, or cost center in multiple formats.' },
      { icon: '🗂️', title: 'Multi-Project Cost Management', desc: 'Manage multiple sites and projects simultaneously. Link multiple cost centers per project and track budget vs actual separately.' },
      { icon: '🔐', title: 'Access Control', desc: 'LINE users can only view and operate projects and cost centers assigned to them. Strict permission design that eliminates information leakage risk.' },
      { icon: '🤖', title: 'AI Assistant on LINE', desc: 'AI responds to user questions on LINE chat. Balance inquiries, monthly reports, cost center confirmation — all in one message. Multi-language support.' },
      { icon: '🔍', title: 'Duplicate Detection & Audit', desc: 'Automatically detects receipts with the same amount and date, displaying an alert. One-click rejection processing available.' },
      { icon: '📈', title: 'Budget vs Actual — Real-time', desc: 'Set budget limits per project. Balance updates in real time with each expense. Auto alarm sent to responsible person on overrun.' },
      { icon: '⚖️', title: 'Settlement Management (User vs Company)', desc: 'Records whether each expense is employee-paid or company-paid. Auto-generates settlement balance sheets by user and project.' },
      { icon: '👤', title: 'Manager Account', desc: 'Manager-level users can view all user info, register new users, and access full movement reports — all from LINE.' },
      { icon: '📉', title: 'Charts & Visual Analytics', desc: 'Visualize expenses by category, cost center, and month with interactive charts. Spot trends and anomalies at a glance.' },
      { icon: '🗄️', title: 'Receipt Storage & Management', desc: 'Receipt images are securely stored in Firebase Storage. Original images can be verified anytime, supporting tax audits.' },
      { icon: '🔗', title: 'Integration with Other Modules', desc: 'Planned integration with Staff Management, Partner Management, and Attendance (LINE). Cost management linked with HR data for full business visibility.' },
    ],
    flow: [
      { icon: '📸', label: 'Photo via LINE' },
      { icon: '🤖', label: 'AI auto-reads' },
      { icon: '🏛️', label: 'NTA auth & duplicate check' },
      { icon: '✅', label: 'Manager approves' },
      { icon: '📊', label: 'Report export' },
    ],
    integrations: [
      { icon: '👥', name: 'Staff Management', status: 'In Development' },
      { icon: '🏢', name: 'Partner Management', status: 'In Development' },
      { icon: '⏱️', name: 'Attendance (LINE)', status: 'In Development' },
      { icon: '📋', name: 'Career (HR)', status: 'Coming Soon' },
      { icon: '🆔', name: 'ID Management', status: 'Coming Soon' },
    ],
  },
  pt: {
    back: 'Voltar ao início',
    login: 'Entrar',
    badge: '💴 MÓDULO DE GESTÃO DE CUSTOS — ATIVO',
    hero: 'Gestão de despesas simplificada.',
    heroAccent: 'simplificada.',
    heroDesc: 'Envie recibos pelo LINE. IA lê automaticamente, autentica na NTA e detecta duplicatas. Gerencie orçamento vs realizado em tempo real.',
    ctaPrimary: 'Começar grátis',
    ctaSecondary: 'Ver funcionalidades',
    featuresLabel: 'Funcionalidades',
    featuresTitle: 'Tudo no módulo de Gestão de Custos',
    workflowLabel: 'Fluxo',
    workflowTitle: 'Do recibo à aprovação',
    integrationsLabel: 'Integrações futuras',
    integrationsTitle: 'Conecta com outros módulos',
    integrationsDesc: 'A Gestão de Custos é poderosa sozinha, mas integrando com outros módulos FastLine você gerencia todo o negócio em um só lugar.',
    ctaTitle: 'Experimente gratuitamente agora',
    ctaDesc: 'Sem cartão de crédito. Comece com apenas uma conta LINE.',
    highlights: [
      'Fluxo de despesas 100% via LINE',
      '99% de precisão da IA na leitura',
      'Autenticação NTA em tempo real',
      'Prevenção de duplicatas em múltiplas camadas',
      'Alarme automático de estouro de orçamento',
      'Múltiplos projetos ao mesmo tempo',
    ],
    features: [
      { icon: '💬', title: 'Integração com LINE', desc: 'Tire foto do recibo e envie pelo LINE. Sem instalação de app. Tudo pelo smartphone.' },
      { icon: '🏛️', title: 'Autenticação NTA (Nota Fiscal Japonesa)', desc: 'Totalmente compatível com o sistema de notas fiscais japonês. IA extrai o número de registro (T-number) e verifica na API da NTA em tempo real.' },
      { icon: '📊', title: 'Exportação e Relatórios Contábeis', desc: 'Exportação CSV para softwares de contabilidade. Exporte por mês, projeto ou centro de custo em múltiplos formatos.' },
      { icon: '🗂️', title: 'Gestão Multi-Projeto', desc: 'Gerencie múltiplas obras e projetos simultaneamente. Vincule múltiplos centros de custo por projeto e acompanhe orçado vs realizado separadamente.' },
      { icon: '🔐', title: 'Controle de Acesso', desc: 'Usuários LINE visualizam apenas projetos e centros de custo atribuídos a eles. Design de permissões rigoroso que elimina risco de vazamento de informação.' },
      { icon: '🤖', title: 'Assistente de IA no LINE', desc: 'IA responde perguntas no chat do LINE. Consulta de saldo, relatório mensal, verificação de centro de custo — tudo em uma mensagem. Multidiomas.' },
      { icon: '🔍', title: 'Detecção de Duplicatas e Auditoria', desc: 'Detecta automaticamente recibos com mesmo valor e data, exibindo alerta. Processamento de rejeição com um clique.' },
      { icon: '📈', title: 'Orçado vs Realizado em Tempo Real', desc: 'Defina limites de orçamento por projeto. Saldo atualizado em tempo real a cada despesa. Alarme automático enviado ao responsável no estouro.' },
      { icon: '⚖️', title: 'Gestão de Prestação de Contas', desc: 'Registra se cada despesa é por conta do funcionário ou da empresa. Gera automaticamente balanço de prestação de contas por usuário e projeto.' },
      { icon: '👤', title: 'Conta Gerente', desc: 'Usuários gerentes podem ver todos os usuários, cadastrar novos e acessar relatórios completos de movimentação — tudo pelo LINE.' },
      { icon: '📉', title: 'Gráficos e Análise Visual', desc: 'Visualize despesas por categoria, centro de custo e mês com gráficos interativos. Identifique tendências e anomalias de relance.' },
      { icon: '🗄️', title: 'Armazenamento de Recibos', desc: 'Imagens dos recibos armazenadas com segurança no Firebase Storage. Imagens originais verificáveis a qualquer momento, suportando auditorias fiscais.' },
      { icon: '🔗', title: 'Integração com Outros Módulos', desc: 'Integração planejada com Gestão de Funcionários, Fornecedores e Ponto (LINE). Custos vinculados a dados de RH para visibilidade completa do negócio.' },
    ],
    flow: [
      { icon: '📸', label: 'Foto pelo LINE' },
      { icon: '🤖', label: 'IA lê automaticamente' },
      { icon: '🏛️', label: 'Auth NTA e duplicatas' },
      { icon: '✅', label: 'Gerente aprova' },
      { icon: '📊', label: 'Relatório exportado' },
    ],
    integrations: [
      { icon: '👥', name: 'Gestão de Funcionários', status: 'Em desenvolvimento' },
      { icon: '🏢', name: 'Gestão de Fornecedores', status: 'Em desenvolvimento' },
      { icon: '⏱️', name: 'Ponto (LINE)', status: 'Em desenvolvimento' },
      { icon: '📋', name: 'Career (RH)', status: 'Em breve' },
      { icon: '🆔', name: 'Gestão de ID', status: 'Em breve' },
    ],
  },
  es: {
    back: 'Volver al inicio',
    login: 'Iniciar sesión',
    badge: '💴 MÓDULO DE GESTIÓN DE COSTOS — ACTIVO',
    hero: 'Gestión de gastos simplificada.',
    heroAccent: 'simplificada.',
    heroDesc: 'Envía recibos por LINE. La IA lee automáticamente, autentica en NTA y detecta duplicados. Gestiona presupuesto vs real en tiempo real.',
    ctaPrimary: 'Comenzar gratis',
    ctaSecondary: 'Ver funciones',
    featuresLabel: 'Funciones',
    featuresTitle: 'Todo en el módulo de Gestión de Costos',
    workflowLabel: 'Flujo de trabajo',
    workflowTitle: 'Del recibo a la aprobación',
    integrationsLabel: 'Integraciones futuras',
    integrationsTitle: 'Se conecta con otros módulos',
    integrationsDesc: 'La gestión de costos es potente por sí sola, pero al integrarse con otros módulos FastLine obtienes visibilidad total del negocio.',
    ctaTitle: 'Pruébalo gratis hoy',
    ctaDesc: 'Sin tarjeta de crédito. Comienza con solo una cuenta LINE.',
    highlights: [
      'Flujo de gastos completo vía LINE',
      '99% de precisión IA en recibos',
      'Autenticación NTA en tiempo real',
      'Prevención de duplicados multicapa',
      'Alarma automática por exceso de presupuesto',
      'Múltiples proyectos simultáneos',
    ],
    features: [
      { icon: '💬', title: 'Integración con LINE', desc: 'Toma foto del recibo y envíalo por LINE. Sin instalación de app. Todo desde tu smartphone.' },
      { icon: '🏛️', title: 'Autenticación NTA', desc: 'Totalmente compatible con el sistema de facturas japonés. La IA extrae el número de registro y lo verifica en la API de NTA en tiempo real.' },
      { icon: '📊', title: 'Exportación y Reportes Contables', desc: 'Exportación CSV para software contable. Exporta por mes, proyecto o centro de costo en múltiples formatos.' },
      { icon: '🗂️', title: 'Gestión Multi-Proyecto', desc: 'Gestiona múltiples obras y proyectos simultáneamente. Vincula centros de costo por proyecto y monitorea presupuesto vs real por separado.' },
      { icon: '🔐', title: 'Control de Acceso', desc: 'Los usuarios LINE solo ven proyectos y centros de costo asignados. Diseño de permisos estricto que elimina el riesgo de filtración.' },
      { icon: '🤖', title: 'Asistente IA en LINE', desc: 'La IA responde preguntas en el chat de LINE. Consulta de saldo, reportes mensuales y más — en un solo mensaje. Multiidioma.' },
      { icon: '🔍', title: 'Detección de Duplicados y Auditoría', desc: 'Detecta automáticamente recibos con el mismo importe y fecha. Rechazo con un solo clic.' },
      { icon: '📈', title: 'Presupuesto vs Real en Tiempo Real', desc: 'Define límites de presupuesto por proyecto. Saldo actualizado en tiempo real. Alarma automática al responsable si se supera.' },
      { icon: '⚖️', title: 'Gestión de Liquidación', desc: 'Registra si cada gasto corre por cuenta del empleado o la empresa. Genera automáticamente balances de liquidación por usuario y proyecto.' },
      { icon: '👤', title: 'Cuenta Gerente', desc: 'Los gerentes pueden ver todos los usuarios, registrar nuevos y acceder a reportes completos — todo desde LINE.' },
      { icon: '📉', title: 'Gráficos y Análisis Visual', desc: 'Visualiza gastos por categoría, centro de costo y mes con gráficos interactivos. Identifica tendencias y anomalías de un vistazo.' },
      { icon: '🗄️', title: 'Almacenamiento de Recibos', desc: 'Imágenes de recibos almacenadas de forma segura. Verificables en cualquier momento para auditorías fiscales.' },
      { icon: '🔗', title: 'Integración con Otros Módulos', desc: 'Integración planificada con Gestión de Personal, Proveedores y Asistencia (LINE).' },
    ],
    flow: [
      { icon: '📸', label: 'Foto por LINE' },
      { icon: '🤖', label: 'IA lee automáticamente' },
      { icon: '🏛️', label: 'Auth NTA y duplicados' },
      { icon: '✅', label: 'Gerente aprueba' },
      { icon: '📊', label: 'Reporte exportado' },
    ],
    integrations: [
      { icon: '👥', name: 'Gestión de Personal', status: 'En desarrollo' },
      { icon: '🏢', name: 'Gestión de Proveedores', status: 'En desarrollo' },
      { icon: '⏱️', name: 'Asistencia (LINE)', status: 'En desarrollo' },
      { icon: '📋', name: 'Career (RRHH)', status: 'Próximamente' },
      { icon: '🆔', name: 'Gestión de ID', status: 'Próximamente' },
    ],
  },
  zh: {
    back: '返回首页',
    login: '登录',
    badge: '💴 成本管理模块 — 运行中',
    hero: '费用管理，更简单。',
    heroAccent: '更简单。',
    heroDesc: '只需通过LINE发送收据。AI自动读取、NTA验证、重复检测——全程自动化。实时管理多个项目的预算与实际支出。',
    ctaPrimary: '免费开始',
    ctaSecondary: '查看功能',
    featuresLabel: '主要功能',
    featuresTitle: '成本管理模块全功能',
    workflowLabel: '工作流程',
    workflowTitle: '从收据提交到审批',
    integrationsLabel: '即将集成',
    integrationsTitle: '与其他模块连接',
    integrationsDesc: '成本管理本身已非常强大，与其他FastLine模块集成后，可实现全业务一体化管理。',
    ctaTitle: '立即免费试用',
    ctaDesc: '无需信用卡，只需LINE账号即可开始。',
    highlights: [
      '通过LINE完成全部费用申请流程',
      'AI收据识别准确率99%',
      'NTA实时认证',
      '多层重复防护',
      '预算超支自动警报',
      '同时管理多个项目',
    ],
    features: [
      { icon: '💬', title: 'LINE集成', desc: '拍摄收据并通过LINE发送即可。无需安装APP，一部智能手机搞定一切。' },
      { icon: '🏛️', title: 'NTA适格发票认证', desc: '完全符合日本发票制度。AI自动提取注册号（T编号）并通过NTA API实时验证。' },
      { icon: '📊', title: '数据导出与会计报告', desc: '支持会计软件CSV导出。可按月份、项目、成本中心等多种格式输出费用数据。' },
      { icon: '🗂️', title: '多项目成本管理', desc: '可同时管理多个工地和项目。每个项目关联多个成本中心，分别追踪预算与实际支出。' },
      { icon: '🔐', title: '访问权限管理', desc: 'LINE用户只能查看和操作分配给自己的项目和成本中心。严格的权限设计，消除信息泄露风险。' },
      { icon: '🤖', title: 'LINE上的AI助手', desc: 'AI在LINE聊天中回答用户问题。余额查询、月度报告、成本中心确认——一条消息完成。多语言支持。' },
      { icon: '🔍', title: '重复检测与审计', desc: '自动检测相同金额和日期的收据并显示警报。一键拒绝处理。' },
      { icon: '📈', title: '预算对比实际——实时管理', desc: '为每个项目设置预算上限。每次发生支出时实时更新余额。超支时自动向负责人发送警报。' },
      { icon: '⚖️', title: '结算管理（个人负担 vs 公司负担）', desc: '记录每笔费用是员工垫付还是公司直付。按用户和项目自动生成结算收支平衡表。' },
      { icon: '👤', title: '管理员账户', desc: '管理员权限用户可通过LINE查看所有用户信息、注册新用户并获取完整的移动报告。' },
      { icon: '📉', title: '图表与可视化分析', desc: '按类别、成本中心和月份以交互图表可视化支出。一目了然掌握趋势和异常。' },
      { icon: '🗄️', title: '收据存储与管理', desc: '收据图像安全存储在Firebase Storage中。随时可查看原始图像，支持税务审查。' },
      { icon: '🔗', title: '与其他模块集成', desc: '计划与员工管理、合作伙伴管理、考勤管理（LINE）集成，将成本管理与人力资源数据关联。' },
    ],
    flow: [
      { icon: '📸', label: '通过LINE拍照发送' },
      { icon: '🤖', label: 'AI自动读取' },
      { icon: '🏛️', label: 'NTA认证·重复检测' },
      { icon: '✅', label: '管理员审批' },
      { icon: '📊', label: '汇总·报告输出' },
    ],
    integrations: [
      { icon: '👥', name: '员工管理', status: '开发中' },
      { icon: '🏢', name: '合作伙伴管理', status: '开发中' },
      { icon: '⏱️', name: '考勤管理（LINE）', status: '开发中' },
      { icon: '📋', name: 'Career（人事）', status: '即将上线' },
      { icon: '🆔', name: 'ID管理', status: '即将上线' },
    ],
  },
  tr: {
    back: 'Ana sayfaya dön',
    login: 'Giriş yap',
    badge: '💴 MALİYET YÖNETİMİ MODÜLÜ — AKTİF',
    hero: 'Gider yönetimi, artık daha basit.',
    heroAccent: 'artık daha basit.',
    heroDesc: 'LINE üzerinden fiş gönderin. Yapay zeka otomatik okur, NTA doğrular, tekrar edenleri tespit eder. Bütçe ile gerçeği gerçek zamanlı yönetin.',
    ctaPrimary: 'Ücretsiz başla',
    ctaSecondary: 'Özellikleri gör',
    featuresLabel: 'Özellikler',
    featuresTitle: 'Maliyet Yönetimi Modülünün Tüm Özellikleri',
    workflowLabel: 'İş akışı',
    workflowTitle: 'Fişten onaya kadar',
    integrationsLabel: 'Yaklaşan entegrasyonlar',
    integrationsTitle: 'Diğer modüllerle bağlantı',
    integrationsDesc: 'Maliyet Yönetimi tek başına güçlüdür, ancak diğer FastLine modülleriyle entegre edildiğinde tüm işletme görünürlüğü sağlanır.',
    ctaTitle: 'Bugün ücretsiz deneyin',
    ctaDesc: 'Kredi kartı gerekmez. Sadece bir LINE hesabıyla başlayın.',
    highlights: [
      'LINE üzerinden tam gider akışı',
      '%99 yapay zeka fatura tanıma',
      'Gerçek zamanlı NTA kimlik doğrulama',
      'Çok katmanlı tekrar önleme',
      'Bütçe aşımında otomatik alarm',
      'Aynı anda birden fazla proje yönetimi',
    ],
    features: [
      { icon: '💬', title: 'LINE Entegrasyonu', desc: 'Fişin fotoğrafını çekin ve LINE üzerinden gönderin. Uygulama yüklemeye gerek yok. Her şey akıllı telefonunuzdan.' },
      { icon: '🏛️', title: 'NTA Fatura Kimlik Doğrulama', desc: 'Japonya\'nın fatura sistemiyle tam uyumlu. Yapay zeka kayıt numarasını (T-numarası) çıkarır ve NTA API\'si ile gerçek zamanlı doğrular.' },
      { icon: '📊', title: 'Veri Dışa Aktarma ve Muhasebe Raporları', desc: 'Muhasebe yazılımı için CSV dışa aktarma. Ay, proje veya maliyet merkezi bazında çok formatlı dışa aktarım.' },
      { icon: '🗂️', title: 'Çok Projeli Maliyet Yönetimi', desc: 'Birden fazla şantiye ve projeyi aynı anda yönetin. Proje başına birden fazla maliyet merkezi bağlayın ve bütçe ile gerçeği ayrı takip edin.' },
      { icon: '🔐', title: 'Erişim Kontrolü', desc: 'LINE kullanıcıları yalnızca atandıkları projeleri ve maliyet merkezlerini görüntüleyip çalıştırabilir.' },
      { icon: '🤖', title: 'LINE\'da Yapay Zeka Asistanı', desc: 'Yapay zeka LINE sohbetinde kullanıcı sorularını yanıtlar. Bakiye sorgusu, aylık raporlar, maliyet merkezi onayı — tek mesajda.' },
      { icon: '🔍', title: 'Tekrar Tespiti ve Denetim', desc: 'Aynı tutar ve tarihe sahip fişleri otomatik tespit ederek uyarı görüntüler. Tek tıklamayla ret işlemi.' },
      { icon: '📈', title: 'Bütçe - Gerçek Karşılaştırması', desc: 'Proje başına bütçe limiti belirleyin. Her gider oluştuğunda bakiye güncellenir. Aşım durumunda otomatik alarm gönderilir.' },
      { icon: '⚖️', title: 'Mutabakat Yönetimi', desc: 'Her giderin çalışan mı yoksa şirket tarafından mı karşılandığını kaydeder. Kullanıcı ve proje bazında mutabakat bilançosu otomatik oluşturulur.' },
      { icon: '👤', title: 'Yönetici Hesabı', desc: 'Yönetici yetkili kullanıcılar LINE üzerinden tüm kullanıcı bilgilerini görüntüleyebilir, yeni kullanıcı kaydedebilir ve tam raporlara erişebilir.' },
      { icon: '📉', title: 'Grafikler ve Görsel Analiz', desc: 'Kategori, maliyet merkezi ve aya göre giderleri etkileşimli grafiklerle görselleştirin.' },
      { icon: '🗄️', title: 'Fiş Depolama ve Yönetimi', desc: 'Fiş görselleri Firebase Storage\'da güvenli şekilde saklanır. Vergi denetimleri için orijinal görseller her zaman erişilebilir.' },
      { icon: '🔗', title: 'Diğer Modüllerle Entegrasyon', desc: 'Personel Yönetimi, İş Ortağı Yönetimi ve Devam Takibi (LINE) ile entegrasyon planlanmaktadır.' },
    ],
    flow: [
      { icon: '📸', label: 'LINE ile fotoğraf gönder' },
      { icon: '🤖', label: 'Yapay zeka okur' },
      { icon: '🏛️', label: 'NTA doğrulama & tekrar tespiti' },
      { icon: '✅', label: 'Yönetici onaylar' },
      { icon: '📊', label: 'Rapor dışa aktarılır' },
    ],
    integrations: [
      { icon: '👥', name: 'Personel Yönetimi', status: 'Geliştiriliyor' },
      { icon: '🏢', name: 'İş Ortağı Yönetimi', status: 'Geliştiriliyor' },
      { icon: '⏱️', name: 'Devam Takibi (LINE)', status: 'Geliştiriliyor' },
      { icon: '📋', name: 'Career (İK)', status: 'Yakında' },
      { icon: '🆔', name: 'Kimlik Yönetimi', status: 'Yakında' },
    ],
  },
};

export default function ModuleCostPage() {
  const router = useRouter();
  const [currentLang, setCurrentLang] = useState('ja');

  useEffect(() => {
    const saved = localStorage.getItem('fastline_lang');
    if (saved && content[saved]) setCurrentLang(saved);
  }, []);

  const handleLangChange = (lang: string) => {
    setCurrentLang(lang);
    localStorage.setItem('fastline_lang', lang);
  };

  const t = content[currentLang] || content.ja;

  return (
    <div className="min-h-screen bg-[#060610] text-white">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#060610]/80 backdrop-blur-xl border-b border-white/5">
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-base font-bold"
        >
          <ArrowLeft className="w-5 h-5" />
          {t.back}
        </button>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-[#22c55e] rounded-md flex items-center justify-center text-white font-black text-base shadow-[0_0_12px_rgba(34,197,94,0.4)]">F</div>
          <span className="font-black text-base"><span className="text-white">Fast</span><span className="text-[#22c55e]">Line</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Select value={currentLang} onValueChange={handleLangChange}>
            <SelectTrigger className="w-[110px] h-9 bg-white/5 border-white/10 text-white/70 rounded-xl focus:ring-0 text-sm font-bold">
              <SelectValue>
                <span className="flex items-center gap-1.5">
                  <span className="text-base">{languages.find(l => l.code === currentLang)?.flag}</span>
                  <span>{languages.find(l => l.code === currentLang)?.code.toUpperCase()}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-[#0c0c14]/95 border-[#222235] text-white rounded-2xl shadow-2xl">
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="focus:bg-white/10 focus:text-white rounded-xl text-sm font-bold">
                  <span className="flex items-center gap-2">
                    <span className="text-base">{lang.flag}</span><span>{lang.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#22c55e] text-white text-sm font-black hover:bg-[#16a34a] transition-all shadow-lg shadow-[#22c55e]/20"
          >
            {t.login} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-sm font-black tracking-widest mb-8">
          {t.badge}
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight max-w-4xl">
          {t.hero.replace(t.heroAccent, '')}<span className="text-[#22c55e]">{t.heroAccent}</span>
        </h1>
        <p className="mt-6 text-white/50 max-w-2xl text-lg leading-relaxed font-medium">{t.heroDesc}</p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push('/')}
            className="px-8 py-4 rounded-2xl bg-[#22c55e] text-white font-black text-base hover:bg-[#16a34a] transition-all shadow-xl shadow-[#22c55e]/25 flex items-center gap-2"
          >
            {t.ctaPrimary} <ArrowRight className="w-5 h-5" />
          </button>
          <a href="#features" className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black text-base hover:bg-white/10 transition-all">
            {t.ctaSecondary}
          </a>
        </div>
      </section>

      {/* Highlights strip */}
      <section className="py-8 border-y border-white/5 bg-white/[0.02] overflow-x-auto">
        <div className="flex items-center gap-10 px-8 min-w-max mx-auto">
          {t.highlights.map((h: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm font-bold text-white/60 whitespace-nowrap">
              <Check className="w-4 h-4 text-[#22c55e] shrink-0" />
              {h}
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="py-24 px-6 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-sm font-black text-[#22c55e] tracking-widest uppercase mb-3">{t.featuresLabel}</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter">{t.featuresTitle}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.features.map((f: any, i: number) => (
            <div key={i} className="p-7 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-[#22c55e]/20 hover:bg-white/[0.05] transition-all group">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-black text-base text-white mb-3 group-hover:text-[#22c55e] transition-colors">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow */}
      <section className="py-20 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-black text-[#22c55e] tracking-widest uppercase mb-3">{t.workflowLabel}</p>
          <h2 className="text-3xl font-black tracking-tighter mb-12">{t.workflowTitle}</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {t.flow.map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-3xl">
                    {s.icon}
                  </div>
                  <p className="text-xs font-black text-white/60 text-center leading-snug max-w-[90px]">{s.label}</p>
                </div>
                {i < t.flow.length - 1 && <div className="hidden sm:block w-8 h-px bg-[#22c55e]/20 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 px-6 max-w-4xl mx-auto text-center">
        <p className="text-sm font-black text-[#22c55e] tracking-widest uppercase mb-3">{t.integrationsLabel}</p>
        <h2 className="text-3xl font-black tracking-tighter mb-4">{t.integrationsTitle}</h2>
        <p className="text-white/50 text-base mb-10">{t.integrationsDesc}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {t.integrations.map((m: any, i: number) => (
            <div key={i} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/8 text-base">
              <span className="text-xl">{m.icon}</span>
              <span className="font-bold text-white/70">{m.name}</span>
              <span className="text-xs font-black text-white/40 bg-white/5 px-2 py-0.5 rounded-full">{m.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center border-t border-white/5">
        <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">{t.ctaTitle}</h2>
        <p className="text-white/50 text-base mb-8">{t.ctaDesc}</p>
        <button
          onClick={() => router.push('/')}
          className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-[#22c55e] text-white font-black text-base hover:bg-[#16a34a] transition-all shadow-xl shadow-[#22c55e]/25"
        >
          {t.ctaPrimary} <ArrowRight className="w-5 h-5" />
        </button>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#22c55e] rounded-md flex items-center justify-center text-white font-black text-sm">F</div>
          <span className="text-base font-black text-white/40"><span className="text-white/60">Fast</span><span className="text-[#22c55e]/80">Line</span></span>
        </div>
        <div className="flex gap-6">
          <button onClick={() => router.push('/tokushoho')} className="text-sm text-white/30 hover:text-white/60 transition-colors">特定商取引法に基づく表記</button>
          <button onClick={() => router.push('/privacy')} className="text-sm text-white/30 hover:text-white/60 transition-colors">プライバシーポリシー</button>
          <button onClick={() => router.push('/terms')} className="text-sm text-white/30 hover:text-white/60 transition-colors">利用規約</button>
        </div>
      </footer>
    </div>
  );
}
