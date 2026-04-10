'use client';

import { useState, useEffect } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue, push, set } from 'firebase/database';
import { Plus, Search, User, Globe, Briefcase, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Member {
  id: string;
  name: string;
  type: 'employee' | 'pj' | 'foreigner';
  role: string;
  status: 'active' | 'inactive' | 'pending';
  nationality?: string;
  visaExpiry?: string;
  phone?: string;
  email?: string;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = { employee: '正社員', pj: 'PJ', foreigner: '外国人' };
const TYPE_COLORS: Record<string, string> = { employee: '#6366f1', pj: '#f59e0b', foreigner: '#0ea5e9' };
const STATUS_LABELS: Record<string, string> = { active: '在籍', inactive: '退職', pending: '審査中' };
const STATUS_COLORS: Record<string, string> = { active: '#22c55e', inactive: '#ef4444', pending: '#f59e0b' };

interface Props { ownerId: string; }

export function MemberListTab({ ownerId }: Props) {
  const database = useDatabase();
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'employee', role: '', nationality: '', phone: '', email: '' });

  useEffect(() => {
    if (!ownerId || !database) return;
    const r = ref(database, `owner/${ownerId}/members`);
    return onValue(r, snap => {
      const data = snap.val() || {};
      setMembers(Object.entries(data).map(([id, val]: any) => ({ id, ...val })));
    });
  }, [ownerId, database]);

  const filtered = members.filter(m =>
    m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.role?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async () => {
    if (!form.name.trim() || !database) return;
    const r = ref(database, `owner/${ownerId}/members`);
    await push(r, { ...form, status: 'active', createdAt: new Date().toISOString() });
    setForm({ name: '', type: 'employee', role: '', nationality: '', phone: '', email: '' });
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="名前・役職で検索..."
              className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl focus:border-[#6366f1]/50"
            />
          </div>
        </div>
        <Button
          onClick={() => setIsAdding(true)}
          className="bg-[#6366f1] hover:bg-[#5558e0] text-white font-black rounded-xl shadow-[0_0_12px_rgba(99,102,241,0.3)]"
        >
          <Plus className="w-4 h-4 mr-2" />メンバー追加
        </Button>
      </div>

      {isAdding && (
        <div className="p-6 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/30 space-y-4">
          <h3 className="font-black text-white text-sm">新規メンバー登録</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { key: 'name', label: '氏名', required: true },
              { key: 'role', label: '役職' },
              { key: 'phone', label: '電話番号' },
              { key: 'email', label: 'メール' },
              { key: 'nationality', label: '国籍' },
            ].map(field => (
              <div key={field.key} className="space-y-1">
                <label className="text-[10px] font-black text-white/40 uppercase">{field.label}{field.required && ' *'}</label>
                <Input
                  value={(form as any)[field.key]}
                  onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl text-sm"
                />
              </div>
            ))}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-white/40 uppercase">種別</label>
              <select
                value={form.type}
                onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#6366f1]/50"
              >
                <option value="employee" className="bg-[#06060b]">正社員</option>
                <option value="pj" className="bg-[#06060b]">PJ（業務委託）</option>
                <option value="foreigner" className="bg-[#06060b]">外国人労働者</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleAdd} className="bg-[#6366f1] hover:bg-[#5558e0] text-white font-black rounded-xl">登録する</Button>
            <Button variant="ghost" onClick={() => setIsAdding(false)} className="text-white/40 hover:text-white rounded-xl">キャンセル</Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-white/20 font-bold">メンバーがいません</div>
        ) : filtered.map(member => (
          <div key={member.id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg" style={{ background: `${TYPE_COLORS[member.type] || '#6366f1'}20`, color: TYPE_COLORS[member.type] || '#6366f1' }}>
              {member.type === 'foreigner' ? <Globe className="w-5 h-5" /> : member.type === 'pj' ? <Briefcase className="w-5 h-5" /> : <User className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-[14px]">{member.name}</span>
                <Badge className="text-[9px] font-black px-2" style={{ background: `${TYPE_COLORS[member.type]}20`, color: TYPE_COLORS[member.type], border: `1px solid ${TYPE_COLORS[member.type]}40` }}>
                  {TYPE_LABELS[member.type]}
                </Badge>
                {member.visaExpiry && new Date(member.visaExpiry) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
                  <Badge className="text-[9px] font-black px-2 bg-red-500/20 text-red-400 border-red-500/30">ビザ期限注意</Badge>
                )}
              </div>
              <div className="text-[11px] text-white/40 font-bold mt-0.5">{member.role}{member.nationality ? ` — ${member.nationality}` : ''}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[member.status] || '#22c55e' }} />
              <span className="text-[11px] font-bold text-white/40">{STATUS_LABELS[member.status]}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
