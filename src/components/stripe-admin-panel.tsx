'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Package, Users, TrendingUp, PlusCircle, RefreshCw,
  Loader2, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  DollarSign, Calendar, Edit2, Power, Trash2, Tag, ArrowUpRight,
  ToggleLeft, ToggleRight, Plus, X, Settings, Save
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase/provider';

type StripePrice = {
  id: string; amount: number; currency: string;
  interval?: string; interval_count?: number; active: boolean;
};
type StripeProduct = {
  id: string; name: string; description: string | null;
  active: boolean; created: number; prices: StripePrice[];
};
type StripeSubscription = {
  id: string;
  status: string;
  created: number;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  cancel_at: number | null;
  canceled_at: number | null;
  ended_at: number | null;
  trial_start: number | null;
  trial_end: number | null;
  billing_cycle_anchor: number;
  collection_method: string;
  latest_invoice: string | null;
  customer: { id: string; email: string | null; name: string | null; phone: string | null };
  product: { id: string; name: string };
  price: { id: string; amount: number; currency: string; interval: string; interval_count: number };
};

const fmt = (amount: number, currency: string) => {
  const isZeroDecimal = ['jpy', 'krw', 'clp', 'pyg'].includes(currency.toLowerCase());
  const value = isZeroDecimal ? amount : amount / 100;
  return new Intl.NumberFormat('ja-JP', { 
    style: 'currency', 
    currency: currency.toUpperCase() 
  }).format(value);
};

