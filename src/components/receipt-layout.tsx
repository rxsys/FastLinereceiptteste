'use client';

import { cn } from '@/lib/utils';

export type ReceiptStatus = 'manual' | 'pending_signature' | 'signed';

interface ReceiptLayoutProps {
  ownerName: string;
  userName: string;
  amount: number;
  description?: string;
  createdAt: string;
  status?: ReceiptStatus;
  signatureUrl?: string | null;
  signedAt?: string | null;
  evidenceUrl?: string | null;
  variant?: 'screen' | 'print';
  className?: string;
}

function formatJpDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${d.getFullYear()}年${String(d.getMonth() + 1).padStart(2, '0')}月${String(d.getDate()).padStart(2, '0')}日`;
  } catch {
    return iso;
  }
}

function formatJpDateTime(iso: string) {
  try {
    const d = new Date(iso);
    return `${formatJpDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch {
    return iso;
  }
}

export const statusMeta: Record<ReceiptStatus, { label: string; cls: string }> = {
  manual: { label: '手書き', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending_signature: { label: '署名待ち', cls: 'bg-amber-50 text-amber-600 border-amber-200' },
  signed: { label: '署名済み', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
};

export function ReceiptLayout({
  ownerName,
  userName,
  amount,
  description,
  createdAt,
  status,
  signatureUrl,
  signedAt,
  evidenceUrl,
  variant = 'screen',
  className,
}: ReceiptLayoutProps) {
  const isPrint = variant === 'print';

  return (
    <div
      className={cn(
        'bg-white text-slate-900 font-serif',
        isPrint ? 'w-full max-w-[680px] mx-auto p-12' : 'rounded-[1.5rem] border border-slate-200 p-8 shadow-sm',
        className
      )}
      style={{ fontFamily: '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", serif' }}
    >
      {/* Header */}
      <div className="text-center border-b-2 border-double border-slate-800 pb-4 mb-6">
        <h1 className="text-4xl tracking-[0.5em] font-bold pl-[0.5em]">領収書</h1>
        <p className="text-[10px] text-slate-500 tracking-widest mt-1 uppercase">Receipt</p>
      </div>

      {/* 宛名 + 発行日 */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex-1">
          <div className="flex items-end gap-2 border-b border-slate-400 pb-2 max-w-[75%]">
            <span className="text-lg font-bold truncate">{userName || '—'}</span>
            <span className="text-sm text-slate-600">様</span>
          </div>
        </div>
        <div className="text-right text-[11px] text-slate-600 shrink-0">
          <div>発行日</div>
          <div className="font-bold text-slate-900">{formatJpDate(createdAt)}</div>
        </div>
      </div>

      {/* 金額 */}
      <div className="mb-6">
        <div className="border-y-2 border-slate-800 py-4 text-center">
          <div className="text-[10px] text-slate-500 tracking-widest mb-1">金 額</div>
          <div className="text-4xl font-bold tracking-wider">
            ¥ {Number(amount || 0).toLocaleString('ja-JP')} <span className="text-2xl">-</span>
          </div>
        </div>
      </div>

      {/* 但し書き */}
      <div className="mb-6">
        <div className="text-[11px] text-slate-500 mb-1">但し書き</div>
        <div className="border-b border-slate-300 pb-2 min-h-[2rem] text-sm">
          {description || '—'}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">上記金額、正に領収いたしました。</p>
      </div>

      {/* 発行者 + 署名 */}
      <div className="flex justify-between items-end gap-6 pt-4 border-t border-slate-200">
        <div className="flex-1">
          <div className="text-[10px] text-slate-500 mb-1">発行者</div>
          <div className="text-sm font-bold">{ownerName || '—'}</div>
        </div>

        <div className="flex-1 text-right">
          <div className="text-[10px] text-slate-500 mb-1">署名欄</div>
          <div className="h-20 border border-slate-300 rounded-md flex items-center justify-center bg-slate-50/50 relative overflow-hidden">
            {signatureUrl ? (
              <img src={signatureUrl} alt="署名" className="max-h-full max-w-full object-contain" />
            ) : status === 'pending_signature' ? (
              <span className="text-[10px] text-amber-600 font-bold">署名待ち</span>
            ) : (
              <span className="text-[10px] text-slate-300">印 / サイン</span>
            )}
          </div>
          {signedAt && (
            <div className="text-[9px] text-slate-400 mt-1">署名日時 {formatJpDateTime(signedAt)}</div>
          )}
        </div>
      </div>

      {/* Badge status (não imprime) */}
      {status && !isPrint && (
        <div className="mt-4 flex justify-center">
          <span
            className={cn(
              'text-[10px] font-bold px-3 py-1 rounded-full border uppercase tracking-wider',
              statusMeta[status].cls
            )}
          >
            {statusMeta[status].label}
          </span>
        </div>
      )}

      {/* Imagem do recibo anexada (evidência) */}
      {evidenceUrl && !isPrint && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <div className="text-[10px] text-slate-500 mb-2">証憑画像</div>
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
            <img src={evidenceUrl} className="w-full h-auto object-contain max-h-[400px]" alt="証憑" />
          </div>
        </div>
      )}
    </div>
  );
}
