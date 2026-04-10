'use client';

import { useState, useEffect } from 'react';
import { useDatabase, useStorage } from '@/firebase';
import { ref, push, set, get, onValue } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { notifyWalletCredit } from '@/app/actions/line-notify';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CloudUpload, X, Loader2, Receipt, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface UserWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  ownerId: string;
  onOpenExpense?: (expense: any) => void;
}

export function UserWalletModal({ isOpen, onClose, user, ownerId, onOpenExpense }: UserWalletModalProps) {
  const database = useDatabase();
  const storage = useStorage();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Sub-form state
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDesc, setCreditDesc] = useState('');
  const [creditFile, setCreditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !database || !ownerId || !user?.id) return;
    const advRef = ref(database, `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances`);
    const expRef = ref(database, `owner_data/${ownerId}/expenses`);

    const unsubAdv = onValue(advRef, (snap: any) => {
      const advList: any[] = [];
      snap.forEach((c: any) => advList.push({ id: c.key, ...c.val() }));
      advList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setAdvances(advList);
    });

    const unsubExp = onValue(expRef, (snap: any) => {
      const expList: any[] = [];
      snap.forEach((c: any) => {
        const e = c.val();
        if (e.userId === user.id || (user.lineUserId && e.userId === user.lineUserId)) {
          expList.push({ id: c.key, ...e });
        }
      });
      expList.sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
      setExpenses(expList);
      setLoading(false);
    });

    return () => { unsubAdv(); unsubExp(); };
  }, [isOpen, database, ownerId, user?.id, user?.lineUserId]);

  const totalAdvances = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const balance = totalAdvances - totalExpenses;

  const balanceLabel = balance > 0
    ? { text: '🔵 残高あり', cls: 'bg-blue-100 text-blue-700 border-blue-200' }
    : balance < 0
    ? { text: '🔴 要精算', cls: 'bg-red-100 text-red-700 border-red-200' }
    : { text: '✅ 精算済み', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };

  const handleSaveCredit = async () => {
    if (!database || !ownerId || !user?.id || !creditAmount) return;
    setSaving(true);
    try {
      let imageUrl: string | undefined;
      if (creditFile && storage) {
        try {
          const path = `owners/${ownerId}/wallet/${user.id}/${Date.now()}_${creditFile.name}`;
          const sRef = storageRef(storage, path);
          const snap = await uploadBytes(sRef, creditFile);
          imageUrl = await getDownloadURL(snap.ref);
        } catch (uploadErr) {
          console.warn('[WalletCredit] upload failed, saving without image:', uploadErr);
        }
      }

      const advRef = push(ref(database, `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances`));
      await set(advRef, {
        amount: Number(creditAmount),
        description: creditDesc,
        ...(imageUrl ? { imageUrl } : {}),
        createdAt: new Date().toISOString()
      });

      // Refresh advances
      const advSnap = await get(ref(database, `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances`));
      const advList: any[] = [];
      advSnap.forEach((c: any) => advList.push({ id: c.key, ...c.val() }));
      advList.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setAdvances(advList);

      // LINE push notification
      const lineId = user.lineUserId || user.id;
      if (lineId) {
        notifyWalletCredit(ownerId, lineId, Number(creditAmount), creditDesc).catch(() => {});
      }

      setCreditAmount('');
      setCreditDesc('');
      setCreditFile(null);
      setShowCreditForm(false);
      toast({ title: 'クレジットを追加いたしました' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'エラー', description: String(e) });
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (s: string) => {
    if (!s) return '---';
    try { return new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }); } catch { return s; }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-[2.5rem] max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        {/* Header */}
        <div className="bg-slate-900 text-white px-8 py-6 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="w-14 h-14 border-2 border-white/20">
                <AvatarImage src={user.photo} />
                <AvatarFallback className="bg-slate-700 text-white font-black text-xl">
                  {(user.name || user.fullName || '?').slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogHeader>
                  <DialogTitle className="text-white font-black text-xl tracking-tight">
                    {user.name || user.fullName || 'ユーザー'}
                  </DialogTitle>
                </DialogHeader>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight">残高</span>
                    <span className={cn(
                      'text-lg font-black',
                      balance > 0 ? 'text-blue-300' : balance < 0 ? 'text-red-300' : 'text-emerald-300'
                    )}>
                      ¥{Math.abs(balance).toLocaleString()}
                    </span>
                  </div>
                  <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full border', balanceLabel.cls)}>
                    {balanceLabel.text}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreditForm(v => !v)}
                className="rounded-xl font-black text-xs gap-1.5 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                + クレジット追加
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="rounded-full text-white/50 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Credit sub-form */}
          {showCreditForm && (
            <div className="mt-4 bg-white/10 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
              <p className="text-[10px] font-black text-slate-300 uppercase tracking-tight">新規クレジット追加</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-slate-400 uppercase">金額</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">¥</span>
                    <Input
                      type="number"
                      value={creditAmount}
                      onChange={e => setCreditAmount(e.target.value)}
                      className="pl-7 h-10 rounded-xl bg-white/10 border-white/20 text-white font-bold placeholder:text-slate-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black text-slate-400 uppercase">摘要</Label>
                  <Input
                    value={creditDesc}
                    onChange={e => setCreditDesc(e.target.value)}
                    className="h-10 rounded-xl bg-white/10 border-white/20 text-white font-bold placeholder:text-slate-500"
                    placeholder="立替金など"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black text-slate-400 uppercase">証憑ファイル (任意)</Label>
                <label className="flex items-center gap-2 cursor-pointer bg-white/5 border border-white/20 border-dashed rounded-xl px-4 py-2.5 hover:bg-white/10 transition-colors">
                  <CloudUpload className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] font-bold text-slate-400">
                    {creditFile ? creditFile.name : 'ファイルを選択...'}
                  </span>
                  <input type="file" className="hidden" accept="image/*,application/pdf"
                    onChange={e => setCreditFile(e.target.files?.[0] || null)} />
                  {creditFile && (
                    <button onClick={(e) => { e.preventDefault(); setCreditFile(null); }} className="ml-auto">
                      <X className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                    </button>
                  )}
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={handleSaveCredit} disabled={saving || !creditAmount}
                  className="flex-1 h-9 rounded-xl font-black text-xs bg-emerald-500 hover:bg-emerald-600 text-white">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '保存する'}
                </Button>
                <Button variant="ghost" onClick={() => setShowCreditForm(false)}
                  className="h-9 rounded-xl font-black text-xs text-slate-400 hover:text-white">
                  キャンセル
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-0 divide-x divide-slate-100 h-full">
                {/* Left: Expenses */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingDown className="w-4 h-4 text-red-400" />
                    <h3 className="font-black text-sm text-slate-700 uppercase tracking-tight">支出一覧</h3>
                    <span className="text-[9px] font-black bg-red-50 text-red-400 px-2 py-0.5 rounded-full border border-red-100">
                      {expenses.length}件
                    </span>
                  </div>
                  {expenses.length === 0 ? (
                    <p className="text-[11px] text-slate-300 font-bold italic text-center py-8">支出なし</p>
                  ) : (
                    <div className="space-y-2">
                      {expenses.map(exp => (
                        <button
                          key={exp.id}
                          onClick={() => onOpenExpense?.(exp)}
                          className="w-full text-left flex items-center justify-between gap-2 p-3 rounded-2xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100"
                        >
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-slate-400">{fmtDate(exp.date || exp.createdAt)}</p>
                            <p className="text-xs font-black text-slate-700 truncate">{exp.description || '---'}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-sm font-black text-red-500">¥{Number(exp.amount || 0).toLocaleString()}</span>
                            <Receipt className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right: Advances */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-blue-400" />
                    <h3 className="font-black text-sm text-slate-700 uppercase tracking-tight">受取一覧</h3>
                    <span className="text-[9px] font-black bg-blue-50 text-blue-400 px-2 py-0.5 rounded-full border border-blue-100">
                      {advances.length}件
                    </span>
                  </div>
                  {advances.length === 0 ? (
                    <p className="text-[11px] text-slate-300 font-bold italic text-center py-8">受取なし</p>
                  ) : (
                    <div className="space-y-2">
                      {advances.map(adv => (
                        <div key={adv.id}
                          className="flex items-center justify-between gap-2 p-3 rounded-2xl border border-blue-50 bg-blue-50/30">
                          <div className="min-w-0">
                            <p className="text-[9px] font-bold text-slate-400">{fmtDate(adv.createdAt)}</p>
                            <p className="text-xs font-black text-slate-700 truncate">{adv.description || '---'}</p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-sm font-black text-blue-600">¥{Number(adv.amount || 0).toLocaleString()}</span>
                            {adv.imageUrl && (
                              <a href={adv.imageUrl} target="_blank" rel="noopener noreferrer"
                                className="text-blue-400 hover:text-blue-600 transition-colors" title="証憑を開く">
                                🖼️
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-slate-100 px-8 py-5 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">支出合計</span>
                    <span className="text-sm font-black text-red-500">¥{totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="text-slate-100 font-black">|</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">受取合計</span>
                    <span className="text-sm font-black text-blue-600">¥{totalAdvances.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">差引残高</span>
                    <span className={cn(
                      'text-lg font-black',
                      balance > 0 ? 'text-blue-600' : balance < 0 ? 'text-red-500' : 'text-emerald-600'
                    )}>
                      {balance < 0 ? '-' : ''}¥{Math.abs(balance).toLocaleString()}
                    </span>
                  </div>
                  <Button 
                    onClick={onClose}
                    className="rounded-2xl h-11 px-8 font-black bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    閉じる
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
