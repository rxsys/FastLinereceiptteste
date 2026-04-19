'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { Sparkles, Building2, Users, Receipt, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HomeTabProps {
  t: any;
  expenses: any[];
  user: any;
  ownerId: string | null;
  role: string;
  ownerName: string;
  subscriptionStatus: string;
  validUntil: any;
  onTabChange: (tab: string) => void;
  allowedModules: any[];
  currentLang?: string;
  subscriptions?: any;
}

export function HomeTab({
  t,
  onTabChange,
  allowedModules = [],
  ownerName,
}: HomeTabProps) {

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-24 animate-in fade-in duration-1000 pb-20">

      {/* Launcher Grid */}
      <TooltipProvider delayDuration={0}>
        <div className="flex flex-wrap justify-center gap-10 w-full max-w-6xl px-8">
          {allowedModules.map((mod) => {
            const isUpcoming = !mod.ready;

            return (
              <Tooltip key={mod.id}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => mod.ready && onTabChange(mod.id)}
                    className={cn(
                      "group relative flex flex-col items-center gap-8 p-12 rounded-[3.5rem] bg-white border border-slate-100/50 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] transition-all duration-500",
                      mod.ready
                        ? "hover:-translate-y-6 hover:shadow-[0_50px_100px_-30px_rgba(0,0,0,0.12)] hover:ring-2 hover:ring-primary/10"
                        : "opacity-50 cursor-default"
                    )}
                  >
                    {/* Icon Container */}
                    <div className={cn(
                      "relative w-28 h-28 rounded-[2.2rem] flex items-center justify-center text-white shadow-2xl transition-all duration-500 group-hover:scale-110",
                      mod.color,
                      !mod.ready && "grayscale-[0.5]"
                    )}>
                      {mod.icon && React.isValidElement(mod.icon) ? React.cloneElement(mod.icon as React.ReactElement, { className: "w-14 h-14" }) : null}
                    </div>

                    {/* Label */}
                    <div className="space-y-2 text-center">
                      <h4 className="text-lg font-[1000] text-slate-800 tracking-tight whitespace-nowrap">{mod.title}</h4>
                      {isUpcoming && <p className="text-[10px] font-black text-slate-400">EM BREVE</p>}
                      <div className={cn(
                        "h-1.5 w-8 bg-slate-100 rounded-full mx-auto transition-all duration-500",
                        mod.ready && "group-hover:w-16 group-hover:bg-primary/40"
                      )} />
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="w-72 p-6 bg-white/95 backdrop-blur-xl border border-slate-100 text-slate-900 rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-200"
                  sideOffset={20}
                >
                  <div className="space-y-2 text-center">
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">{mod.desc}</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Onboarding Section - Quick Guide */}
      <div className="w-full max-w-6xl px-10 space-y-12">
        <div className="flex flex-col items-center md:items-start gap-4">
          <div className="flex items-center gap-4 w-full">
            <h3 className="text-xs font-[1000] text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">はじめに — 3つのステップ</h3>
            <div className="h-px w-full bg-slate-100/50" />
          </div>
          <p className="text-sm font-bold text-slate-400 italic">システムを最大限に活用するための基本ガイド</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              title: "1. 組織構造の設定",
              desc: "「プロジェクト」タブで現場を登録し、その下に「原価センター（部門・現場）」を作成します。これがコスト集計の最小単位となります。",
              icon: <Building2 className="w-8 h-8 text-blue-500" />,
              action: () => onTabChange('management')
            },
            {
              title: "2. メンバーの招待",
              desc: "「ユーザー」タブから招待QRコードを発行。現場スタッフがLINEでスキャンして登録することで、報告体制が整います。",
              icon: <Users className="w-8 h-8 text-emerald-500" />,
              action: () => onTabChange('lineUsers')
            },
            {
              title: "3. 運用の開始",
              desc: "スタッフがLINEでレシートを送信すれば、AIが自動解析。すべての収支データは「収支・明細」タブでリアルタイムに確認できます。",
              icon: <Receipt className="w-8 h-8 text-orange-500" />,
              action: () => onTabChange('expenses')
            }
          ].map((step, idx) => (
            <div 
              key={idx} 
              onClick={step.action}
              className="group p-10 bg-white/40 hover:bg-white backdrop-blur-md border border-white rounded-[3rem] shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 cursor-pointer"
            >
               <div className="mb-8 w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 ring-1 ring-slate-100">
                  {step.icon}
               </div>
               <div className="space-y-4">
                 <h4 className="text-lg font-[1000] text-slate-900 group-hover:text-primary transition-colors">{step.title}</h4>
                 <div className="pt-4 flex items-center text-primary/0 group-hover:text-primary transition-all duration-500 font-black text-[10px] uppercase tracking-widest gap-2">
                    GO TO MODULE <ArrowRight className="w-3 h-3" />
                 </div>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Subtext */}
      <div className="pt-10 opacity-30 select-none pointer-events-none">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[1em]">FastLine Intelligence</p>
      </div>
    </div>
  );
}
