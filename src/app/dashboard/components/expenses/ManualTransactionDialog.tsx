'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Wallet, ArrowUpCircle, ArrowDownCircle, CloudUpload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDatabase } from '@/firebase';
import { ref, push, set } from 'firebase/database';
import { useToast } from "@/hooks/use-toast";
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useStorage } from '@/firebase';

interface ManualTransactionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ownerId: string;
  costCenters: any[];
  preselectedCc?: { id: string; name: string; projectId: string } | null;
  t: any;
}

export function ManualTransactionDialog({ isOpen, onClose, ownerId, costCenters, preselectedCc, t }: ManualTransactionDialogProps) {
  const database = useDatabase();
  const storage = useStorage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [data, setData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    type: 'expense' as 'expense' | 'income_amortization' | 'income_additive',
    category: 'Miscellaneous'
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
  };

  const handleSave = async () => {
    if (!database || !ownerId || !data.amount || !preselectedCc) {
      toast({ variant: 'destructive', title: '必須項目をすべてご入力ください。' });
      return;
    }

    setLoading(true);
    try {
      let imageUrl = '';
      if (file && storage) {
        const fileRef = storageRef(storage, `owners/${ownerId}/expenses/${Date.now()}_${file.name}`);
        const uploadResult = await uploadBytes(fileRef, file);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      const newRef = push(ref(database, `owner_data/${ownerId}/expenses`));

      await set(newRef, {
        ...data,
        costcenterId: preselectedCc.id,
        amount: Number(data.amount),
        projectId: preselectedCc.projectId,
        costcenterName: preselectedCc.name,
        imageUrl,
        status: 'processed',
        createdAt: new Date().toISOString(),
        senderName: 'ダッシュボード手動登録',
        paymentType: 'company'
      });

      toast({ title: '登録が完了いたしました。' });
      onClose();
      setData({
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        category: 'Miscellaneous'
      });
      clearFile();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: '登録中にエラーが発生いたしました。' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[2.5rem] max-w-2xl p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-slate-900 p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <PlusCircle className="text-white w-6 h-6" />
             </div>
             <div>
                <DialogTitle className="text-white font-black text-xl">新規登録</DialogTitle>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">収支管理・キャッシュフロー</p>
             </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-slate-400 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">取引区分</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'expense',            label: '支出',      icon: ArrowDownCircle, color: 'text-red-500',     bg: 'bg-red-50' },
                  { id: 'income_amortization', label: '入金（償却）', icon: ArrowUpCircle,  color: 'text-emerald-500', bg: 'bg-emerald-50' },
                  { id: 'income_additive',    label: '入金（加算）', icon: Wallet,          color: 'text-blue-500',   bg: 'bg-blue-50' }
                ].map((tp) => (
                  <button
                    key={tp.id}
                    onClick={() => setData({...data, type: tp.id as any})}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
                      data.type === tp.id ? "border-slate-900 bg-slate-900 text-white" : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <tp.icon className={cn("w-5 h-5 mb-1", data.type === tp.id ? "text-white" : tp.color)} />
                    <span className="text-[10px] font-black">{tp.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">金額</Label>
               <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-lg">¥</span>
                  <Input
                    type="number"
                    value={data.amount}
                    onChange={e => setData({...data, amount: e.target.value})}
                    placeholder="0"
                    className="h-14 pl-10 rounded-2xl text-xl font-black bg-slate-50 border-none ring-offset-0 focus-visible:ring-2 focus-visible:ring-slate-900 transition-all"
                  />
               </div>
            </div>

            <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">原価センター</Label>
               <div className="h-14 rounded-2xl bg-slate-50 flex items-center px-4 gap-3">
                 <div className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
                 <span className="font-black text-slate-800 text-sm truncate">{preselectedCc?.name || '—'}</span>
               </div>
            </div>

            <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">取引日</Label>
               <Input
                  type="date"
                  value={data.date}
                  onChange={e => setData({...data, date: e.target.value})}
                  className="h-14 rounded-2xl font-bold bg-slate-50 border-none"
               />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">摘要・備考</Label>
               <Textarea
                value={data.description}
                onChange={e => setData({...data, description: e.target.value})}
                placeholder="例：資材購入、契約加算金..."
                className="min-h-[100px] rounded-2xl font-bold bg-slate-50 border-none resize-none"
               />
            </div>

            <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">証憑ファイル添付</Label>
               <div className="relative group">
                  {preview ? (
                    <div className="relative aspect-video rounded-[2rem] overflow-hidden border-2 border-slate-100 group-hover:border-primary/30 transition-all">
                       <img src={preview} className="w-full h-full object-cover" alt="プレビュー" />
                       <button onClick={clearFile} className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-red-500 shadow-xl hover:scale-110 transition-all">
                          <X className="w-5 h-5" />
                       </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center aspect-video rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer">
                       <CloudUpload className="w-10 h-10 text-slate-300 mb-2" />
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">クリックしてファイルを添付</span>
                       <input type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                    </label>
                  )}
               </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-slate-50/50 block">
           <Button
            disabled={loading}
            onClick={handleSave}
            className="w-full h-16 rounded-[1.5rem] bg-slate-900 text-white font-black text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3"
           >
             {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <PlusCircle className="w-6 h-6" />}
             登録を確定する
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
