'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDatabase } from '@/firebase';
import { ref, query, orderByChild, limitToLast, endBefore, get } from 'firebase/database';
import { ChevronDown, ChevronRight, RefreshCw, Filter, User, Bot, Settings, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 50;

const ACTION_META: Record<string, { label: string; cls: string }> = {
  create: { label: '追加', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  update: { label: '更新', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  delete: { label: '削除', cls: 'bg-red-50 text-red-700 border-red-200' },
};

const ENTITY_LABEL: Record<string, string> = {
  expense: '経費', advance: '立替クレジット', lineUser: 'LINEユーザー',
  user: 'ユーザー', invite: '招待', project: 'プロジェクト',
  costcenter: '原価センター', owner: '企業', apiPool: 'LINE API', signature: '署名',
};

const SOURCE_META: Record<string, { label: string; icon: React.ElementType }> = {
  dashboard: { label: 'Dashboard', icon: Settings },
  line_bot:  { label: 'LINE Bot', icon: Bot },
  webhook:   { label: 'Webhook', icon: FileText },
  api:       { label: 'API', icon: Settings },
};

function fmtTs(ts: string) {
  try {
    const d = new Date(ts);
    return d.toLocaleString('ja-JP', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch { return ts; }
}

function DiffView({ before, after, diff }: { before?: any; after?: any; diff?: string[] }) {
  if (!before && !after) return null;
  const keys = diff?.length ? diff : [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  if (!keys.length) return null;

  return (
    <div className="grid grid-cols-2 gap-3 mt-3">
      {before && (
        <div className="bg-red-50 rounded-2xl p-3 border border-red-100">
          <p className="text-[8px] font-black text-red-400 uppercase tracking-wider mb-2">変更前</p>
          <div className="space-y-1">
            {keys.map(k => (
              <div key={k} className="flex gap-1 text-[10px]">
                <span className="font-black text-slate-500 shrink-0">{k}:</span>
                <span className="text-red-700 break-all font-mono">{String(before[k] ?? '—')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {after && (
        <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100">
          <p className="text-[8px] font-black text-emerald-400 uppercase tracking-wider mb-2">変更後</p>
          <div className="space-y-1">
            {keys.map(k => (
              <div key={k} className="flex gap-1 text-[10px]">
                <span className="font-black text-slate-500 shrink-0">{k}:</span>
                <span className="text-emerald-700 break-all font-mono">{String((after)[k] ?? '—')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LogRow({ log }: { log: any }) {
  const [open, setOpen] = useState(false);
  const action = ACTION_META[log.action] || { label: log.action, cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  const SourceIcon = SOURCE_META[log.source]?.icon || Settings;

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        className="w-full flex items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors text-left"
        onClick={() => setOpen(v => !v)}
      >
        {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
        <span className="text-[10px] font-mono text-slate-400 shrink-0 w-28">{fmtTs(log.timestamp)}</span>
        <span className="text-[10px] font-black text-slate-600 truncate w-28 shrink-0">
          {log.actor?.name || log.actor?.id || '—'}
        </span>
        <span className={cn('text-[8px] font-black px-2 py-0.5 rounded-full border shrink-0', action.cls)}>
          {action.label}
        </span>
        <span className="text-[10px] font-black text-slate-500 shrink-0">
          {ENTITY_LABEL[log.entity?.type] || log.entity?.type}
        </span>
        <span className="text-[10px] text-slate-400 truncate flex-1 min-w-0">{log.entity?.label || log.entity?.id}</span>
        <div className="flex items-center gap-1 shrink-0">
          <SourceIcon className="w-3 h-3 text-slate-300" />
          <span className="text-[8px] text-slate-300">{SOURCE_META[log.source]?.label || log.source}</span>
        </div>
      </button>

      {open && (
        <div className="px-10 pb-4 bg-slate-50/50">
          <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 mb-2">
            <span><span className="font-black">Path:</span> {log.entity?.path}</span>
            <span><span className="font-black">Role:</span> {log.actor?.role || '—'}</span>
            {log.actor?.email && <span><span className="font-black">Email:</span> {log.actor.email}</span>}
            {log.metadata?.inviteHash && <span><span className="font-black">Invite:</span> #{log.metadata.inviteHash}</span>}
          </div>
          {log.diff?.length > 0 && (
            <p className="text-[9px] text-slate-400 mb-1">
              <span className="font-black">変更フィールド:</span> {log.diff.join(', ')}
            </p>
          )}
          <DiffView before={log.before} after={log.after} diff={log.diff} />
        </div>
      )}
    </div>
  );
}

export function AuditLogPanel({ ownerId }: { ownerId: string }) {
  const database = useDatabase();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  const loadLogs = useCallback(async () => {
    if (!database || !ownerId) return;
    setLoading(true);
    try {
      const q = query(ref(database, `audit_logs/${ownerId}`), orderByChild('timestamp'), limitToLast(PAGE_SIZE));
      const snap = await get(q);
      const list: any[] = [];
      snap.forEach(child => list.push({ _key: child.key, ...child.val() }));
      setLogs(list.reverse());
    } catch (e) {
      console.warn('[AuditLogPanel] load failed:', e);
    } finally {
      setLoading(false);
    }
  }, [database, ownerId]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const filtered = logs.filter(l => {
    if (filterAction !== 'all' && l.action !== filterAction) return false;
    if (filterEntity !== 'all' && l.entity?.type !== filterEntity) return false;
    if (filterSource !== 'all' && l.source !== filterSource) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 text-white px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-slate-300" />
          <h3 className="font-black text-sm tracking-tight">監査ログ / Audit Log</h3>
          <Badge variant="outline" className="text-[9px] border-slate-600 text-slate-400 font-mono">
            {filtered.length}件
          </Badge>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={loadLogs}
          disabled={loading}
          className="text-white/50 hover:text-white rounded-xl h-8 gap-1.5 text-[10px] font-black"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          更新
        </Button>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2 flex-wrap">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="h-8 rounded-xl text-[10px] font-black w-28 border-slate-200">
            <SelectValue placeholder="操作" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全操作</SelectItem>
            <SelectItem value="create">追加</SelectItem>
            <SelectItem value="update">更新</SelectItem>
            <SelectItem value="delete">削除</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterEntity} onValueChange={setFilterEntity}>
          <SelectTrigger className="h-8 rounded-xl text-[10px] font-black w-32 border-slate-200">
            <SelectValue placeholder="エンティティ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全エンティティ</SelectItem>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterSource} onValueChange={setFilterSource}>
          <SelectTrigger className="h-8 rounded-xl text-[10px] font-black w-28 border-slate-200">
            <SelectValue placeholder="ソース" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全ソース</SelectItem>
            <SelectItem value="dashboard">Dashboard</SelectItem>
            <SelectItem value="line_bot">LINE Bot</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
          </SelectContent>
        </Select>
        {(filterAction !== 'all' || filterEntity !== 'all' || filterSource !== 'all') && (
          <Button variant="ghost" size="sm" className="h-8 rounded-xl text-[10px] font-black text-slate-400"
            onClick={() => { setFilterAction('all'); setFilterEntity('all'); setFilterSource('all'); }}>
            クリア
          </Button>
        )}
      </div>

      {/* Column headers */}
      <div className="hidden sm:grid grid-cols-[16px_112px_112px_56px_80px_1fr_80px] gap-3 px-6 py-2 bg-slate-50 border-b border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-widest">
        <span />
        <span>日時</span>
        <span>ユーザー</span>
        <span>操作</span>
        <span>種別</span>
        <span>対象</span>
        <span>ソース</span>
      </div>

      {/* Rows */}
      <div className="divide-y divide-slate-50">
        {loading && logs.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-[11px] text-slate-300 font-bold py-16">ログがありません</p>
        )}
        {filtered.map(log => <LogRow key={log._key} log={log} />)}
      </div>

      {logs.length >= PAGE_SIZE && (
        <div className="px-6 py-3 border-t border-slate-100 text-center">
          <p className="text-[9px] text-slate-400 font-bold">最新 {PAGE_SIZE} 件を表示しています</p>
        </div>
      )}
    </div>
  );
}
