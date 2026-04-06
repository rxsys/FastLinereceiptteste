'use client';

import { useUser } from '@/firebase';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Cpu, Zap, Activity, Coins, RefreshCw } from "lucide-react";
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function DevAIPanel() {
  const { user } = useUser();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);

  const fetchUsage = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/admin/ai-usage', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsage(data);
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erro ao buscar métricas da IA" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [user]);

  if (loading && !usage) {
    return <Card className="rounded-[2.5rem] border shadow-sm p-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500"/></Card>;
  }

  return (
    <Card className="rounded-[2.5rem] border shadow-sm overflow-hidden bg-white">
      <CardHeader className="bg-slate-900 border-b border-white/10 p-6 sm:p-8 flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-black text-white flex items-center gap-2">Google AI Console</CardTitle>
            <p className="text-xs text-indigo-400/70 font-mono tracking-widest mt-1">MODEL: {usage?.model?.toUpperCase() || 'UNKNOWN'}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchUsage} disabled={loading} className="text-white/50 hover:bg-white/10 hover:text-white rounded-xl">
          <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
        </Button>
      </CardHeader>
      
      <CardContent className="p-6 sm:p-8">
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            
            {/* Tokens Utilizados */}
            <div className="p-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                 <Zap className="w-5 h-5 text-amber-500" />
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Tokens (Mês)</p>
                 <p className="text-2xl font-black text-slate-800 tracking-tight">{(usage?.tokens?.total || 0).toLocaleString()}</p>
                 <div className="flex items-center gap-2 mt-1">
                   <Badge className="bg-amber-100 text-amber-700 border-none text-[8px] h-4 py-0">IN: {(usage?.tokens?.input || 0).toLocaleString()}</Badge>
                   <Badge className="bg-blue-100 text-blue-700 border-none text-[8px] h-4 py-0">OUT: {(usage?.tokens?.output || 0).toLocaleString()}</Badge>
                 </div>
               </div>
            </div>

            {/* Custo Estimado */}
            <div className="p-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                 <Coins className="w-5 h-5 text-emerald-500" />
               </div>
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custo Estimado (API)</p>
                 <p className="text-2xl font-black text-slate-800 tracking-tight">¥{(usage?.tokens?.estimatedCostYen || 0).toLocaleString()}</p>
                 <p className="text-[9px] text-slate-400 font-bold mt-1">Free Tier pode estar ativo</p>
               </div>
            </div>

            {/* Quota RPM */}
            <div className="p-5 rounded-[1.5rem] border border-slate-100 bg-slate-50 flex items-center gap-4">
               <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                 <Activity className="w-5 h-5 text-blue-500" />
               </div>
               <div className="w-full">
                 <div className="flex justify-between items-center mb-1">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requisições (RPM)</p>
                   <p className="text-[10px] font-black text-slate-800">{usage?.quota?.used || 0} / {usage?.quota?.limit || 1500}</p>
                 </div>
                 <div className="w-full bg-slate-200 rounded-full h-2">
                   <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, ((usage?.quota?.used || 0) / (usage?.quota?.limit || 1)) * 100)}%` }} />
                 </div>
                 <p className="text-[9px] text-slate-400 font-bold mt-1 text-right">RPM: Requisições por minuto</p>
               </div>
            </div>

         </div>

         <div className="mt-6 flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
           <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Status da API</span>
           </div>
           <Badge className="bg-indigo-100 text-indigo-700 border-none">{usage?.status === 'active' ? "ONLINE" : "OFFLINE"}</Badge>
         </div>
      </CardContent>
    </Card>
  );
}
