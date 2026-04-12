'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  User as UserIcon,
  Building,
  LogOut,
  Mail,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ArrowRight,
  X,
  ShieldCheck
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useUser, useAuth, useDatabase } from '@/firebase';
import { ref, get, set } from 'firebase/database';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { APP_VERSION } from '@/lib/version';
import { translations } from '@/lib/translations';
import { CheckoutPanel } from '@/components/checkout-panel';

const ModulePrice = ({ priceId }: { priceId: string }) => {
  const [price, setPrice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!priceId || priceId === 'undefined') {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/stripe/price/${priceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.formattedPrice) setPrice(data.formattedPrice);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [priceId]);

  if (loading || !price) return <span className="animate-pulse opacity-50">...</span>;
  return <span>{price} / 月</span>;
};

const ModuleIcon = ({
  emoji, title, color, badge, badgeColor, active, tooltip, id, priceId, onModuleClick, isSubscribed, priceLoading
}: any) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div 
        className="group flex flex-col items-center gap-4 transition-all duration-500 hover:-translate-y-1.5 cursor-pointer"
        onClick={() => onModuleClick(id, priceId, active)}
      >
        <div 
          className={cn(
            "relative w-[80px] h-[80px] rounded-[24px] flex items-center justify-center bg-white transition-all duration-500 border-2 border-slate-200 shadow-sm hover:shadow-md",
            active ? "border-[#ff6b35]/50 shadow-[0_0_25px_rgba(255,107,53,0.15)]" : "group-hover:border-slate-300"
          )}
        >
          <span className="text-4xl">{emoji}</span>
          {badge && <div className={cn("absolute -top-3 -right-3 px-3 py-1 rounded-full text-[11px] font-black text-white shadow-xl", badgeColor)}>{badge}</div>}
        </div>
        <div className="text-center space-y-1">
          <p className="text-[14px] font-black text-slate-500 group-hover:text-slate-900 transition-colors tracking-tight whitespace-nowrap">{title}</p>
          {active ? (
            isSubscribed ? (
               <p className="text-[13px] font-bold text-[#00c48c] drop-shadow-[0_0_8px_rgba(0,196,140,0.3)] flex items-center justify-center gap-1">
                <span>✅</span> 利用中
              </p>
            ) : priceLoading ? (
              <p className="text-[13px] font-bold text-slate-300 animate-pulse">...</p>
            ) : priceId ? (
              <p className="text-[13px] font-bold text-[#ff6b35]">
                <ModulePrice priceId={priceId} />
              </p>
            ) : (
              <p className="text-[13px] font-bold text-slate-400">無料</p>
            )
          ) : (
            <p className="text-[12px] font-black text-slate-400 tracking-widest uppercase">近日公開</p>
          )}
        </div>
      </div>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="w-[240px] p-4 bg-white/95 backdrop-blur-xl border border-slate-200 text-slate-800 rounded-2xl shadow-xl animate-in zoom-in-95 duration-200" sideOffset={12}>
      {tooltip}
    </TooltipContent>
  </Tooltip>
);

