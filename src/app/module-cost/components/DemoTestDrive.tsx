'use client';

import { useState, useEffect } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue, set, off } from 'firebase/database';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Smartphone, MessageSquare, Sparkles, CheckCircle2, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DemoTestDrive() {
  const database = useDatabase();
  const [code, setCode] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'waiting_link' | 'linked' | 'processing' | 'completed' | 'error'>('idle');
  const [resultData, setResultData] = useState<any>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  // 1. Iniciar Sessão e Gerar Código
  const startDemo = () => {
    const newCode = Math.floor(1000 + Math.random() * 9000).toString();
    setCode(newCode);
    setStatus('waiting_link');
    
    if (database) {
      // Limpar sessões antigas deste código (se houver) e iniciar listener
      set(ref(database, `demo_codes/${newCode}`), { status: 'idle', ts: Date.now() });
      set(ref(database, `demo_sessions/${newCode}`), null);
    }
  };

  // 2. Escutar mudanças no Firebase
  useEffect(() => {
    if (!code || !database) return;

    const codeRef = ref(database, `demo_codes/${code}`);
    const sessionRef = ref(database, `demo_sessions/${code}`);

    const unsubCode = onValue(codeRef, (snap) => {
      const val = snap.val();
      if (val?.status === 'linked') setStatus('linked');
    });

    const unsubSession = onValue(sessionRef, (snap) => {
      const val = snap.val();
      if (!val) return;

      if (val.status === 'processing') setStatus('processing');
      if (val.status === 'completed') {
        setStatus('completed');
        setResultData(val.data);
        setReceiptImage(val.imageUrl);
      }
      if (val.status === 'error') setStatus('error');
    });

    return () => {
      off(codeRef);
      off(sessionRef);
    };
  }, [code, database]);

  return (
    <section className="py-24 bg-slate-900 overflow-hidden relative rounded-[3rem] my-20">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full -mr-64 -mt-64" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -ml-64 -mb-64" />

      <div className="max-w-6xl mx-auto px-10 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Esquerda: Instruções */}
          <div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-none mb-6 px-4 py-1.5 text-[10px] font-black tracking-widest uppercase">
              Free Test Drive
            </Badge>
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter leading-tight mb-8">
              今すぐお手元の領収書で<br />
              <span className="text-emerald-400">AIを体感してください。</span>
            </h2>
            
            <div className="space-y-6">
              {[
                { step: 1, text: "下のボタンを押してテストコードを発行", active: status === 'waiting_link' || status === 'idle' },
                { step: 2, text: "LINEでQRコードを読み取り、コードを送信", active: status === 'linked' },
                { step: 3, text: "領収書の写真を送るだけ！", active: status === 'processing' || status === 'completed' }
              ].map((s) => (
                <div key={s.step} className={cn(
                  "flex items-center gap-4 transition-all duration-500",
                  s.active ? "opacity-100 translate-x-2" : "opacity-40"
                )}>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-black text-white text-sm">
                    {s.step}
                  </div>
                  <p className="text-white font-bold text-lg">{s.text}</p>
                </div>
              ))}
            </div>

            {status === 'idle' && (
              <Button 
                onClick={startDemo}
                size="lg"
                className="mt-12 h-16 px-10 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black text-lg gap-3 shadow-2xl shadow-emerald-500/20"
              >
                テストドライブを開始する <Smartphone className="w-5 h-5"/>
              </Button>
            )}

            {code && (
              <div className="mt-12 p-8 bg-white/5 border border-white/10 rounded-[2rem] flex flex-col md:flex-row items-center gap-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="bg-white p-3 rounded-2xl shadow-xl">
                  {/* QR Code Demo - Usando o ID do Bot Demo */}
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://line.me/R/oaMessage/2009522176/" className="w-[120px] h-[120px]" alt="QR" />
                </div>
                <div className="text-center md:text-left">
                  <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">Passo 1: LINEで送信</p>
                  <p className="text-white text-2xl font-black tracking-tighter mb-4">このコードを送信 👇</p>
                  <div className="inline-block bg-white text-slate-900 px-6 py-3 rounded-2xl text-4xl font-black tracking-[0.2em]">
                    #{code}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Direita: Emulador de Smartphone */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-[320px] h-[640px] bg-slate-800 rounded-[3rem] border-[8px] border-slate-700 shadow-[0_0_80px_rgba(0,0,0,0.5)] overflow-hidden">
               {/* Phone Notch */}
               <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-700 rounded-b-2xl z-20" />
               
               {/* Screen Content */}
               <div className="h-full w-full bg-slate-50 relative flex flex-col">
                  {/* Bot Header */}
                  <div className="bg-white border-b p-4 pt-10 flex items-center gap-3">
                     <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white"><Sparkles className="w-4 h-4"/></div>
                     <div>
                        <p className="text-[10px] font-black text-slate-900 leading-none">FastLine AI Demo</p>
                        <p className="text-[8px] text-emerald-500 font-bold">Online</p>
                     </div>
                  </div>

                  {/* Chat Area / Results */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                     {status === 'waiting_link' && (
                       <div className="flex flex-col items-center justify-center h-full text-center gap-4 animate-pulse">
                          <QrCode className="w-12 h-12 text-slate-200" />
                          <p className="text-xs font-bold text-slate-400">LINEでコードを送信するのを<br/>待っています...</p>
                       </div>
                     )}

                     {status === 'linked' && (
                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl animate-in zoom-in-95">
                           <p className="text-xs font-bold text-emerald-700 text-center">✨ 接続完了！<br/>準備ができました。領収書を送ってください。</p>
                        </div>
                     )}

                     {status === 'processing' && (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                           <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                           <p className="text-sm font-black text-slate-600 animate-bounce">AIが読み取り中...</p>
                        </div>
                     )}

                     {status === 'completed' && resultData && (
                        <div className="animate-in slide-in-from-bottom-10 duration-700">
                           {receiptImage && (
                             <img src={receiptImage} className="w-full h-40 object-cover rounded-2xl mb-4 border shadow-sm" alt="Receipt"/>
                           )}
                           <div className="bg-white border rounded-2xl p-5 shadow-sm space-y-4">
                              <div className="flex justify-between items-start border-b pb-3">
                                 <div>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">合計金額</p>
                                    <p className="text-2xl font-black text-slate-900">¥{Number(resultData.amount).toLocaleString()}</p>
                                 </div>
                                 <Badge className="bg-emerald-100 text-emerald-700 border-none text-[8px] font-black shadow-none">AI抽出完了</Badge>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                 <div>
                                    <p className="text-[9px] text-slate-400 font-bold">日付</p>
                                    <p className="text-xs font-bold text-slate-700">{resultData.date}</p>
                                 </div>
                                 <div>
                                    <p className="text-[9px] text-slate-400 font-bold">カテゴリー</p>
                                    <p className="text-xs font-bold text-slate-700">{resultData.category}</p>
                                 </div>
                              </div>
                              <div>
                                 <p className="text-[9px] text-slate-400 font-bold">店舗名 / 内容</p>
                                 <p className="text-xs font-bold text-slate-700">{resultData.description}</p>
                              </div>
                              {resultData.registrationNumber && (
                                <div className="p-2 bg-slate-50 rounded-lg border border-dashed flex items-center gap-2">
                                   <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                   <p className="text-[9px] font-black text-slate-500">インボイス番号: {resultData.registrationNumber}</p>
                                </div>
                              )}
                           </div>
                           
                           <Button className="w-full mt-6 h-12 rounded-xl bg-slate-900 text-white font-black text-xs gap-2">
                             今すぐ全機能を試す <ArrowRight className="w-3 h-3"/>
                           </Button>
                        </div>
                     )}
                  </div>

                  {/* Fake Keyboard Input */}
                  <div className="p-3 bg-white border-t flex gap-2">
                     <div className="flex-1 h-8 bg-slate-100 rounded-full px-4 flex items-center">
                        <span className="text-[10px] text-slate-300">Message...</span>
                     </div>
                     <div className="w-8 h-8 rounded-full bg-slate-200" />
                  </div>
               </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

function ArrowRight(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2007/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  )
}
