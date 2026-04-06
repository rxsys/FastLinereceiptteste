'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Zap, Coins, Activity, RefreshCw, ShoppingCart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function OwnerAIUsagePanel() {
  const { user } = useUser();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchUsage = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/owner/ai-usage', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro');
      setData(await res.json());
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao buscar uso de IA' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsage(); }, [user]);

  if (loading && !data) {
    return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-violet-500 w-6 h-6" /></div>;
  }

  const tokens = data?.tokens || {};
  const balance: number | null = data?.balance ?? null;
  const FREE_LIMIT = 50000;
  const usedPct = balance === null
    ? Math.min(100, (tokens.total / FREE_LIMIT) * 100)
    : Math.min(100, ((FREE_LIMIT - balance) / FREE_LIMIT) * 100);
  const isOverLimit = balance === null ? tokens.total >= FREE_LIMIT : balance <= 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">AI トークン使用状況</h3>
          <p className="text-[10px] text-slate-400 font-bold">{data?.currentMonth}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchUsage} disabled={loading}
          className="text-slate-400 hover:text-slate-700 rounded-xl">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tokens */}
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tokens (mês)</p>
            <p className="text-xl font-black text-slate-800">{(tokens.total || 0).toLocaleString()}</p>
            <div className="flex gap-1.5 mt-0.5">
              <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] h-4 py-0">IN: {(tokens.input || 0).toLocaleString()}</Badge>
              <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] h-4 py-0">OUT: {(tokens.output || 0).toLocaleString()}</Badge>
            </div>
          </div>
        </div>

        {/* Custo */}
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <Coins className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Custo estimado</p>
            <p className="text-xl font-black text-slate-800">¥{(tokens.estimatedCostYen || 0).toLocaleString()}</p>
            <p className="text-[9px] text-slate-400 font-bold">{(tokens.requests || 0)} requisições</p>
          </div>
        </div>

        {/* Saldo / Cota */}
        <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-violet-500" />
          </div>
          <div className="w-full">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                {balance !== null ? 'Saldo tokens' : 'Free Tier'}
              </p>
              <p className="text-[9px] font-black text-slate-700">
                {balance !== null
                  ? `${balance.toLocaleString()} restantes`
                  : `${(tokens.total || 0).toLocaleString()} / ${FREE_LIMIT.toLocaleString()}`
                }
              </p>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5">
              <div className={cn('h-1.5 rounded-full', isOverLimit ? 'bg-red-500' : 'bg-violet-500')}
                style={{ width: `${usedPct}%` }} />
            </div>
            {isOverLimit && (
              <p className="text-[9px] text-red-500 font-black mt-1">⚠️ Limite atingido</p>
            )}
          </div>
        </div>
      </div>

      {/* Histórico 3 meses */}
      {data?.history?.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
          {data.history.map((h: any, i: number) => (
            <div key={h.month} className={cn(
              'p-3 rounded-xl border text-center',
              i === 0 ? 'border-violet-200 bg-violet-50' : 'border-slate-100 bg-slate-50'
            )}>
              <p className="text-[9px] font-black text-slate-400">{h.month}</p>
              <p className="text-sm font-black text-slate-700">{(h.total || 0).toLocaleString()}</p>
              <p className="text-[9px] text-slate-400">{h.requests || 0} req</p>
            </div>
          ))}
        </div>
      )}

      {/* CTA compra (placeholder futuro) */}
      <button
        disabled
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-300 text-xs font-black cursor-not-allowed"
      >
        <ShoppingCart className="w-4 h-4" />
        Comprar tokens adicionais (em breve)
      </button>
    </div>
  );
}