export default function LandingPage() {
  const { user, isUserLoading: loading, ownerId, role, companyName } = useUser();
  const auth = useAuth();
  const database = useDatabase();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [currentLang, setCurrentLang] = useState('ja');
  const [isRegister, setIsRegister] = useState(false);
  const [userName, setUserName] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [stripeKeys, setStripeKeys] = useState<any>(null);
  const [stripeKeysLoading, setStripeKeysLoading] = useState(true);
  const [selectedModulePrice, setSelectedModulePrice] = useState<string>('');

  useEffect(() => {
    const savedLang = localStorage.getItem('fastline_lang');
    if (savedLang) setCurrentLang(savedLang);

    fetch('/api/stripe/public-config')
      .then(r => r.json())
      .then(data => { if (data && !data.error) setStripeKeys(data); })
      .catch(() => {})
      .finally(() => setStripeKeysLoading(false));
  }, []);

  useEffect(() => {
    if (!user || !database) { setActiveModules([]); return; }
    const effectiveOwnerId = ownerId || user.uid;
    get(ref(database, `owner/${effectiveOwnerId}`)).then(snap => {
      if (!snap.exists()) return;
      const subs = snap.val()?.subscriptions || {};
      const active = Object.entries(subs).filter(([, sub]: any) => sub?.status === 'active').map(([id]) => id);
      setActiveModules(active);
    }).catch(() => {});
  }, [user, ownerId, database]);

  useEffect(() => {
    if (!selectedModule?.priceId) {
      setSelectedModulePrice('');
      return;
    }
    fetch(`/api/stripe/price/${selectedModule.priceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.formattedPrice) setSelectedModulePrice(data.formattedPrice);
      })
      .catch(console.error);
  }, [selectedModule?.priceId]);

  const handleLangChange = (lang: string) => { setCurrentLang(lang); localStorage.setItem('fastline_lang', lang); };
  const rawT = (translations as any)[currentLang] || translations.ja;
  const t = { ...rawT, modules: { ...translations.ja.modules, ...(rawT.modules || {}) } };

  const sendVerificationEmail = async (firebaseUser: any) => {
    try {
      const functions = getFunctions(auth!.app, 'asia-east1');
      const fn = httpsCallable(functions, 'sendCustomVerificationEmail');
      await fn({ uid: firebaseUser.uid, lang: currentLang });
    } catch (err: any) {
      if (auth) auth.languageCode = currentLang;
      await sendEmailVerification(firebaseUser, {
        url: process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
        handleCodeInApp: false,
      });
    }
  };

  const MODULE_ROUTES: Record<string, string> = {
    receipt: '/cost',
    member: '/member',
    mypage: '/mypage',
  };

  const FREE_MODULES = ['mypage'];

  const handleModuleClick = async (moduleId: string, priceId?: string, isActive?: boolean) => {
    if (!isActive) { toast({ title: "近日公開", description: "公開予定です。" }); return; }
    if (!user) { router.push('/login'); return; }
    if (FREE_MODULES.includes(moduleId)) { router.push(MODULE_ROUTES[moduleId] || '/'); return; }

    setSelectedModule({ id: moduleId, priceId: priceId || '' });

    if (role === 'user') { setIsCheckoutOpen(true); return; }

    const snap = await get(ref(database!, `owner/${ownerId || user.uid}`));
    if (snap.val()?.subscriptions?.[moduleId]?.status === 'active') router.push(MODULE_ROUTES[moduleId] || '/cost');
    else setIsCheckoutOpen(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocalLoading) return;
    setIsLocalLoading(true);
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const cred = await createUserWithEmailAndPassword(auth!, email, password);
      await set(ref(database!, `users/${cred.user.uid}`), { email, displayName: userName, status: 'new', emailVerified: false, createdAt: new Date().toISOString(), role: 'user' });
      try {
        await sendVerificationEmail(cred.user);
      } catch (verifyErr: any) {
        console.error('Error sending verification email during registration:', verifyErr);
        // We don't throw here so the user sees the account creation was successful
      }
      setIsLoginOpen(false);
      setIsRegister(false);
      toast({ title: t.verifyEmailTitle, description: t.verifyEmailDesc });
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        setAuthError('リクエストが多すぎます。しばらくしてからもう一度お試しください。');
      } else if (err.code === 'auth/email-already-in-use') {
        setAuthError('このメールアドレスは既に使用されています。');
      } else {
        setAuthError(err.message);
      }
    } finally { setIsLocalLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLocalLoading(true);
    try {
      await signInWithEmailAndPassword(auth!, email, password);
      setIsLoginOpen(false);
      toast({ title: "ログイン完了" });
    } catch (err: any) { setAuthError("ログインに失敗しました。"); } finally { setIsLocalLoading(false); }
  };

  const handleResendVerification = async () => {
    if (!user) return;
    setIsLocalLoading(true);
    try {
      await user.reload();
      await sendVerificationEmail(user);
      toast({ title: t.verifyEmailTitle, description: t.verifyEmailDesc });
    } catch (err: any) {
      toast({ title: 'エラー', description: 'メール送信に失敗しました。', variant: 'destructive' });
    } finally {
      setIsLocalLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user || !selectedModule) return;
    setCheckoutLoading(true);
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          ownerId: ownerId || user.uid,
          email: user.email,
          priceId: selectedModule.priceId,
          moduleId: selectedModule.id,
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.url) window.location.href = data.url;
      else throw new Error('Checkout URL not received');
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setCheckoutLoading(false); }
  };

  const currentPriceId = stripeKeys?.mode === 'test' ? stripeKeys?.testPriceId : stripeKeys?.livePriceId;

  const languages = [
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'pt', name: 'Português', flag: '🇧🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  ];

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans antialiased overflow-x-hidden">
        
        {/* Navbar */}
        <nav className={`fixed left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50 transition-all duration-200 ${user && !user.emailVerified && role !== 'developer' ? 'top-[52px]' : 'top-6'}`}>
          <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#22c55e] rounded-md flex items-center justify-center text-white font-black text-lg shadow-[0_0_15px_rgba(34,197,94,0.4)]">F</div>
              <div className="flex items-center font-black text-xl tracking-tight">
                <span className="text-slate-900">Fast</span><span className="text-[#22c55e]">Line</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={currentLang} onValueChange={handleLangChange}>
                <SelectTrigger className="w-[110px] h-9 bg-slate-50 border-slate-200 text-slate-600 rounded-xl focus:ring-0 text-[12px] font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{languages.find(l => l.code === currentLang)?.flag}</span>
                    <span>{languages.find(l => l.code === currentLang)?.code.toUpperCase()}</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-white border-slate-200 text-slate-800 rounded-2xl shadow-xl">
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="focus:bg-slate-100 focus:text-slate-900 rounded-xl text-[12px] font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span><span>{lang.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {user ? (
                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="hidden lg:flex flex-col items-end pr-4 border-r border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-black text-[#ff6b35] uppercase tracking-widest">{role || 'User'}</span>
                      <span className="text-[12px] font-bold text-slate-700">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">v{APP_VERSION}</span>
                      <span className="text-[11px] font-medium text-slate-500">{companyName || 'Personal Account'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeModules.includes('receipt') && role !== 'user' && (
                      <button 
                        onClick={() => router.push('/cost')} 
                        className="flex items-center px-4 h-9 rounded-xl bg-[#ff6b35]/10 border border-[#ff6b35]/20 hover:bg-[#ff6b35]/20 hover:scale-105 active:scale-95 transition-all shadow-sm"
                      >
                        <span className="text-base">📄</span>
                        <span className="text-[11px] font-black tracking-tight text-[#ff6b35] ml-2">FastLineコスト管理</span>
                        <ArrowRight className="w-3 h-3 ml-2 text-[#ff6b35]" />
                      </button>
                    )}
                    <button onClick={() => signOut(auth!)} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors" title="Logout"><LogOut className="w-5 h-5" /></button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsLoginOpen(true)} className="text-[13px] font-bold text-slate-600 hover:text-slate-900 shadow-sm transition-colors px-4 border border-slate-200 rounded-xl py-2 bg-white">
                  {t.login}
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Email Verification Banner */}
        {user && !user.emailVerified && role !== 'developer' && (
          <div className="fixed top-0 left-0 right-0 z-[60] bg-[#f59e0b] px-6 py-3 flex items-center justify-between gap-4 shadow-lg border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-1.5 rounded-lg"><Mail className="w-5 h-5 text-white" /></div>
              <p className="text-[13px] font-black text-white tracking-wide">メールアドレスの確認が必要です。受信ボックスをご確認ください。</p>
            </div>
            <button onClick={handleResendVerification} disabled={isLocalLoading} className="text-[12px] font-black text-white border border-white/30 px-5 py-2 rounded-xl hover:bg-black/10 transition-colors whitespace-nowrap bg-black/5">
              {isLocalLoading ? '...' : '再送信'}
            </button>
          </div>
        )}

        <main className="pt-32 pb-32 px-6 flex flex-col items-center">
          <h1 className="text-2xl md:text-5xl font-black text-center uppercase tracking-tighter leading-tight text-slate-900">{t.heroTitle[0]}<span className="text-[#ff6b35]">{t.heroTitle[1]}</span>{t.heroTitle[2]}</h1>
          <p className="text-slate-500 mt-4 max-w-2xl text-center font-medium text-lg">{t.heroDesc}</p>

          <div className="flex flex-nowrap justify-center gap-2 mt-8 mb-10 w-full overflow-x-auto">
            {t.categories.map((cat: string) => <span key={cat} className="px-4 py-2.5 rounded-full bg-white border border-slate-200 text-[13px] font-black tracking-widest text-slate-500 shadow-sm whitespace-nowrap shrink-0">{cat}</span>)}
          </div>

          <div className="mt-4 w-full max-w-[1000px] grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-x-8 gap-y-12 pb-24">
            <div className="flex flex-col items-center gap-2 relative z-10">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); router.push('/module-cost'); }}
                className="px-4 py-1.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[12px] font-black text-[#22c55e] hover:bg-[#22c55e]/20 transition-all tracking-widest whitespace-nowrap relative z-20"
              >
                詳細はこちら →
              </button>
              <ModuleIcon
                emoji="💴" id="receipt" title={t.modules.receipt.title} color="#22c55e" active
                priceId={stripeKeys?.receiptPriceId || (stripeKeys?.mode === 'live' ? stripeKeys?.livePriceId : stripeKeys?.testPriceId)}
                priceLoading={stripeKeysLoading}
                isSubscribed={activeModules.includes('receipt')}
                onModuleClick={handleModuleClick}
                tooltip={<div className="space-y-2.5"><p className="font-black text-[13px] text-slate-800">💴 コスト管理</p><div className="space-y-1.5">{[["📱","LINEで写真を送るだけで経費登録"],["🤖","AIが金額・日付・税率を自動抽出"],["🏛️","NTA適格請求書をリアルタイム認証"],["📊","プロジェクト別の予算・実績を管理"]].map(([ic,tx])=><p key={String(tx)} className="flex gap-1.5 text-[12px] text-slate-600"><span>{ic}</span><span>{tx}</span></p>)}</div></div>}
              />
            </div>
            <div className="flex flex-col items-center gap-2 relative z-10">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); router.push('/modules/member'); }}
                className="px-4 py-1.5 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/30 text-[12px] font-black text-[#6366f1] hover:bg-[#6366f1]/20 transition-all tracking-widest whitespace-nowrap relative z-20"
              >
                詳細はこちら →
              </button>
              <ModuleIcon
                emoji="🧑‍💼" id="member" title={t.modules.member.title} color="#6366f1" active
                priceId={stripeKeys?.memberPriceId || (stripeKeys?.mode === 'live' ? stripeKeys?.livePriceId : stripeKeys?.testPriceId)}
                priceLoading={stripeKeysLoading}
                isSubscribed={activeModules.includes('member')}
                onModuleClick={handleModuleClick}
                badge={t.modules.member.badge}
                badgeColor="bg-[#6366f1]/20"
                tooltip={<div className="space-y-2.5"><p className="font-black text-[13px] text-slate-800">🧑‍💼 メンバー管理</p><div className="space-y-1.5">{[["👥","正社員・業務委託・外国人を一元管理"],["⏰","ビザ・契約期限を自動アラート"],["🕐","LINE打刻で勤怠を自動記録"],["💹","労務費をコスト管理へ自動連携"]].map(([ic,tx])=><p key={String(tx)} className="flex gap-1.5 text-[12px] text-slate-600"><span>{ic}</span><span>{tx}</span></p>)}</div></div>}
              />
            </div>
            <div className="flex flex-col items-center gap-2 relative z-10">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); router.push('/mypage'); }}
                className="px-4 py-1.5 rounded-full bg-[#0ea5e9]/10 border border-[#0ea5e9]/30 text-[12px] font-black text-[#0ea5e9] hover:bg-[#0ea5e9]/20 transition-all tracking-widest whitespace-nowrap relative z-20"
              >
                詳細はこちら →
              </button>
              <ModuleIcon
                emoji="🪪" id="mypage" title={t.modules.mypage.title} color="#0ea5e9" active
                priceLoading={stripeKeysLoading}
                isSubscribed={activeModules.includes('mypage')}
                onModuleClick={handleModuleClick}
                badge={t.modules.mypage.badge}
                badgeColor="bg-[#0ea5e9]/20"
                tooltip={<div className="space-y-2.5"><p className="font-black text-[13px] text-slate-800">🪪 マイページ</p><div className="space-y-1.5">{[["📋","勤怠・給与・書類を一画面で確認"],["🔗","QRコードで複数企業に対応"],["🌐","6言語対応の個人ポータル"],["📄","書類の期限アラートを自己管理"]].map(([ic,tx])=><p key={String(tx)} className="flex gap-1.5 text-[12px] text-slate-600"><span>{ic}</span><span>{tx}</span></p>)}</div></div>}
              />
            </div>
            <ModuleIcon emoji="📁" id="project" title={t.modules.project.title} color="#6366f1" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('project')} badge={t.modules.project.badge} badgeColor="bg-slate-200 text-slate-700" tooltip={<p className="text-xs font-bold text-slate-500">{t.modules.project.desc}</p>} priceLoading={stripeKeysLoading} />

            <ModuleIcon emoji="📋" id="career" title={t.modules.career.title} color="#f59e0b" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('career')} badge={t.modules.career.badge} badgeColor="bg-slate-200 text-slate-700" tooltip={<p className="text-xs font-bold text-slate-500">{t.modules.career.desc}</p>} priceLoading={stripeKeysLoading} />
            <ModuleIcon emoji="🆔" id="id" title={t.modules.id.title} color="#3b82f6" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('id')} badge={t.modules.id.badge} badgeColor="bg-slate-200 text-slate-700" tooltip={<p className="text-xs font-bold text-slate-500">{t.modules.id.desc}</p>} priceLoading={stripeKeysLoading} />
            <ModuleIcon emoji="🔧" id="assets" title={t.modules.assets.title} color="#ef4444" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('assets')} tooltip={<p className="text-xs font-bold text-slate-500">{t.modules.assets.desc}</p>} priceLoading={stripeKeysLoading} />
            <ModuleIcon emoji="💰" id="sales" title={t.modules.sales.title} color="#10b981" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('sales')} tooltip={<p className="text-xs font-bold text-slate-500">{t.modules.sales.desc}</p>} priceLoading={stripeKeysLoading} />

            <ModuleIcon emoji="🏢" id="kaigyo" title={t.modules.kaigyo.title} color="#f43f5e" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('kaigyo')} badge={t.modules.kaigyo.badge} badgeColor="bg-slate-200 text-slate-700" tooltip={<p className="text-xs font-bold text-slate-500">{t.modules.kaigyo.desc}</p>} priceLoading={stripeKeysLoading} />
            <ModuleIcon emoji="📑" id="docs" title={t.modules.docs.title} color="#71717a" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('docs')} tooltip={<p className="text-xs font-bold text-slate-500">{t.modules.docs.desc}</p>} priceLoading={stripeKeysLoading} />

          </div>

          {/* Footer Area with Legal links */}
          <div className="mt-20 w-full max-w-5xl pt-12 border-t border-slate-200 flex flex-col md:flex-row justify-between items-start gap-8 px-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#ff6b35] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">F</div>
                <span className="font-black text-2xl tracking-tight text-slate-900">FastLine Platform</span>
              </div>
              <p className="text-[12px] text-slate-500 max-w-[300px] leading-relaxed">
                © 2024 Fast LINE - 建設業界特化型コスト管理プラットフォーム
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-400 tracking-widest uppercase">法的情報</h4>
                <div className="flex flex-col gap-3">
                  <Link href="/tokushoho" className="text-[12px] text-slate-500 hover:text-[#ff6b35] transition-colors">特定商取引法に基づく表記</Link>
                  <Link href="/privacy" className="text-[12px] text-slate-500 hover:text-[#ff6b35] transition-colors">プライバシーポリシー</Link>
                  <Link href="/terms" className="text-[12px] text-slate-500 hover:text-[#ff6b35] transition-colors">利用規約</Link>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-400 tracking-widest uppercase">サポート</h4>
                <div className="flex flex-col gap-2 text-[12px] text-slate-500">
                  <p className="font-bold text-slate-700">RICARDO YUKIO (代表者)</p>
                  <p>WhatsApp/Tel: 090-3277-7484</p>
                  <p>Email: rxsys@gmail.com</p>
                </div>
              </div>
            </div>
          </div>

          {/* Secure Payment Section (Stripe Trust Badge) */}
          <div className="mt-24 w-full max-w-4xl px-8 py-10 rounded-[2.5rem] bg-gradient-to-br from-slate-50/50 to-white border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
            <div className="flex flex-col gap-2 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
                <span className="text-[12px] font-black text-emerald-600 uppercase tracking-widest">Secure Payments</span>
              </div>
              <h3 className="text-xl font-black text-slate-800">100%安全な決済システム</h3>
              <p className="text-slate-500 text-sm font-medium max-w-md leading-relaxed">
                すべてのお取引は世界最高水準のセキュリティを誇る <a href="https://stripe.com" target="_blank" rel="noopener noreferrer" className="text-[#635bff] font-black hover:underline transition-all">Stripe</a> によって安全に処理されます。銀行レベルの暗号化技術により、お客様の情報は厳重に保護されます。
              </p>
            </div>
            
            <a 
              href="https://stripe.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-6 group grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-500 bg-white px-8 py-5 rounded-3xl border border-slate-50 shadow-sm"
            >
              <div className="w-px h-8 bg-slate-200" />
              <svg viewBox="0 0 60 25" className="h-8 w-auto fill-[#635bff]">
                <path d="M59.64 14.28c0-4.59-2.29-8.7-7.44-8.7-5.22 0-8.96 4.16-8.96 10.43 0 6.67 3.86 10.12 9.28 10.12 2.23 0 4.27-.6 5.8-1.59v-3.5c-1.27.76-2.73 1.2-4.33 1.2-2.59 0-4.31-1.31-4.31-3.61h10.03c.01-.15.01-.21.01-.35zm-7.12-3.1c1.92 0 3.03 1.06 3.03 2.94h-6.19c.14-1.88 1.24-2.94 3.16-2.94zM33.26 6.15c-1.14 0-2.64.47-3.4 1.18V6.44h-5.13v18.53l5.51-1.17V17.3c.76.68 2.26 1.15 3.4 1.15 4.38 0 7.16-3.34 7.16-7.99 0-4.62-2.8-8.31-7.54-8.31zm-1.58 8.27c-1.32 0-2.31-.34-2.31-1.63V11.2c0-1.29.99-1.63 2.31-1.63 1.63 0 2.35 1.05 2.35 2.47 0 1.42-.72 2.38-2.35 2.38zM11.48 6.15c-4.43 0-7.39 3.1-7.39 7.63 0 4.54 2.96 7.64 7.39 7.64 2.25 0 4.04-.54 5.37-1.39V15.7c-1.12.63-2.61 1.01-4.14 1.01-1.92 0-2.81-1.02-2.81-2.4V6.44h4.14v-4l-4.14 1.14V6.15zM22.09 6.44h-5.51v12.03h5.51V6.44zM22.09 2.05h-5.51v4.39h5.51V2.05zM0 6.44h5.51v12.03H0V6.44z"/>
              </svg>
              <div className="w-px h-8 bg-slate-200" />
            </a>
          </div>

          <div className="mt-20 opacity-10 select-none pointer-events-none">
            <p className="text-[12px] font-black tracking-[1em] uppercase text-slate-900">FastLine Intelligence</p>
          </div>
        </main>



        {/* Login/Register Modal */}
        <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
          <DialogContent className="sm:max-w-[400px] bg-white border border-slate-200 text-slate-900 rounded-3xl p-8 overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c]" />
            
            <DialogHeader className="space-y-4 text-center mt-2">
              <div className="mx-auto w-12 h-12 bg-[#ff6b35] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg rotate-3">
                F
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight uppercase text-slate-900">
                {isRegister ? t.registerTitle : t.loginTitle}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs font-bold tracking-widest uppercase">
                FastLine Platform Access
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-5 mt-6">
              {isRegister && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">会社名またはお名前</Label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#ff6b35] transition-colors" />
                    <Input
                      placeholder="株式会社○○ / 山田太郎"
                      className="bg-slate-50 border-slate-200 h-12 pl-11 rounded-xl focus:border-[#ff6b35]/50 focus:ring-0 transition-all placeholder:text-slate-300 text-slate-900"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.email}</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#ff6b35] transition-colors" />
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    className="bg-slate-50 border-slate-200 h-12 pl-11 rounded-xl focus:border-[#ff6b35]/50 focus:ring-0 transition-all placeholder:text-slate-300 text-slate-900"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.password}</Label>
                  {!isRegister && <button type="button" className="text-[9px] font-black text-[#ff6b35]/80 hover:text-[#ff6b35] transition-colors uppercase tracking-widest">{t.forgot}</button>}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#ff6b35] transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    className="bg-slate-50 border-slate-200 h-12 pl-11 pr-11 rounded-xl focus:border-[#ff6b35]/50 focus:ring-0 transition-all text-slate-900"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-500 text-[11px] font-bold text-center animate-shake">
                  {authError}
                </div>
              )}

              <Button 
                type="submit" 
                disabled={isLocalLoading}
                className="w-full h-12 bg-[#ff6b35] hover:bg-[#ff8555] text-white font-black rounded-xl shadow-lg shadow-[#ff6b35]/20 group relative overflow-hidden transition-all active:scale-[0.98]"
              >
                {isLocalLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <span className="relative z-10">{isRegister ? t.registerBtn : t.login}</span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                  </>
                )}
              </Button>

              {!isRegister && (
                <div className="space-y-4 pt-2">
                  <div className="relative">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-slate-100" />
                    <span className="relative bg-white px-2 text-[10px] font-black text-slate-300 uppercase tracking-widest mx-auto block w-max">OR</span>
                  </div>
                  
                  <Button 
                    type="button"
                    onClick={() => { setIsRegister(true); setAuthError(null); }}
                    className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg shadow-slate-200 group relative overflow-hidden transition-all active:scale-[0.98]"
                  >
                    <span className="relative z-10">{t.registerFree}</span>
                    <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />
                  </Button>
                </div>
              )}

              {isRegister && (
                <div className="pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => { setIsRegister(false); setAuthError(null); }}
                    className="text-[11px] font-black text-slate-400 hover:text-slate-900 transition-colors tracking-tight uppercase"
                  >
                    既にアカウントをお持ちですか？ <span className="text-[#ff6b35]">ログイン</span>
                  </button>
                </div>
              )}
            </form>
          </DialogContent>
        </Dialog>

        <CheckoutPanel
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          onUpgrade={handleUpgrade}
          loading={checkoutLoading}
          price={selectedModulePrice}
          moduleId={selectedModule?.id}
        />
      </div>
    </TooltipProvider>
  );
}
