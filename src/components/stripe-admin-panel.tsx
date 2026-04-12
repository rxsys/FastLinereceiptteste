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
};

const EMPTY_CONFIG: StripeConfigForm = {
  mode: 'test',
  liveSecretKey: '', testSecretKey: '',
  livePriceId: '', testPriceId: '',
  liveWebhookSecret: '', testWebhookSecret: '',
  livePublishableKey: '', testPublishableKey: '',
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

function SubscriptionCard({ sub }: { sub: StripeSubscription }) {
  const [open, setOpen] = useState(false);
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

  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white hover:shadow-sm transition-all">
      {/* Header row */}
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

      {/* Expanded details */}
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
        </div>
      )}
    </div>
  );
}

function SubscriptionsTab({ subscriptions, loading, loadError }: {
  subscriptions: StripeSubscription[];
  loading: boolean;
  loadError: string | null;
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
        <SubscriptionCard key={sub.id} sub={sub} />
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
        const text = await res.text();
        throw new Error(`Failed to load config: ${res.status} ${text}`);
      }

      const data = await res.json();
      const config = data.config ?? data;
      
      if (config && typeof config === 'object' && !config.error) {
        const { updatedAt, ...rest } = config;
        // Merge with EMPTY_CONFIG to ensure all fields exist
        setConfigForm(prev => ({ ...prev, ...rest }));
        if (updatedAt) setConfigUpdatedAt(updatedAt);
        console.log('[StripeAdminPanel] Config loaded successfully');
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
  }, [configForm.mode, user]);

  const loadSubscriptions = useCallback(async (modeOverride?: string) => {
    const mode = modeOverride || configForm.mode;
    const authHeaders = user ? { Authorization: `Bearer ${await user.getIdToken()}` } : {};
    const res = await fetch(`/api/stripe/admin/subscriptions?status=all&mode=${mode}`, { headers: authHeaders });
    const data = await res.json();
    if (data.subscriptions) {
      setLoadError(null);
      setSubscriptions(data.subscriptions);
      setMrr(data.mrr || 0);
      setActiveCount(data.activeCount || 0);
    } else if (data.error) {
      console.error('[StripeAdminPanel] subscriptions error:', data.error);
      setLoadError(data.error);
      setSubscriptions([]);
      setMrr(0);
      setActiveCount(0);
    }
  }, [configForm.mode, user]);

  const loadAll = useCallback(async (modeOverride?: string) => {
    setLoading(true);
    try {
      await Promise.all([loadProducts(modeOverride), loadSubscriptions(modeOverride)]);
    } finally {
      setLoading(false);
    }
  }, [loadProducts, loadSubscriptions]);

  // Carrega configurações iniciais
  useEffect(() => { loadConfig(); }, [loadConfig]);

  // Recarrega dados somente após config ser carregada (evita race condition com mode='test')
  useEffect(() => {
    if (configLoaded) loadAll();
  }, [configForm.mode, loadAll, configLoaded]);

  const tabs = [
    { id: 'overview',       label: 'Métricas',       icon: TrendingUp },
    { id: 'products',       label: 'Produtos',       icon: Package },
    { id: 'subscriptions',  label: 'Assinaturas',    icon: Users },
    { id: 'config',         label: 'Configurações',   icon: Settings },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#635BFF] rounded-2xl flex items-center justify-center shadow-lg shadow-[#635BFF]/30">
            <CreditCard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 tracking-tight">Stripe Integration</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Painel de Controle de Faturamento</p>
          </div>
        </div>
        <Button
          variant="ghost" size="sm"
          onClick={loadAll}
          disabled={loading}
          className="text-slate-400 hover:text-slate-700 gap-2 h-9 font-bold"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          Atualizar
        </Button>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black transition-all',
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ERRO */}
      {loadError && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-red-700">Erro na API do Stripe</p>
            <p className="text-xs text-red-500 font-mono mt-1 break-all">{loadError}</p>
            <p className="text-[11px] text-red-600 font-bold mt-2">
              As chaves da API não estão configuradas ou são inválidas.
              <button
                onClick={() => setActiveTab('config')}
                className="underline ml-1 hover:text-red-800"
              >
                → Vá para a aba de Configurações para inserir as chaves
              </button>
            </p>
          </div>
        </div>
      )}

      {/* MÉTRICAS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'MRR (Mensal)', value: fmt(mrr, 'jpy'), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100' },
              { label: 'Assinaturas Ativas', value: activeCount.toString(), icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-100' },
              { label: 'Total de Produtos', value: products.length.toString(), icon: Package, color: 'text-purple-500', bg: 'bg-purple-50 border-purple-100' },
            ].map(kpi => (
              <div key={kpi.label} className={cn('p-5 rounded-[1.5rem] border flex items-center gap-4', kpi.bg)}>
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-white border', kpi.border)}>
                  <kpi.icon className={cn('w-5 h-5', kpi.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tight">{kpi.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-sm font-black text-slate-700">Assinaturas Recentes</p>
            </div>
            <div className="divide-y divide-slate-50">
              {subscriptions.slice(0, 5).map(sub => (
                <div key={sub.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Users className="w-4 h-4 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">{sub.customer.email || sub.customer.name || sub.customer.id}</p>
                      <p className="text-[10px] font-bold text-slate-400">{sub.product.name} • Renova: {fmtDate(sub.current_period_end)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-black text-slate-700">{fmt(sub.price.amount, sub.price.currency)}</p>
                    <span className={cn('text-[9px] font-black px-2 py-0.5 rounded-full border', statusConfig[sub.status]?.color || 'bg-slate-100 text-slate-500 border-slate-200')}>
                      {statusConfig[sub.status]?.label || sub.status}
                    </span>
                  </div>
                </div>
              ))}
              {subscriptions.length === 0 && (
                <div className="px-6 py-10 text-center text-slate-400 text-xs font-bold">Nenhuma assinatura encontrada</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PRODUTOS */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <p className="text-sm font-black text-slate-700">Lista de Produtos</p>
            </div>
            <div className="divide-y divide-slate-50">
              {products.map(product => (
                <div key={product.id} className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-800">{product.name}</h4>
                      <p className="text-xs text-slate-400">{product.description || 'Sem descrição'}</p>
                    </div>
                    <Badge variant={product.active ? 'default' : 'secondary'}>{product.active ? 'Ativo' : 'Inativo'}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {product.prices.map(price => (
                      <div key={price.id} className="p-3 bg-slate-50 rounded-xl flex justify-between items-center">
                        <span className="text-xs font-bold">{fmt(price.amount, price.currency)} / {price.interval}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase">{price.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="p-10 text-center text-slate-400 text-xs font-bold">Nenhum produto encontrado. Verifique suas chaves.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBSCRIPTIONS */}
      {activeTab === 'subscriptions' && (
        <SubscriptionsTab subscriptions={subscriptions} loading={loading} loadError={loadError} />
      )}

      {/* CONFIGURAÇÕES */}
      {activeTab === 'config' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className={cn('w-2.5 h-2.5 rounded-full', configForm.mode === 'live' ? 'bg-emerald-400' : 'bg-blue-400')} />
              <span className="text-white font-black text-sm">
                Modo {configForm.mode === 'live' ? 'Produção (LIVE)' : 'Teste (TEST)'}
              </span>
              {configUpdatedAt && (
                <span className="text-slate-400 text-[11px] font-bold">
                  Última atualização: {new Date(configUpdatedAt).toLocaleString('pt-BR')}
                </span>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleTestConnection}
              disabled={testLoading}
              className="bg-white/10 hover:bg-white/20 text-white border-none rounded-xl h-8 px-4 text-[11px] font-black gap-1.5"
            >
              {testLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
              Testar Conexão
            </Button>
          </div>

          {testResult && (
            <div className={cn(
              'flex items-start gap-3 p-4 rounded-2xl border',
              testResult.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            )}>
              {testResult.ok
                ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                : <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              }
              <div>
                <p className={cn('text-sm font-black', testResult.ok ? 'text-emerald-700' : 'text-red-700')}>
                  {testResult.ok ? 'Conexão Bem-sucedida' : 'Falha na Conexão'}
                </p>
                <p className="text-[11px] opacity-70 mt-0.5">{testResult.error || testResult.businessName || testResult.accountId}</p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {(['test', 'live'] as const).map(m => (
              <button
                key={m}
                onClick={() => setConfigForm(f => ({ ...f, mode: m }))}
                className={cn(
                  'flex-1 py-3 rounded-2xl border-2 font-black text-sm transition-all',
                  configForm.mode === m
                    ? m === 'live' ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300'
                )}
              >
                {m === 'live' ? '🟢 Produção (Live)' : '🔵 Teste (Test)'}
              </button>
            ))}
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden">
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
                        value={(configForm as any)[field.key]}
                        onChange={e => setConfigForm(f => ({ ...f, [field.key]: e.target.value }))}
                        className="h-9 rounded-xl font-mono text-xs border-slate-200 flex-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSaveConfig}
              disabled={configLoading}
              className="flex-1 h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar e Aplicar
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
