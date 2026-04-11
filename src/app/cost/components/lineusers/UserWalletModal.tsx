'use client';

import { useState, useEffect } from 'react';
import { useDatabase, useStorage } from '@/firebase';
import { ref, push, set, get, onValue, update, remove } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { notifyWalletCredit } from '@/app/actions/line-notify';
import { auditAction } from '@/app/actions/audit';
import { useUser } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { CloudUpload, X, Loader2, Receipt, TrendingUp, TrendingDown, Wallet, Edit2, Trash2, Eye, CheckCircle2, PenTool, Printer, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { ReceiptLayout, statusMeta, type ReceiptStatus } from '@/components/receipt-layout';

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
  const { user: authUser } = useUser();

  const [expenses, setExpenses] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Sub-form state
  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDesc, setCreditDesc] = useState('');
  const [creditFile, setCreditFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingAdv, setEditingAdv] = useState<any | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !database || !ownerId) return;
    get(ref(database, `owner/${ownerId}/name`)).then(s => setOwnerName(s.val() || '')).catch(() => {});
    get(ref(database, `owner_data/${ownerId}/projects`)).then(s => {
      if (!s.exists()) return;
      const list: any[] = [];
      s.forEach(child => list.push({ id: child.key, ...child.val() }));
      setProjects(list);
    }).catch(() => {});
  }, [isOpen, database, ownerId]);

  useEffect(() => {
    if (!isOpen || !database || !ownerId || !user?.id) return;

    // Reset components to avoid showing old data
    setExpenses([]);
    setAdvances([]);
    setLoading(true);

    const advRef = ref(database, `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances`);
    const expRef = ref(database, `owner_data/${ownerId}/expenses`);

    // Listener para Créditos (Recebimentos)
    const unsubAdv = onValue(advRef, (snap) => {
      const list: any[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key, ...child.val() });
      });
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      setAdvances(list);
    });

    // Listener para Débitos (Despesas)
    const unsubExp = onValue(expRef, (snap) => {
      const list: any[] = [];
      snap.forEach((child) => {
        const val = child.val();
        if (val.userId === user.id || (user.lineUserId && val.userId === user.lineUserId)) {
          list.push({ id: child.key, ...val });
        }
      });
      list.sort((a, b) => (b.date || b.createdAt || '').localeCompare(a.date || a.createdAt || ''));
      setExpenses(list);
      setLoading(false);
    });

    return () => {
      unsubAdv();
      unsubExp();
    };
  }, [isOpen, database, ownerId, user?.id, user?.lineUserId]);

  const totalAdvances = advances.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const totalExpenses = expenses.reduce((s, e) => {
    if (e.reviewStatus === 'approved') return s + (Number(e.amount) || 0);
    return s;
  }, 0);
  const balance = totalAdvances - totalExpenses;

  const balanceLabel = balance > 0
    ? { text: '🔵 残高あり', cls: 'bg-blue-100 text-blue-700 border-blue-200' }
    : balance < 0
    ? { text: '🔴 要精算', cls: 'bg-red-100 text-red-700 border-red-200' }
    : { text: '✅ 精算済み', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' };

  const uploadEvidence = async (): Promise<string | undefined> => {
    if (!creditFile || !storage) return undefined;
    try {
      const path = `owners/${ownerId}/wallet/${user.id}/${Date.now()}_${creditFile.name}`;
      const sRef = storageRef(storage, path);
      const snap = await uploadBytes(sRef, creditFile);
      return await getDownloadURL(snap.ref);
    } catch (uploadErr) {
      console.warn('[WalletCredit] upload failed:', uploadErr);
      return undefined;
    }
  };

  const resetCreditForm = () => {
    setCreditAmount('');
    setCreditDesc('');
    setCreditFile(null);
    setShowCreditForm(false);
  };

  // Botão A — 手書き領収書で登録 (manual, no LINE)
  const handleSaveManual = async () => {
    if (!database || !ownerId || !user?.id || !creditAmount) return;
    setSaving(true);
    try {
      const imageUrl = await uploadEvidence();
      const advRef = push(ref(database, `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances`));
      const receiptId = advRef.key;
      const manualPayload = { amount: Number(creditAmount), description: creditDesc, ...(imageUrl ? { imageUrl } : {}), createdAt: new Date().toISOString(), signed: true, status: 'manual' };
      await set(advRef, manualPayload);
      auditAction({ ownerId, actor: { type: 'user', id: authUser?.uid || 'unknown', name: authUser?.displayName || authUser?.email || 'manager', role: 'manager' }, action: 'create', entity: { type: 'advance', id: receiptId || '', path: `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances/${receiptId}`, label: `¥${Number(creditAmount).toLocaleString()} ${creditDesc} (手書き)` }, after: manualPayload, source: 'dashboard' }).catch(() => {});
      resetCreditForm();
      toast({
        title: '手書き領収書を登録しました',
        description: '印刷ボタンから印刷できます',
        action: receiptId ? (
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl font-black text-[10px]"
            onClick={() => window.open(`/print/${ownerId}_${user.id}_${receiptId}`, '_blank')}
          >
            <Printer className="w-3 h-3 mr-1" /> 印刷
          </Button>
        ) : undefined,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: 'エラー', description: String(e) });
    } finally {
      setSaving(false);
    }
  };

  // Botão B — LINEで署名依頼 (current flow)
  const handleSaveWithLine = async () => {
    if (!database || !ownerId || !user?.id || !creditAmount) return;
    setSaving(true);
    try {
      const imageUrl = await uploadEvidence();
      const advRef = push(ref(database, `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances`));
      const receiptId = advRef.key;
      const createdAt = new Date().toISOString();
      const linePayload = { amount: Number(creditAmount), description: creditDesc, ...(imageUrl ? { imageUrl } : {}), createdAt, signed: false, status: 'pending_signature' };
      await set(advRef, linePayload);
      auditAction({ ownerId, actor: { type: 'user', id: authUser?.uid || 'unknown', name: authUser?.displayName || authUser?.email || 'manager', role: 'manager' }, action: 'create', entity: { type: 'advance', id: receiptId || '', path: `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances/${receiptId}`, label: `¥${Number(creditAmount).toLocaleString()} ${creditDesc} (LINE署名)` }, after: linePayload, source: 'dashboard' }).catch(() => {});

      const lineId = (user.lineUserId?.startsWith('U') ? user.lineUserId : null) ||
                     (user.id?.startsWith('U') ? user.id : null) ||
                     user.lineUserId ||
                     user.id;

      if (lineId && receiptId) {
        const token = `${ownerId}_${user.id}_${receiptId}`;
        let signUrl = `${window.location.origin}/sign/${token}`;
        try {
          const ownerSnap = await get(ref(database!, `owner/${ownerId}`));
          const liffSignId = ownerSnap.val()?.liffSignId;
          if (liffSignId) signUrl = `https://liff.line.me/${liffSignId}/${token}`;
        } catch {}
        const userName = user.name || user.fullName || user.displayName || '';
        const result = await notifyWalletCredit(ownerId, lineId, Number(creditAmount), creditDesc, signUrl, { userName, createdAt });
        resetCreditForm();
        if (!result.success) {
          toast({ variant: 'destructive', title: 'クレジット追加OK / LINE通知NG', description: `ERRO: ${result.error || '通信エラー'}` });
        } else {
          toast({ title: 'クレジットを追加いたしました', description: 'LINE通知を送信しました' });
        }
      } else {
        resetCreditForm();
        toast({ variant: 'destructive', title: 'クレジット追加OK / LINE通知NG', description: 'LINE IDが見つかりません' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'エラー', description: String(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateAdv = async () => {
    if (!database || !ownerId || !user?.id || !editingAdv) return;
    setSaving(true);
    try {
      const advRef = ref(database, `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances/${editingAdv.id}`);
      const { id, viewOnly, ...beforeData } = editingAdv;
      const updatedAt = new Date().toISOString();
      await update(advRef, { amount: Number(editingAdv.amount), description: editingAdv.description, updatedAt });
      auditAction({ ownerId, actor: { type: 'user', id: authUser?.uid || 'unknown', name: authUser?.displayName || authUser?.email || 'manager', role: 'manager' }, action: 'update', entity: { type: 'advance', id: editingAdv.id, path: `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances/${editingAdv.id}`, label: `¥${Number(editingAdv.amount).toLocaleString()} ${editingAdv.description}` }, before: beforeData, after: { ...beforeData, amount: Number(editingAdv.amount), description: editingAdv.description, updatedAt }, source: 'dashboard' }).catch(() => {});
      setEditingAdv(null);
      toast({ title: '更新いたしました' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'エラー', description: String(e) });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAdv = async (advId: string) => {
    if (!database || !ownerId || !user?.id) return;
    try {
      const advRef = ref(database, `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances/${advId}`);
      const snap = advances.find(a => a.id === advId);
      await remove(advRef);
      if (snap) auditAction({ ownerId, actor: { type: 'user', id: authUser?.uid || 'unknown', name: authUser?.displayName || authUser?.email || 'manager', role: 'manager' }, action: 'delete', entity: { type: 'advance', id: advId, path: `owner_data/${ownerId}/lineUsers/${user.id}/wallet/advances/${advId}`, label: `¥${Number(snap.amount).toLocaleString()} ${snap.description}` }, before: snap, source: 'dashboard' }).catch(() => {});
      setShowDeleteConfirm(null);
      toast({ title: '削除いたしました' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'エラー', description: String(e) });
    }
  };

  const fmtDate = (s: string) => {
    if (!s) return '---';
    try { return new Date(s).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }); } catch { return s; }
  };

  if (!user) return null;

  return (
    <>
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
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleSaveManual} disabled={saving || !creditAmount}
                    className="h-10 rounded-xl font-black text-[11px] bg-slate-100 hover:bg-white text-slate-900 shadow-lg gap-1.5">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Printer className="w-3.5 h-3.5" />手書き領収書で登録</>}
                  </Button>
                  <Button onClick={handleSaveWithLine} disabled={saving || !creditAmount}
                    className="h-10 rounded-xl font-black text-[11px] bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 gap-1.5">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><FileSignature className="w-3.5 h-3.5" />LINEで署名依頼</>}
                  </Button>
                </div>
                <Button variant="ghost" onClick={() => setShowCreditForm(false)}
                  className="w-full h-8 rounded-xl font-black text-[10px] text-slate-400 hover:text-white">
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
                      {expenses.map(exp => {
                        // Resolve project + costcenter from fetched projects
                        const allCcs = projects.flatMap(p =>
                          p.costcenters
                            ? Object.entries(p.costcenters).map(([id, d]: [string, any]) => ({ id, projectId: p.id, projectName: p.name, ...d }))
                            : []
                        );
                        const cc = allCcs.find(c => c.id === exp.costcenterId);
                        const proj = projects.find(p => p.id === (exp.projectId || cc?.projectId));
                        const projectName = proj?.name || null;
                        const ccName = exp.costcenterName || cc?.name || null;
                        const isApproved = exp.reviewStatus === 'approved';
                        const isRejected = exp.reviewStatus === 'rejected';
                        const isReviewing = !exp.reviewStatus || exp.reviewStatus === 'reviewing';

                        return (
                        <button
                          key={exp.id}
                          onClick={() => onOpenExpense?.(exp)}
                          className={cn(
                            "w-full text-left flex items-center justify-between gap-2 p-3 rounded-2xl transition-colors group border border-transparent hover:border-slate-100",
                            isApproved ? "hover:bg-slate-50" : 
                            isRejected ? "bg-red-50/50 hover:bg-red-50 text-red-900" :
                            "bg-amber-50/50 hover:bg-amber-50 text-amber-900"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                               <p className="text-[9px] font-bold text-slate-400">{fmtDate(exp.date || exp.createdAt)}</p>
                               {isReviewing && <Badge variant="outline" className="text-[8px] font-black border-amber-200 text-amber-600 bg-amber-50 uppercase tracking-tighter">審査中</Badge>}
                               {isRejected && <Badge variant="outline" className="text-[8px] font-black border-red-200 text-red-600 bg-red-50 uppercase tracking-tighter">否認</Badge>}
                               {isApproved && <Badge variant="outline" className="text-[8px] font-black border-emerald-200 text-emerald-600 bg-emerald-50 uppercase tracking-tighter">受取済み</Badge>}
                            </div>
                            <p className="text-xs font-black truncate">{exp.description || '---'}</p>
                            {(projectName || ccName) && (
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                {projectName && (
                                  <span className={cn(
                                    "text-[8px] font-black border px-1.5 py-0.5 rounded-full truncate max-w-[80px]",
                                    isApproved ? "bg-indigo-50 text-indigo-500 border-indigo-100" : "bg-white/50 border-transparent opacity-70"
                                  )}>
                                    {projectName}
                                  </span>
                                )}
                                {ccName && (
                                  <span className={cn(
                                    "text-[8px] font-black border px-1.5 py-0.5 rounded-full truncate max-w-[80px]",
                                    isApproved ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-white/50 border-transparent opacity-70"
                                  )}>
                                    {ccName}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={cn("text-sm font-black", isApproved ? "text-red-500" : isRejected ? "text-red-400 line-through" : "text-amber-500")}>
                               ¥{Number(exp.amount || 0).toLocaleString()}
                            </span>
                            <Receipt className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                          </div>
                        </button>
                        );
                      })}
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
                      {advances.map(adv => {
                        const status: ReceiptStatus =
                          adv.status || (adv.signed ? 'signed' : 'pending_signature');
                        const meta = statusMeta[status];
                        return (
                        <div key={adv.id}
                          className="group relative flex items-center justify-between gap-2 p-3 rounded-2xl border border-blue-50 bg-blue-50/30 hover:bg-blue-50 transition-all">
                          <div className="min-w-0 cursor-pointer flex-1" onClick={() => setEditingAdv({ ...adv, viewOnly: true })}>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[9px] font-bold text-slate-400">{fmtDate(adv.createdAt)}</p>
                              <span className={cn('text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wider', meta.cls)}>
                                {meta.label}
                              </span>
                            </div>
                            <p className="text-xs font-black text-slate-700 truncate">{adv.description || '---'}</p>
                          </div>

                          {/* Actions on hover */}
                          <div className="absolute inset-y-0 right-0 flex items-center px-4 gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-blue-50 via-blue-50/95 to-transparent rounded-r-2xl">
                             <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-white text-blue-500 shadow-sm" onClick={() => setEditingAdv({ ...adv, viewOnly: true })}>
                               <Eye className="w-3.5 h-3.5" />
                             </Button>
                             {status === 'manual' && (
                               <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-white text-slate-700 shadow-sm" title="印刷"
                                 onClick={() => window.open(`/print/${ownerId}_${user.id}_${adv.id}`, '_blank')}>
                                 <Printer className="w-3.5 h-3.5" />
                               </Button>
                             )}
                             <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-white text-slate-600 shadow-sm" onClick={() => setEditingAdv(adv)}>
                               <Edit2 className="w-3.5 h-3.5" />
                             </Button>
                             <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-red-50 text-red-500 shadow-sm" onClick={() => setShowDeleteConfirm(adv.id)}>
                               <Trash2 className="w-3.5 h-3.5" />
                             </Button>
                          </div>

                           <div className="flex items-center gap-1.5 shrink-0" onClick={() => setEditingAdv({ ...adv, viewOnly: true })}>
                              <span className="text-sm font-black text-blue-600">¥{Number(adv.amount || 0).toLocaleString()}</span>
                              {status === 'signed' && (
                                 <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center" title="署名済み">
                                   <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                 </div>
                              )}
                            </div>
                        </div>
                      );
                      })}
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

      {/* Edit/View Advance Dialog */}
      <Dialog open={!!editingAdv} onOpenChange={(open) => !open && setEditingAdv(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-2xl max-h-[92vh] overflow-hidden p-0 bg-white border-none shadow-2xl flex flex-col">
          <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between shrink-0">
            <h3 className="font-black tracking-tight text-sm">{editingAdv?.viewOnly ? '領収書の確認' : '受取情報の編集'}</h3>
            <div className="flex items-center gap-2">
              {editingAdv?.viewOnly && (editingAdv?.status === 'manual' || editingAdv?.status === 'signed') && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl h-9 px-3 font-black text-[10px] bg-white/10 border-white/20 text-white hover:bg-white/20 gap-1.5"
                  onClick={() => window.open(`/print/${ownerId}_${user.id}_${editingAdv.id}`, '_blank')}
                >
                  <Printer className="w-3.5 h-3.5" /> 印刷
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setEditingAdv(null)} className="text-white/50 hover:text-white rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
            {editingAdv?.viewOnly ? (
              <ReceiptLayout
                ownerName={ownerName}
                userName={user?.name || user?.fullName || user?.displayName || ''}
                amount={Number(editingAdv?.amount || 0)}
                description={editingAdv?.description}
                createdAt={editingAdv?.createdAt}
                status={(editingAdv?.status as ReceiptStatus) || (editingAdv?.signed ? 'signed' : 'pending_signature')}
                signatureUrl={editingAdv?.signatureUrl}
                signedAt={editingAdv?.signedAt}
                evidenceUrl={editingAdv?.imageUrl}
              />
            ) : (
              <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-100">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">金額</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">¥</span>
                    <Input
                      type="number"
                      value={editingAdv?.amount || ''}
                      onChange={e => setEditingAdv(p => ({ ...p, amount: e.target.value }))}
                      className="pl-8 h-12 rounded-2xl font-bold bg-slate-50 border-transparent focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-tight">摘要</Label>
                  <Input
                    value={editingAdv?.description || ''}
                    onChange={e => setEditingAdv(p => ({ ...p, description: e.target.value }))}
                    className="h-12 rounded-2xl font-bold bg-slate-50 border-transparent focus:bg-white transition-all shadow-sm"
                  />
                </div>
                <Button onClick={handleUpdateAdv} disabled={saving}
                  className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-xl shadow-blue-200 transition-all">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '更新を保存する'}
                </Button>
              </div>
            )}
          </div>

          {editingAdv?.viewOnly && (
            <div className="shrink-0 border-t border-slate-100 px-8 py-4 bg-white flex justify-end">
              <Button
                onClick={() => setEditingAdv(p => ({ ...p, viewOnly: false }))}
                variant="outline"
                className="rounded-2xl font-black text-xs border-slate-200 gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" /> 内容を編集する
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
        <DialogContent className="rounded-[2rem] max-w-xs p-8 text-center bg-white border-none shadow-2xl">
           <div className="w-16 h-16 bg-red-100 text-red-500 rounded-3xl mx-auto flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8" />
           </div>
           <h4 className="font-black text-slate-900 text-lg mb-2">削除しますか？</h4>
           <p className="text-xs text-slate-400 font-bold leading-relaxed mb-6">この受取記録を削除すると、ユーザーの残高が再計算されます。元に戻すことはできません。</p>
           <div className="space-y-2">
              <Button onClick={() => handleDeleteAdv(showDeleteConfirm!)} variant="destructive" className="w-full h-12 rounded-2xl font-black text-xs bg-red-500 hover:bg-red-600">
                 はい、削除します
              </Button>
              <Button onClick={() => setShowDeleteConfirm(null)} variant="ghost" className="w-full h-12 rounded-2xl font-black text-xs text-slate-400">
                 キャンセル
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
