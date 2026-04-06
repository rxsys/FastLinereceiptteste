'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
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
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-16 animate-in fade-in duration-1000">

      {/* Centered Welcome Message */}
      <div className="flex flex-col items-center space-y-6 text-center">
        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-black tracking-[0.2em] uppercase py-1.5 px-6 rounded-full shadow-sm">
          <Sparkles className="w-3.5 h-3.5 mr-2 inline" /> Executive Dashboard
        </Badge>
        <div className="space-y-2">
          <h2 className="text-4xl font-[1000] text-slate-900 tracking-tight leading-none uppercase">
            {(t.dash && t.dash.welcome) || "Welcome "}<span className="text-primary">{ownerName}</span>
          </h2>
          <p className="text-slate-400 font-bold text-base">{(t.dash && t.dash.selectModule) || "Select a module to continue"}</p>
        </div>
      </div>

      {/* Launcher Grid */}
      <TooltipProvider delayDuration={0}>
        <div className={cn(
          "grid gap-10 w-full max-w-6xl px-8",
          allowedModules.length <= 4 ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
        )}>
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

      {/* Bottom Subtext */}
      <div className="pt-10 opacity-30 select-none pointer-events-none">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[1em]">FastLine Intelligence</p>
      </div>
    </div>
  );
}
