'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSignReceipt } from '@/app/actions/sign';
import { ReceiptLayout } from '@/components/receipt-layout';
import { Loader2, Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PrintReceiptPage() {
  const { id } = useParams();
  const [receipt, setReceipt] = useState<any>(null);
  const [ownerName, setOwnerName] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const result = await getSignReceipt(id as string);
        if (result.success && result.receipt) {
          setReceipt(result.receipt);
          setOwnerName(result.ownerName || '');
          setUserName(result.userName || '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // Auto print after data loads
  useEffect(() => {
    if (!loading && receipt) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loading, receipt]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
    </div>
  );

  if (!receipt) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <X className="w-12 h-12 text-red-400 mb-3" />
      <p className="font-black text-slate-700">領収書が見つかりません</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white py-10 print:py-0">
      {/* Toolbar (não imprime) */}
      <div className="max-w-[680px] mx-auto px-6 mb-4 flex items-center justify-between print:hidden">
        <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">領収書印刷プレビュー</p>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} className="rounded-xl h-10 px-4 font-black text-xs bg-slate-900 text-white gap-2">
            <Printer className="w-3.5 h-3.5" /> 印刷
          </Button>
          <Button onClick={() => window.close()} variant="outline" className="rounded-xl h-10 px-4 font-black text-xs">
            閉じる
          </Button>
        </div>
      </div>

      <ReceiptLayout
        ownerName={ownerName}
        userName={userName}
        amount={Number(receipt.amount || 0)}
        description={receipt.description}
        createdAt={receipt.createdAt}
        status={receipt.status}
        signatureUrl={receipt.signatureUrl}
        signedAt={receipt.signedAt}
        evidenceUrl={receipt.imageUrl}
        variant="print"
      />

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
