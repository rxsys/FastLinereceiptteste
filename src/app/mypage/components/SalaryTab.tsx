'use client';

import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';

interface Props { member: any; lang: string; ownerId: string; }

const LABELS: Record<string, any> = {
  ja: { title: '給与履歴', month: '月', gross: '総支給額', net: '手取り', hours: '勤務時間', rate: '時給', noRecords: '給与記録なし', yen: '¥', h: '時間' },
  en: { title: 'Salary History', month: 'Month', gross: 'Gross', net: 'Net', hours: 'Hours', rate: 'Rate/h', noRecords: 'No salary records', yen: '¥', h: 'h' },
  pt: { title: 'Histórico Salarial', month: 'Mês', gross: 'Bruto', net: 'Líquido', hours: 'Horas', rate: 'Taxa/h', noRecords: 'Sem registros', yen: '¥', h: 'h' },
  es: { title: 'Historial de Salario', month: 'Mes', gross: 'Bruto', net: 'Neto', hours: 'Horas', rate: 'Tarifa/h', noRecords: 'Sin registros', yen: '¥', h: 'h' },
  zh: { title: '薪资历史', month: '月', gross: '税前', net: '实发', hours: '工时', rate: '时薪', noRecords: '无薪资记录', yen: '¥', h: 'h' },
  tr: { title: 'Maaş Geçmişi', month: 'Ay', gross: 'Brüt', net: 'Net', hours: 'Saat', rate: 'Oran/s', noRecords: 'Maaş kaydı yok', yen: '¥', h: 's' },
};

export function SalaryTab({ member, lang, ownerId }: Props) {
  const database = useDatabase();
  const [salaryHistory, setSalaryHistory] = useState<any[]>([]);
  const t = LABELS[lang] || LABELS.ja;

  useEffect(() => {
    if (!ownerId || !member?.id || !database) return;
    const r = ref(database, `owner/${ownerId}/salary/${member.id}`);
    return onValue(r, snap => {
      const data = snap.val() || {};
      setSalaryHistory(
        Object.entries(data)
          .map(([month, val]: any) => ({ month, ...val }))
          .sort((a, b) => b.month.localeCompare(a.month))
      );
    });
  }, [ownerId, member, database]);

  const hourlyRate = member.hourlyRate || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900">{t.title}</h2>
        {hourlyRate > 0 && (
          <div className="px-4 py-2 rounded-2xl bg-[#22c55e]/10 border border-[#22c55e]/20">
            <span className="text-[11px] font-black text-[#22c55e]">{t.rate}: {t.yen}{hourlyRate.toLocaleString()}</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {salaryHistory.length === 0 ? (
          <div className="text-center py-12 text-slate-300 font-bold text-lg">{t.noRecords}</div>
        ) : salaryHistory.map(record => (
          <div key={record.month} className="p-5 rounded-3xl bg-white border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-black text-slate-500">{record.month}</span>
              {record.paid && (
                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-600 text-[10px] font-black">
                  {lang === 'ja' ? '支払済' : 'Paid'}
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-slate-900">{t.yen}{(record.gross || 0).toLocaleString()}</div>
                <div className="text-[10px] font-bold text-slate-400">{t.gross}</div>
              </div>
              <div>
                <div className="text-2xl font-black text-[#0ea5e9]">{t.yen}{(record.net || 0).toLocaleString()}</div>
                <div className="text-[10px] font-bold text-slate-400">{t.net}</div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-500">{(record.hours || 0).toFixed(1)}{t.h}</div>
                <div className="text-[10px] font-bold text-slate-400">{t.hours}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
