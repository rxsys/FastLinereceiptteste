'use client';

import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';

interface Props { member: any; lang: string; ownerId: string; }

const LABELS: Record<string, any> = {
  ja: { title: '所属企業', since: '入社', role: '役職', status: 'ステータス', active: '在籍', inactive: '退職', noCompanies: '企業情報なし' },
  en: { title: 'Companies', since: 'Since', role: 'Role', status: 'Status', active: 'Active', inactive: 'Inactive', noCompanies: 'No company data' },
  pt: { title: 'Empresas', since: 'Desde', role: 'Cargo', status: 'Status', active: 'Ativo', inactive: 'Inativo', noCompanies: 'Sem dados de empresa' },
  es: { title: 'Empresas', since: 'Desde', role: 'Rol', status: 'Estado', active: 'Activo', inactive: 'Inactivo', noCompanies: 'Sin datos de empresa' },
  zh: { title: '所属企业', since: '入职时间', role: '职位', status: '状态', active: '在职', inactive: '离职', noCompanies: '暂无企业信息' },
  tr: { title: 'Şirketler', since: 'Başlangıç', role: 'Rol', status: 'Durum', active: 'Aktif', inactive: 'İnaktif', noCompanies: 'Şirket bilgisi yok' },
};

export function CompaniesTab({ member, lang, ownerId }: Props) {
  const database = useDatabase();
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const t = LABELS[lang] || LABELS.ja;

  useEffect(() => {
    if (!ownerId || !database) return;
    const r = ref(database, `owner/${ownerId}`);
    return onValue(r, snap => {
      const data = snap.val();
      if (data) setCompanyInfo({ name: data.companyName || data.name, ...data });
    }, { onlyOnce: true });
  }, [ownerId, database]);

  const companies = [
    companyInfo && {
      name: companyInfo.name,
      role: member.role,
      since: member.createdAt?.split('T')[0],
      status: member.status === 'active' ? 'active' : 'inactive',
      type: member.type,
    }
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-900">{t.title}</h2>

      {companies.length === 0 ? (
        <div className="text-center py-12 text-slate-300 font-bold text-lg">{t.noCompanies}</div>
      ) : companies.map((company: any, i) => (
        <div key={i} className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#6366f1]/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-[#6366f1]" />
            </div>
            <div>
              <div className="font-black text-slate-900 text-lg leading-tight">{company.name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${company.status === 'active' ? 'bg-green-400' : 'bg-slate-300'}`} />
                <span className={`text-[11px] font-black ${company.status === 'active' ? 'text-green-500' : 'text-slate-400'}`}>
                  {company.status === 'active' ? t.active : t.inactive}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.role}</div>
              <div className="font-black text-slate-900 mt-1">{company.role || '—'}</div>
            </div>
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.since}</div>
              <div className="font-black text-slate-900 mt-1">{company.since || '—'}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
