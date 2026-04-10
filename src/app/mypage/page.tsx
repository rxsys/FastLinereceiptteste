'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Home, Clock, DollarSign, FileText, Building2, Settings, User as UserIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from '@/firebase/provider';

import { HomeTab } from './components/HomeTab';
import { AttendanceTab } from './components/AttendanceTab';
import { SalaryTab } from './components/SalaryTab';
import { DocumentsTab } from './components/DocumentsTab';
import { CompaniesTab } from './components/CompaniesTab';

import { APP_VERSION } from '@/lib/version';

const LANGS: Record<string, any> = {
  ja: {
    title: 'マイページ',
    home: 'ホーム', attendance: '勤怠', salary: '給与', documents: '書類', companies: '所属企業',
    version: 'バージョン', welcome: 'ようこそ',
    noHash: 'QRコードからアクセスしてください。',
    flag: '🇯🇵',
  },
  en: {
    title: 'My Page',
    home: 'Home', attendance: 'Attendance', salary: 'Salary', documents: 'Documents', companies: 'Companies',
    version: 'Version', welcome: 'Welcome',
    noHash: 'Please access via QR Code.',
    flag: '🇺🇸',
  },
  pt: {
    title: 'Minha Página',
    home: 'Início', attendance: 'Presença', salary: 'Salário', documents: 'Documentos', companies: 'Empresas',
    version: 'Versão', welcome: 'Bem-vindo',
    noHash: 'Acesse via QR Code.',
    flag: '🇧🇷',
  },
  es: {
    title: 'Mi Página',
    home: 'Inicio', attendance: 'Asistencia', salary: 'Salario', documents: 'Documentos', companies: 'Empresas',
    version: 'Versión', welcome: 'Bienvenido',
    noHash: 'Accede mediante código QR.',
    flag: '🇪🇸',
  },
  zh: {
    title: '我的主页',
    home: '首页', attendance: '考勤', salary: '薪资', documents: '文件', companies: '所属企业',
    version: '版本', welcome: '欢迎',
    noHash: '请通过二维码访问。',
    flag: '🇨🇳',
  },
  tr: {
    title: 'Sayfam',
    home: 'Ana Sayfa', attendance: 'Devam', salary: 'Maaş', documents: 'Belgeler', companies: 'Şirketler',
    version: 'Sürüm', welcome: 'Hoş geldiniz',
    noHash: 'Lütfen QR kodu ile erişin.',
    flag: '🇹🇷',
  },
};

const LANGUAGES = [
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
];

export default function MyPageIndex() {
  const router = useRouter();
  const { user, role } = useUser();
  const [lang, setLang] = useState('ja');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const saved = localStorage.getItem('fastline_lang');
    if (saved && LANGS[saved]) setLang(saved);
  }, []);

  const handleLangChange = (l: string) => { setLang(l); localStorage.setItem('fastline_lang', l); };

  if (!hasMounted) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f4ff]">
      <Loader2 className="animate-spin text-[#0ea5e9]" />
    </div>
  );

  const t = LANGS[lang] || LANGS.ja;

  return (
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col items-center justify-center px-6 relative">
      <div className="w-full max-w-md space-y-8 text-center bg-white/40 backdrop-blur-md p-8 md:p-12 rounded-[2.5rem] border border-white/50 shadow-2xl shadow-blue-500/5">
        
        {/* Header Actions */}
        <div className="flex justify-between items-center bg-white/60 backdrop-blur-sm p-1.5 rounded-2xl border border-white/50 shadow-sm">
          {user ? (
            <div className="flex items-center gap-2 pl-2">
              <Avatar className="h-7 w-7 border-2 border-white shadow-sm ring-1 ring-slate-100">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[10px] font-black uppercase">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || <UserIcon size={12} />}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start pr-4">
                <span className="text-[10px] font-black text-slate-800 tracking-tight leading-none uppercase">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <span className="text-[8px] font-black text-blue-500/80 uppercase tracking-widest mt-0.5">
                  {role || 'Standard'}
                </span>
              </div>
            </div>
          ) : (
             <div className="flex items-center gap-2 pl-3">
                <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Guest</span>
             </div>
          )}

          <Select value={lang} onValueChange={handleLangChange}>
            <SelectTrigger className="w-[100px] h-9 bg-white border-0 text-slate-700 rounded-xl text-[11px] font-black shadow-none hover:bg-slate-50 transition-all">
              <div className="flex items-center gap-2">
                <span>{LANGUAGES.find(l => l.code === lang)?.flag}</span>
                <span>{lang.toUpperCase()}</span>
              </div>
            </SelectTrigger>
            <SelectContent className="bg-white border-slate-100 rounded-2xl shadow-2xl border-none p-1">
              {LANGUAGES.map(l => (
                <SelectItem key={l.code} value={l.code} className="text-[10px] font-black rounded-xl hover:bg-blue-50 transition-colors">
                  <div className="flex items-center gap-2"><span>{l.flag}</span><span>{l.name}</span></div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-6">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-blue-400/20 blur-2xl rounded-full" />
            <div className="relative w-24 h-24 mx-auto rounded-[2rem] flex items-center justify-center text-5xl shadow-2xl ring-4 ring-white" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
              🪪
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{t.title}</h1>
            <p className="text-slate-400 font-bold group">
              {t.noHash}
              <span className="block h-1 w-8 bg-blue-400/30 mx-auto mt-3 rounded-full group-hover:w-16 transition-all duration-500" />
            </p>
          </div>
        </div>

        <div className="p-8 rounded-[2rem] bg-gradient-to-b from-white to-slate-50/50 border border-white shadow-xl shadow-blue-500/5 text-left space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <p className="text-[10px] font-black text-blue-500/50 uppercase tracking-[0.2em]">FastLine Platform</p>
          </div>
          <p className="text-[13px] leading-relaxed text-slate-500 font-medium">
            {lang === 'ja' && 'このページはQRコードを通じてアクセスする個人ポータルです。管理者にQRコードの発行を依頼してください。'}
            {lang === 'en' && 'This page is a personal portal accessed via QR code. Ask your manager to issue your QR code.'}
            {lang === 'pt' && 'Esta página é um portal pessoal acessado via QR code. Peça ao seu gestor para emitir seu QR code.'}
            {lang === 'es' && 'Esta página es un portal personal al que se accede mediante código QR. Solicita a tu gestor que emita tu código QR.'}
            {lang === 'zh' && '本页面是通过二维码访问的个人门户。请联系您的管理员获取二维码。'}
            {lang === 'tr' && 'Bu sayfa, QR kodu aracılığıyla erişilen kişisel bir portaldır. QR kodunuzu yöneticinizden talep edin.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3">
          <div className="h-[1px] w-8 bg-slate-100" />
          <p className="text-[10px] text-slate-300 font-black tracking-widest">v{APP_VERSION}</p>
          <div className="h-[1px] w-8 bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
