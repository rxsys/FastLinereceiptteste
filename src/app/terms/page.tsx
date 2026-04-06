'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, ScrollText } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#06060b] text-white font-sans selection:bg-[#ff6b35]/30">
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[92%] max-w-5xl z-50">
        <div className="flex items-center justify-between px-6 py-3 bg-[#0c0c14]/80 backdrop-blur-xl border-[0.5px] border-[#222235] rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#ff6b35] rounded-md flex items-center justify-center text-white font-black text-lg">F</div>
            <span className="font-dm font-black text-xl">Fast<span className="text-[#ff6b35]">Line</span></span>
          </div>
          <Link href="/">
            <button className="text-[11px] font-black text-white/40 hover:text-white flex items-center gap-2 transition-all uppercase">
              <ChevronRight className="w-4 h-4 rotate-180" /> トップへ戻る
            </button>
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 max-w-4xl mx-auto space-y-12">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full">
            <ScrollText className="w-3 h-3 text-[#ff6b35]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#ff6b35]">利用規約</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none uppercase font-dm">
            利用<span className="text-[#ff6b35]">規約</span>
          </h1>
        </div>

        <div className="space-y-8 text-white/60 font-medium leading-relaxed font-noto">
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center text-white font-black">1</div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">利用資格</h2>
            </div>
            <p className="text-[13px] pl-12 border-l border-white/5 mx-4">FastLineは個人・法人を問わずご利用いただけます。本システムを利用することで、正確な情報の提供および日本の法令に従った利用に同意したものとみなします。</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center text-white font-black">2</div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">提供サービス</h2>
            </div>
            <p className="text-[13px] pl-12 border-l border-white/5 mx-4">当社は、財務・業務管理のためのAIツールを提供します。継続的な改善・メンテナンスのため、サービス内容を変更または一時停止する場合があります。</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center text-white font-black">3</div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">お支払いについて</h2>
            </div>
            <p className="text-[13px] pl-12 border-l border-white/5 mx-4">一部のモジュールのご利用には、Stripe経由での月額サブスクリプションが必要です。お支払いが確認できない場合、プレミアム機能へのアクセスは自動的に停止されます。</p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-[#ff6b35] flex items-center justify-center text-white font-black">4</div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">免責事項</h2>
            </div>
            <p className="text-[13px] pl-12 border-l border-white/5 mx-4">ユーザーは送信する書類の適法性およびアカウントの適切な管理に責任を負います。FastLineは、料金未払いによるアカウント無効化に起因するデータ損失について責任を負いません。</p>
          </section>
        </div>

        <div className="pt-8 border-t border-white/10 text-[10px] text-white/20 font-black uppercase tracking-widest text-center">
          © 2026 FastLine Platform - Japan
        </div>
      </main>
    </div>
  );
}
