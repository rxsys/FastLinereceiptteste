'use client';

import React from 'react';
import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

interface GuideBalloonProps {
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  onClose?: () => void;
}

export function GuideBalloon({ message, position = 'top', className }: GuideBalloonProps) {
  return (
    <div className={cn(
      "absolute z-[100] group animate-in fade-in zoom-in-95 duration-500",
      position === 'top' && "-top-16 left-1/2 -translate-x-1/2",
      position === 'bottom' && "-bottom-16 left-1/2 -translate-x-1/2",
      position === 'left' && "-left-64 top-1/2 -translate-y-1/2",
      position === 'right' && "-right-64 top-1/2 -translate-y-1/2",
      className
    )}>
      {/* Balloon Body */}
      <div className="bg-slate-900 text-white p-4 rounded-[1.5rem] shadow-2xl border border-slate-800 flex items-start gap-3 min-w-[200px] max-w-[280px]">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
          <Info className="w-4 h-4 text-primary" />
        </div>
        <p className="text-[11px] font-bold leading-relaxed">{message}</p>
      </div>

      {/* Balloon Arrow */}
      <div className={cn(
        "absolute w-4 h-4 bg-slate-900 border-slate-800 rotate-45",
        position === 'top' && "-bottom-2 left-1/2 -translate-x-1/2 border-b border-r",
        position === 'bottom' && "-top-2 left-1/2 -translate-x-1/2 border-t border-l",
        position === 'left' && "-right-2 top-1/2 -translate-y-1/2 border-t border-r",
        position === 'right' && "-left-2 top-1/2 -translate-y-1/2 border-b border-l"
      )} />
    </div>
  );
}

export function InfoHint({ message }: { message: string }) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-400 mt-2 italic shadow-inner">
      <Info className="w-3 h-3 text-primary" />
      {message}
    </div>
  );
}
