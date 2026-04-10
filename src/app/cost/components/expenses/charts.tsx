'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { CATEGORY_MAP } from '@/types';

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#06b6d4', '#ec4899', '#8b5cf6', '#a855f7'];

export const BudgetSpeedometer = ({ totalExpense, budgetLimit }: { totalExpense: number; budgetLimit: number }) => {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => setHasMounted(true), []);

  const percent = budgetLimit > 0 ? Math.min((totalExpense / budgetLimit) * 100, 200) : 0;
  const data = [{ value: percent }, { value: Math.max(0, 100 - percent) }];
  const color = percent > 100 ? '#ef4444' : percent > 80 ? '#f59e0b' : '#10b981';

  if (!hasMounted) return <div className="w-28 h-12 bg-slate-50 animate-pulse rounded-xl" />;

  return (
    <div className="flex flex-col items-center group">
      <div className="relative w-28 h-12 flex flex-col items-center justify-center overflow-hidden">
        <ResponsiveContainer width="100%" height={80}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={26}
              outerRadius={40}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#f1f5f9" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 flex flex-col items-center justify-center">
          <p className={cn("text-[13px] font-black leading-none", percent > 100 ? "text-destructive" : "text-slate-900")}>{Math.round(percent)}%</p>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1">
        {percent > 100 ? (
          <AlertTriangle className="w-2 h-2 text-destructive" />
        ) : percent > 80 ? (
          <AlertTriangle className="w-2 h-2 text-amber-500" />
        ) : (
          <CheckCircle2 className="w-2 h-2 text-emerald-500" />
        )}
        <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">予算消化率管理</p>
      </div>
      <div className="hidden group-hover:block absolute -top-8 bg-slate-900 text-white text-[8px] py-1 px-2 rounded-lg whitespace-nowrap z-50">
        消化率: {Math.round(percent)}% (上限 ¥{budgetLimit.toLocaleString()})
      </div>
    </div>
  );
};

export const CategoryPieChart = ({ categories }: { categories: any }) => {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => setHasMounted(true), []);

  const data = Object.entries(categories)
    .map(([name, value]) => ({ name, value: Number(value) }))
    .sort((a, b) => b.value - a.value);
  
  if (!hasMounted) return <div className="w-32 h-24 bg-slate-50 animate-pulse rounded-2xl" />;

  const topCategories = data.slice(0, 3);

  return (
    <div className="flex flex-col items-center group relative">
      <div className="w-32 h-24 flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              innerRadius={24}
              outerRadius={32}
              paddingAngle={5}
              dataKey="value"
              stroke="transparent"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: '10px', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 'bold' }}
              formatter={(value: number, _name: string, props: any) => [`¥${value.toLocaleString()}`, CATEGORY_MAP[props.name] || props.name]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <TrendingUp className="w-3 h-3 text-slate-300" />
        </div>
      </div>
      <div className="flex flex-col items-center">
        <p className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">支出内訳構成</p>
      </div>
      
      {/* Dynamic Hover Detail */}
      {data.length > 0 && (
        <div className="hidden group-hover:flex flex-col absolute -top-20 left-0 bg-white/95 backdrop-blur-md border border-slate-100 p-2 rounded-2xl shadow-2xl z-50 min-w-[120px]">
          <p className="text-[8px] font-black text-slate-400 mb-1 border-b border-slate-50 pb-1">上位支出項目</p>
          {topCategories.map((item, i) => (
            <div key={i} className="flex items-center justify-between gap-2 py-0.5">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[8px] font-bold text-slate-600 truncate max-w-[60px]">{CATEGORY_MAP[item.name] || item.name}</span>
              </div>
              <span className="text-[8px] font-black text-slate-900">¥{item.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
