'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Home, Clock, DollarSign, FileText, Building2, Settings } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

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
    <div className="min-h-screen bg-[#f0f4ff] flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="flex justify-end">
          <Select value={lang} onValueChange={handleLangChange}>
            <SelectTrigger className="w-[110px] h-9 bg-white border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold shadow-sm">
              <div className="flex items-center gap-2">
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

        <div className="space-y-4">
          <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center text-4xl shadow-lg" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
            🪪
          </div>
          <h1 className="text-3xl font-black text-slate-900">{t.title}</h1>
          <p className="text-slate-400 font-medium">{t.noHash}</p>
        </div>

        <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm text-left space-y-3">
          <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest">FastLine Platform</p>
          <p className="text-[13px] text-slate-500">
            {lang === 'ja' && 'このページはQRコードを通じてアクセスする個人ポータルです。管理者にQRコードの発行を依頼してください。'}
            {lang === 'en' && 'This page is a personal portal accessed via QR code. Ask your manager to issue your QR code.'}
            {lang === 'pt' && 'Esta página é um portal pessoal acessado via QR code. Peça ao seu gestor para emitir seu QR code.'}
            {lang === 'es' && 'Esta página es un portal personal al que se accede mediante código QR. Solicita a tu gestor que emita tu código QR.'}
            {lang === 'zh' && '本页面是通过二维码访问的个人门户。请联系您的管理员获取二维码。'}
            {lang === 'tr' && 'Bu sayfa, QR kodu aracılığıyla erişilen kişisel bir portaldır. QR kodunuzu yöneticinizden talep edin.'}
          </p>
        </div>

        <p className="text-[10px] text-slate-300 font-bold">v{APP_VERSION}</p>
      </div>
    </div>
  );
}
