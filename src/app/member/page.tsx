'use client';

export const dynamic = 'force-dynamic';

import { useUser, useAuth, useDatabase } from '@/firebase';
import { LogOut, LayoutDashboard, Users, FileText, Clock, Settings, Loader2, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState, useMemo } from 'react';
import { signOut } from 'firebase/auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { HomeTab } from './components/HomeTab';
import { MemberListTab } from './components/MemberListTab';
import { AttendanceTab } from './components/AttendanceTab';
import { DocumentsTab } from './components/DocumentsTab';
import { MemberSettingsTab } from './components/MemberSettingsTab';

import { APP_VERSION } from '@/lib/version';

export default function MemberPage() {
  const { user, isUserLoading, ownerId, role, companyName } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('home');
  const [currentLang, setCurrentLang] = useState('ja');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const saved = localStorage.getItem('fastline_lang');
    if (saved) setCurrentLang(saved);
  }, []);

  const isDeveloper = role === 'developer';
  const isManager = role === 'manager' || isDeveloper;

  const tabs = [
    { id: 'home',       label: 'ホーム',       icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'members',    label: 'メンバー一覧', icon: <Users className="w-4 h-4" /> },
    { id: 'attendance', label: '勤怠管理',     icon: <Clock className="w-4 h-4" /> },
    { id: 'documents',  label: '文書管理',     icon: <FileText className="w-4 h-4" /> },
    ...(isManager ? [{ id: 'settings', label: '設定', icon: <Settings className="w-4 h-4" /> }] : []),
  ];

  if (isUserLoading || !hasMounted) return (
    <div className="min-h-screen flex items-center justify-center bg-[#06060b]">
      <Loader2 className="animate-spin text-[#6366f1]" />
    </div>
  );
  if (!user) { router.push('/'); return null; }

  const ownerName = companyName || (isDeveloper ? 'Dev Console' : '');

  return (
    <div className="min-h-screen bg-[#06060b] text-white">
      <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-8">

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-[0_0_20px_rgba(99,102,241,0.4)]"
              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}
            >
              👔
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black tracking-tight">
                <span className="text-white">メンバー</span>
                <span className="text-[#6366f1]">管理</span>
              </h1>
              <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">v{APP_VERSION}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-5 py-2 bg-white/5 border border-white/10 rounded-[2rem]">
              <span className="text-[10px] font-black text-[#6366f1] uppercase">{ownerName}</span>
              <div className="w-1 h-1 rounded-full bg-white/20" />
              <Badge variant="outline" className="text-[10px] font-black border-white/20 text-white/60">{role?.toUpperCase() || 'USER'}</Badge>
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => router.push('/cost')}
              className="text-white/30 hover:text-white font-black text-xs border border-white/10"
            >
              コスト管理
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => signOut(auth!)}
              className="text-white/30 hover:text-red-400 font-black text-xs"
            >
              <LogOut className="w-4 h-4 mr-2" />ログアウト
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="p-1 h-12 rounded-2xl bg-white/5 border border-white/10">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "rounded-xl h-10 px-5 font-black text-xs flex items-center gap-2 text-white/40",
                  "data-[state=active]:bg-[#6366f1] data-[state=active]:text-white data-[state=active]:shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                )}
              >
                {tab.icon}{tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="home" className="mt-0">
            <HomeTab ownerId={ownerId || ''} role={role || 'user'} ownerName={ownerName} onTabChange={setActiveTab} />
          </TabsContent>
          <TabsContent value="members" className="mt-0">
            <MemberListTab ownerId={ownerId || ''} />
          </TabsContent>
          <TabsContent value="attendance" className="mt-0">
            <AttendanceTab ownerId={ownerId || ''} />
          </TabsContent>
          <TabsContent value="documents" className="mt-0">
            <DocumentsTab ownerId={ownerId || ''} />
          </TabsContent>
          {isManager && (
            <TabsContent value="settings" className="mt-0">
              <MemberSettingsTab ownerId={ownerId || ''} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
