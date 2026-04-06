'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Shield } from 'lucide-react';

export default function PrivacyPage() {
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
            <Shield className="w-3 h-3 text-[#ff6b35]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#ff6b35]">プライバシーポリシー</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-none uppercase font-dm">
            プライバシー<span className="text-[#ff6b35]">ポリシー</span>
          </h1>
        </div>

        <div className="space-y-8 text-white/60 font-medium leading-relaxed font-noto">
          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">1. 情報の収集</h2>
            <p className="text-[13px]">当社は、LINEアプリを通じた経費管理およびレシート自動化サービスを提供するために必要な情報を収集します。収集対象には、LINEの識別情報およびユーザーが自発的に送信した書類が含まれます。</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">2. 情報の利用目的</h2>
            <p className="text-[13px]">収集した情報は、Gemini APIを使用したAIによるデータ抽出と管理パネルへの整理のためにのみ使用されます。第三者への提供はありません。</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">3. セキュリティ</h2>
            <p className="text-[13px]">すべてのデータはGoogle Firebaseサーバー上で暗号化して保管され、堅固なセキュリティルールで保護されています。サービス運営に必要なインフラプロバイダー（Google Cloud / Stripe）以外の第三者とデータを共有することはありません。</p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-black text-white uppercase tracking-tight">4. ユーザーの権利</h2>
            <p className="text-[13px]">ユーザーはいつでも公式サポートまたは設定パネルを通じて、アカウントおよびすべてのデータの完全削除を申請することができます。</p>
          </section>
        </div>

        <div className="pt-8 border-t border-white/10 text-[10px] text-white/20 font-black uppercase tracking-widest text-center">
          © 2026 FastLine Platform - Japan
        </div>
      </main>
    </div>
  );
}
