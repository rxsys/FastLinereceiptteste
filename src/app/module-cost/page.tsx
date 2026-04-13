'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useDatabase } from '@/firebase';
import { get, ref } from 'firebase/database';
import { CheckoutPanel } from '@/components/checkout-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MessageCircle, Brain, ShieldCheck, BarChart3, ArrowRight, Loader2, Shield, Bell, Zap, CheckCircle2 } from 'lucide-react';
import DemoTestDrive from './components/DemoTestDrive';

const COLOR = '#22c55e';

const FEATURES = [
  {
    icon: <MessageCircle className="w-6 h-6" />,
    title: 'LINEで領収書を送るだけ',
    desc: '現場からLINEで写真を送信するだけで経費登録完了。アプリのインストール不要、スマートフォン一台で完結します。',
  },
  {
    icon: <Brain className="w-6 h-6" />,
    title: 'AIが自動読み取り',
    desc: '金額・日付・税率・店舗名をAIが自動抽出。手入力ゼロで経費データが即座に反映されます。',
  },
  {
    icon: <ShieldCheck className="w-6 h-6" />,
    title: 'NTA適格請求書リアルタイム認証',
    desc: 'インボイス制度に完全対応。登録番号（T番号）をAIが抽出し、国税庁APIで即時認証. 重複・不正も自動検知。',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'プロジェクト別予算管理',
    desc: '複数プロジェクト・コストセンターの予算と実績をリアルタイム可視化。超過時には担当者へ自動アラートを送信。',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'LINEで撮影・送信',
    desc: '現場で領収書を撮影してLINEに送るだけ. GPSと時刻も自動記録され、管理者にリアルタイム通知。',
  },
  {
    num: '02',
    title: 'AIが自動処理',
    desc: 'AIが金額・日付・税率を抽出し、NTA認証・重複チェックを自動実行. 承認待ちキューに即時追加。',
  },
  {
    num: '03',
    title: '集計・レポート出力',
    desc: 'プロジェクト別・月別の集計がワンクリックで完成. 会計ソフト向けCSVエクスポートにも対応。',
  },
];

const PROBLEMS = [
  '領収書をExcelやスプレッドシートで管理していませんか？',
  'インボイス番号の確認作業に毎月時間を費やしていませんか？',
  '現場からの経費申請がLINEやメールで散らばっていませんか？',
  'プロジェクト別のコストをリアルタイムで把握できていますか？',
];

