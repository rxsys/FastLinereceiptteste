'use client';

import { useRTDBCollection } from '@/firebase/rtdb';
import { useMemoFirebase, useUser, useDatabase } from '@/firebase';
import { auditAction } from '@/app/actions/audit';
import { ref, update, remove } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Briefcase, Filter, User, Users, Download,
  ShieldCheck, Clock, Calendar, AlertCircle,
  CheckSquare, Square, Trash2, LayoutList, LayoutGrid,
  ChevronDown, ChevronRight, Image as ImageIcon
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from '@/lib/utils';

import { EditExpenseDialog } from './expenses/EditExpenseDialog';
import { ManualTransactionDialog } from './expenses/ManualTransactionDialog';
import * as XLSX from 'xlsx';
import { Expense, LineUser, CostCenter } from '@/types';

// ── Helpers de formatação ─────────────────────────────────────────────────────
function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function toMonthKey(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}
function fmtMonthLabel(key: string) {
  const [y, m] = key.split('-');
  return `${y}年${parseInt(m)}月`;
}

// ── Selo NTA ─────────────────────────────────────────────────────────────────
function NtaSeal({ status, small = false }: { status?: string; small?: boolean }) {
  if (status === 'verified') return (
    <div className={`flex items-center gap-1 bg-emerald-500 text-white rounded-full font-black shadow-sm shadow-emerald-200 ${small ? 'px-2 py-0.5 text-[8px]' : 'px-3 py-1 text-[10px]'}`}>
      <ShieldCheck className={small ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
      適格請求書
    </div>
  );
  if (status === 'not_found') return (
    <div className={`flex items-center gap-1 bg-slate-100 text-slate-400 rounded-full font-black ${small ? 'px-2 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'}`}>
      <AlertCircle className="w-2.5 h-2.5" /> 未登録
    </div>
  );
  if (status === 'failed') return (
    <div className={`flex items-center gap-1 bg-red-50 text-red-400 rounded-full font-black ${small ? 'px-2 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'}`}>
      <AlertCircle className="w-2.5 h-2.5" /> 確認失敗
    </div>
  );
  return (
    <div className={`flex items-center gap-1 bg-amber-50 text-amber-400 rounded-full font-black ${small ? 'px-2 py-0.5 text-[8px]' : 'px-2 py-0.5 text-[9px]'}`}>
      <AlertCircle className="w-2.5 h-2.5" /> NTA確認待ち
    </div>
  );
}

// ── Linha de despesa ─────────────────────────────────────────────────────────
function ExpenseRow({
  exp, onClick, amber = false,
  selected, onSelect, showCheckbox, isDuplicate = false,
}: {
  exp: any; onClick: () => void; amber?: boolean;
  selected?: boolean; onSelect?: (id: string) => void; showCheckbox?: boolean; isDuplicate?: boolean;
}) {
  const [imgHovered, setImgHovered] = useState(false);
  const isRejected = exp.reviewStatus === 'rejected';

  return (
    <TableRow className={cn(
      'cursor-pointer transition-colors group',
      amber ? 'hover:bg-amber-100/20 border-b border-amber-100' : 'hover:bg-slate-50/80',
      selected && 'bg-blue-50/60',
      isRejected && 'opacity-50 bg-slate-50/80',
    )}>
      {/* Checkbox bulk select */}
      {showCheckbox && (
        <TableCell className="pl-4 py-4 w-8" onClick={e => { e.stopPropagation(); onSelect?.(exp.id); }}>
          <div className="flex items-center justify-center w-5 h-5 rounded border-2 border-slate-300 cursor-pointer hover:border-blue-500 transition-colors"
            style={{ background: selected ? '#3b82f6' : 'white', borderColor: selected ? '#3b82f6' : undefined }}>
            {selected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </div>
        </TableCell>
      )}

      {/* Remetente + NTA */}
      <TableCell className="pl-6 py-4 w-[200px]" onClick={onClick}>
        <div className="flex flex-col gap-1">
          <span className="text-sm font-black text-slate-800">{exp.senderName}</span>
          {(exp.registrationNumber || exp.ntaStatus) && <NtaSeal status={exp.ntaStatus} small />}
        </div>
      </TableCell>

      {/* Imagem preview */}
      <TableCell className="py-4 w-12 hidden sm:table-cell" onClick={onClick}>
        {exp.imageUrl ? (
          <div className="relative" onMouseEnter={() => setImgHovered(true)} onMouseLeave={() => setImgHovered(false)}>
            <img
              src={exp.imageUrl}
              alt="receipt"
              className="w-9 h-9 rounded-lg object-cover border border-slate-200 shadow-sm"
              onClick={e => { e.stopPropagation(); window.open(exp.imageUrl, '_blank'); }}
            />
            {imgHovered && (
              <div className="absolute left-10 top-0 z-50 w-48 h-64 rounded-xl overflow-hidden shadow-2xl border border-slate-200 bg-white">
                <img src={exp.imageUrl} alt="receipt preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-slate-300" />
          </div>
        )}
      </TableCell>

      {/* Descrição + status badge */}
      <TableCell className="py-4" onClick={onClick}>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-slate-700">{exp.description?.substring(0, 45)}</span>
            {isRejected
              ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold shrink-0 border border-red-200">❌ 否認</span>
              : exp.reviewStatus === 'approved'
              ? <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold shrink-0 border border-emerald-200">✅ 受取済み</span>
              : <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold shrink-0 border border-amber-200">🔍 審査中</span>
            }
            {isRejected && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 font-black shrink-0">集計対象外</span>
            )}
            {((exp as any).duplicateFlag || isDuplicate) && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-bold shrink-0 border border-orange-300">⚠️ 重複要確認</span>
            )}
            {exp.paymentType === 'company' && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-blue-100 text-blue-700 font-bold shrink-0" title="会社カードまたは口座から直接支払済み">🏢 会社負担</span>
            )}
            {exp.paymentType === 'reimbursement' && (
              <span className={cn('text-[9px] px-1.5 py-0.5 rounded-sm font-bold shrink-0 border',
                (exp as any).reimbursementPaid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-purple-100 text-purple-700 border-purple-200'
              )} title={`個人が立て替えて支払い — ${(exp as any).reimbursementPaid ? '精算済み' : '精算待ち'}`}>
                💳 個人立替{(exp as any).reimbursementPaid ? ' ✅精算済' : ' 🔴未精算'}
              </span>
            )}
          </div>
          {exp.registrationNumber && (
            <span className="text-[9px] font-mono text-slate-400">{exp.registrationNumber}</span>
          )}
        </div>
      </TableCell>

      {/* Datas */}
      <TableCell className="py-4 hidden md:table-cell" onClick={onClick}>
        <div className="flex flex-col gap-1 text-[10px] text-slate-400">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-300"/> {fmtDate(exp.date)}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-300"/> {fmtDateTime(exp.createdAt)}</span>
        </div>
      </TableCell>

      {/* Valor */}
      <TableCell className={`text-right font-black pr-6 text-lg ${amber ? 'text-amber-700' : 'text-red-600'}`} onClick={onClick}>
        ¥{Number(exp.amount).toLocaleString()}
      </TableCell>
    </TableRow>
  );
}

// ── Mapeamentos contábeis japoneses ──────────────────────────────────────────
const ACCOUNT_MAP: Record<string, { code: string; title: string; sub: string }> = {
  Food:           { code: '603', title: '会議費',       sub: '飲食・食事代' },
  Transport:      { code: '608', title: '旅費交通費',   sub: '交通費・燃料代' },
  Utilities:      { code: '610', title: '通信費',       sub: '通信・インフラ費' },
  Shopping:       { code: '612', title: '消耗品費',     sub: '備品・事務用品' },
  Entertainment:  { code: '604', title: '接待交際費',   sub: '接待・交際費' },
  Groceries:      { code: '501', title: '原材料費',     sub: '原材料・資材費' },
  'Rent/Mortgage':{ code: '615', title: 'リース料',     sub: 'リース・レンタル料' },
  Healthcare:     { code: '607', title: '福利厚生費',   sub: '福利厚生・安全費' },
  Work:           { code: '502', title: '外注費',       sub: '外注・委託費' },
  Miscellaneous:  { code: '620', title: '雑費',         sub: 'その他' },
  Income:         { code: '401', title: '売上高',       sub: '入金・受取' },
};

function getTaxRate(category: string): 10 | 8 {
  return category === 'Food' || category === 'Groceries' ? 8 : 10;
}
function getTaxClass(category: string, ntaVerified: boolean): string {
  const rate = getTaxRate(category);
  if (ntaVerified) return rate === 8 ? '課税仕入8%(適格)' : '課税仕入10%(適格)';
  return rate === 8 ? '課税仕入8%' : '課税仕入10%';
}
function calcTax(totalWithTax: number, rate: 10 | 8): { taxEx: number; tax: number } {
  const tax = Math.floor(totalWithTax * rate / (100 + rate));
  return { taxEx: totalWithTax - tax, tax };
}

function csv(v: string | number) {
  if (typeof v === 'number') return v;
  return `"${String(v).replace(/"/g, '""')}"`;
}

function exportToExcel(expenses: Expense[], projects: any[], costCenters: CostCenter[]) {
  const data = expenses.map((exp, i) => {
    const anyExp = exp as any;
    const cc = costCenters.find(c => c.id === exp.costcenterId);
    const proj = projects?.find((p: any) => p.id === (exp.projectId || cc?.projectId));
    const account = ACCOUNT_MAP[exp.category] || ACCOUNT_MAP['Miscellaneous'];
    const taxRate = getTaxRate(exp.category);
    const { taxEx, tax } = calcTax(Number(exp.amount) || 0, taxRate);
    const ntaVerified = anyExp.ntaStatus === 'verified';
    const payType = anyExp.paymentType === 'company' ? '会社払い' : anyExp.paymentType === 'reimbursement' ? '立替払い' : '未設定';
    const status = (exp.status as string) === 'processed' ? '承認済み' : '未承認';
    
    return {
      'No.': i + 1,
      '取引日': exp.date || '',
      '送信日時': fmtDateTime(exp.createdAt),
      '勘定科目コード': account.code,
      '勘定科目': account.title,
      '補助科目': account.sub,
      '摘要': exp.description || '',
      '取引先': anyExp.ntaData?.name || '',
      '税区分': getTaxClass(exp.category, ntaVerified),
      '税率(%)': taxRate,
      '税込金額(¥)': Number(exp.amount) || 0,
      '消費税額(¥)': tax,
      '税抜金額(¥)': taxEx,
      '登録番号': anyExp.registrationNumber || exp.tNumber || '',
      '支払方法': payType,
      '原価センター': exp.costcenterName || cc?.name || '',
      'プロジェクト': proj?.name || '',
      '登録者': exp.senderName || '',
      'ステータス': status
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Expenses");

  const wscols = [
    {wch: 5}, {wch: 12}, {wch: 20}, {wch: 15}, {wch: 15},
    {wch: 15}, {wch: 30}, {wch: 20}, {wch: 15}, {wch: 8},
    {wch: 12}, {wch: 12}, {wch: 12}, {wch: 20}, {wch: 12},
    {wch: 20}, {wch: 20}, {wch: 15}, {wch: 12}
  ];
  ws['!cols'] = wscols;

  XLSX.writeFile(wb, `経費精算書_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function exportToCSV(expenses: Expense[], projects: any[], costCenters: CostCenter[]) {
  const BOM = '\uFEFF';
  const now = new Date();
  const today = fmtDate(now.toISOString());
  const row = (...cells: (string | number)[]) => cells.map(c => csv(c)).join(',');
  const lines: string[] = [];

  lines.push(row('経費精算書 — FastLine System', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''));
  lines.push(row(`出力日: ${today}`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''));
  lines.push(row('電子帳簿保存法対応 / インボイス制度対応', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''));
  lines.push('');

  const HEADERS = [
    'No.', '取引日(購入)', '送信日時', '勘定科目コード', '勘定科目',
    '補助科目', '摘要(内容)', '取引先名称(NTA)', '税区分', '税率(%)',
    '税込金額(¥)', '消費税額(¥)', '税抜金額(¥)', '適格請求書番号',
    'NTA認証状態', '支払方法', '原価センター', 'プロジェクト', '登録者', '承認状態',
  ];
  lines.push(HEADERS.join(','));

  let grandTotal = 0, grandTax = 0, grandTaxEx = 0;
  expenses.forEach((exp, i) => {
    const anyExp = exp as any;
    const cc = costCenters.find(c => c.id === exp.costcenterId);
    const proj = projects?.find((p: any) => p.id === (exp.projectId || cc?.projectId));
    const account = ACCOUNT_MAP[exp.category] || ACCOUNT_MAP['Miscellaneous'];
    const taxRate = getTaxRate(exp.category);
    const { taxEx, tax } = calcTax(Number(exp.amount) || 0, taxRate);
    const ntaVerified = anyExp.ntaStatus === 'verified';
    const taxClass = getTaxClass(exp.category, ntaVerified);
    const payType = anyExp.paymentType === 'company' ? '会社払い' : anyExp.paymentType === 'reimbursement' ? '立替払い' : '未設定';
    const status = (exp.status as string) === 'processed' ? '承認済み' : '未承認';
    const ntaLabel = ntaVerified ? '✓ 適格請求書確認済' : anyExp.ntaStatus === 'not_found' ? '未登録' : anyExp.ntaStatus === 'failed' ? '確認失敗' : '未確認';
    const vendorName = anyExp.ntaData?.name || '';
    grandTotal += Number(exp.amount) || 0;
    grandTax += tax;
    grandTaxEx += taxEx;
    lines.push(row(i+1, exp.date||'', fmtDateTime(exp.createdAt), account.code, account.title, account.sub, exp.description||'', vendorName, taxClass, taxRate, Number(exp.amount)||0, tax, taxEx, anyExp.registrationNumber||exp.tNumber||'', ntaLabel, payType, exp.costcenterName||cc?.name||'', proj?.name||'', exp.senderName||'', status));
  });

  lines.push('');
  lines.push(row('','','','','','','','','','合計',grandTotal,grandTax,grandTaxEx,'','','','','','',''));
  lines.push(row('','','','','','','','','','件数',expenses.length,'','','','','','','','',''));
  lines.push('');
  lines.push(row('【備考】','','','','','','','','','','','','','','','','','','',''));
  lines.push(row('本レポートは電子帳簿保存法・インボイス制度（適格請求書等保存方式）に準拠しています。','','','','','','','','','','','','','','','','','','',''));
  lines.push(row('freee会計インポート: 取引日=B列 / 勘定科目=E列 / 税区分=I列 / 金額=K列 / 摘要=G列','','','','','','','','','','','','','','','','','','',''));
  lines.push(row('弥生会計インポート: 伝票日付=B列 / 借方勘定科目=E列 / 借方税区分=I列 / 借方金額=M列 / 摘要=G列','','','','','','','','','','','','','','','','','','',''));

  const csvStr = BOM + lines.join('\n');
  const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `経費精算書_${now.toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExpensesTab({ ownerIdOverride, t }: { expenses: Expense[], ownerIdOverride?: string, t: any }) {
  const { ownerId: userOwnerId } = useUser();
  const database = useDatabase();
  const { toast } = useToast();
  const effectiveOwnerId = ownerIdOverride || userOwnerId;

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [manualCc, setManualCc] = useState<{ id: string; name: string; projectId: string } | null>(null);
  const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [selectedCcId, setSelectedCcId] = useState<string>('all');
  
  // View mode: project/CC vs user
  const [viewMode, setViewMode] = useState<'project' | 'user'>('project');
  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => { setMounted(true); }, []);

  const expensesRef = useMemoFirebase(() => effectiveOwnerId && database ? ref(database, `owner_data/${effectiveOwnerId}/expenses`) : null, [database, effectiveOwnerId]);
  const usersRef = useMemoFirebase(() => effectiveOwnerId && database ? ref(database, `owner_data/${effectiveOwnerId}/lineUsers`) : null, [database, effectiveOwnerId]);
  const projectsRef = useMemoFirebase(() => effectiveOwnerId && database ? ref(database, `owner_data/${effectiveOwnerId}/projects`) : null, [database, effectiveOwnerId]);

  const { data: expensesRaw } = useRTDBCollection<Expense>(expensesRef);
  const { data: lineUsers } = useRTDBCollection<LineUser>(usersRef);
  const { data: projects } = useRTDBCollection<any>(projectsRef);

  const expenses = useMemo(() => {
    if (!expensesRaw) return [];
    return [...expensesRaw].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [expensesRaw]);

  const costCenters = useMemo(() => {
    const ccs: CostCenter[] = [];
    projects?.forEach(p => {
      if (p.costcenters) Object.entries(p.costcenters).forEach(([id, data]: [string, any]) => ccs.push({ id, projectId: p.id, ...data }));
    });
    return ccs;
  }, [projects]);

  // No longer using month filter options as we moved to date range

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Busca por palavra-chave (descrição ou remetente)
      const matchesKeyword = !searchKeyword || 
        exp.description?.toLowerCase().includes(searchKeyword.toLowerCase()) || 
        exp.senderName?.toLowerCase().includes(searchKeyword.toLowerCase());
      
      // Filtro por Data
      const expDate = exp.date || exp.createdAt?.substring(0, 10);
      const matchesStartDate = !startDate || (expDate && expDate >= startDate);
      const matchesEndDate = !endDate || (expDate && expDate <= endDate);
      
      // Filtro por Status
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'approved' && exp.status === 'processed') ||
        (selectedStatus === 'pending' && exp.status !== 'processed');

      // Filtro por Projeto
      const matchesProject = selectedProjectId === 'all' || exp.projectId === selectedProjectId;
      
      // Filtro por Centro de Custo
      const matchesCc = selectedCcId === 'all' || exp.costcenterId === selectedCcId;

      return matchesKeyword && matchesStartDate && matchesEndDate && matchesStatus && matchesProject && matchesCc;
    });
  }, [expenses, searchKeyword, startDate, endDate, selectedStatus, selectedProjectId, selectedCcId]);

  // ② Period totals
  const periodTotals = useMemo(() => {
    let income = 0, expense = 0;
    filteredExpenses.forEach(exp => {
      const isIncome = exp.type === 'income' || exp.type === 'income_amortization' || exp.type === 'income_additive';
      if (isIncome) income += Number(exp.amount) || 0;
      else expense += Number(exp.amount) || 0;
    });
    return { income, expense, balance: income - expense, count: filteredExpenses.length };
  }, [filteredExpenses]);

  const { groupedByProject, unassignedExpenses } = useMemo(() => {
    const unassigned: Expense[] = [];
    const byProject: Record<string, any> = {};

    filteredExpenses.forEach(exp => {
      if (!exp.costcenterId) {
        unassigned.push(exp);
      } else {
        const costcenter = costCenters?.find(cc => cc.id === exp.costcenterId);
        const project = projects?.find(p => p.id === (exp.projectId || costcenter?.projectId));
        const projectName = project?.name || t?.tabs?.expenses?.projectNotSet || "プロジェクト未設定";
        const costCenterName = exp.costcenterName || costcenter?.name || t?.tabs?.expenses?.unknownCC || "不明な原価センター";

        if (!byProject[projectName]) byProject[projectName] = { costCenters: {} };
        if (!byProject[projectName].costCenters[costCenterName]) {
          byProject[projectName].costCenters[costCenterName] = {
            items: [], totalIncome: 0, totalProjectIncome: 0, totalExtraIncome: 0,
            totalExpense: 0, categories: {}, costcenterId: exp.costcenterId, projectId: project?.id,
            ntaPending: 0,
          };
        }
        const group = byProject[projectName].costCenters[costCenterName];
        const isIncome = exp.type === 'income' || exp.type === 'income_amortization' || exp.type === 'income_additive';
        const isRejected = (exp as any).reviewStatus === 'rejected';
        if (isIncome) {
          group.totalIncome += Number(exp.amount);
          if (exp.type === 'income_amortization') group.totalExtraIncome += Number(exp.amount);
        } else if (!isRejected) {
          group.totalExpense += Number(exp.amount);
          const cat = exp.category || 'Miscellaneous';
          group.categories[cat] = (group.categories[cat] || 0) + Number(exp.amount);
        }
        // ⑥ NTA pending count
        if ((exp as any).ntaStatus !== 'verified') group.ntaPending++;
        group.items.push(exp);
      }
    });
    return { groupedByProject: byProject, unassignedExpenses: unassigned };
  }, [filteredExpenses, costCenters, projects, t]);

  // ⑤ Group by user
  const groupedByUser = useMemo(() => {
    const byUser: Record<string, { items: Expense[]; totalExpense: number; totalIncome: number }> = {};
    filteredExpenses.forEach(exp => {
      const sender = exp.senderName || '不明なユーザー';
      if (!byUser[sender]) byUser[sender] = { items: [], totalExpense: 0, totalIncome: 0 };
      const isIncome = exp.type === 'income' || exp.type === 'income_amortization' || exp.type === 'income_additive';
      if (isIncome) byUser[sender].totalIncome += Number(exp.amount) || 0;
      else byUser[sender].totalExpense += Number(exp.amount) || 0;
      byUser[sender].items.push(exp);
    });
    return byUser;
  }, [filteredExpenses]);

  // ── Detecção client-side de duplicatas (amount + date + descrição) ──────────
  const clientDuplicateIds = useMemo(() => {
    const norm = (s: string) => (s || '').toLowerCase().replace(/[\s\W]/g, '');
    const normDate = (d: string) => (d || '').replace(/\//g, '-').substring(0, 10);
    const dupSet = new Set<string>();
    const seen: Array<{ id: string; amount: number; date: string; desc: string }> = [];
    filteredExpenses.forEach(exp => {
      if ((exp as any).reviewStatus === 'rejected') return;
      const amount = Number(exp.amount);
      const date = normDate(exp.date || exp.createdAt || '');
      const desc = norm(exp.description || '');
      const match = seen.find(s =>
        s.amount === amount &&
        s.date === date &&
        s.desc.substring(0, 6) === desc.substring(0, 6) &&
        s.id !== exp.id
      );
      if (match) { dupSet.add(exp.id!); dupSet.add(match.id); }
      seen.push({ id: exp.id!, amount, date, desc });
    });
    return dupSet;
  }, [filteredExpenses]);

  // ⑦ Bulk action handlers
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBulkMarkReimbursed = async () => {
    if (!database || !effectiveOwnerId) return;
    const updates: Record<string, any> = {};
    selectedIds.forEach(id => {
      updates[`owner_data/${effectiveOwnerId}/expenses/${id}/reimbursementPaid`] = true;
      updates[`owner_data/${effectiveOwnerId}/expenses/${id}/reimbursementPaidAt`] = new Date().toISOString();
    });
    await update(ref(database), updates);
    toast({ title: `${selectedIds.size}件を精算済みにしました` });
    setSelectedIds(new Set());
  };

  const handleBulkApprove = async () => {
    if (!database || !effectiveOwnerId) return;
    const updates: Record<string, any> = {};
    selectedIds.forEach(id => {
      updates[`owner_data/${effectiveOwnerId}/expenses/${id}/status`] = 'processed';
      updates[`owner_data/${effectiveOwnerId}/expenses/${id}/updatedAt`] = new Date().toISOString();
    });
    await update(ref(database), updates);
    toast({ title: `${selectedIds.size}件を承認しました` });
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (!database || !effectiveOwnerId || !confirm(`${selectedIds.size}件を削除しますか？`)) return;
    for (const id of selectedIds) {
      await remove(ref(database, `owner_data/${effectiveOwnerId}/expenses/${id}`));
    }
    toast({ title: `${selectedIds.size}件を削除しました` });
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    const selected = filteredExpenses.filter(e => selectedIds.has(e.id!));
    exportToExcel(selected, projects || [], costCenters);
  };

  const te = t?.tabs?.expenses || {};
  const showCheckbox = selectedIds.size > 0;

  return (
    <div className="space-y-4 pb-32">
      {/* ── Barra de filtros ── */}
      <Card className="border-none shadow-xl bg-white rounded-[2rem]">
        <CardContent className="p-5 flex flex-col gap-3">
          {/* Linha 1: busca + mês + view mode */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 ml-1">キーワード・内容で検索</span>
              <Input
                value={searchKeyword}
                onChange={e => setSearchKeyword(e.target.value)}
                placeholder={te.searchPlaceholder || "検索ワードを入力..."}
                className="h-11 rounded-xl"
              />
            </div>
            
            <div className="flex flex-col gap-1 w-full md:w-[150px]">
              <span className="text-[10px] font-bold text-slate-400 ml-1">ステータス</span>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="all">すべて表示</option>
                <option value="approved">✅ 承認済み</option>
                <option value="pending">🔍 未承認</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 ml-1">期間 (開始 〜 終了)</span>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="h-11 rounded-xl w-full md:w-[140px] text-xs font-bold"
                />
                <span className="text-slate-300 text-sm">〜</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="h-11 rounded-xl w-full md:w-[140px] text-xs font-bold"
                />
              </div>
            </div>
          </div>

          {/* Linha 2: Projeto + CC + View mode */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] font-bold text-slate-400 ml-1">プロジェクトで絞り込み</span>
              <select
                value={selectedProjectId}
                onChange={e => {
                  setSelectedProjectId(e.target.value);
                  setSelectedCcId('all'); // Reseta CC ao trocar projeto
                }}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 w-full focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="all">すべてのプロジェクト</option>
                {projects?.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 flex-1">
              <span className="text-[10px] font-bold text-slate-400 ml-1">原価センターで絞り込み</span>
              <select
                value={selectedCcId}
                onChange={e => setSelectedCcId(e.target.value)}
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 w-full focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <option value="all">すべての原価センター</option>
                {costCenters
                  .filter(cc => selectedProjectId === 'all' || cc.projectId === selectedProjectId)
                  .map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.name}</option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 shrink-0">
               <span className="text-[10px] font-bold text-white ml-1">.</span>
               <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setViewMode('project')}
                  className={cn('flex items-center gap-1.5 px-4 h-11 text-sm font-bold transition-colors', viewMode === 'project' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}
                >
                  <LayoutList className="w-4 h-4" /> CC別
                </button>
                <button
                  onClick={() => setViewMode('user')}
                  className={cn('flex items-center gap-1.5 px-4 h-11 text-sm font-bold transition-colors', viewMode === 'user' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 hover:bg-slate-50')}
                >
                  <Users className="w-4 h-4" /> ユーザー別
                </button>
              </div>
            </div>
          </div>

          {/* Export */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setSearchKeyword('');
                  setSelectedStatus('all');
                  setStartDate('');
                  setEndDate('');
                  setSelectedProjectId('all');
                  setSelectedCcId('all');
                }}
                className="text-[10px] font-bold text-slate-400 hover:text-slate-900"
              >
                フィルターをリセット
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => exportToCSV(filteredExpenses, projects || [], costCenters)} className="rounded-xl h-9 gap-1.5 text-xs border-orange-200 text-orange-700 hover:bg-orange-50">
                <Download className="w-3.5 h-3.5" />{te.exportCSV || "CSVエクスポート"}
              </Button>
              <Button variant="outline" onClick={() => exportToExcel(filteredExpenses, projects || [], costCenters)} className="rounded-xl h-9 gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Download className="w-3.5 h-3.5" />{te.exportExcel || "Excelエクスポート"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Não atribuídos ── */}
      {unassignedExpenses.length > 0 && viewMode === 'project' && (
        <Card className="border-none shadow-xl bg-amber-50 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-amber-100/50 py-4 px-8 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black text-amber-900 flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {te.unassignedTitle || "原価センター未割当"} ({unassignedExpenses.length})
            </CardTitle>
          </CardHeader>
          <Table>
            <TableBody>
              {unassignedExpenses.map(exp => (
                <ExpenseRow key={exp.id} exp={exp} onClick={() => setEditingExpense(exp)} amber
                  selected={selectedIds.has(exp.id!)} onSelect={toggleSelect} showCheckbox={showCheckbox}
                  isDuplicate={clientDuplicateIds.has(exp.id!)} />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── View: CC/project ── */}
      {viewMode === 'project' && Object.entries(groupedByProject).map(([projectName, projectData]) => (
        <div key={projectName} className="space-y-3">
          <h3 className="text-2xl font-black text-slate-900 flex items-center gap-3 ml-4">
            <Briefcase className="text-primary"/> {projectName}
          </h3>
          {Object.entries(projectData.costCenters).map(([costCenterName, group]: [string, any]) => (
            <Collapsible key={costCenterName} open={openProjects[costCenterName]} onOpenChange={() => setOpenProjects(prev => ({...prev, [costCenterName]: !prev[costCenterName]}))}>
              <Card className="overflow-hidden border-none shadow-xl bg-white rounded-[2.5rem]">
                <CollapsibleTrigger asChild>
                  <CardHeader className="border-b py-6 px-8 cursor-pointer hover:bg-slate-50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <CardTitle className="text-lg font-black truncate">{costCenterName}</CardTitle>
                        {/* ⑥ NTA pending badge */}
                        {group.ntaPending > 0 && (
                          <span className="flex items-center gap-1 bg-amber-100 text-amber-700 text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">
                            <AlertCircle className="w-2.5 h-2.5" /> NTA未確認 {group.ntaPending}件
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold shrink-0 hidden sm:block">
                          {group.items.length}件
                        </span>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        {mounted && (() => {
                          const cc = costCenters?.find(c => c.id === group.costcenterId);
                          const budgetLimit = Number(cc?.budgetLimit || 0);
                          const totalExpense = Number(group.totalExpense || 0);
                          const balance = budgetLimit - totalExpense;
                          return (
                            <div className="flex items-center gap-2">
                              <div className="text-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">予算上限</p>
                                <p className="text-sm font-black text-slate-600 whitespace-nowrap">¥{budgetLimit.toLocaleString()}</p>
                              </div>
                              <span className="text-slate-300 font-black">−</span>
                              <div className="text-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">支出実績</p>
                                <p className="text-sm font-black text-red-600 whitespace-nowrap">¥{totalExpense.toLocaleString()}</p>
                              </div>
                              <span className="text-slate-300 font-black">=</span>
                              <div className="text-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">予算残高</p>
                                <p className={cn("text-lg font-black whitespace-nowrap", balance >= 0 ? "text-emerald-600" : "text-red-600")}>
                                  {balance < 0 ? '-' : ''}¥{Math.abs(balance).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          );
                        })()}
                        <Button size="sm" onClick={(e) => {
                          e.stopPropagation();
                          const cc = costCenters.find(c => c.id === group.costcenterId);
                          setManualCc(cc ? { id: cc.id, name: cc.name, projectId: cc.projectId || group.projectId || '' } : null);
                          setIsManualDialogOpen(true);
                        }} className="rounded-xl h-9 text-xs font-black gap-1.5 bg-slate-900 text-white shrink-0">
                          <span>＋</span> 新規登録
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableBody>
                      {group.items.map((exp: any) => (
                        <ExpenseRow key={exp.id} exp={exp} onClick={() => setEditingExpense(exp)}
                          selected={selectedIds.has(exp.id!)} onSelect={toggleSelect} showCheckbox={showCheckbox}
                          isDuplicate={clientDuplicateIds.has(exp.id!)} />
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      ))}

      {/* ── View: user ── */}
      {viewMode === 'user' && (
        <div className="space-y-3">
          {Object.entries(groupedByUser).map(([userName, group]) => (
            <Collapsible key={userName} open={openProjects[`user_${userName}`]} onOpenChange={() => setOpenProjects(prev => ({...prev, [`user_${userName}`]: !prev[`user_${userName}`]}))}>
              <Card className="overflow-hidden border-none shadow-xl bg-white rounded-[2.5rem]">
                <CollapsibleTrigger asChild>
                  <CardHeader className="border-b py-5 px-8 cursor-pointer hover:bg-slate-50">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="text-base font-black text-slate-900">{userName}</p>
                          <p className="text-[10px] text-slate-400 font-bold">{group.items.length}件</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {group.totalIncome > 0 && (
                          <div className="text-center hidden sm:block">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">入金</p>
                            <p className="text-sm font-black text-emerald-600">¥{group.totalIncome.toLocaleString()}</p>
                          </div>
                        )}
                        <div className="text-center">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tight">支出</p>
                          <p className="text-sm font-black text-slate-800">¥{group.totalExpense.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableBody>
                      {group.items.map((exp: any) => (
                        <ExpenseRow key={exp.id} exp={exp} onClick={() => setEditingExpense(exp)}
                          selected={selectedIds.has(exp.id!)} onSelect={toggleSelect} showCheckbox={showCheckbox}
                          isDuplicate={clientDuplicateIds.has(exp.id!)} />
                      ))}
                    </TableBody>
                  </Table>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* ⑦ Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white rounded-2xl shadow-2xl px-6 py-3 flex items-center gap-4 whitespace-nowrap">
          <span className="text-sm font-black">{selectedIds.size}件選択中</span>
          <div className="w-px h-5 bg-slate-600" />
          <button onClick={handleBulkApprove} className="flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
            <ShieldCheck className="w-4 h-4" /> 一括承認
          </button>
          <button onClick={handleBulkMarkReimbursed} className="flex items-center gap-1.5 text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors">
            💳 精算済みにする
          </button>
          <button onClick={handleBulkExport} className="flex items-center gap-1.5 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors">
            <Download className="w-4 h-4" /> エクスポート
          </button>
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 text-sm font-bold text-red-400 hover:text-red-300 transition-colors">
            <Trash2 className="w-4 h-4" /> 削除
          </button>
          <div className="w-px h-5 bg-slate-600" />
          <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-white text-sm font-bold transition-colors">
            ✕ 解除
          </button>
        </div>
      )}

      <EditExpenseDialog
        expense={editingExpense}
        costCenters={costCenters}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={async (updated) => {
          if (!database || !effectiveOwnerId) return;
          const { id, ...data } = updated;
          const updatedAt = new Date().toISOString();
          await update(ref(database, `owner_data/${effectiveOwnerId}/expenses/${id}`), { ...data, amount: Number(data.amount), updatedAt });
          auditAction({ ownerId: effectiveOwnerId, actor: { type: 'user', id: user?.uid || 'unknown', name: user?.displayName || user?.email || 'manager', role: role || 'manager' }, action: 'update', entity: { type: 'expense', id, path: `owner_data/${effectiveOwnerId}/expenses/${id}`, label: `¥${Number(data.amount).toLocaleString()} ${data.description||''}` }, before: editingExpense, after: { ...data, amount: Number(data.amount), updatedAt }, source: 'dashboard' }).catch(() => {});
          setEditingExpense(null);
          toast({ title: te.btnSave || "変更を保存" });
        }}
        ownerId={effectiveOwnerId || undefined}
        onUpdateState={setEditingExpense}
        onDelete={async (exp) => {
          if (!database || !effectiveOwnerId || !confirm(te.btnDelete || "削除しますか？")) return;
          await remove(ref(database, `owner_data/${effectiveOwnerId}/expenses/${exp.id}`));
          auditAction({ ownerId: effectiveOwnerId, actor: { type: 'user', id: user?.uid || 'unknown', name: user?.displayName || user?.email || 'manager', role: role || 'manager' }, action: 'delete', entity: { type: 'expense', id: exp.id, path: `owner_data/${effectiveOwnerId}/expenses/${exp.id}`, label: `¥${Number(exp.amount).toLocaleString()} ${exp.description||''}` }, before: exp, source: 'dashboard' }).catch(() => {});
          setEditingExpense(null);
          toast({ title: te.btnDelete || "削除しました" });
        }}
        t={t}
      />

      <ManualTransactionDialog
        isOpen={isManualDialogOpen}
        onClose={() => { setIsManualDialogOpen(false); setManualCc(null); }}
        ownerId={effectiveOwnerId || ''}
        costCenters={costCenters}
        preselectedCc={manualCc}
        t={t}
      />
    </div>
  );
}
