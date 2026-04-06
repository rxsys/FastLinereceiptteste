'use client';

import { useUser, useAuth } from '@/firebase';
import { ShieldCheck, LogOut, ArrowLeft, Loader2, Users, RefreshCw } from "lucide-react";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StripeAdminPanel } from '@/components/stripe-admin-panel';
import { DevUserManagement } from '@/components/dev-user-management';
import { DevAIPanel } from '@/components/dev-ai-panel';
import { DevAIChatPanel } from '@/components/dev-ai-chat-panel';
import { Badge } from "@/components/ui/badge";
import { APP_VERSION } from '@/lib/version';

export default function DeveloperSettingsPage() {
  const { user, isUserLoading, role } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const [ntaOwnerId, setNtaOwnerId] = useState('');
  const [isRefreshingNta, setIsRefreshingNta] = useState(false);
  const [ntaResult, setNtaResult] = useState<{ updated: number; checked: number } | null>(null);
  const [ntaError, setNtaError] = useState('');

  const handleNtaRefresh = async () => {
    if (!ntaOwnerId.trim()) return;
    setIsRefreshingNta(true);
    setNtaResult(null);
    setNtaError('');
    try {
      const res = await fetch(`/api/nta/refresh/${ntaOwnerId.trim()}`, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setNtaResult(data);
    } catch (e: any) {
      setNtaError(e.message || 'Error');
    } finally {
      setIsRefreshingNta(false);
    }
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!isUserLoading && (!user || role !== 'developer')) {
      router.push('/');
    }
  }, [user, isUserLoading, role, router]);

  if (isUserLoading || !hasMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-10 h-10 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!user || role !== 'developer') return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Dev Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-50 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-1.5 rounded-xl">
              <Image src="/logo.png" alt="Logo" width={32} height={32} className="object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight">FAST LINE <span className="text-amber-500">DEV</span></h1>
                <Badge className="bg-amber-500 text-slate-900 text-[10px] font-black border-none px-2 h-5">DEVELOPER PORTAL</Badge>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global Configuration & Administration</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end px-4 py-1.5 bg-white/5 border border-white/10 rounded-2xl">
              <span className="text-[11px] font-black text-white">{user?.email?.split('@')[0]}</span>
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-tighter">Authorized Developer</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push('/superadmin')} className="bg-amber-500 border-none text-slate-900 hover:bg-amber-400 rounded-xl h-9 font-black px-4">
              <Users className="w-4 h-4 mr-2" /> License Manager
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="bg-transparent border-white/20 text-white hover:bg-white/10 rounded-xl h-9">
              <ArrowLeft className="w-4 h-4 mr-2" /> サイトへ戻る
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut(auth!)} className="text-red-400 hover:bg-red-400/10 rounded-xl h-9 font-bold px-4">
              <LogOut className="w-4 h-4 mr-2" /> ログアウト
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
        <div className="flex justify-between items-end bg-slate-100/50 p-6 rounded-[2rem] border border-slate-200/60">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">System Administration</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Multi-Tenant Control Panel</p>
          </div>
          <Badge className="bg-amber-100 text-amber-700 border-none font-black text-[9px] h-4">v{APP_VERSION} SUPERUSER</Badge>
        </div>

        <section className="space-y-6">
           <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Chat Studio — LINE System Prompt</span>
              <div className="flex-1 h-px bg-slate-200" />
           </div>
           <DevAIChatPanel />
        </section>

        <section className="space-y-6">
           <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Google AI Usage & Quotas</span>
              <div className="flex-1 h-px bg-slate-200" />
           </div>
           <DevAIPanel />
        </section>

        <section className="space-y-6">
           <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global User Directory</span>
              <div className="flex-1 h-px bg-slate-200" />
           </div>
           <DevUserManagement />
        </section>

        <section className="space-y-6">
           <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">NTA Invoice Verification</span>
              <div className="flex-1 h-px bg-slate-200" />
           </div>
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 md:p-8 space-y-4">
             <div>
               <h3 className="text-base font-black text-slate-800">NTA月次一括更新</h3>
               <p className="text-xs text-slate-400 mt-1">指定したOwnerの登録番号（T番号）を国税庁APIで再確認します。</p>
             </div>
             <div className="flex gap-3 items-center">
               <Input
                 value={ntaOwnerId}
                 onChange={e => setNtaOwnerId(e.target.value)}
                 placeholder="OwnerId を入力..."
                 className="h-11 rounded-xl max-w-xs font-mono text-sm"
               />
               <Button
                 onClick={handleNtaRefresh}
                 disabled={isRefreshingNta || !ntaOwnerId.trim()}
                 className="h-11 rounded-xl gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black"
               >
                 <RefreshCw className={`w-4 h-4 ${isRefreshingNta ? 'animate-spin' : ''}`} />
                 NTA月次更新
               </Button>
             </div>
             {ntaResult && (
               <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2">
                 <ShieldCheck className="w-4 h-4" />
                 完了: {ntaResult.updated}件更新 / {ntaResult.checked}件確認
               </div>
             )}
             {ntaError && (
               <p className="text-sm font-bold text-red-600 bg-red-50 rounded-xl px-4 py-2">⚠️ {ntaError}</p>
             )}
           </div>
        </section>

        <section className="space-y-6">
           <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stripe Integration</span>
              <div className="flex-1 h-px bg-slate-200" />
           </div>
           <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6 md:p-8">
              <StripeAdminPanel />
           </div>
        </section>

      </main>

      <footer className="py-20 border-t bg-slate-900 text-slate-500">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Logo" width={24} height={24} className="grayscale brightness-200" />
            <span className="font-black text-white text-lg tracking-tight">Fast LINE</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest">Restricted Internal Use Only</p>
          <p className="text-xs font-medium">© 2026 Fast LINE DEVPORTS.</p>
        </div>
      </footer>
    </div>
  );
}
