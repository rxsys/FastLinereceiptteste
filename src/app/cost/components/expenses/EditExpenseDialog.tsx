'use client';

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Clock, Calendar, Building2, MapPin, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Expense, CostCenter, CATEGORY_MAP } from '@/types';
import { notifyReviewStatus } from '@/app/actions/line-notify';
import { cn } from '@/lib/utils';
import { useDatabase } from '@/firebase';
import { ref, get, set } from 'firebase/database';

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

const REVIEW_STATUSES = [
  { val: 'reviewing', label: '🔍 審査中',   cls: 'border-amber-300 bg-amber-50 text-amber-800' },
  { val: 'approved',  label: '✅ 受取済み', cls: 'border-emerald-300 bg-emerald-50 text-emerald-800' },
  { val: 'rejected',  label: '❌ 否認',     cls: 'border-red-300 bg-red-50 text-red-800' },
] as const;

interface EditExpenseDialogProps {
  expense: Expense | null;
  costCenters: CostCenter[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Expense) => void;
  onUpdateState: (updated: Expense) => void;
  onDelete?: (expense: Expense) => void;
  ownerId?: string;
  t: any;
}

export const EditExpenseDialog = ({
  expense,
  costCenters,
  isOpen,
  onClose,
  onSave,
  onUpdateState,
  onDelete,
  ownerId,
  t
}: EditExpenseDialogProps) => {
  const prevReviewStatus = useRef<string | undefined>(undefined);
  const [rejectReason, setRejectReason] = React.useState('');
  const [requireResubmission, setRequireResubmission] = React.useState(false);
  const [savedReasons, setSavedReasons] = React.useState<string[]>([]);
  const database = useDatabase();

  React.useEffect(() => {
    if (ownerId && database && isOpen) {
      get(ref(database, `owner_data/${ownerId}/settings/rejectionReasons`)).then((snap) => {
        if (snap.exists()) {
          const list = snap.val();
          setSavedReasons(Array.isArray(list) ? list : Object.values(list));
        } else {
          const defaults = [
            '領収書の画像が不鮮明で読み取れません。再度撮影をお願いします。',
            '日付が確認できません。',
            '金額が確認できません。',
            '会社規定外の支出と判断されました。'
          ];
          setSavedReasons(defaults);
        }
      }).catch(() => {});
    }
  }, [ownerId, database, isOpen]);

  React.useEffect(() => {
    if (expense) {
      prevReviewStatus.current = (expense as any).reviewStatus || 'reviewing';
      setRejectReason((expense as any).rejectReason || '');
      setRequireResubmission((expense as any).requireResubmission || false);
    }
  }, [expense?.id]);

  if (!expense) return null;

  const currentReviewStatus = (expense as any).reviewStatus || 'reviewing';

  const handleSave = () => {
    const newStatus = currentReviewStatus as 'reviewing' | 'approved' | 'rejected';
    const changed = prevReviewStatus.current !== newStatus || newStatus === 'rejected'; // Always update if rejected (might have changed reason)
    const lineUserId = (expense as any).userId;
    
    const updatedExpense = { 
      ...expense, 
      rejectReason: newStatus === 'rejected' ? rejectReason : undefined,
      requireResubmission: newStatus === 'rejected' ? requireResubmission : undefined
    } as any;

    if (changed && ownerId && lineUserId) {
      const cc = costCenters.find(c => c.id === expense.costcenterId);
      const projectName = (expense as any).projectName || cc?.projectId || '—'; // Fallback to projectId if name is not available
      notifyReviewStatus(
        ownerId, 
        lineUserId, 
        newStatus, 
        expense.description || '', 
        Number(expense.amount),
        expense.date,
        projectName,
        expense.costcenterName || cc?.name || '—',
        newStatus === 'rejected' ? rejectReason : undefined,
        newStatus === 'rejected' ? requireResubmission : undefined
      ).catch(() => {});

      if (database && newStatus === 'rejected' && rejectReason && !savedReasons.includes(rejectReason)) {
        const updatedReasons = [rejectReason, ...savedReasons].slice(0, 15);
        set(ref(database, `owner_data/${ownerId}/settings/rejectionReasons`), updatedReasons).catch(() => {});
      }
    }
    onSave(updatedExpense);
  };

  const handleQuickStatus = (newStatus: 'reviewing' | 'approved' | 'rejected') => {
    if (newStatus === 'rejected') {
      // Just change local status to show the reject fields, don't auto-save
      onUpdateState({ ...expense, reviewStatus: newStatus } as any);
      return;
    }

    const updatedExpense = { ...expense, reviewStatus: newStatus } as any;
    const changed = prevReviewStatus.current !== newStatus;
    const lineUserId = (expense as any).userId;
    if (changed && ownerId && lineUserId) {
      const cc = costCenters.find(c => c.id === expense.costcenterId);
      const projectName = (expense as any).projectName || cc?.projectId || '—';
      notifyReviewStatus(
        ownerId, 
        lineUserId, 
        newStatus, 
        expense.description || '', 
        Number(expense.amount),
        expense.date,
        projectName,
        expense.costcenterName || cc?.name || '—'
      ).catch(() => {});
    }
    onSave(updatedExpense);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden max-w-6xl border-none shadow-2xl">
        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          {/* Imagem do Recibo (Esquerda) */}
          {(!expense.type || expense.type === 'expense' || expense.type === 'income') && (
            <div className="flex-1 bg-slate-900 flex flex-col min-h-[400px]">
              {/* Imagem */}
              <div className="flex-1 relative flex items-center justify-center p-4 min-h-0">
                {expense.imageUrl ? (
                  <img src={expense.imageUrl} alt="Receipt" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
                ) : (
                  <div className="text-slate-400 flex flex-col items-center gap-4">
                    <ShieldCheck className="w-16 h-16 opacity-20" />
                    <p className="font-bold text-sm">{t.tabs.expenses.noData}</p>
                  </div>
                )}
              </div>

              {/* ステータス — clique salva e fecha */}
              <div className="px-4 pb-5 space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">取引ステータス</p>
                <div className="grid grid-cols-3 gap-2">
                  {REVIEW_STATUSES.map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => handleQuickStatus(opt.val)}
                      className={cn(
                        'text-center py-3 px-2 rounded-xl border-2 transition-all text-xs font-black',
                        currentReviewStatus === opt.val
                          ? opt.cls
                          : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {currentReviewStatus === 'rejected' ? (
                  <div className="mt-4 p-4 rounded-xl bg-slate-800/50 border border-red-500/20 space-y-4 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-black text-red-400">否認の理由（ユーザーに通知されます）</Label>
                      {savedReasons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pb-1">
                          {savedReasons.map(r => (
                            <span 
                              key={r} 
                              onClick={() => setRejectReason(r)}
                              className="text-[10px] bg-slate-800 border-b border-slate-700 text-slate-400 px-2.5 py-1 rounded-md cursor-pointer hover:bg-slate-700 hover:text-white transition-colors truncate max-w-full"
                              title={r}
                            >
                              {r.length > 30 ? r.substring(0, 30) + '...' : r}
                            </span>
                          ))}
                        </div>
                      )}
                      <textarea
                        className="w-full h-20 rounded-xl bg-slate-900 border border-slate-700 text-sm font-medium text-slate-200 p-3 outline-none focus:border-red-500/50 resize-none transition-colors placeholder:text-slate-600"
                        placeholder="例：領収書が不鮮明なため、再提出をお願いします。"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="resubmit"
                        checked={requireResubmission}
                        onCheckedChange={(checked) => setRequireResubmission(!!checked)}
                        className="border-slate-500 data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500"
                      />
                      <label htmlFor="resubmit" className="text-sm font-bold text-slate-300 cursor-pointer">
                        レシートの再送信を要求する
                      </label>
                    </div>
                    <p className="text-[10px] text-red-300/70 leading-tight">
                      ※設定後、右下の「保存」ボタンをクリックしてください。
                    </p>
                  </div>
                ) : (
                  ownerId && (
                    <p className="text-[9px] text-slate-600 text-center leading-tight">
                      選択すると即時保存・通知されます
                    </p>
                  )
                )}
              </div>
            </div>

          )}

          {/* Dados para Edição (Direita) */}
          <div className="w-full md:w-[480px] bg-white p-8 md:p-10 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <DialogHeader><DialogTitle className="text-2xl font-black text-slate-900">{t.tabs.expenses.editTransactionTitle}</DialogTitle></DialogHeader>
              
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.tabs.expenses.colMerchant}</Label>
                  <Input 
                    value={expense.description || ''} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateState({...expense, description: e.target.value})} 
                    className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold" 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.tabs.expenses.colAmount} (¥)</Label>
                    <Input 
                      type="number" 
                      value={expense.amount || 0} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateState({...expense, amount: Number(e.target.value)})} 
                      className="h-12 rounded-xl bg-slate-50 border-slate-100 font-bold" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.tabs.expenses.colContentCategory}</Label>
                    <select 
                      className="w-full h-12 bg-slate-50 border border-slate-100 rounded-xl px-3 text-sm font-bold focus:outline-none" 
                      value={expense.category} 
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onUpdateState({...expense, category: e.target.value})}
                    >
                      {Object.entries(CATEGORY_MAP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>

                {/* Datas: compra vs envio */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3"/> 購入日 (レシート)</span>
                    <span className="text-sm font-black text-slate-700">{fmtDate(expense.date)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Clock className="w-3 h-3"/> 送信日時</span>
                    <span className="text-sm font-black text-slate-700">{fmtDateTime(expense.createdAt)}</span>
                  </div>
                </div>

                {/* NTA Status — selo grande */}
                {(expense as any).registrationNumber && (
                  <div className={`p-4 rounded-2xl border ${(expense as any).ntaStatus === 'verified' ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {(expense as any).ntaStatus === 'verified' ? (
                            <div className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-full text-xs font-black shadow-sm shadow-emerald-200">
                              <ShieldCheck className="w-4 h-4"/> 適格請求書発行事業者 — NTA認証済
                            </div>
                          ) : (expense as any).ntaStatus === 'not_found' ? (
                            <div className="flex items-center gap-1.5 bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-xs font-black">
                              <AlertCircle className="w-3.5 h-3.5"/> NTA未登録
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-black">
                              <AlertCircle className="w-3.5 h-3.5"/> 確認中
                            </div>
                          )}
                        </div>
                        {(expense as any).ntaData?.name && (
                          <div className="space-y-1 mt-2">
                            <p className="text-xs font-black text-emerald-800 flex items-center gap-1"><Building2 className="w-3 h-3"/>{(expense as any).ntaData.name}</p>
                            {(expense as any).ntaData?.address && <p className="text-[10px] text-emerald-600 flex items-center gap-1"><MapPin className="w-3 h-3"/>{(expense as any).ntaData.address}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-[9px] font-mono text-slate-400 mt-2">{(expense as any).registrationNumber} {(expense as any).ntaLastCheck ? `— 最終確認: ${fmtDate((expense as any).ntaLastCheck)}` : ''}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                    <span>登録番号 (T-Number)</span>
                    {(expense as any).registrationNumber && <Badge className="bg-blue-600 text-white border-none text-[8px] h-4">Qualified</Badge>}
                  </Label>
                  {(expense as any).registrationNumber ? (
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                      <Input
                        value={(expense as any).registrationNumber}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdateState({...expense, registrationNumber: e.target.value})}
                        className="h-12 pl-10 rounded-xl bg-blue-50/50 border-blue-100 font-mono font-bold text-blue-700"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <Input
                        disabled
                        value=""
                        placeholder="登録番号なし（インボイス未対応）"
                        className="h-12 pl-10 rounded-xl bg-slate-50 border-slate-100 font-mono text-slate-300 cursor-not-allowed"
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 leading-tight">{t.tabs.expenses.labelTNumberHint}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-500 uppercase tracking-widest">{t.tabs.expenses.labelCC}</Label>
                  <select
                    className="w-full h-12 border border-slate-100 rounded-xl px-3 text-sm font-bold bg-slate-50 focus:outline-none"
                    value={expense.costcenterId || ''}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onUpdateState({...expense, costcenterId: e.target.value})}
                  >
                    <option value="">{t.tabs.expenses.selectCC}</option>
                    {costCenters?.map(cc => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
                  </select>
                </div>



              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t mt-4">
                {onDelete && (
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      onDelete(expense);
                      onClose();
                    }} 
                    className="flex-1 h-14 border-red-100 text-red-500 hover:bg-red-50 hover:text-red-600 font-black rounded-xl"
                  >
                    {t.tabs.expenses.btnDelete}
                  </Button>
                )}
                <Button onClick={handleSave} className="flex-[2] h-14 bg-primary text-white font-black rounded-xl shadow-xl shadow-primary/20">
                  {t.tabs.expenses.btnSave}
                </Button>
              </DialogFooter>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
