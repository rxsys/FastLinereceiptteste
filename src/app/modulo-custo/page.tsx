'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const features = [
  {
    icon: '💬',
    title: 'LINE連携',
    desc: '現場からLINEで領収書を撮影して送信するだけ。アプリのインストール不要。スマートフォン一台で完結します。',
  },
  {
    icon: '🏛️',
    title: '国税庁（NTA）適格請求書認証',
    desc: 'インボイス制度に完全対応。登録番号（Tナンバー）をAIが自動抽出し、国税庁のAPIでリアルタイム認証。適格請求書か否かをダッシュボードで即座に確認できます。',
  },
  {
    icon: '📊',
    title: 'データエクスポート・会計レポート',
    desc: '会計ソフト向けCSVエクスポートに対応。月次・プロジェクト別・コストセンター別など、多様なフォーマットで経費データを出力できます。',
  },
  {
    icon: '🗂️',
    title: '複数プロジェクト・コスト管理',
    desc: '複数の現場・プロジェクトを同時に管理可能。各プロジェクトに複数のコストセンターを紐づけ、予算と実績を分離して追跡できます。',
  },
  {
    icon: '🔐',
    title: 'アクセス権限管理',
    desc: 'LINEユーザーは自分が割り当てられたプロジェクトとコストセンターのみ閲覧・操作可能。情報漏洩リスクを排除した厳格な権限設計です。',
  },
  {
    icon: '🤖',
    title: 'LINE上のAIアシスタント',
    desc: 'LINEチャット上でAIがユーザーの質問に応答。残高照会・月次レポート・コストセンター確認などをチャット一問で完結。多言語対応（日・英・葡・西）。',
  },
  {
    icon: '🔍',
    title: '重複検知・監査',
    desc: '同一金額・同一日付の領収書を自動検出してアラートを表示。ダッシュボードで重複候補を一覧確認でき、ワンクリックで否認処理が可能です。',
  },
  {
    icon: '📈',
    title: '予算対実績・リアルタイム管理',
    desc: 'プロジェクトごとに予算上限を設定。支出が発生するたびに残高をリアルタイム更新。上限超過時には担当者へ自動アラームを送信します。',
  },
  {
    icon: '⚖️',
    title: '精算管理（ユーザー負担 vs 会社負担）',
    desc: '各経費が「立替（個人負担）」か「会社直払い」かを記録。ユーザー別・プロジェクト別に精算済み／未精算の収支バランスシートを自動生成します。',
  },
  {
    icon: '👤',
    title: 'マネージャーアカウント',
    desc: 'マネージャー権限のユーザーはLINEから全ユーザー情報の閲覧・新規ユーザー登録・完全な移動レポートの取得が可能。現場にいながら管理業務を完結できます。',
  },
  {
    icon: '📉',
    title: 'グラフ・ビジュアル分析',
    desc: 'カテゴリ別・コストセンター別・月別の支出をインタラクティブグラフで可視化。トレンドと異常値を一目で把握できます。',
  },
  {
    icon: '🗄️',
    title: '領収書の保存・管理',
    desc: '撮影した領収書画像はFirebase Storageに安全保存。いつでもダッシュボードから原本画像を確認でき、税務調査にも対応可能な証憑管理を実現します。',
  },
  {
    icon: '🔗',
    title: '他モジュールとの統合',
    desc: '現在開発中の「スタッフ管理」「協力会社管理」「勤怠管理（LINE連携）」と統合予定。コスト管理が人事・労務データと紐づき、経営全体の可視化を実現します。',
  },
];

const highlights = [
  'LINEだけで完結する経費申請フロー',
  'AIによる領収書自動読み取り（精度99%）',
  '国税庁リアルタイム認証',
  '重複・不正防止の多層チェック',
  '予算超過時の自動アラーム',
  '複数プロジェクト・現場の同時管理',
];

