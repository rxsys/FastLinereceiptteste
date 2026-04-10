'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDatabase, useUser } from '@/firebase/provider';
import { ref, onValue } from 'firebase/database';
import { Loader2, Home, Clock, DollarSign, FileText, Building2, User as UserIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { HomeTab } from '../components/HomeTab';
import { AttendanceTab } from '../components/AttendanceTab';
import { SalaryTab } from '../components/SalaryTab';
import { DocumentsTab } from '../components/DocumentsTab';
import { CompaniesTab } from '../components/CompaniesTab';

import { APP_VERSION } from '@/lib/version';

const LANGS: Record<string, any> = {
  ja: { title: 'マイページ', home: 'ホーム', attendance: '勤怠', salary: '給与', documents: '書類', companies: '所属企業', notFound: 'メンバーが見つかりません', flag: '🇯🇵' },
  en: { title: 'My Page', home: 'Home', attendance: 'Attendance', salary: 'Salary', documents: 'Documents', companies: 'Companies', notFound: 'Member not found', flag: '🇺🇸' },
  pt: { title: 'Minha Página', home: 'Início', attendance: 'Presença', salary: 'Salário', documents: 'Documentos', companies: 'Empresas', notFound: 'Membro não encontrado', flag: '🇧🇷' },
  es: { title: 'Mi Página', home: 'Inicio', attendance: 'Asistencia', salary: 'Salario', documents: 'Documentos', companies: 'Empresas', notFound: 'Miembro no encontrado', flag: '🇪🇸' },
  zh: { title: '我的主页', home: '首页', attendance: '考勤', salary: '薪资', documents: '文件', companies: '所属企业', notFound: '未找到成员', flag: '🇨🇳' },
  tr: { title: 'Sayfam', home: 'Ana Sayfa', attendance: 'Devam', salary: 'Maaş', documents: 'Belgeler', companies: 'Şirketler', notFound: 'Üye bulunamadı', flag: '🇹🇷' },
};

const LANGUAGES = [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
];

export default function MyPageHash() {
  const params = useParams();
  const hash = params?.hash as string;
  const database = useDatabase();
  const { user, role } = useUser();

  const [lang, setLang] = useState('ja');
  const [hasMounted, setHasMounted] = useState(false);
  const [member, setMember] = useState<any>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    setHasMounted(true);
    const saved = localStorage.getItem('fastline_lang');
    if (saved && LANGS[saved]) setLang(saved);
  }, []);

  useEffect(() => {
    if (!hash || !database) return;
    // Lookup member by hash: stored at members/{hash} globally
    const r = ref(database, `memberLinks/${hash}`);
    return onValue(r, snap => {
      const link = snap.val();
      if (!link) { setIsLoading(false); return; }
      setOwnerId(link.ownerId);
      // Load member data from owner
      const memberRef = ref(database, `owner/${link.ownerId}/members/${link.memberId}`);
      onValue(memberRef, mSnap => {
        setMember({ id: link.memberId, ...mSnap.val() });
        setIsLoading(false);
      }, { onlyOnce: true });
    });
  }, [hash, database]);

  const handleLangChange = (l: string) => { setLang(l); localStorage.setItem('fastline_lang', l); };

  if (!hasMounted || isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff]">
      <Loader2 className="animate-spin text-[#0ea5e9] w-8 h-8" />
    </div>
  );

  const t = LANGS[lang] || LANGS.ja;

  if (!member) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff] text-slate-400 font-bold text-lg">
      <div className="text-center space-y-4">
        <p>{t.notFound}</p>
        <p className="text-[10px] text-slate-300">FastLine v{APP_VERSION}</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'home',       label: t.home,       icon: <Home className="w-4 h-4" /> },
    { id: 'attendance', label: t.attendance, icon: <Clock className="w-4 h-4" /> },
    { id: 'salary',     label: t.salary,     icon: <DollarSign className="w-4 h-4" /> },
    { id: 'documents',  label: t.documents,  icon: <FileText className="w-4 h-4" /> },
    { id: 'companies',  label: t.companies,  icon: <Building2 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#f0f4ff] text-slate-900">
      {user && (
        <div className="sticky top-0 z-50 w-full bg-white/40 backdrop-blur-md border-b border-white/50 px-4 py-2 flex justify-end items-center gap-3">
          <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/50 shadow-sm">
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <Avatar className="h-5 w-5 border border-white shadow-sm">
              <AvatarImage src={user.photoURL || undefined} />
              <AvatarFallback className="bg-blue-500 text-white text-[8px] font-bold">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || <UserIcon size={10} />}
              </AvatarFallback>
            </Avatar>
            <span className="text-[7px] font-black text-blue-500/50 uppercase tracking-widest">{role || 'USER'}</span>
          </div>
        </div>
      )}
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-24 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
              {member.name?.[0] || '?'}
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900">{member.name}</h1>
              <p className="text-[11px] text-slate-400 font-bold">{member.role} · {member.nationality || '—'}</p>
            </div>
          </div>
          <Select value={lang} onValueChange={handleLangChange}>
            <SelectTrigger className="w-[90px] h-9 bg-white border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold shadow-sm">
              <div className="flex items-center gap-1.5">
                <span>{LANGUAGES.find(l => l.code === lang)?.flag}</span>
                <span>{lang.toUpperCase()}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-200 rounded-2xl shadow-xl">
              {LANGUAGES.map(l => (
                <SelectItem key={l.code} value={l.code} className="text-[11px] font-bold rounded-xl">
                  <div className="flex items-center gap-2"><span>{l.flag}</span><span>{l.name}</span></div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full p-1 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "rounded-xl h-10 px-4 font-black text-[11px] flex items-center gap-1.5 text-slate-400 flex-shrink-0",
                  "data-[state=active]:bg-[#0ea5e9] data-[state=active]:text-white data-[state=active]:shadow-sm"
                )}
              >
                {tab.icon}<span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="mt-6">
            <TabsContent value="home" className="mt-0">
              <HomeTab member={member} lang={lang} ownerId={ownerId || ''} />
            </TabsContent>
            <TabsContent value="attendance" className="mt-0">
              <AttendanceTab member={member} lang={lang} ownerId={ownerId || ''} />
            </TabsContent>
            <TabsContent value="salary" className="mt-0">
              <SalaryTab member={member} lang={lang} ownerId={ownerId || ''} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              <DocumentsTab member={member} lang={lang} />
            </TabsContent>
            <TabsContent value="companies" className="mt-0">
              <CompaniesTab member={member} lang={lang} ownerId={ownerId || ''} />
            </TabsContent>
          </div>
        </Tabs>

        <p className="text-center text-[10px] text-slate-300 font-bold">FastLine v{APP_VERSION}</p>
      </div>
    </div>
  );
}
