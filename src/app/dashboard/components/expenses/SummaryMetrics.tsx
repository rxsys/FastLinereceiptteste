'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SummaryMetricsProps {
  totalValue: number;
  totalIncome: number;
  totalProjectIncome: number;
  totalExpense: number;
  budgetLimit: number;
  categories: Record<string, number>;
  mounted: boolean;
  t: any;
}

export const SummaryMetrics = ({
  totalValue,
  totalIncome,
  totalProjectIncome,
  totalExpense,
  budgetLimit,
  categories,
  mounted,
  t,
  onNewEntry,
}: SummaryMetricsProps & { onNewEntry?: () => void }) => {
  const balance = Number(budgetLimit) - Number(totalExpense);

  if (!mounted) return <div className="flex-1" />;

  return (
    <div className="flex items-center gap-3 xl:gap-5 min-w-0 flex-wrap justify-end">
      {/* Botão novo lançamento */}
      {onNewEntry && (
        <button
          onClick={e => { e.stopPropagation(); onNewEntry(); }}
          className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-slate-900 hover:bg-slate-700 text-white text-[11px] font-black transition-colors shrink-0"
        >
          <span className="text-base leading-none">+</span> 新規登録
        </button>
      )}

      <div className="h-10 w-px bg-slate-100 shrink-0 hidden md:block" />

      {/* Middle metrics */}
      <div className="hidden lg:flex items-center gap-4 shrink-0">
        <MetricCard label="案件・契約数" value={totalProjectIncome} colorClass="text-slate-700" />
        <MetricCard label="契約入金合計" value={totalIncome} colorClass="text-emerald-600" />
        <MetricCard label="割当予算" value={budgetLimit} colorClass="text-slate-700" />
      </div>

      <div className="h-10 w-px bg-slate-100 shrink-0 hidden lg:block" />

      {/* Fórmula: 予算上限 − 支出実績 = 予算残高 */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">予算上限</p>
          <p className="text-sm font-black text-slate-600 whitespace-nowrap">¥{Number(budgetLimit).toLocaleString()}</p>
        </div>
        <span className="text-slate-300 font-black text-base">−</span>
        <div className="text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">支出実績</p>
          <p className="text-sm font-black text-red-600 whitespace-nowrap">¥{Number(totalExpense).toLocaleString()}</p>
        </div>
        <span className="text-slate-300 font-black text-base">=</span>
        <div className="text-center">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">予算残高</p>
          <p className={cn("text-lg font-black whitespace-nowrap", balance >= 0 ? "text-emerald-600" : "text-red-600")}>
            ¥{balance >= 0 ? '' : '-'}{Math.abs(balance).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ label, value, colorClass }: { label: string, value: number, colorClass: string }) => {
  const safeValue = Number(value) || 0;
  return (
    <div className="min-w-fit flex flex-col items-center xl:items-end gap-0.5">
      <p className="text-[8px] xl:text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-0.5 whitespace-nowrap leading-none">{label}</p>
      <p className={cn("text-[12px] xl:text-base font-black whitespace-nowrap leading-none", colorClass)}>¥{safeValue.toLocaleString()}</p>
    </div>
  );
};
