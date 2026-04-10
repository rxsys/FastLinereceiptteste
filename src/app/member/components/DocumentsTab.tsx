'use client';

import { useState, useEffect } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

interface Props { ownerId: string; }

const TODAY = new Date().toISOString().split('T')[0];
const IN30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const IN90 = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

function expiryStatus(date?: string): 'expired' | 'critical' | 'warning' | 'ok' | 'none' {
  if (!date) return 'none';
  if (date < TODAY) return 'expired';
  if (date <= IN30) return 'critical';
  if (date <= IN90) return 'warning';
  return 'ok';
}

const STATUS_CONFIG = {
  expired: { label: '期限切れ', color: '#ef4444', icon: <AlertCircle className="w-4 h-4" /> },
  critical: { label: '30日以内', color: '#f59e0b', icon: <AlertCircle className="w-4 h-4" /> },
  warning:  { label: '90日以内', color: '#eab308', icon: <Clock className="w-4 h-4" /> },
  ok:       { label: '有効',     color: '#22c55e', icon: <CheckCircle className="w-4 h-4" /> },
  none:     { label: '未登録',   color: '#64748b', icon: <FileText className="w-4 h-4" /> },
};

const DOC_TYPES = [
  { key: 'visaExpiry',      label: 'ビザ有効期限',   icon: '🛂' },
  { key: 'passportExpiry',  label: 'パスポート有効期限', icon: '📕' },
  { key: 'insuranceExpiry', label: '健康保険証',     icon: '🏥' },
  { key: 'contractExpiry',  label: '契約期限',       icon: '📄' },
];

export function DocumentsTab({ ownerId }: Props) {
  const database = useDatabase();
  const [members, setMembers] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'expired' | 'critical' | 'warning'>('all');

  useEffect(() => {
    if (!ownerId || !database) return;
    const r = ref(database, `owner/${ownerId}/members`);
    return onValue(r, snap => {
      const data = snap.val() || {};
      setMembers(Object.entries(data).map(([id, v]: any) => ({ id, ...v })));
    });
  }, [ownerId, database]);

  const alerts = members.flatMap(member =>
    DOC_TYPES.map(doc => ({
      memberId: member.id,
      memberName: member.name,
      ...doc,
      expiry: member[doc.key],
      status: expiryStatus(member[doc.key]),
    }))
  ).filter(a => {
    if (filter === 'all') return a.status !== 'none' && a.status !== 'ok';
    return a.status === filter;
  });

  const counts = {
    expired: members.flatMap(m => DOC_TYPES.map(d => expiryStatus(m[d.key]))).filter(s => s === 'expired').length,
    critical: members.flatMap(m => DOC_TYPES.map(d => expiryStatus(m[d.key]))).filter(s => s === 'critical').length,
    warning: members.flatMap(m => DOC_TYPES.map(d => expiryStatus(m[d.key]))).filter(s => s === 'warning').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">文書管理</h2>
        <p className="text-white/40 text-[12px] mt-0.5">書類・ビザ・パスポートの期限アラート</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'expired', label: '期限切れ', count: counts.expired, color: '#ef4444' },
          { key: 'critical', label: '30日以内', count: counts.critical, color: '#f59e0b' },
          { key: 'warning', label: '90日以内', count: counts.warning, color: '#eab308' },
        ].map(item => (
          <button
            key={item.key}
            onClick={() => setFilter(filter === item.key as any ? 'all' : item.key as any)}
            className={`p-4 rounded-2xl border transition-all text-left ${filter === item.key ? 'border-opacity-60' : 'border-white/10 bg-white/5 hover:border-white/20'}`}
            style={filter === item.key ? { background: `${item.color}15`, borderColor: `${item.color}50` } : {}}
          >
            <div className="text-3xl font-black" style={{ color: item.color }}>{item.count}</div>
            <div className="text-[11px] font-bold text-white/40 mt-1">{item.label}</div>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-16 text-white/20 font-bold">
            {filter === 'all' ? '期限アラートなし' : 'この条件の書類はありません'}
          </div>
        ) : alerts.map((alert, i) => {
          const cfg = STATUS_CONFIG[alert.status];
          return (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-2xl">{alert.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-white text-[13px]">{alert.memberName}</div>
                <div className="text-[11px] text-white/40">{alert.label}</div>
              </div>
              <div className="text-right">
                <div className="text-[12px] font-bold text-white/60">{alert.expiry || '—'}</div>
                <div className="flex items-center gap-1 justify-end mt-0.5" style={{ color: cfg.color }}>
                  {cfg.icon}
                  <span className="text-[10px] font-black">{cfg.label}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