export default function CostLandingPage() {
  const router = useRouter();
  const { user, ownerId, isUserLoading, role } = useUser();
  const database = useDatabase();
  const { toast } = useToast();

  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [price, setPrice] = useState<string>('');
  const [priceId, setPriceId] = useState<string>('');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => { setHasMounted(true); }, []);

  useEffect(() => {
    fetch('/api/stripe/public-config')
      .then(r => r.json())
      .then(data => {
        if (!data || data.error) return;
        const id = data.receiptPriceId || (data.mode === 'live' ? data.livePriceId : data.testPriceId);
        if (id) setPriceId(id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || !database) return;
    const effectiveOwnerId = ownerId || user.uid;
    get(ref(database, `owner/${effectiveOwnerId}`)).then(snap => {
      if (!snap.exists()) return;
      const subs = snap.val()?.subscriptions || {};
      const active = Object.entries(subs)
        .filter(([, sub]: any) => sub?.status === 'active')
        .map(([id]) => id);
      setActiveModules(active);
    }).catch(() => {});
  }, [user, ownerId, database]);

  useEffect(() => {
    if (!priceId) return;
    fetch(`/api/stripe/price/${priceId}`)
      .then(r => r.json())
      .then(d => { if (d.formattedPrice) setPrice(d.formattedPrice); })
      .catch(() => {});
  }, [priceId]);

  const isSubscribed = activeModules.includes('receipt');

  const handleCTA = () => {
    if (!hasMounted) return;
    if (isSubscribed) { router.push('/cost'); return; }
    if (!user) { router.push('/'); return; }
    setIsCheckoutOpen(true);
  };

  const handleUpgrade = async () => {
    if (!user) return;
    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          ownerId: ownerId || user.uid,
          email: user.email,
          priceId,
          moduleId: 'receipt',
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* ignore */ } finally { setCheckoutLoading(false); }
  };

  if (!hasMounted) return null;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            FastLine
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: COLOR }}>
              F
            </div>
            <span className="font-black text-slate-800 text-sm">コスト管理</span>
            <Badge className="text-[9px] font-black border-none" style={{ backgroundColor: `${COLOR}20`, color: COLOR }}>有料</Badge>
          </div>
          <Button
            size="sm"
            onClick={handleCTA}
            className="h-9 rounded-xl font-black text-white text-xs px-5"
            style={{ backgroundColor: COLOR }}
          >
            {isSubscribed ? 'ダッシュボードへ' : user ? '今すぐ始める' : 'ログインして始める'}
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6">

        {/* Hero */}
        <section className="pt-24 pb-20 text-center">
          <Badge className="mb-6 text-[10px] font-black px-4 py-1.5 rounded-full border-none" style={{ backgroundColor: `${COLOR}15`, color: COLOR }}>
            💴 コスト管理モジュール
          </Badge>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight text-slate-900 mb-6">
            経費管理を、<br />
            <span style={{ color: COLOR }}>自動化</span>する。
          </h1>
          <p className="text-slate-500 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            LINEで写真を送るだけで経費登録完了。<br />
            AIがNTA認証・重複検知・集計まで完全自動化.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button
              size="lg"
              onClick={handleCTA}
              className="h-14 px-10 rounded-2xl font-black text-white text-base shadow-xl"
              style={{ backgroundColor: COLOR, boxShadow: `0 12px 40px ${COLOR}40` }}
            >
              {isSubscribed ? 'ダッシュボードを開く' : user ? '今すぐ始める' : 'ログインして始める'}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            {!isSubscribed && price && (
              <span className="text-slate-400 text-sm font-bold">{price} / 月</span>
            )}
          </div>
        </section>

        {/* TEST DRIVE SECTION */}
        <DemoTestDrive />

        {/* Problems */}
        <section className="py-16">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-8">こんな課題ありませんか？</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PROBLEMS.map((p, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-2xl bg-red-50/60 border border-red-100">
                  <span className="text-red-400 mt-0.5 shrink-0 text-lg">✗</span>
                  <p className="text-sm font-bold text-slate-700">{p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">機能</p>
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-12 tracking-tight">
            必要な機能が、すべて揃っています
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8 flex gap-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white" style={{ backgroundColor: COLOR }}>
                  {f.icon}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="py-16">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-4">使い方</p>
          <h2 className="text-2xl md:text-3xl font-black text-center text-slate-900 mb-12 tracking-tight">
            3ステップで始められます
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={i} className="relative bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
                <span className="text-[48px] font-black leading-none" style={{ color: `${COLOR}20` }}>{s.num}</span>
                <h3 className="font-black text-slate-900 mt-2 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 z-10" style={{ color: `${COLOR}60` }} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Integration badges */}
        <section className="py-12">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">モジュール連携</p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { label: 'LINE Bot', color: '#22c55e' },
                { label: 'メンバー管理', color: '#6366f1' },
                { label: 'マイページ', color: '#0ea5e9' },
                { label: 'NTA インボイス', color: '#f59e0b' },
              ].map(b => (
                <span key={b.label} className="flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-black"
                  style={{ borderColor: `${b.color}40`, color: b.color, backgroundColor: `${b.color}10` }}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section className="py-16">
          <div className="rounded-[2.5rem] p-12 text-center text-white" style={{ background: `linear-gradient(135deg, ${COLOR}, #16a34a)` }}>
            <Shield className="w-10 h-10 mx-auto mb-4 opacity-80" />
            <h2 className="text-3xl font-black mb-3">シンプルな料金プラン</h2>
            <div className="text-5xl font-black mb-2">
              {price || '¥9,900'}
              <span className="text-lg font-bold opacity-70 ml-2">/ 月</span>
            </div>
            <p className="text-white/70 text-sm mb-8">いつでもキャンセル可能 · Stripe による安全な決済</p>
            <ul className="flex flex-wrap justify-center gap-4 mb-10">
              {FEATURES.map(f => (
                <li key={f.title} className="flex items-center gap-2 text-sm font-bold text-white/90">
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  {f.title}
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              onClick={handleCTA}
              className="h-14 px-12 rounded-2xl font-black text-base bg-white hover:bg-white/90"
              style={{ color: COLOR }}
            >
              {isSubscribed ? 'ダッシュボードを開く' : user ? '今すぐ申し込む' : 'ログインして申し込む'}
              <Zap className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 mt-8">
        <div className="max-w-6xl mx-auto px-6 h-16 flex flex-col md:flex-row items-center justify-between gap-4">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-slate-400 hover:text-slate-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">FastLine トップへ戻る</span>
          </button>
          <p className="text-xs text-slate-300 font-medium">© 2026 Fast LINE · コスト管理モジュール</p>
        </div>
      </footer>

      <CheckoutPanel
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onUpgrade={handleUpgrade}
        loading={checkoutLoading}
        price={price}
        moduleId="receipt"
      />
    </div>
  );
}
