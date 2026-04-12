'use client';

export const dynamic = 'force-dynamic';

import { useUser, useAuth, useMemoFirebase, useDatabase } from '@/firebase';
import { ref, get, set, push, serverTimestamp } from 'firebase/database';
import { LogOut, LayoutDashboard, Receipt, Users, Settings, Lock, AlertCircle, Loader2, RefreshCw, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { ExpensesTab } from './components/ExpensesTab';
import { LineUsersTab } from './components/LineUsersTab';
import { ManagementTab } from './components/ManagementTab';
import { SettingsTab } from './components/SettingsTab';
import { HomeTab } from './components/HomeTab';
import { AiAssistantPanel } from './components/AiAssistantPanel';

import { APP_VERSION } from '@/lib/version';
import { translations } from '@/lib/translations';
import { useRTDBDoc } from '@/firebase/rtdb';

export default function DashboardPage() {
  const { user, isUserLoading, ownerId, role, subscriptionStatus, validUntil, graceUntil, lastPaymentFailedAt, companyName, subscriptions } = useUser();
  const auth = useAuth();
  const database = useDatabase();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('home');
  const [selectedOwnerId, setSelectedOwnerId] = useState<string | null>(null);

  const aiConfigPath = ownerId ? `owner/${ownerId}/aiConfig` : null;
  const { data: aiConfig } = useRTDBDoc(aiConfigPath);
  const [currentLang, setCurrentLang] = useState('ja');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const savedLang = localStorage.getItem('fastline_lang');
    if (savedLang) setCurrentLang(savedLang);
  }, []);

  useEffect(() => {
    if (ownerId && !selectedOwnerId) setSelectedOwnerId(ownerId);
  }, [ownerId]);

  const handleLangChange = (lang: string) => { setCurrentLang(lang); localStorage.setItem('fastline_lang', lang); };
  const t = (translations as any)[currentLang] || translations.ja;

  const isDeveloper = role === 'developer';

  // --- MODULES CONFIGURATION ---
  const modules = useMemo(() => [
    { 
      id: 'expenses', 
      title: t.dash?.expenses || 'Despesas', 
      icon: <Receipt />, 
      color: 'bg-orange-500', 
      role: 'all',
      ready: true
    },
    { 
      id: 'management', 
      title: t.dash?.projects || 'Projetos', 
      icon: <Building2 />, 
      color: 'bg-blue-600', 
      role: 'manager',
      ready: true 
    },
    { 
      id: 'lineUsers', 
      title: t.dash?.users || 'Usuários', 
      icon: <Users />, 
      color: 'bg-emerald-500', 
      role: 'all',
      ready: true
    },
    { 
      id: 'settings', 
      title: t.dash?.settings || 'Ajustes', 
      icon: <Settings />, 
      color: 'bg-slate-700', 
      role: 'manager',
      ready: true
    },
  ], [t]);

  const allowedModules = useMemo(() => modules.filter(m => {
    if (isDeveloper) return true;
    if (m.role === 'all') return true;
    if (m.role === 'manager') return role === 'manager';
    return false;
  }), [modules, isDeveloper, role]);

  const hasReceiptAccess = isDeveloper || subscriptions?.receipt?.status === 'active' || subscriptions?.receipt?.status === 'trialing';

  useEffect(() => {
    if (!isUserLoading && hasMounted) {
      if (!user || (!isDeveloper && !hasReceiptAccess)) {
        router.push('/');
      }
    }
  }, [user, isUserLoading, hasMounted, isDeveloper, hasReceiptAccess, router]);

  if (isUserLoading || !hasMounted) return <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]"><Loader2 className="animate-spin text-primary" /></div>;
  if (!user || (!isDeveloper && !hasReceiptAccess)) return null;

  const ownerName = companyName || (isDeveloper ? 'Dev Console' : 'Loading...');

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 print:p-0 relative overflow-hidden">
      <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8 relative z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center print:hidden">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="bg-white border border-slate-100 p-2 rounded-2xl shadow-sm"><Image src="/logo.png" alt="Logo" width={32} height={32} /></div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black">{t.dash?.system || 'FastLine System'}</h1>
              <span className="text-[10px] text-slate-400 font-bold uppercase">v{APP_VERSION}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="hidden md:flex items-center gap-2 px-5 py-2 bg-white/70 backdrop-blur-md border border-white rounded-[2rem] shadow-sm">
                <span className="text-[10px] font-black text-primary uppercase">{ownerName}</span>
                <div className="w-1 h-1 rounded-full bg-slate-200" />
                <Badge variant="outline" className="text-[10px] font-black bg-primary/5 text-primary">{role || 'USER'}</Badge>
             </div>
             <Button variant="ghost" size="sm" onClick={() => signOut(auth!)} className="text-slate-400 hover:text-red-500 font-black text-xs"><LogOut className="w-4 h-4 mr-2" />{t.dash?.logout || 'Logout'}</Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-12">
          <TabsList className={cn("p-1 h-12 rounded-3xl bg-white border shadow-sm", activeTab === 'home' && "hidden")}>
            <TabsTrigger value="home" className="rounded-2xl h-10">Home</TabsTrigger>
            <TabsTrigger value="expenses" className="rounded-2xl h-10 px-6 font-black">{t.dash?.expenses || 'Despesas'}</TabsTrigger>
            <TabsTrigger value="management" className="rounded-2xl h-10 px-6 font-black">{t.dash?.projects || 'Projetos'}</TabsTrigger>
            <TabsTrigger value="lineUsers" className="rounded-2xl h-10 px-6 font-black">{t.dash?.users || 'Usuários'}</TabsTrigger>
            {(role === 'manager' || isDeveloper) && <TabsTrigger value="settings" className="rounded-2xl h-10 px-6 font-black">{t.dash?.settings || 'Ajustes'}</TabsTrigger>}
          </TabsList>

          <TabsContent value="home" className="mt-0">
             <HomeTab t={t} expenses={[]} user={user} ownerId={ownerId} role={role || 'user'} ownerName={ownerName} subscriptionStatus={subscriptionStatus || 'trial'} validUntil={validUntil} onTabChange={setActiveTab} allowedModules={allowedModules} />
          </TabsContent>
          
          <TabsContent value="expenses" className="mt-0"><ExpensesTab expenses={[]} ownerIdOverride={selectedOwnerId || undefined} t={t} /></TabsContent>
          <TabsContent value="lineUsers" className="mt-0"><LineUsersTab ownerIdOverride={selectedOwnerId || undefined} t={t} /></TabsContent>
          <TabsContent value="management" className="mt-0"><ManagementTab ownerIdOverride={selectedOwnerId || undefined} t={t} /></TabsContent>
          <TabsContent value="settings" className="mt-0"><SettingsTab version={APP_VERSION} hideUserManagement={false} t={t} ownerIdOverride={selectedOwnerId || undefined} /></TabsContent>
        </Tabs>
      </div>

      {ownerId && user?.uid && aiConfig?.dashboardAiEnabled && (
        <AiAssistantPanel ownerId={ownerId} userId={user.uid} />
      )}
    </div>
  );
}
