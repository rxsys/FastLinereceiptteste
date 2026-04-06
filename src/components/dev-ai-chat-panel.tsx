'use client';

import { useState, useEffect, useRef } from 'react';
import { useUser } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Bot, Send, Trash2, Save, Key, ChevronDown, Loader2,
  MessageSquare, Sparkles, Eye, EyeOff
} from 'lucide-react';

type Provider = 'claude' | 'gemini' | 'openai';

const PROVIDERS: { id: Provider; label: string; color: string; hint: string }[] = [
  { id: 'claude', label: 'Claude (Anthropic)', color: 'bg-orange-500', hint: 'sk-ant-...' },
  { id: 'gemini', label: 'Gemini (Google)', color: 'bg-blue-500', hint: 'AIza...' },
  { id: 'openai', label: 'GPT-4o (OpenAI)', color: 'bg-emerald-500', hint: 'sk-...' },
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function DevAIChatPanel() {
  const { user } = useUser();
  const { toast } = useToast();

  const [provider, setProvider] = useState<Provider>('claude');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentGlobalPrompt, setCurrentGlobalPrompt] = useState('');
  const [showSystem, setShowSystem] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load API key from RTDB when provider changes
  useEffect(() => {
    if (!user) return;
    const loadKey = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/developer/ai-chat?key=${provider}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setApiKey(data.apiKey || '');
      } catch {}
    };
    loadKey();
  }, [user, provider]);

  // Load current global prompt
  useEffect(() => {
    if (!user) return;
    const loadPrompt = async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/developer/ai-chat', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setCurrentGlobalPrompt(data.lineSystemPrompt || '');
      } catch {}
    };
    loadPrompt();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const saveApiKey = async () => {
    if (!user || !apiKey) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/developer/ai-chat', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ provider, apiKey })
      });
      if (!res.ok) throw new Error('Falha');
      toast({ title: 'Chave salva' });
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao salvar chave' });
    }
  };

  const sendMessage = async () => {
    if (!message.trim() || !apiKey || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: message };
    const newHistory = [...history, userMsg];
    setHistory(newHistory);
    setMessage('');
    setLoading(true);

    try {
      const token = await user!.getIdToken();
      const res = await fetch('/api/developer/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          message: userMsg.content,
          provider,
          apiKey,
          history: newHistory.slice(0, -1),
          systemPrompt: systemPrompt || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro desconhecido');

      setHistory(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
      setHistory(prev => prev.slice(0, -1));
      setMessage(userMsg.content);
    } finally {
      setLoading(false);
    }
  };

  const saveAsGlobalPrompt = async (content: string) => {
    if (!user || !content) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/developer/ai-chat', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: content })
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      setCurrentGlobalPrompt(content);
      toast({ title: '✅ Salvo como diretriz global LINE' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message });
    } finally {
      setSaving(false);
    }
  };

  const selectedProvider = PROVIDERS.find(p => p.id === provider)!;

  return (
    <Card className="rounded-[2.5rem] border shadow-sm overflow-hidden bg-white">
      <CardHeader className="bg-slate-900 border-b border-white/10 p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-black text-white flex items-center gap-2">
              AI Chat Studio
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px] font-black">DEVELOPER ONLY</Badge>
            </CardTitle>
            <p className="text-xs text-purple-400/70 font-mono tracking-widest mt-1">LINE SYSTEM PROMPT EDITOR</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Config bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 space-y-4">
          {/* Provider selector */}
          <div className="flex flex-wrap gap-2">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border transition-all',
                  provider === p.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', p.color)} />
                {p.label}
              </button>
            ))}
          </div>

          {/* API Key */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={selectedProvider.hint}
                className="pl-9 pr-10 h-11 rounded-xl bg-white border-slate-200 font-mono text-sm"
              />
              <button
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={saveApiKey} variant="outline" className="h-11 rounded-xl px-4 font-black text-xs border-slate-200 shrink-0">
              <Save className="w-4 h-4" />
            </Button>
          </div>

          {/* System prompt toggle */}
          <button
            onClick={() => setShowSystem(v => !v)}
            className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-slate-700"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Diretriz de contexto (system prompt)
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', showSystem && 'rotate-180')} />
          </button>
          {showSystem && (
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              placeholder="Defina o papel da IA nesta sessão (ex: Você é um especialista em diretrizes para chatbots LINE...)"
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          )}

          {/* Current global prompt */}
          {currentGlobalPrompt && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">Diretriz Global LINE Atual</p>
              <p className="text-xs text-amber-800 line-clamp-2 font-mono">{currentGlobalPrompt}</p>
            </div>
          )}
        </div>

        {/* Chat area */}
        <div className="h-[400px] overflow-y-auto p-6 space-y-4 bg-white">
          {history.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-300">
              <Bot className="w-12 h-12" />
              <p className="text-sm font-bold">Inicie uma conversa com a IA</p>
              <p className="text-xs text-center max-w-xs">Use este chat para rascunhar e refinar a diretriz global que todos os usuários LINE irão seguir.</p>
            </div>
          )}
          {history.map((msg, i) => (
            <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap',
                msg.role === 'user'
                  ? 'bg-slate-900 text-white rounded-br-sm'
                  : 'bg-slate-100 text-slate-800 rounded-bl-sm'
              )}>
                {msg.content}
                {msg.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-slate-200 flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => saveAsGlobalPrompt(msg.content)}
                      disabled={saving}
                      className="h-6 text-[9px] font-black bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-2"
                    >
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 mr-1" />}
                      Salvar como Diretriz Global LINE
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                <span className="text-sm text-slate-500 font-bold">Pensando...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistory([])}
            className="shrink-0 h-11 w-11 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500"
            title="Limpar chat"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={apiKey ? 'Digite sua mensagem...' : 'Insira a chave de API primeiro'}
            disabled={!apiKey || loading}
            className="flex-1 h-11 rounded-xl bg-white border-slate-200"
          />
          <Button
            onClick={sendMessage}
            disabled={!message.trim() || !apiKey || loading}
            className="shrink-0 h-11 w-11 rounded-xl bg-slate-900 hover:bg-slate-800"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
