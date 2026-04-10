'use client';

import { Users, Clock, FileText, AlertCircle, TrendingUp } from "lucide-react";
import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { useEffect, useState } from 'react';

interface Props {
  ownerId: string;
  role: string;
  ownerName: string;
  onTabChange: (tab: string) => void;
}

interface Stats {
  totalMembers: number;
  activeToday: number;
  docsExpiringSoon: number;
  pendingApprovals: number;
}

export function HomeTab({ ownerId, role, ownerName, onTabChange }: Props) {
  const database = useDatabase();
  const [stats, setStats] = useState<Stats>({ totalMembers: 0, activeToday: 0, docsExpiringSoon: 0, pendingApprovals: 0 });

  useEffect(() => {
    if (!ownerId || !database) return;
    const membersRef = ref(database, `owner/${ownerId}/members`);
    return onValue(membersRef, snap => {
      const data = snap.val() || {};
      const members = Object.values(data) as any[];
      const today = new Date().toISOString().split('T')[0];
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setStats({
        totalMembers: members.length,
        activeToday: members.filter(m => m.lastCheckIn?.startsWith(today)).length,
        docsExpiringSoon: members.filter(m => {
          const exp = m.visaExpiry || m.passportExpiry;
          return exp && exp <= in30Days && exp >= today;
        }).length,
        pendingApprovals: members.filter(m => m.status === 'pending').length,
      });
    });
  }, [ownerId, database]);

  const cards = [
    { label: '総メンバー数', value: stats.totalMembers, icon: <Users className="w-5 h-5" />, color: '#6366f1', tab: 'members' },
    { label: '本日出勤', value: stats.activeToday, icon: <Clock className="w-5 h-5" />, color: '#22c55e', tab: 'attendance' },
    { label: '書類期限 (30日)', value: stats.docsExpiringSoon, icon: <AlertCircle className="w-5 h-5" />, color: '#f59e0b', tab: 'documents' },
    { label: '承認待ち', value: stats.pendingApprovals, icon: <FileText className="w-5 h-5" />, color: '#ef4444', tab: 'members' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-black text-white">ダッシュボード</h2>
        <p className="text-white/40 text-sm mt-1">{ownerName} — メンバー管理の概要</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <button
            key={card.label}
            onClick={() => onTabChange(card.tab)}
            className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-xl" style={{ background: `${card.color}20`, color: card.color }}>
                {card.icon}
              </div>
              <TrendingUp className="w-3 h-3 text-white/20 group-hover:text-white/40 transition-colors" />
            </div>
            <div className="text-3xl font-black text-white">{card.value}</div>
            <div className="text-[11px] font-bold text-white/40 mt-1">{card.label}</div>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-black text-white/70 text-sm uppercase tracking-widest">クイックアクション</h3>
          <div className="space-y-2">
            {[
              { label: '新規メンバー登録', tab: 'members', color: '#6366f1' },
              { label: '勤怠レポートを見る', tab: 'attendance', color: '#22c55e' },
              { label: '書類アラートを確認', tab: 'documents', color: '#f59e0b' },
              { label: '設定を変更', tab: 'settings', color: '#64748b' },
            ].map(action => (
              <button
                key={action.label}
                onClick={() => onTabChange(action.tab)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors text-left group"
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: action.color }} />
                <span className="text-[13px] font-bold text-white/60 group-hover:text-white/90 transition-colors">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-4">
          <h3 className="font-black text-white/70 text-sm uppercase tracking-widest">モジュール連携</h3>
          <div className="space-y-3">
            {[
              { icon: '💴', label: 'コスト管理と連携', desc: '労務費を自動でコストに反映', active: true },
              { icon: '📱', label: 'LINE Bot 連携', desc: 'チェックイン/アウト通知', active: true },
              { icon: '🪪', label: 'マイページ発行', desc: 'メンバーに個人ポータルを配布', active: true },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-black text-white/80">{item.label}</div>
                  <div className="text-[10px] text-white/40 truncate">{item.desc}</div>
                </div>
                <div className={`w-2 h-2 rounded-full ${item.active ? 'bg-green-400' : 'bg-white/20'}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