export default function CostLandingPage() {
  return (
    <div className="min-h-screen bg-[#060610] text-white">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-[#060610]/80 backdrop-blur-xl border-b border-white/5">
        <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-base font-bold">
          <ArrowLeft className="w-5 h-5" />
          トップに戻る
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#22c55e] rounded-md flex items-center justify-center text-white font-black text-base shadow-[0_0_12px_rgba(34,197,94,0.4)]">F</div>
          <span className="font-black text-base"><span className="text-white">Fast</span><span className="text-[#22c55e]">Line</span></span>
        </div>
        <Link href="/" className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#22c55e] text-white text-sm font-black hover:bg-[#16a34a] transition-all shadow-lg shadow-[#22c55e]/20">
          ログイン <ArrowRight className="w-4 h-4" />
        </Link>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-sm font-black tracking-widest mb-8">
          💴 COST MANAGEMENT MODULE — 稼働中
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight max-w-4xl">
          経費管理を、<span className="text-[#22c55e]">もっとシンプルに。</span>
        </h1>
        <p className="mt-6 text-white/50 max-w-2xl text-lg leading-relaxed font-medium">
          LINEで領収書を送るだけ。AIが自動読み取り・国税庁認証・重複検知まで完全自動化。<br />
          複数プロジェクトの予算と実績をリアルタイムで一元管理します。
        </p>
        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Link href="/" className="px-8 py-4 rounded-2xl bg-[#22c55e] text-white font-black text-base hover:bg-[#16a34a] transition-all shadow-xl shadow-[#22c55e]/25 flex items-center gap-2">
            無料で始める <ArrowRight className="w-5 h-5" />
          </Link>
          <a href="#features" className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black text-base hover:bg-white/10 transition-all">
            機能一覧を見る
          </a>
        </div>
      </section>

      {/* Highlights strip */}
      <section className="py-8 border-y border-white/5 bg-white/[0.02] overflow-x-auto">
        <div className="flex items-center gap-10 px-8 min-w-max mx-auto">
          {highlights.map((h, i) => (
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
          <p className="text-sm font-black text-[#22c55e] tracking-widest uppercase mb-3">主な機能</p>
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter">コスト管理モジュールの全機能</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => (
            <div key={i} className="p-7 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-[#22c55e]/20 hover:bg-white/[0.05] transition-all group">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-black text-base text-white mb-3 group-hover:text-[#22c55e] transition-colors">{f.title}</h3>
              <p className="text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LINE flow visual */}
      <section className="py-20 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-black text-[#22c55e] tracking-widest uppercase mb-3">ワークフロー</p>
          <h2 className="text-3xl font-black tracking-tighter mb-12">領収書提出から承認まで</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {[
              { step: '01', icon: '📸', label: 'LINEで撮影・送信' },
              { step: '02', icon: '🤖', label: 'AIが自動読み取り' },
              { step: '03', icon: '🏛️', label: 'NTA認証・重複検知' },
              { step: '04', icon: '✅', label: '管理者が承認' },
              { step: '05', icon: '📊', label: '集計・レポート出力' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20 flex items-center justify-center text-3xl">
                    {s.icon}
                  </div>
                  <p className="text-xs font-black text-white/60 text-center leading-snug max-w-[90px]">{s.label}</p>
                </div>
                {i < 4 && <div className="hidden sm:block w-8 h-px bg-[#22c55e]/20 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-20 px-6 max-w-4xl mx-auto text-center">
        <p className="text-sm font-black text-[#22c55e] tracking-widest uppercase mb-3">統合予定</p>
        <h2 className="text-3xl font-black tracking-tighter mb-4">他モジュールと連携予定</h2>
        <p className="text-white/50 text-base mb-10">コスト管理は単独でも強力ですが、他のFastLineモジュールと統合することで経営全体を一元管理できます。</p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { icon: '👥', name: 'スタッフ管理', status: '開発中' },
            { icon: '🏢', name: '協力会社管理', status: '開発中' },
            { icon: '⏱️', name: '勤怠管理（LINE）', status: '開発中' },
            { icon: '📋', name: 'Career（採用・人事）', status: '近日公開' },
            { icon: '🆔', name: 'ID管理', status: '近日公開' },
          ].map((m, i) => (
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
        <h2 className="text-3xl md:text-4xl font-black tracking-tighter mb-4">
          今すぐ<span className="text-[#22c55e]">無料</span>でお試しください
        </h2>
        <p className="text-white/50 text-base mb-8">クレジットカード不要。LINEアカウントがあればすぐに始められます。</p>
        <Link href="/" className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-[#22c55e] text-white font-black text-base hover:bg-[#16a34a] transition-all shadow-xl shadow-[#22c55e]/25">
          無料で始める <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#22c55e] rounded-md flex items-center justify-center text-white font-black text-sm">F</div>
          <span className="text-base font-black text-white/40"><span className="text-white/60">Fast</span><span className="text-[#22c55e]/80">Line</span> コスト管理</span>
        </div>
        <div className="flex gap-6">
          <Link href="/tokushoho" className="text-sm text-white/30 hover:text-white/60 transition-colors">特定商取引法に基づく表記</Link>
          <Link href="/privacy" className="text-sm text-white/30 hover:text-white/60 transition-colors">プライバシーポリシー</Link>
          <Link href="/terms" className="text-sm text-white/30 hover:text-white/60 transition-colors">利用規約</Link>
        </div>
      </footer>
    </div>
  );
}
