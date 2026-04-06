'use client';

import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Loader2, ChevronDown, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'ai';
  text: string;
  ts?: number;
}

interface AiAssistantPanelProps {
  ownerId: string;
  userId: string;
}

export function AiAssistantPanel({ ownerId, userId }: AiAssistantPanelProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ balance: number | null; usedThisMonth: number; freeLimit: number | null } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Carrega histórico do RTDB ao abrir pela primeira vez
  useEffect(() => {
    if (!open || historyLoaded) return;

    const loadHistory = async () => {
      try {
        const { getDatabase, ref, get } = await import('firebase/database');
        const db = getDatabase();
        const snap = await get(ref(db, `owner_data/${ownerId}/dashboardAiHistory/${userId}`));
        const data = snap.val() || {};
        const saved: Message[] = (data.messages || []).slice(-15);

        setMessages(saved.length > 0 ? saved : [
          { role: 'ai', text: 'こんにちは！経費管理についてご質問があればお気軽にどうぞ。プロジェクトの状況や承認待ち経費などをお調べいたします。', ts: Date.now() }
        ]);
      } catch {
        setMessages([{ role: 'ai', text: 'こんにちは！ご質問があればお気軽にどうぞ。', ts: Date.now() }]);
      }
      setHistoryLoaded(true);
    };

    loadHistory();
  }, [open, historyLoaded, ownerId, userId]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { role: 'user', text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, ownerId, userId }),
      });
      const data = await res.json();

      setMessages(prev => [...prev, { role: 'ai', text: data.text || 'エラーが発生いたしました。', ts: Date.now() }]);

      if (data.usedThisMonth !== undefined) {
        setTokenInfo({ balance: data.tokenBalance ?? null, usedThisMonth: data.usedThisMonth, freeLimit: data.freeLimit ?? null });
      }
    } catch {
      setMessages(prev => [...prev, { role: 'ai', text: '接続エラーが発生いたしました。', ts: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const tokenLabel = () => {
    if (!tokenInfo) return null;
    if (tokenInfo.balance !== null) return `残高 ${tokenInfo.balance.toLocaleString()} tokens`;
    if (tokenInfo.freeLimit) return `今月 ${tokenInfo.usedThisMonth.toLocaleString()} / ${tokenInfo.freeLimit.toLocaleString()} tokens`;
    return null;
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          'fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300',
          open ? 'bg-slate-800' : 'bg-violet-600 hover:bg-violet-700 hover:scale-110'
        )}
      >
        {open ? <ChevronDown className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-white" />}
      </button>

      {/* Painel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 bg-white rounded-[2rem] shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300" style={{ maxHeight: '70vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-violet-600 text-white">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              <div>
                <p className="text-sm font-black">AIアシスタント</p>
                {tokenLabel() && (
                  <p className="text-[10px] opacity-70 flex items-center gap-1">
                    <Coins className="w-3 h-3" /> {tokenLabel()}
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="opacity-70 hover:opacity-100 transition-opacity">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {!historyLoaded ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-violet-400" /></div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[80%] px-4 py-2.5 rounded-2xl text-xs font-medium leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-700 border border-slate-100 rounded-bl-sm shadow-sm'
                  )}>
                    {msg.text}
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-100 bg-white flex gap-2">
            <Input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="メッセージを入力..."
              className="h-10 rounded-xl text-xs border-slate-100 bg-slate-50 flex-1"
              disabled={loading || !historyLoaded}
            />
            <Button
              onClick={send}
              disabled={!input.trim() || loading || !historyLoaded}
              size="icon"
              className="h-10 w-10 rounded-xl bg-violet-600 hover:bg-violet-700 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
