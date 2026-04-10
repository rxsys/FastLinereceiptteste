'use client';

import { useState, useEffect } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue, set } from 'firebase/database';
import { Save, Bell, Link } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface Props { ownerId: string; }

export function MemberSettingsTab({ ownerId }: Props) {
  const database = useDatabase();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    lineNotifications: true,
    autoLaborCost: true,
    documentAlertDays: 30,
    lineGroupId: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!ownerId || !database) return;
    const r = ref(database, `owner/${ownerId}/memberSettings`);
    return onValue(r, snap => {
      if (snap.val()) setSettings(prev => ({ ...prev, ...snap.val() }));
    });
  }, [ownerId, database]);

  const handleSave = async () => {
    if (!database) return;
    setIsSaving(true);
    try {
      await set(ref(database, `owner/${ownerId}/memberSettings`), settings);
      toast({ title: '設定を保存しました' });
    } catch {
      toast({ title: 'エラー', description: '保存に失敗しました', variant: 'destructive' });
    } finally { setIsSaving(false); }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-xl font-black text-white">設定</h2>
        <p className="text-white/40 text-[12px] mt-0.5">メンバー管理モジュールの設定</p>
      </div>

      <div className="space-y-4">
        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5">
          <h3 className="font-black text-white/70 text-[11px] uppercase tracking-widest flex items-center gap-2">
            <Bell className="w-4 h-4" />通知設定
          </h3>
          {[
            { key: 'lineNotifications', label: 'LINE通知を有効化', desc: '勤怠チェックイン/アウト時にLINEで通知' },
            { key: 'autoLaborCost', label: 'コスト管理と自動連携', desc: '勤怠データをコスト管理に自動反映（種別: 労務費）' },
          ].map(item => (
            <div key={item.key} className="flex items-center justify-between gap-4">
              <div>
                <div className="text-[13px] font-black text-white">{item.label}</div>
                <div className="text-[11px] text-white/30 mt-0.5">{item.desc}</div>
              </div>
              <button
                onClick={() => setSettings(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                className={`w-12 h-6 rounded-full transition-all relative ${(settings as any)[item.key] ? 'bg-[#6366f1]' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${(settings as any)[item.key] ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-6 rounded-2xl bg-white/5 border border-white/10 space-y-5">
          <h3 className="font-black text-white/70 text-[11px] uppercase tracking-widest flex items-center gap-2">
            <Link className="w-4 h-4" />連携設定
          </h3>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase">書類アラート日数</label>
            <Input
              type="number"
              value={settings.documentAlertDays}
              onChange={e => setSettings(prev => ({ ...prev, documentAlertDays: Number(e.target.value) }))}
              className="bg-white/5 border-white/10 text-white rounded-xl w-32"
            />
            <p className="text-[10px] text-white/20">期限の何日前にアラートを表示するか</p>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/40 uppercase">LINE グループID</label>
            <Input
              value={settings.lineGroupId}
              onChange={e => setSettings(prev => ({ ...prev, lineGroupId: e.target.value }))}
              placeholder="C1234567890..."
              className="bg-white/5 border-white/10 text-white placeholder:text-white/20 rounded-xl"
            />
            <p className="text-[10px] text-white/20">勤怠通知を送信するLINEグループID</p>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={isSaving} className="bg-[#6366f1] hover:bg-[#5558e0] text-white font-black rounded-xl shadow-[0_0_12px_rgba(99,102,241,0.3)]">
        <Save className="w-4 h-4 mr-2" />{isSaving ? '保存中...' : '設定を保存'}
      </Button>
    </div>
  );
}
