'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDatabase, useStorage } from '@/firebase';
import { ref, get, update } from 'firebase/database';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, PenTool, Eraser, X } from 'lucide-react';

export default function SignReceiptPage() {
  const { id } = useParams();
  const router = useRouter();
  const database = useDatabase();
  const storage = useStorage();

  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  useEffect(() => {
    if (!database || !id) return;

    // Buscar o recibo em toda a base (precisamos do ownerId e userId)
    // Para simplificar no LIFF, o ID do recibo deve ser único ou conter o path
    // Vamos assumir que passamos o path codificado ou buscamos por ID global
    const fetchReceipt = async () => {
      try {
        // Como o ID é dinâmico, vamos tentar localizar onde ele está
        // Nota: Em produção, o ideal é passar o path completo no link do LIFF
        // Ex: /sign/ownerId_userId_receiptId
        const parts = (id as string).split('_');
        if (parts.length < 3) {
          setLoading(false);
          return;
        }

        const [oId, uId, rId] = parts;
        const rRef = ref(database, `owner_data/${oId}/lineUsers/${uId}/wallet/advances/${rId}`);
        const snap = await get(rRef);
        
        if (snap.exists()) {
          setReceipt({ ...snap.val(), oId, uId, rId });
        }
      } catch (err) {
        console.error('Error fetching receipt:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [database, id]);

  // Lógica do Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: any) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    const start = (e: any) => {
      e.preventDefault();
      setIsDrawing(true);
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const move = (e: any) => {
      if (!isDrawing) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const stop = () => {
      setIsDrawing(false);
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', move, { passive: false });
    canvas.addEventListener('touchend', stop);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', move);
      canvas.removeEventListener('touchend', stop);
    };
  }, [isDrawing, loading]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !storage || !database || !receipt) return;

    setSaving(true);
    try {
      // 1. Converter canvas para base64
      const dataUrl = canvas.toDataURL('image/png');
      
      // 2. Upload para o Storage
      const path = `owners/${receipt.oId}/signatures/${receipt.rId}.png`;
      const sRef = storageRef(storage, path);
      await uploadString(sRef, dataUrl, 'data_url');
      const signatureUrl = await getDownloadURL(sRef);

      // 3. Atualizar o RTDB
      const rRef = ref(database, `owner_data/${receipt.oId}/lineUsers/${receipt.uId}/wallet/advances/${receipt.rId}`);
      await update(rRef, {
        signed: true,
        signatureUrl,
        signedAt: new Date().toISOString()
      });

      setDone(true);
    } catch (err) {
      console.error('Error saving signature:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
        <h1 className="text-xl font-black text-slate-900">領収書を確認中...</h1>
      </div>
    );
  }

  if (!receipt && !done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <X className="w-16 h-16 text-red-400 mb-4" />
        <h1 className="text-xl font-black text-slate-900">エラー</h1>
        <p className="text-slate-500 font-bold mt-2">指定された領収書が見つかりません。</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-200">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">署名完了</h1>
        <p className="text-slate-500 font-bold mt-2 leading-relaxed">
          正しく署名されました。<br />管理画面へ反映されます。
        </p>
        <div className="mt-10 w-full max-w-xs space-y-4">
          <Button onClick={() => window.close()} className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black">
            閉じる
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-slate-900 text-white px-6 py-10 rounded-b-[3rem] shadow-2xl">
        <h1 className="text-2xl font-black tracking-tight text-center">領収書への署名</h1>
        <p className="text-[10px] uppercase font-black text-slate-400 text-center mt-2 tracking-widest">Digital Receipt Protocol</p>
      </div>

      <div className="max-w-md mx-auto px-6 -mt-8">
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden mb-6">
          <CardContent className="p-8 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-50 pb-4">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">金額 (Amount)</p>
                <p className="text-3xl font-black text-slate-900">¥{Number(receipt.amount).toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                未署名
              </div>
            </div>

            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">概要 (Description)</p>
              <p className="text-sm font-bold text-slate-700 leading-relaxed">
                {receipt.description || '---'}
              </p>
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                  <PenTool className="w-3 h-3" />
                  署名エリア (Sign Here)
                </p>
                <button onClick={clearCanvas} className="text-[10px] font-black text-red-400 flex items-center gap-1 hover:text-red-500">
                  <Eraser className="w-3 h-3" /> リセット
                </button>
              </div>
              
              <div className="w-full aspect-[4/3] bg-white border-2 border-slate-100 rounded-3xl overflow-hidden touch-none shadow-inner">
                <canvas 
                  ref={canvasRef} 
                  width={600} 
                  height={450} 
                  className="w-full h-full cursor-crosshair"
                />
              </div>
            </div>

            <div className="pt-4">
              <Button 
                onClick={handleSaveSignature} 
                disabled={saving}
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-xl shadow-blue-200 transition-all active:scale-95"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '署名を保存する'}
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-center text-[10px] text-slate-400 font-bold leading-relaxed px-4">
          「署名を保存する」をタップすることで、上記内容の領収書に正しく同意したことになります。
        </p>
      </div>
    </div>
  );
}
