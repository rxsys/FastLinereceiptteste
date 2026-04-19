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
  ShieldCheck,
  Brain,
  Zap,
  MessageCircle
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
  emoji, title, desc, color, badge, badgeColor, active, tooltip, id, priceId, onModuleClick, isSubscribed, priceLoading
}: any) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div 
        className="group flex flex-col items-center gap-4 transition-all duration-500 hover:-translate-y-2 cursor-pointer"
        onClick={() => onModuleClick(id, priceId, active)}
      >
        <div 
          className={cn(
            "relative w-[80px] h-[80px] rounded-[24px] flex items-center justify-center bg-white transition-all duration-500 border-2 border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] group-hover:border-slate-200",
            active ? "border-[#1d4ed8]/20 shadow-[0_0_25px_rgba(29,78,216,0.1)] group-hover:border-[#1d4ed8]/40" : "opacity-70 group-hover:opacity-100"
          )}
        >
          <span className="text-4xl transform transition-transform duration-500 group-hover:scale-110">{emoji}</span>
          {badge && <div className={cn("absolute -top-3 -right-3 px-3 py-1 rounded-full text-[12px] font-black text-white shadow-xl animate-bounce", badgeColor)}>{badge}</div>}
          
          {/* Shine effect */}
          <div className="absolute inset-0 overflow-hidden rounded-[24px] pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-[15px] font-black text-slate-700 group-hover:text-[#1d4ed8] transition-colors tracking-tight whitespace-nowrap">{title}</p>
          {desc && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{desc}</p>}
          {active ? (
            isSubscribed ? (
              <p className="text-[14px] font-bold text-[#00c48c] drop-shadow-[0_0_8px_rgba(0,196,140,0.2)] flex items-center justify-center gap-1">
                <span className="text-[12px]">●</span> 利用中
              </p>
            ) : priceLoading ? (
              <p className="text-[14px] font-bold text-slate-300 animate-pulse">...</p>
            ) : priceId ? (
              <p className="text-[14px] font-bold text-[#1d4ed8] bg-[#1d4ed8]/5 px-3 py-0.5 rounded-full">
                <ModulePrice priceId={priceId} />
              </p>
            ) : (
              <p className="text-[14px] font-bold text-slate-400">無料</p>
            )
          ) : (
            <p className="text-[11px] font-black text-slate-300 tracking-[0.1em] uppercase">近日公開</p>
          )}
        </div>
      </div>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="w-[280px] p-5 bg-white/95 backdrop-blur-xl border border-slate-200 text-slate-800 rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200" sideOffset={15}>
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
    if (!user) { setSelectedModule({ id: moduleId, priceId: priceId || '' }); setIsLoginOpen(true); return; }
    
    // Stripe disabled, go directly to module
    router.push(MODULE_ROUTES[moduleId] || '/cost');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocalLoading) return;
    if (!userName.trim()) { setAuthError('会社名またはお名前を入力してください'); return; }
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



  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-[#fafbfc] text-slate-900 font-sans antialiased overflow-x-hidden relative">
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-[#1d4ed8]/5 to-transparent pointer-events-none" />
        <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] bg-[#1d4ed8]/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[200px] left-[-100px] w-[500px] h-[500px] bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
        
        {/* Navbar */}
        <nav className={`fixed left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50 transition-all duration-200 ${user && !user.emailVerified && role !== 'developer' ? 'top-[52px]' : 'top-6'}`}>
          <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-lg relative">
            <div className="flex items-center gap-2 z-10">
              <img src="/logo.png" alt="田中組管理システム" className="h-[28px] w-auto object-contain" />
            </div>
            
            <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block">
              <span className="text-[15px] font-black text-slate-500 tracking-widest">社内専用システム</span>
            </div>

            <div className="flex items-center gap-4 z-10">


              {user ? (
                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="hidden lg:flex flex-col items-end pr-4 border-r border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-black text-[#1d4ed8] uppercase tracking-widest">{role || 'User'}</span>
                      <span className="text-[14px] font-bold text-slate-700">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">v{APP_VERSION}</span>
                      <span className="text-[12px] font-medium text-slate-500">{companyName || 'Personal Account'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">

                    <button 
                      onClick={() => signOut(auth!)} 
                      className="flex items-center gap-2 px-3 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
                      title="Logout"
                    >
                      <span className="text-[12px] font-bold uppercase tracking-tight">ログアウト</span>
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsLoginOpen(true)} className="text-[13px] font-bold text-white border-transparent hover:bg-slate-800 shadow-md transition-all px-5 rounded-xl py-2 bg-slate-900">
                  {t.login}
                </button>
              )}
            </div>
          </div>
        </nav>

        {/* Email Verification Banner Removed */}

        <main className="pt-32 pb-32 px-6 flex flex-col items-center">
          {/* Hero text and categories removed per request */}

          {user ? (
            <div className="mt-8 w-full max-w-[1100px] flex flex-col gap-12 pb-24 relative z-10">
              
              {/* 経理 */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-[20px] font-black text-slate-800 uppercase tracking-widest pl-4 border-l-[6px] border-emerald-500 py-1">経理</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-8 gap-y-10 px-2">
                  <ModuleIcon
                    emoji="💴" id="receipt" title={t.modules.receipt.title} desc="経費・収支の記録管理" color="#22c55e" active
                    priceId={stripeKeys?.receiptPriceId || (stripeKeys?.mode === 'live' ? stripeKeys?.livePriceId : stripeKeys?.testPriceId)}
                    priceLoading={stripeKeysLoading}
                    isSubscribed={activeModules.includes('receipt')}
                    onModuleClick={handleModuleClick}
                    tooltip={<div className="space-y-3"><p className="font-black text-[15px] text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><span>💴</span> {t.modules.receipt.title}</p><div className="space-y-2">{[["📱","LINEで写真を送るだけで経費登録"],["🤖","AIが金額・日付・税率を自動抽出"],["🏛️","国税庁(NTA)適格請求書をリアルタイム認証"],["📊","プロジェクト別の予算・実績を管理"]].map(([ic,tx])=><p key={String(tx)} className="flex gap-2.5 text-[13px] text-slate-600 leading-relaxed font-bold"><span>{ic}</span><span>{tx}</span></p>)}</div></div>}
                  />
                </div>
              </div>

              {/* 総務 */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-[20px] font-black text-slate-800 uppercase tracking-widest pl-4 border-l-[6px] border-sky-500 py-1">総務</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-12 gap-y-12 px-2">
                  <ModuleIcon
                    emoji="🧑‍💼" id="member" title={t.modules.member.title} desc="従業員・権限の管理" color="#6366f1" active={false}
                    priceId={stripeKeys?.memberPriceId || (stripeKeys?.mode === 'live' ? stripeKeys?.livePriceId : stripeKeys?.testPriceId)}
                    priceLoading={stripeKeysLoading}
                    isSubscribed={activeModules.includes('member')}
                    onModuleClick={handleModuleClick}
                    tooltip={<div className="space-y-3 p-1"><p className="font-black text-[15px] text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><span>🧑‍💼</span> {t.modules.member.title}</p><div className="bg-amber-50 p-4 rounded-2xl border border-amber-100/50 mt-1"><p className="text-[13px] text-amber-700 font-bold flex gap-2"><span>🚧</span> 開発中：まもなく公開予定</p></div></div>}
                  />
                  <ModuleIcon
                    emoji="🪪" id="mypage" title={t.modules.mypage.title} desc="個人ポータル・勤怠確認" color="#0ea5e9" active={false}
                    priceLoading={stripeKeysLoading}
                    isSubscribed={activeModules.includes('mypage')}
                    onModuleClick={handleModuleClick}
                    tooltip={<div className="space-y-3"><p className="font-black text-[15px] text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2"><span>🪪</span> {t.modules.mypage.title}</p><div className="space-y-2">{[["📋","勤怠・給与・書類を一画面で確認"],["🔗","QRコードで複数企業に対応"],["🌐","6言語対応の個人ポータル"],["📄","書類の期限アラートを自己管理"]].map(([ic,tx])=><p key={String(tx)} className="flex gap-2.5 text-[13px] text-slate-600 leading-relaxed font-bold"><span>{ic}</span><span>{tx}</span></p>)}</div></div>}
                  />
                  <ModuleIcon emoji="🔧" id="assets" title={t.modules.assets.title} desc="備品・資産の統合管理" color="#ef4444" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('assets')} tooltip={<p className="text-sm font-bold text-slate-600">{t.modules.assets.desc}</p>} priceLoading={stripeKeysLoading} />
                  <ModuleIcon emoji="📑" id="docs" title={t.modules.docs.title} desc="社内書類・電子保存管理" color="#71717a" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('docs')} tooltip={<p className="text-sm font-bold text-slate-600">{t.modules.docs.desc}</p>} priceLoading={stripeKeysLoading} />
                </div>
              </div>

              {/* 役員 */}
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <h3 className="text-[20px] font-black text-slate-800 uppercase tracking-widest pl-4 border-l-[6px] border-indigo-500 py-1">役員</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-12 gap-y-12 px-2">
                  <ModuleIcon emoji="📁" id="project" title={t.modules.project.title} desc="事業計画・収支分析" color="#6366f1" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('project')} tooltip={<p className="text-sm font-bold text-slate-600">{t.modules.project.desc}</p>} priceLoading={stripeKeysLoading} />
                </div>
              </div>
            </div>

          ) : null}

          {/* Footer Area Removed */}

          {/* Infrastructure & Trust Section Removed */}

          <div className="mt-32 pb-10 opacity-[0.15] select-none pointer-events-none flex flex-col md:flex-row items-center justify-center gap-6 md:gap-8 overflow-hidden w-full">
            <img src="/logo.png" alt="" className="h-[48px] md:h-[80px] w-auto grayscale" />
            <p className="text-[28px] md:text-[56px] font-black tracking-[0.15em] text-slate-900 text-center whitespace-nowrap">田中組業務管理システム</p>
          </div>
        </main>



        {/* Login/Register Modal */}
        <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
          <DialogContent className="sm:max-w-[400px] bg-white border border-slate-200 text-slate-900 rounded-3xl p-8 overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#1d4ed8] to-[#3b82f6]" />
            
            <DialogHeader className="space-y-4 text-center mt-2">
              <div className="mx-auto flex items-center justify-center mb-2">
                <img src="/logo.png" alt="田中組管理システム" className="h-[32px] w-auto object-contain" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight uppercase text-slate-900">
                {isRegister ? t.registerTitle : t.loginTitle}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs font-bold tracking-widest uppercase">
                Tanaka-gumi Platform Access
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-5 mt-6">
              {isRegister && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">会社名またはお名前</Label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1d4ed8] transition-colors" />
                    <Input
                      placeholder="株式会社○○ / 山田太郎"
                      className="bg-slate-50 border-slate-200 h-12 pl-11 rounded-xl focus:border-[#1d4ed8]/50 focus:ring-0 transition-all placeholder:text-slate-300 text-slate-900"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                      onInvalid={(e: any) => e.target.setCustomValidity("氏名または会社名を入力してください。")}
                      onInput={(e: any) => e.target.setCustomValidity("")}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.email}</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1d4ed8] transition-colors" />
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    className="bg-slate-50 border-slate-200 h-12 pl-11 rounded-xl focus:border-[#1d4ed8]/50 focus:ring-0 transition-all placeholder:text-slate-300 text-slate-900"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    onInvalid={(e: any) => {
                      const v = e.target.validity;
                      if (v.valueMissing) e.target.setCustomValidity("メールアドレスを入力してください。");
                      else if (v.typeMismatch) e.target.setCustomValidity("有効なメールアドレスを入力してください。");
                      else e.target.setCustomValidity("メールアドレスの形式が正しくありません。");
                    }}
                    onInput={(e: any) => e.target.setCustomValidity("")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.password}</Label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#1d4ed8] transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    className="bg-slate-50 border-slate-200 h-12 pl-11 pr-11 rounded-xl focus:border-[#1d4ed8]/50 focus:ring-0 transition-all text-slate-900"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    onInvalid={(e: any) => e.target.setCustomValidity("パスワードを入力してください。")}
                    onInput={(e: any) => e.target.setCustomValidity("")}
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
                className="w-full h-12 bg-[#1d4ed8] hover:bg-[#2563eb] text-white font-black rounded-xl shadow-lg shadow-[#1d4ed8]/20 group relative overflow-hidden transition-all active:scale-[0.98]"
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
