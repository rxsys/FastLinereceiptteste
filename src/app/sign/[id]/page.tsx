'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useDatabase, useStorage } from '@/firebase';
import { ref, get, update } from 'firebase/database';
import { ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { notifySignatureComplete } from '@/app/actions/line-notify';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, PenTool, Eraser, X, Shield } from 'lucide-react';
import Script from 'next/script';

// LIFF SDK types (loaded via CDN)
declare global {
  interface Window {
    liff: {
      init: (config: { liffId: string }) => Promise<void>;
      isInClient: () => boolean;
      closeWindow: () => void;
      getProfile: () => Promise<{ userId: string; displayName: string; pictureUrl?: string }>;
      isLoggedIn: () => boolean;
    };
  }
}

export default function SignReceiptPage() {
  const { id } = useParams();
  const database = useDatabase();
  const storage = useStorage();

  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [liffReady, setLiffReady] = useState(false);
  const [isInLiff, setIsInLiff] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Fetch receipt data
  useEffect(() => {
    if (!database || !id) return;
    const fetchReceipt = async () => {
      try {
        // Formato: ${ownerId}_${userId}_${receiptId}
        // receiptId (pushId RTDB) pode conter '_', então reagrupa o resto.
        const parts = (id as string).split('_');
        if (parts.length < 3) { setLoading(false); return; }
        const oId = parts[0];
        const uId = parts[1];
        const rId = parts.slice(2).join('_');
        const rRef = ref(database, `owner_data/${oId}/lineUsers/${uId}/wallet/advances/${rId}`);
        const snap = await get(rRef);
        if (snap.exists()) setReceipt({ ...snap.val(), oId, uId, rId });
      } catch (err) {
        console.error('Error fetching receipt:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReceipt();
  }, [database, id]);

  // Initialize LIFF after SDK loads
  const initLiff = useCallback(async () => {
    if (!receipt?.oId || !window.liff) return;
    try {
      // Fetch liffSignId from owner config
      const ownerSnap = await get(ref(database!, `owner/${receipt.oId}`));
      const liffId = ownerSnap.val()?.liffSignId;
      if (liffId) {
        await window.liff.init({ liffId });
        const inClient = window.liff.isInClient();
        setIsInLiff(inClient);
        console.log('[LIFF] initialized, isInClient:', inClient);
      }
    } catch (err) {
      console.warn('[LIFF] init failed (running outside LINE):', err);
    } finally {
      setLiffReady(true);
    }
  }, [receipt, database]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || loading) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawingRef.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const move = (e: MouseEvent | TouchEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      setHasDrawn(true);
    };

    const stop = () => { isDrawingRef.current = false; };

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
  }, [loading]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSaveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !storage || !database || !receipt) return;
    setSaving(true);
    try {
      // 1. Upload signature to Storage
      const dataUrl = canvas.toDataURL('image/png');
      const path = `owners/${receipt.oId}/signatures/${receipt.rId}.png`;
      const sRef = storageRef(storage, path);
      await uploadString(sRef, dataUrl, 'data_url');
      const signatureUrl = await getDownloadURL(sRef);

      // 2. Update RTDB
      const signedAt = new Date().toISOString();
      const rRef = ref(database, `owner_data/${receipt.oId}/lineUsers/${receipt.uId}/wallet/advances/${receipt.rId}`);
      await update(rRef, { signed: true, signatureUrl, signedAt });

      // 3. Send LINE confirmation to user (get lineUserId from RTDB)
      try {
        const userSnap = await get(ref(database, `owner_data/${receipt.oId}/lineUsers/${receipt.uId}`));
        const lineUserId = userSnap.val()?.lineUserId || receipt.uId;
        if (lineUserId?.startsWith('U')) {
          await notifySignatureComplete(receipt.oId, lineUserId, receipt.amount, receipt.description, signedAt);
        }
      } catch (notifyErr) {
        console.warn('[Sign] confirmation notify failed:', notifyErr);
      }

      setDone(true);

      // 4. Close LIFF if in LINE client
      if (isInLiff && window.liff?.isInClient()) {
        setTimeout(() => window.liff.closeWindow(), 1500);
      }
    } catch (err) {
      console.error('Error saving signature:', err);
      alert('エラーが発生しました。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  // --- Screens ---

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <Loader2 className="w-12 h-12 animate-spin text-blue-500 mb-4" />
      <h1 className="text-xl font-black text-slate-900">領収書を確認中...</h1>
    </div>
  );

  if (!receipt) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <X className="w-16 h-16 text-red-400 mb-4" />
      <h1 className="text-xl font-black text-slate-900">エラー</h1>
      <p className="text-slate-500 font-bold mt-2">指定された領収書が見つかりません。</p>
    </div>
  );

  if (receipt.signed && !done) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
        <Shield className="w-10 h-10" />
      </div>
      <h1 className="text-2xl font-black text-slate-900">署名済み</h1>
      <p className="text-slate-500 font-bold mt-2">この領収書はすでに署名されています。</p>
      {receipt.signedAt && (
        <p className="text-[11px] text-slate-400 mt-3">
          署名日時：{new Date(receipt.signedAt).toLocaleString('ja-JP')}
        </p>
      )}
    </div>
  );

  if (done) return (
    <div className="min-h-screen bg-emerald-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
      <Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" onLoad={initLiff} />
      <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-200">
        <CheckCircle2 className="w-12 h-12" />
      </div>
      <h1 className="text-2xl font-black text-slate-900">署名完了</h1>
      <p className="text-slate-500 font-bold mt-2 leading-relaxed">
        正しく署名されました。<br />管理画面へ反映されます。
      </p>
      <p className="text-[11px] text-slate-400 mt-4">LINEにも確認メッセージを送信しました。</p>
      {isInLiff ? (
        <p className="text-[11px] text-blue-400 font-bold mt-4">まもなく自動で閉じます...</p>
      ) : (
        <Button onClick={() => window.close()} className="mt-10 w-full max-w-xs h-14 rounded-2xl bg-slate-900 text-white font-black">
          閉じる
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Script src="https://static.line-scdn.net/liff/edge/2/sdk.js" onLoad={initLiff} />

      <div className="min-h-screen bg-slate-50 pb-10">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-10 rounded-b-[3rem] shadow-2xl">
          <h1 className="text-2xl font-black tracking-tight text-center">領収書への署名</h1>
          <p className="text-[10px] uppercase font-black text-slate-400 text-center mt-2 tracking-widest">Digital Receipt — Signature Required</p>
        </div>

        <div className="max-w-md mx-auto px-6 -mt-8">
          <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden mb-6">
            <CardContent className="p-8 space-y-6">

              {/* Receipt details */}
              <div className="space-y-4">
                <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">金額</p>
                    <p className="text-4xl font-black text-slate-900">¥{Number(receipt.amount).toLocaleString()}</p>
                  </div>
                  <div className="bg-amber-50 text-amber-600 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                    署名待ち
                  </div>
                </div>

                {receipt.description && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">摘要</p>
                    <p className="text-sm font-bold text-slate-700 leading-relaxed mt-1">{receipt.description}</p>
                  </div>
                )}

                {receipt.imageUrl && (
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                    <img src={receipt.imageUrl} className="w-full h-full object-contain" alt="証憑" />
                  </div>
                )}
              </div>

              {/* Signature canvas */}
              <div className="pt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                    <PenTool className="w-3 h-3" />署名エリア
                  </p>
                  <button onClick={clearCanvas} className="text-[10px] font-black text-red-400 flex items-center gap-1 hover:text-red-500 transition-colors">
                    <Eraser className="w-3 h-3" />リセット
                  </button>
                </div>

                <div className={`w-full aspect-[4/3] border-2 rounded-3xl overflow-hidden touch-none shadow-inner transition-colors ${hasDrawn ? 'bg-white border-slate-200' : 'bg-slate-50 border-dashed border-slate-200'}`}>
                  <canvas ref={canvasRef} width={600} height={450} className="w-full h-full cursor-crosshair" />
                </div>

                {!hasDrawn && (
                  <p className="text-center text-[11px] text-slate-300 font-bold">指またはスタイラスで署名してください</p>
                )}
              </div>

              {/* Submit */}
              <div className="pt-2">
                <Button
                  onClick={handleSaveSignature}
                  disabled={saving || !hasDrawn}
                  className="w-full h-14 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: hasDrawn ? '#1d4ed8' : '#94a3b8' }}
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : '署名を確定する'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-[10px] text-slate-400 font-bold leading-relaxed px-4">
            「署名を確定する」をタップすることで、上記内容の領収書に同意したことになります。
          </p>

          {isInLiff && (
            <p className="text-center text-[11px] text-blue-400 font-bold mt-3">LINE内で安全に処理されています</p>
          )}
        </div>
      </div>
    </>
  );
}
