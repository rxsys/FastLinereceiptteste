'use client';

import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Clock, CheckCircle } from 'lucide-react';

interface Props { member: any; lang: string; ownerId: string; }

const LABELS: Record<string, any> = {
  ja: { title: '勤怠記録', checkIn: 'チェックイン', checkOut: 'チェックアウト', hours: '勤務時間', total: '合計', noRecords: '記録なし', monthSelect: '月選択' },
  en: { title: 'Attendance', checkIn: 'Check-in', checkOut: 'Check-out', hours: 'Hours', total: 'Total', noRecords: 'No records', monthSelect: 'Select month' },
  pt: { title: 'Registro de Presença', checkIn: 'Entrada', checkOut: 'Saída', hours: 'Horas', total: 'Total', noRecords: 'Sem registros', monthSelect: 'Selecionar mês' },
  es: { title: 'Registro de Asistencia', checkIn: 'Entrada', checkOut: 'Salida', hours: 'Horas', total: 'Total', noRecords: 'Sin registros', monthSelect: 'Seleccionar mes' },
  zh: { title: '考勤记录', checkIn: '签到', checkOut: '签出', hours: '工时', total: '合计', noRecords: '无记录', monthSelect: '选择月份' },
  tr: { title: 'Devam Kaydı', checkIn: 'Giriş', checkOut: 'Çıkış', hours: 'Saat', total: 'Toplam', noRecords: 'Kayıt yok', monthSelect: 'Ay seç' },
};

export function AttendanceTab({ member, lang, ownerId }: Props) {
  const database = useDatabase();
  const [records, setRecords] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const t = LABELS[lang] || LABELS.ja;

  useEffect(() => {
    if (!ownerId || !member?.id || !database) return;
    const r = ref(database, `owner/${ownerId}/attendance`);
    return onValue(r, snap => {
      const data = snap.val() || {};
      const list = Object.entries(data)
        .filter(([date]) => date.startsWith(selectedMonth))
        .map(([date, dayData]: any) => ({ date, ...(dayData[member.id] || {}) }))
        .filter(r => r.checkIn)
        .sort((a, b) => b.date.localeCompare(a.date));
      setRecords(list);
    });
  }, [ownerId, member, database, selectedMonth]);

  const totalHours = records.reduce((sum, r) => sum + (r.hours || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-black text-slate-900">{t.title}</h2>
        <input
          type="month"
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          className="bg-white border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2 shadow-sm"
        />
      </div>

      <div className="p-5 rounded-3xl bg-[#0ea5e9] text-white shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-4 h-4" />
          <span className="text-[11px] font-black uppercase tracking-widest opacity-80">{t.total}</span>
        </div>
        <div className="text-4xl font-black">{totalHours.toFixed(1)}<span className="text-2xl ml-1 opacity-60">{t.hours}</span></div>
        <div className="text-[11px] opacity-60 mt-1">{records.length} {lang === 'ja' ? '日' : lang === 'pt' ? 'dias' : lang === 'es' ? 'días' : lang === 'zh' ? '天' : lang === 'tr' ? 'gün' : 'days'}</div>
      </div>

      <div className="space-y-3">
        {records.length === 0 ? (
          <div className="text-center py-12 text-slate-300 font-bold text-lg">{t.noRecords}</div>
        ) : records.map(rec => (
          <div key={rec.date} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
            <div className="text-center min-w-[40px]">
              <div className="text-[10px] font-black text-slate-400">{rec.date.slice(5, 7)}/{rec.date.slice(8, 10)}</div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-2 text-[12px]">
              <div>
                <span className="text-slate-400 font-bold">{t.checkIn}: </span>
                <span className="font-black text-slate-900">{rec.checkIn || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-bold">{t.checkOut}: </span>
                <span className="font-black text-slate-900">{rec.checkOut || '—'}</span>
              </div>
            </div>
            <div className="text-[13px] font-black text-[#0ea5e9]">{rec.hours ? `${rec.hours.toFixed(1)}h` : '—'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
