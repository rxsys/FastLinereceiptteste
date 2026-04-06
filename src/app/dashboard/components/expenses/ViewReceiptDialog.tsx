'use client';

import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, CheckCircle2, XCircle } from 'lucide-react';
import { Expense, LineUser } from '@/types';

interface ViewReceiptDialogProps {
  expense: Expense | null;
  lineUsers: LineUser[];
  isOpen: boolean;
  onClose: () => void;
  t: any;
}

export const ViewReceiptDialog = ({
  expense,
  lineUsers,
  isOpen,
  onClose,
  t
}: ViewReceiptDialogProps) => {
  if (!expense) return null;

  const sender = lineUsers?.find((u: any) => u.lineId === expense.userId || u.id === expense.lineuserId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-[2.5rem] p-0 overflow-hidden max-w-4xl border-none shadow-2xl">
        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          {/* Imagem do Recibo */}
          <div className="flex-1 bg-slate-900 flex items-center justify-center p-4 relative min-h-[400px]">
            {expense.imageUrl ? (
              <img src={expense.imageUrl} alt="Receipt" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
            ) : (
              <div className="text-slate-400 flex flex-col items-center gap-4">
                <XCircle className="w-16 h-16 opacity-20" />
                <p className="font-bold text-sm">{t.tabs.expenses.noData}</p>
              </div>
            )}
          </div>

          {/* Dados e Auditoria */}
          <div className="w-full md:w-[380px] bg-white p-8 md:p-10 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.tabs.expenses.colMerchant}</p>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">{expense.description}</h3>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.tabs.expenses.colAmount} (税込)</p>
                  <p className="text-3xl font-black text-slate-900">¥{expense.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.tabs.expenses.colDate}</p>
                  <p className="text-lg font-black text-slate-700">{expense.date}</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                {expense.tNumber ? (
                  <div className="p-5 rounded-2xl bg-blue-50 border border-blue-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-black text-blue-900">{t.tabs.expenses.invoiceQualified}</span>
                    </div>
                    <p className="text-xs font-mono font-bold text-blue-700 bg-white p-2 rounded-lg border border-blue-200 truncate">{t.tabs.expenses.colMerchant} ID: {expense.tNumber}</p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-slate-400" />
                      <span className="text-sm font-black text-slate-500">{t.tabs.expenses.invoiceStandard}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">{t.tabs.expenses.tNumberNotFound}</p>
                  </div>
                )}
              </div>

              <div className="pt-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{t.tabs.expenses.titleSender}</p>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                    <AvatarImage src={sender?.photo} />
                    <AvatarFallback><User /></AvatarFallback>
                  </Avatar>
                  <div className="text-xs">
                    <p className="font-black text-slate-800">{expense.senderName}</p>
                    <p className="text-slate-400">ID: {expense.id.substring(0, 8)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
