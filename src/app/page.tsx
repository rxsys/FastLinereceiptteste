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
  X
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

const ModulePrice = ({ priceId, defaultPrice }: { priceId: string, defaultPrice: string }) => {
  const [price, setPrice] = useState<string>(defaultPrice);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!priceId) return;
    setLoading(true);
    fetch(`/api/stripe/price/${priceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.formattedPrice) setPrice(data.formattedPrice);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [priceId]);

  if (loading) return <span className="animate-pulse opacity-50">...</span>;
  return <span>{price} / 月</span>;
};

const ModuleIcon = ({ 
  emoji, title, color, badge, badgeColor, active, tooltip, id, priceId, onModuleClick, isSubscribed 
}: any) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div 
        className="group flex flex-col items-center gap-4 transition-all duration-500 hover:-translate-y-1.5 cursor-pointer"
        onClick={() => onModuleClick(id, priceId, active)}
      >
        <div 
          className={cn(
            "relative w-[80px] h-[80px] rounded-[24px] flex items-center justify-center bg-white/[0.03] transition-all duration-500 border-2 border-white/5",
            active ? "border-[#ff6b35]/50 shadow-[0_0_25px_rgba(255,107,53,0.2)]" : "group-hover:border-white/20"
          )}
        >
          <span className="text-4xl">{emoji}</span>
          {badge && <div className={cn("absolute -top-3 -right-3 px-3 py-1 rounded-full text-[9px] font-black text-white shadow-xl", badgeColor)}>{badge}</div>}
        </div>
        <div className="text-center space-y-1">
          <p className="text-[11px] font-black text-white/40 group-hover:text-white transition-colors tracking-tight whitespace-nowrap">{title}</p>
          {active ? (
            isSubscribed ? (
              <p className="text-[10px] font-bold text-[#00c48c] drop-shadow-[0_0_8px_rgba(0,196,140,0.3)] flex items-center justify-center gap-1">
                <span>✅</span> 利用中
              </p>
            ) : (
              <p className="text-[10px] font-bold text-[#ff6b35]">
                <ModulePrice priceId={priceId} defaultPrice="¥10,000" />
              </p>
            )
          ) : (
            <p className="text-[9px] font-black text-white/20 tracking-widest uppercase">近日公開</p>
          )}
        </div>
      </div>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="w-[240px] p-4 bg-[#0c0c14]/95 backdrop-blur-xl border border-[#222235] text-white rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200" sideOffset={12}>
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
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<any>(null);
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [stripeKeys, setStripeKeys] = useState<any>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('fastline_lang');
    if (savedLang) setCurrentLang(savedLang);
    
    if (database) {
      get(ref(database, 'stripe_config/keys')).then(snap => {
        setStripeKeys(snap.val());
      });
    }
  }, [database]);

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

  const handleLangChange = (lang: string) => { setCurrentLang(lang); localStorage.setItem('fastline_lang', lang); };
  const t = (translations as any)[currentLang] || translations.ja;

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

  const handleModuleClick = async (moduleId: string, priceId?: string, isActive?: boolean) => {
    if (!isActive) { toast({ title: "近日公開", description: "公開予定です。" }); return; }
    setSelectedModule({ id: moduleId, priceId: priceId || '' });
    if (!user) { setIsLoginOpen(true); } 
    else {
      const snap = await get(ref(database!, `owner/${ownerId || user.uid}`));
      if (snap.val()?.subscriptions?.[moduleId]?.status === 'active') router.push('/cost');
      else setIsCheckoutOpen(true);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocalLoading) return;
    setIsLocalLoading(true);
    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const cred = await createUserWithEmailAndPassword(auth!, email, password);
      await set(ref(database!, `users/${cred.user.uid}`), { email, name: userName, ownerId: cred.user.uid, companyName: companyNameInput || userName, status: 'new', createdAt: new Date().toISOString(), role: 'user' });
      await set(ref(database!, `owner/${cred.user.uid}`), { ownerId: cred.user.uid, name: companyNameInput || userName, companyName: companyNameInput || userName, subscriptionStatus: 'none', createdAt: new Date().toISOString() });
      await sendVerificationEmail(cred.user);
      setIsLoginOpen(false);
      setIsRegister(false);
      toast({ title: t.verifyEmailTitle, description: t.verifyEmailDesc });
    } catch (err: any) { setAuthError(err.message); } finally { setIsLocalLoading(false); }
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
      if (data.url) window.location.href = data.url;
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
      <div className="min-h-screen bg-[#06060b] text-white font-sans antialiased overflow-x-hidden">
        
        {/* Navbar */}
        <nav className={`fixed left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50 transition-all duration-200 ${user && !user.emailVerified && role !== 'developer' ? 'top-[52px]' : 'top-6'}`}>
          <div className="flex items-center justify-between px-6 py-3 bg-[#0c0c14]/80 backdrop-blur-xl border border-[#222235] rounded-2xl shadow-2xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#22c55e] rounded-md flex items-center justify-center text-white font-black text-lg shadow-[0_0_15px_rgba(34,197,94,0.4)]">F</div>
              <div className="flex items-center font-black text-xl tracking-tight">
                <span className="text-white">Fast</span><span className="text-[#22c55e]">Line</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={currentLang} onValueChange={handleLangChange}>
                <SelectTrigger className="w-[100px] h-9 bg-white/5 border-white/10 text-white/70 rounded-xl focus:ring-0 text-[11px] font-bold">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{languages.find(l => l.code === currentLang)?.flag}</span>
                    <span>{languages.find(l => l.code === currentLang)?.code.toUpperCase()}</span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#0c0c14]/95 border-[#222235] text-white rounded-2xl shadow-2xl">
                  {languages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code} className="focus:bg-white/10 focus:text-white rounded-xl text-[11px] font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{lang.flag}</span><span>{lang.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {user ? (
                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="hidden lg:flex flex-col items-end pr-4 border-r border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-[#ff6b35] uppercase tracking-widest">{role || 'User'}</span>
                      <span className="text-[11px] font-bold text-white/90">{user.email}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">v{APP_VERSION}</span>
                      <span className="text-[10px] font-medium text-white/40">{companyName || 'Personal Account'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => router.push('/cost')} 
                      className="flex items-center px-4 h-9 rounded-xl bg-[#ff6b35]/15 border border-[#ff6b35]/40 hover:bg-[#ff6b35]/30 hover:scale-105 active:scale-95 transition-all shadow-[0_0_12px_#ff6b3530]"
                    >
                      <span className="text-base">📄</span>
                      <span className="text-[10px] font-black tracking-tight text-[#ff6b35] ml-2">FastLineコスト管理</span>
                      <ArrowRight className="w-3 h-3 ml-2 text-[#ff6b35]" />
                    </button>
                    <button onClick={() => signOut(auth!)} className="p-2.5 text-white/30 hover:text-red-400 transition-colors" title="Logout"><LogOut className="w-5 h-5" /></button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setIsLoginOpen(true)} className="text-[13px] font-bold text-white/50 hover:text-white transition-colors px-4 border border-white/10 rounded-xl py-2 bg-white/5">
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

        <main className="pt-44 pb-32 px-6 flex flex-col items-center">
          <h1 className="text-2xl md:text-5xl font-black text-center uppercase tracking-tighter leading-tight">{t.heroTitle[0]}<span className="text-[#ff6b35]">{t.heroTitle[1]}</span>{t.heroTitle[2]}</h1>
          <p className="text-white/40 mt-6 max-w-2xl text-center font-medium">{t.heroDesc}</p>

          <div className="flex flex-wrap justify-center gap-3 mt-12 mb-16 max-w-3xl">
            {t.categories.map((cat: string) => <span key={cat} className="px-6 py-3 rounded-full bg-white/5 border border-white/10 text-[12px] font-black tracking-widest text-white/40">{cat}</span>)}
          </div>

          <div className="mt-8 w-full max-w-[1000px] grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-x-8 gap-y-12 pb-24">
            <div className="flex flex-col items-center gap-2 relative z-10">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); router.push('/cost'); }}
                className="px-3 py-1 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 text-[9px] font-black text-[#22c55e] hover:bg-[#22c55e]/20 transition-all tracking-widest whitespace-nowrap relative z-20"
              >
                詳細はこちら →
              </button>
              <ModuleIcon
                emoji="💴" id="receipt" title={t.modules.receipt.title} color="#22c55e" active
                priceId={currentPriceId}
                isSubscribed={activeModules.includes('receipt')}
                onModuleClick={handleModuleClick}
                tooltip={<div className="space-y-3"><p className="font-black text-[14px]">{t.modules.receipt.fullTitle}</p><p className="text-[10px] leading-relaxed text-white/70">{t.modules.receipt.desc}</p></div>}
              />
            </div>
            <ModuleIcon emoji="📁" id="project" title={t.modules.project.title} color="#6366f1" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('project')} badge={t.modules.project.badge} badgeColor="bg-white/10" tooltip={<p className="text-xs font-bold text-white/50">{t.modules.project.desc}</p>} />
            <ModuleIcon emoji="👥" id="staff" title={t.modules.staff.title} color="#00c48c" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('staff')} badge={t.modules.staff.badge} badgeColor="bg-white/10" tooltip={<p className="text-xs font-bold text-white/50">{t.modules.staff.desc}</p>} />
            <ModuleIcon emoji="📋" id="career" title={t.modules.career.title} color="#f59e0b" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('career')} badge={t.modules.career.badge} badgeColor="bg-white/10" tooltip={<p className="text-xs font-bold text-white/50">{t.modules.career.desc}</p>} />
            <ModuleIcon emoji="🆔" id="id" title={t.modules.id.title} color="#3b82f6" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('id')} badge={t.modules.id.badge} badgeColor="bg-white/10" tooltip={<p className="text-xs font-bold text-white/50">{t.modules.id.desc}</p>} />
            <ModuleIcon emoji="🔧" id="assets" title={t.modules.assets.title} color="#ef4444" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('assets')} tooltip={<p className="text-xs font-bold text-white/50">{t.modules.assets.desc}</p>} />
            <ModuleIcon emoji="💰" id="sales" title={t.modules.sales.title} color="#10b981" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('sales')} tooltip={<p className="text-xs font-bold text-white/50">{t.modules.sales.desc}</p>} />
            <ModuleIcon emoji="⏱️" id="attendance" title={t.modules.attendance.title} color="#8b5cf6" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('attendance')} tooltip={<p className="text-xs font-bold text-white/50">{t.modules.attendance.desc}</p>} />
            <ModuleIcon emoji="🏢" id="kaigyo" title={t.modules.kaigyo.title} color="#f43f5e" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('kaigyo')} badge={t.modules.kaigyo.badge} badgeColor="bg-white/10" tooltip={<p className="text-xs font-bold text-white/50">{t.modules.kaigyo.desc}</p>} />
            <ModuleIcon emoji="📑" id="docs" title={t.modules.docs.title} color="#71717a" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('docs')} tooltip={<p className="text-xs font-bold text-white/50">{t.modules.docs.desc}</p>} />
            <ModuleIcon emoji="⚙️" id="setup" title={t.modules.settings.title} color="#64748b" onModuleClick={handleModuleClick} isSubscribed={activeModules.includes('settings')} tooltip={<p className="text-xs font-bold text-white/50">{t.modules.settings.desc}</p>} />
          </div>

          {/* Footer Area with Legal links */}
          <div className="mt-20 w-full max-w-5xl pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-start gap-8 px-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-[#ff6b35] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg">F</div>
                <span className="font-black text-2xl tracking-tight">FastLine Platform</span>
              </div>
              <p className="text-[12px] text-white/30 max-w-[300px] leading-relaxed">
                © 2024 Fast LINE - 建設業界特化型コスト管理プラットフォーム
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-white/50 tracking-widest uppercase">法的情報</h4>
                <div className="flex flex-col gap-3">
                  <Link href="/tokushoho" className="text-[12px] text-white/30 hover:text-[#ff6b35] transition-colors">特定商取引法に基づく表記</Link>
                  <Link href="/privacy" className="text-[12px] text-white/30 hover:text-[#ff6b35] transition-colors">プライバシーポリシー</Link>
                  <Link href="/terms" className="text-[12px] text-white/30 hover:text-[#ff6b35] transition-colors">利用規約</Link>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-white/50 tracking-widest uppercase">サポート</h4>
                <div className="flex flex-col gap-2 text-[12px] text-white/30">
                  <p className="font-bold text-white/50">RICARDO YUKIO (代表者)</p>
                  <p>WhatsApp/Tel: 090-3277-7484</p>
                  <p>Email: rxsys@gmail.com</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-20 opacity-10 select-none pointer-events-none">
            <p className="text-[10px] font-black tracking-[1em] uppercase">FastLine Intelligence</p>
          </div>
        </main>



        {/* Login/Register Modal */}
        <Dialog open={isLoginOpen} onOpenChange={setIsLoginOpen}>
          <DialogContent className="sm:max-w-[400px] bg-[#0c0c14] border border-[#222235] text-white rounded-3xl p-8 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c]" />
            
            <DialogHeader className="space-y-4 text-center mt-2">
              <div className="mx-auto w-12 h-12 bg-[#ff6b35] rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg rotate-3">
                F
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight uppercase">
                {isRegister ? t.registerTitle : t.loginTitle}
              </DialogTitle>
              <DialogDescription className="text-white/40 text-xs font-bold tracking-widest uppercase">
                FastLine Platform Access
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-5 mt-6">
              {isRegister && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">{t.dash.users.colName || 'Name'}</Label>
                  <div className="relative group">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#ff6b35] transition-colors" />
                    <Input
                      placeholder="Jane Doe"
                      className="bg-white/[0.03] border-white/5 h-12 pl-11 rounded-xl focus:border-[#ff6b35]/50 focus:ring-0 transition-all placeholder:text-white/10"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      required
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-white/30 uppercase tracking-widest ml-1">{t.email}</Label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#ff6b35] transition-colors" />
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    className="bg-white/[0.03] border-white/5 h-12 pl-11 rounded-xl focus:border-[#ff6b35]/50 focus:ring-0 transition-all placeholder:text-white/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label className="text-[10px] font-black text-white/30 uppercase tracking-widest">{t.password}</Label>
                  {!isRegister && <button type="button" className="text-[9px] font-black text-[#ff6b35]/60 hover:text-[#ff6b35] transition-colors uppercase tracking-widest">{t.forgot}</button>}
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-[#ff6b35] transition-colors" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    className="bg-white/[0.03] border-white/5 h-12 pl-11 pr-11 rounded-xl focus:border-[#ff6b35]/50 focus:ring-0 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
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

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => { setIsRegister(!isRegister); setAuthError(null); }}
                  className="text-[11px] font-black text-white/30 hover:text-white transition-colors tracking-tight"
                >
                  {isRegister ? "既にアカウントをお持ちですか？ ログイン" : t.registerFree}
                </button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
