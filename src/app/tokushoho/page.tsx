'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TokushohoPage() {
  return (
    <div className="min-h-screen bg-[#06060b] text-white p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-10">
        <Link href="/" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> トップへ戻る
        </Link>

        <header className="space-y-4">
          <h1 className="text-4xl font-black tracking-tight">特定商取引法に基づく表記</h1>
          <p className="text-white/40">日本の特定商取引法に基づき、以下の情報を開示します。</p>
        </header>

        <section className="space-y-8 bg-white/5 border border-white/10 rounded-3xl p-8">
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-black text-[#ff6b35] uppercase tracking-widest mb-1">事業者名</h3>
              <p className="font-bold">FastLine Platform（FastLine Corporation）</p>
            </div>
            <div>
              <h3 className="text-xs font-black text-[#ff6b35] uppercase tracking-widest mb-1">代表者</h3>
              <p className="font-bold">Ricardo Yukio</p>
            </div>
            <div className="sm:col-span-2">
              <h3 className="text-xs font-black text-[#ff6b35] uppercase tracking-widest mb-1">所在地</h3>
              <p className="text-white/80">サポートへのお問い合わせにより開示いたします（日本国内）</p>
            </div>
            <div>
              <h3 className="text-xs font-black text-[#ff6b35] uppercase tracking-widest mb-1">電話番号</h3>
              <p className="text-white/80">090-3277-7484（日本）</p>
            </div>
            <div>
              <h3 className="text-xs font-black text-[#ff6b35] uppercase tracking-widest mb-1">メールアドレス</h3>
              <p className="text-white/80">rxsys@gmail.com</p>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 space-y-4">
            <div>
              <h3 className="text-xs font-black text-[#ff6b35] uppercase tracking-widest mb-1">販売価格</h3>
              <p className="text-white/80 italic text-sm">モジュールによって異なります（例：レシートモジュール ¥10,000／月）。購入手続き完了時に詳細が表示されます。</p>
            </div>
            <div>
              <h3 className="text-xs font-black text-[#ff6b35] uppercase tracking-widest mb-1">サービス提供時期</h3>
              <p className="text-white/80 text-sm">Stripeによる決済確認後、即時にデジタルパネルへのアクセスが有効化されます。</p>
            </div>
            <div>
              <h3 className="text-xs font-black text-[#ff6b35] uppercase tracking-widest mb-1">解約・返品について</h3>
              <p className="text-white/80 text-sm">管理パネルからいつでも解約可能です。解約後も既払い期間中はサービスをご利用いただけます。</p>
            </div>
          </div>
        </section>

        <footer className="text-center text-[10px] text-white/20 pb-12">
          © 2026 FastLine. All rights reserved.
        </footer>
      </div>
    </div>
  );
}
