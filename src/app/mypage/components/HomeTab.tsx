'use client';

import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Clock, FileText, Building2, DollarSign } from 'lucide-react';

interface Props {
  member: any;
  lang: string;
  ownerId: string;
}

const LABELS: Record<string, any> = {
  ja: { today: '本日', lastCheckIn: '最終チェックイン', monthHours: '今月の勤務時間', salary: '今月の給与', company: '所属企業', docs: '書類期限アラート', hours: '時間', yen: '円' },
  en: { today: 'Today', lastCheckIn: 'Last Check-in', monthHours: 'Hours this month', salary: 'Salary this month', company: 'Company', docs: 'Document Alerts', hours: 'h', yen: '¥' },
  pt: { today: 'Hoje', lastCheckIn: 'Último Check-in', monthHours: 'Horas este mês', salary: 'Salário este mês', company: 'Empresa', docs: 'Alertas de Docs', hours: 'h', yen: '¥' },
  es: { today: 'Hoy', lastCheckIn: 'Último Check-in', monthHours: 'Horas este mes', salary: 'Salario este mes', company: 'Empresa', docs: 'Alertas de Docs', hours: 'h', yen: '¥' },
  zh: { today: '今天', lastCheckIn: '最后签到', monthHours: '本月工时', salary: '本月薪资', company: '所属企业', docs: '文件提醒', hours: 'h', yen: '¥' },
  tr: { today: 'Bugün', lastCheckIn: 'Son Giriş', monthHours: 'Bu ay saatler', salary: 'Bu ay maaş', company: 'Şirket', docs: 'Belge Uyarıları', hours: 's', yen: '¥' },
};

export function HomeTab({ member, lang, ownerId }: Props) {
  const database = useDatabase();
  const [monthHours, setMonthHours] = useState(0);
  const [monthlySalary, setMonthlySalary] = useState(0);
  const t = LABELS[lang] || LABELS.ja;

  const today = new Date().toISOString().split('T')[0];
  const monthKey = today.slice(0, 7);

  useEffect(() => {
    if (!ownerId || !member?.id || !database) return;
    const r = ref(database, `owner/${ownerId}/attendance`);
    return onValue(r, snap => {
      const data = snap.val() || {};
      let total = 0;
      Object.entries(data).forEach(([date, dayData]: any) => {
        if (date.startsWith(monthKey) && dayData[member.id]?.hours) {
          total += dayData[member.id].hours;
        }
      });
      setMonthHours(total);
      // Estimate salary: hourly rate from member profile
      const hourlyRate = member.hourlyRate || 0;
      setMonthlySalary(Math.round(total * hourlyRate));
    });
  }, [ownerId, member, database, monthKey]);

  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const docAlerts = ['visaExpiry', 'passportExpiry', 'insuranceExpiry', 'contractExpiry']
    .filter(k => member[k] && member[k] <= in30 && member[k] >= today).length;

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm space-y-2">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.today} — {today}</p>
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
          <span className="text-lg font-black text-slate-900">
            {member.lastCheckIn ? `${t.lastCheckIn}: ${member.lastCheckIn}` : (lang === 'ja' ? '本日未出勤' : lang === 'en' ? 'Not checked in today' : lang === 'pt' ? 'Sem registro hoje' : lang === 'es' ? 'Sin registro hoy' : lang === 'zh' ? '今日未打卡' : 'Bugün giriş yok')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {[
          { label: t.monthHours, value: `${monthHours.toFixed(1)} ${t.hours}`, icon: <Clock className="w-5 h-5" />, color: '#0ea5e9' },
          { label: t.salary, value: `${t.yen}${monthlySalary.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: '#22c55e' },
          { label: t.company, value: member.companyName || '—', icon: <Building2 className="w-5 h-5" />, color: '#6366f1' },
          { label: t.docs, value: docAlerts > 0 ? `⚠ ${docAlerts}` : '✓', icon: <FileText className="w-5 h-5" />, color: docAlerts > 0 ? '#f59e0b' : '#22c55e' },
        ].map(card => (
          <div key={card.label} className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm">
            <div className="p-2 rounded-xl w-fit mb-3" style={{ background: `${card.color}15`, color: card.color }}>
              {card.icon}
            </div>
            <div className="text-xl font-black text-slate-900 leading-tight">{card.value}</div>
            <div className="text-[11px] font-bold text-slate-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
