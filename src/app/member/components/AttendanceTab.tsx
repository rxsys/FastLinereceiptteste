'use client';

import { useState, useEffect } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface AttendanceRecord {
  memberId: string;
  memberName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  hours?: number;
  status: 'present' | 'absent' | 'partial';
}

interface Props { ownerId: string; }

const TODAY = new Date().toISOString().split('T')[0];

export function AttendanceTab({ ownerId }: Props) {
  const database = useDatabase();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    if (!ownerId || !database) return;
    const membersRef = ref(database, `owner/${ownerId}/members`);
    return onValue(membersRef, snap => {
      const data = snap.val() || {};
      setMembers(Object.entries(data).map(([id, v]: any) => ({ id, ...v })));
    });
  }, [ownerId, database]);

  useEffect(() => {
    if (!ownerId || !database) return;
    const r = ref(database, `owner/${ownerId}/attendance/${selectedDate}`);
    return onValue(r, snap => {
      const data = snap.val() || {};
      setRecords(Object.entries(data).map(([memberId, val]: any) => ({ memberId, ...val })));
    });
  }, [ownerId, database, selectedDate]);

  const presentCount = records.filter(r => r.status === 'present' || r.checkIn).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-white">勤怠管理</h2>
          <p className="text-white/40 text-[12px] mt-0.5">日別の出勤記録を確認・管理</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-white/40" />
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-white/5 border border-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-[#6366f1]/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '出勤', value: presentCount, color: '#22c55e', icon: <CheckCircle className="w-5 h-5" /> },
          { label: '欠勤', value: members.length - presentCount, color: '#ef4444', icon: <XCircle className="w-5 h-5" /> },
          { label: '総メンバー', value: members.length, color: '#6366f1', icon: <Clock className="w-5 h-5" /> },
        ].map(stat => (
          <div key={stat.label} className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2" style={{ color: stat.color }}>
              {stat.icon}
              <span className="text-[11px] font-black uppercase tracking-widest text-white/40">{stat.label}</span>
            </div>
            <div className="text-3xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {members.length === 0 ? (
          <div className="text-center py-16 text-white/20 font-bold">メンバーがいません</div>
        ) : members.map(member => {
          const rec = records.find(r => r.memberId === member.id);
          const isPresent = rec?.checkIn;
          return (
            <div key={member.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className={`w-3 h-3 rounded-full ${isPresent ? 'bg-green-400 shadow-[0_0_6px_rgba(34,197,94,0.6)]' : 'bg-white/10'}`} />
              <div className="flex-1">
                <div className="font-black text-white text-[13px]">{member.name}</div>
                <div className="text-[10px] text-white/40">{member.role}</div>
              </div>
              {isPresent ? (
                <div className="text-right">
                  <div className="text-[11px] font-black text-green-400">{rec?.checkIn} 〜 {rec?.checkOut || '勤務中'}</div>
                  {rec?.hours && <div className="text-[10px] text-white/30">{rec.hours.toFixed(1)}時間</div>}
                </div>
              ) : (
                <span className="text-[11px] font-bold text-white/20">未出勤</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