const statusConfig: Record<string, { label: string; color: string }> = {
  active:   { label: 'Ativo',      color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  trialing: { label: 'Trial',      color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  past_due: { label: 'Atrasado',   color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  canceled: { label: 'Cancelado',  color: 'bg-red-500/15 text-red-400 border-red-500/20' },
  incomplete:{ label: 'Incompleto', color: 'bg-slate-500/15 text-slate-400 border-slate-500/20' },
};

type StripeConfigForm = {
  mode: 'live' | 'test';
  liveSecretKey: string;
  testSecretKey: string;
  livePriceId: string;
  testPriceId: string;
  liveWebhookSecret: string;
  testWebhookSecret: string;
  livePublishableKey: string;
  testPublishableKey: string;
  receiptPriceId: string;
  memberPriceId: string;
  mypagePriceId: string;
};

const EMPTY_CONFIG: StripeConfigForm = {
  mode: 'test',
  liveSecretKey: '', testSecretKey: '',
  livePriceId: '', testPriceId: '',
  liveWebhookSecret: '', testWebhookSecret: '',
  livePublishableKey: '', testPublishableKey: '',
  receiptPriceId: '', memberPriceId: '', mypagePriceId: '',
};

const fmtDate = (ts: number | null | undefined) => {
  if (!ts) return '—';
  return new Date(ts * 1000).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
};

const intervalLabel: Record<string, string> = {
  day: 'dia', week: 'semana', month: 'mês', year: 'ano',
};

function SubscriptionCard({ sub, mode, onReload }: { sub: StripeSubscription, mode: string, onReload: () => void }) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useUser();
  const sc = statusConfig[sub.status] || { label: sub.status, color: 'bg-slate-100 text-slate-500 border-slate-200' };
  const isCancelPending = sub.cancel_at_period_end && sub.status === 'active';

  const info: { label: string; value: string; highlight?: string }[] = [
    { label: 'ID da Assinatura', value: sub.id },
    { label: 'ID do Cliente', value: sub.customer.id },
    { label: 'Nome', value: sub.customer.name || '—' },
    { label: 'Telefone', value: sub.customer.phone || '—' },
    { label: 'Produto', value: sub.product.name },
    { label: 'Plano', value: `${fmt(sub.price.amount, sub.price.currency)} / ${sub.price.interval_count > 1 ? sub.price.interval_count + ' ' : ''}${intervalLabel[sub.price.interval] ?? sub.price.interval}` },
    { label: 'Price ID', value: sub.price.id },
    { label: 'Data de criação', value: fmtDate(sub.created) },
    { label: 'Início do período', value: fmtDate(sub.current_period_start) },
    { label: 'Fim do período (renovação)', value: fmtDate(sub.current_period_end), highlight: isCancelPending ? 'text-red-600' : 'text-emerald-600' },
    ...(sub.trial_start ? [{ label: 'Início do trial', value: fmtDate(sub.trial_start) }] : []),
    ...(sub.trial_end ? [{ label: 'Fim do trial', value: fmtDate(sub.trial_end) }] : []),
    ...(sub.cancel_at ? [{ label: 'Cancelamento agendado para', value: fmtDate(sub.cancel_at), highlight: 'text-red-600' }] : []),
    ...(sub.canceled_at ? [{ label: 'Cancelado em', value: fmtDate(sub.canceled_at), highlight: 'text-red-500' }] : []),
    ...(sub.ended_at ? [{ label: 'Encerrado em', value: fmtDate(sub.ended_at), highlight: 'text-slate-400' }] : []),
    { label: 'Âncora de cobrança', value: fmtDate(sub.billing_cycle_anchor) },
    { label: 'Método de cobrança', value: sub.collection_method === 'charge_automatically' ? 'Automático' : 'Envio de fatura' },
    ...(sub.latest_invoice ? [{ label: 'Última fatura ID', value: sub.latest_invoice }] : []),
  ];

  const handleDelete = async () => {
    if (!confirm('Excluir esta compra vai cancelar o plano imediatamente. Deseja prosseguir?')) return;
    setIsDeleting(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/stripe/admin/subscriptions?subscriptionId=${sub.id}&mode=${mode}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: 'Assinatura excluída (cancelada)' });
      onReload();
    } catch(err: any) {
      toast({ variant: 'destructive', title: 'Erro ao excluir', description: err.message });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white hover:shadow-sm transition-all relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-800 truncate">{sub.customer.email || sub.customer.name || sub.customer.id}</p>
            <p className="text-[11px] font-bold text-slate-400 truncate">{sub.product.name} • <span className="font-mono">{sub.id.slice(0, 14)}…</span></p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-black text-slate-800">{fmt(sub.price.amount, sub.price.currency)}<span className="text-[10px] text-slate-400 font-bold">/{intervalLabel[sub.price.interval] ?? sub.price.interval}</span></p>
            <p className="text-[10px] text-slate-400 font-bold">Renova: {fmtDate(sub.current_period_end)}</p>
          </div>
          <span className={cn('text-[10px] font-black px-2.5 py-1 rounded-full border', sc.color)}>
            {isCancelPending ? 'Cancela no fim' : sc.label}
          </span>
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 px-6 py-5 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {info.map(({ label, value, highlight }) => (
              <div key={label} className="bg-white rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className={cn('text-xs font-bold break-all', highlight || 'text-slate-700')}>{value}</p>
              </div>
            ))}
          </div>
          
          {mode === 'test' && sub.status !== 'canceled' && (
            <div className="mt-4 flex justify-end">
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-xl h-8 text-[11px] font-black tracking-wide"
              >
                {isDeleting ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Trash2 className="w-3 h-3 mr-2" />}
                Excluir Teste e Cancelar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubscriptionsTab({ subscriptions, loading, loadError, mode, onReload }: {
  subscriptions: StripeSubscription[];
  loading: boolean;
  loadError: string | null;
  mode: string;
  onReload: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <p className="text-sm font-black text-slate-700">Todas as Assinaturas</p>
        <span className="text-[11px] font-bold text-slate-400">{subscriptions.length} registro{subscriptions.length !== 1 ? 's' : ''}</span>
      </div>
      {!loading && subscriptions.length === 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl px-6 py-10 text-center text-slate-400 text-sm font-bold">
          {loadError ? `Erro: ${loadError}` : 'Nenhuma assinatura encontrada'}
        </div>
      )}
      {subscriptions.map(sub => (
        <SubscriptionCard key={sub.id} sub={sub} mode={mode} onReload={onReload} />
      ))}
    </div>
  );
}

export function StripeAdminPanel() {
  const { toast } = useToast();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'subscriptions' | 'config'>('overview');
  const [loading, setLoading] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // Data
  const [products, setProducts] = useState<StripeProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<StripeSubscription[]>([]);
  const [mrr, setMrr] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Config tab
  const [configForm, setConfigForm] = useState<StripeConfigForm>(EMPTY_CONFIG);
  const [configLoading, setConfigLoading] = useState(false);
  const [configUpdatedAt, setConfigUpdatedAt] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; accountId?: string; businessName?: string; keySource?: string; error?: string } | null>(null);
  const [testLoading, setTestLoading] = useState(false);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const loadConfig = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/stripe/admin/config', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error('[StripeAdminPanel] Config load failed:', res.status, errData);
        return;
      }
      const data = await res.json();
      console.log('[StripeAdminPanel] Config raw data:', data);

      const config = data.config ?? data;
      
      if (config && typeof config === 'object' && !config.error) {
        const { updatedAt, ...rest } = config;
        // Merge with EMPTY_CONFIG to ensure all fields exist
        setConfigForm(prev => ({ ...prev, ...rest }));
        if (updatedAt) setConfigUpdatedAt(updatedAt);
      }
    } catch (e) {
      console.error('[StripeAdminPanel] Error loading config:', e);
    } finally {
      setConfigLoaded(true);
    }
  }, [user]);

  const handleSaveConfig = async () => {
    setConfigLoading(true);
    setTestResult(null);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/stripe/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify(configForm),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const savedAt = data.config?.updatedAt ?? data.updatedAt ?? new Date().toISOString();
      setConfigUpdatedAt(savedAt);
      await fetch('/api/stripe/admin/config/invalidate', { method: 'POST', headers: authHeaders }).catch(() => {});
      toast({ title: 'Configurações salvas', description: 'As novas chaves serão aplicadas na próxima requisição.' });
      await loadProducts();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
    } finally {
      setConfigLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch(`/api/stripe/admin/test?mode=${configForm.mode}`, { headers: authHeaders });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSyncModulePrices = async () => {
    setConfigLoading(true);
    try {
      const authHeaders = await getAuthHeaders();
      const res = await fetch('/api/stripe/admin/sync-module-prices', {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast({ 
        title: 'Preços Sincronizados', 
        description: `Módulos mapeados com sucesso (${Object.keys(data.updated || {}).length} módulos encontrados).` 
      });
      await loadConfig();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro na sincronização', description: e.message });
    } finally {
      setConfigLoading(false);
    }
  };

  const loadProducts = useCallback(async (modeOverride?: string) => {
    const mode = modeOverride || configForm.mode;
    const authHeaders = user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {};
    const res = await fetch(`/api/stripe/admin/products?mode=${mode}`, { headers: authHeaders });
    const data = await res.json();
    if (data.error) {
      setLoadError(data.error);
      setProducts([]);
    } else if (data.products) {
      setLoadError(null);
      setProducts(data.products);
    }
  }, [user, configForm.mode]);

  const loadSubscriptions = useCallback(async (modeOverride?: string) => {
    const mode = modeOverride || configForm.mode;
    const authHeaders = user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {};
    const res = await fetch(`/api/stripe/admin/subscriptions?mode=${mode}`, { headers: authHeaders });
    const data = await res.json();
    if (data.error) {
      setSubscriptions([]);
    } else if (data.subscriptions) {
      setSubscriptions(data.subscriptions);
      setMrr(data.mrr || 0);
      setActiveCount(data.activeCount || 0);
    }
  }, [user, configForm.mode]);

  const loadAll = useCallback(() => {
    setLoading(true);
    Promise.all([loadProducts(), loadSubscriptions()]).finally(() => setLoading(false));
  }, [loadProducts, loadSubscriptions]);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  useEffect(() => {
    if (configLoaded) loadAll();
  }, [configForm.mode, loadAll, configLoaded]);

  const tabs = [
    { id: 'overview',      label: 'Métricas',      icon: TrendingUp },
    { id: 'products',      label: 'Produtos',      icon: Package },
    { id: 'subscriptions', label: 'Assinaturas',   icon: Users },
    { id: 'config',         label: 'Configurações',   icon: Settings },
  ] as const;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-slate-900" />
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Stripe Integration</h2>
            <div className={cn(
              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
              configForm.mode === 'live' ? "bg-emerald-500/10 text-emerald-600" : "bg-blue-500/10 text-blue-600"
            )}>
              {configForm.mode === 'live' ? 'Live Mode' : 'Test Mode'}
            </div>
          </div>
          <p className="text-slate-400 font-bold text-sm">Painel de controle de faturamento e chaves de API</p>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-[2rem] gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-[1.5rem] text-sm font-black transition-all",
                activeTab === tab.id 
                  ? "bg-white text-slate-900 shadow-sm" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">MRR (Mensal)</p>
            <p className="text-3xl font-black text-slate-900">{fmt(mrr, 'jpy')}</p>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Assinaturas Ativas</p>
            <p className="text-3xl font-black text-slate-900">{activeCount}</p>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-black text-slate-700">Lista de Produtos</p>
            <Button variant="ghost" className="text-xs font-bold gap-2 text-slate-400" onClick={() => loadProducts()}>
              <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
          <div className="grid gap-4">
            {products.map(product => (
              <div key={product.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <p className="text-lg font-black text-slate-900">{product.name}</p>
                    <Badge variant={product.active ? "default" : "secondary"}>
                      {product.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-slate-400 max-w-xl">{product.description || 'Sem descrição'}</p>
                  <div className="flex flex-wrap gap-4 pt-2">
                    {product.prices.map(price => (
                      <div key={price.id} className="bg-slate-50 px-4 py-2 rounded-2xl flex flex-col gap-0.5">
                        <p className="text-sm font-black text-slate-900">{fmt(price.amount, price.currency)} / {price.interval === 'month' ? 'month' : price.interval}</p>
                        <p className="text-[9px] font-mono text-slate-300 uppercase tracking-tighter">{price.id}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <SubscriptionsTab 
          subscriptions={subscriptions} 
          loading={loading} 
          loadError={loadError} 
          mode={configForm.mode}
          onReload={() => loadSubscriptions()}
        />
      )}

      {activeTab === 'config' && (
        <div className="max-w-4xl space-y-6">
          <div className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden shadow-2xl">
             <div className="relative z-10 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-4 h-4 rounded-full animate-pulse",
                      configForm.mode === 'live' ? "bg-emerald-400" : "bg-blue-400"
                    )} />
                    <div>
                      <h3 className="text-xl font-black tracking-tight">
                        {configForm.mode === 'live' ? 'Modo Produção (LIVE)' : 'Modo Teste (TEST)'}
                      </h3>
                      <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                        Última atualização: {configUpdatedAt ? new Date(configUpdatedAt).toLocaleString() : 'Nunca'}
                      </p>
                    </div>
                  </div>

                  <Button 
                    onClick={handleTestConnection}
                    disabled={testLoading}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-2xl px-6 font-black text-xs h-10 border border-white/10 gap-2 backdrop-blur-md"
                  >
                    {testLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Testar Conexão
                  </Button>
                </div>

                {testResult && (
                  <div className={cn(
                    "p-6 rounded-[2rem] border animate-in slide-in-from-top-2 duration-300",
                    testResult.ok ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"
                  )}>
                    <div className="flex items-start gap-4">
                      {testResult.ok ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 mt-0.5" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-400 mt-0.5" />
                      )}
                      <div>
                        <p className={cn("text-base font-black truncate", testResult.ok ? "text-emerald-400" : "text-red-400")}>
                          {testResult.ok ? 'Conexão Bem-sucedida' : 'Falha na Conexão'}
                        </p>
                        {testResult.ok ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mt-1">
                            <p className="text-[11px] font-bold text-white/60">Account: <span className="text-white ml-1">{testResult.accountId}</span></p>
                            <p className="text-[11px] font-bold text-white/60">Business: <span className="text-white ml-1">{testResult.businessName}</span></p>
                          </div>
                        ) : (
                          <p className="text-xs font-medium text-red-300/80 mt-1 leading-relaxed">{testResult.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
               onClick={() => setConfigForm(f => ({ ...f, mode: 'test' }))}
               className={cn(
                 "p-6 rounded-[2.5rem] border-2 transition-all text-left group",
                 configForm.mode === 'test' ? "bg-blue-50/50 border-blue-500/50" : "bg-white border-slate-100 hover:border-slate-200"
               )}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-3 h-3 rounded-full", configForm.mode === 'test' ? "bg-blue-500" : "bg-slate-300")} />
                <span className={cn("text-sm font-black", configForm.mode === 'test' ? "text-blue-900" : "text-slate-400")}>Teste (Test)</span>
              </div>
            </button>
            <button
               onClick={() => setConfigForm(f => ({ ...f, mode: 'live' }))}
               className={cn(
                 "p-6 rounded-[2.5rem] border-2 transition-all text-left",
                 configForm.mode === 'live' ? "bg-emerald-50/50 border-emerald-500/50" : "bg-white border-slate-100 hover:border-slate-200"
               )}
            >
               <div className="flex items-center gap-3 mb-2">
                 <div className={cn("w-3 h-3 rounded-full", configForm.mode === 'live' ? "bg-emerald-500" : "bg-slate-300")} />
                 <span className={cn("text-sm font-black", configForm.mode === 'live' ? "text-emerald-900" : "text-slate-400")}>Produção (Live)</span>
               </div>
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
            {[
              { group: 'CHAVES DE TESTE', color: 'bg-blue-50', fields: [
                { key: 'testSecretKey',      label: 'Secret Key',       placeholder: 'sk_test_...' },
                { key: 'testPublishableKey', label: 'Publishable Key',  placeholder: 'pk_test_...' },
                { key: 'testPriceId',        label: 'Price ID',         placeholder: 'price_...' },
                { key: 'testWebhookSecret',  label: 'Webhook Secret',   placeholder: 'whsec_...' },
              ]},
              { group: 'CHAVES DE PRODUÇÃO', color: 'bg-emerald-50', fields: [
                { key: 'liveSecretKey',      label: 'Secret Key',       placeholder: 'sk_live_...' },
                { key: 'livePublishableKey', label: 'Publishable Key',  placeholder: 'pk_live_...' },
                { key: 'livePriceId',        label: 'Price ID',         placeholder: 'price_...' },
                { key: 'liveWebhookSecret',  label: 'Webhook Secret',   placeholder: 'whsec_...' },
              ]},
              { group: 'PREÇOS POR MÓDULO', color: 'bg-violet-50', fields: [
                { key: 'receiptPriceId', label: 'コスト管理',   placeholder: 'price_...' },
                { key: 'memberPriceId',  label: 'メンバー管理', placeholder: 'price_...' },
                { key: 'mypagePriceId',  label: 'マイページ',   placeholder: 'price_...' },
              ]},
            ].map(group => (
              <div key={group.group}>
                <div className={cn('px-5 py-2.5 border-b border-slate-100', group.color)}>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{group.group}</p>
                </div>
                <div className="divide-y divide-slate-50">
                  {group.fields.map(field => (
                    <div key={field.key} className="flex items-center gap-4 px-5 py-3">
                      <span className="w-32 text-[11px] font-black text-slate-400 uppercase tracking-wide flex-shrink-0">{field.label}</span>
                      <Input
                        type="text"
                        placeholder={field.placeholder}
                        value={(configForm as any)[field.key] || ''}
                        onChange={e => setConfigForm(f => ({ ...f, [field.key]: e.target.value }))}
                        className="h-9 rounded-xl font-mono text-xs border-slate-200 flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <Button
              onClick={handleSaveConfig}
              disabled={configLoading}
              className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar Configurações
            </Button>
            <Button
              onClick={handleSyncModulePrices}
              disabled={configLoading}
              variant="outline"
              className="flex-1 h-12 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-2xl font-black text-sm gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", configLoading && "animate-spin")} />
              Sincronizar Preços dos Módulos
            </Button>
            <Button
              onClick={() => { loadConfig(); loadAll(); }}
              variant="outline"
              className="h-12 px-5 rounded-2xl font-black text-sm border-slate-200"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
