'use client';

import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, X, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';

const MODULE_FEATURES: Record<string, { title: string; color: string; items: string[] }> = {
  receipt: {
    title: '💴 コスト管理',
    color: '#22c55e',
    items: ['📱 LINEで写真を送るだけで経費登録', '🤖 AIが金額・日付・税率を自動抽出', '🏛️ NTA適格請求書をリアルタイム認証', '📊 プロジェクト別の予算・実績を管理'],
  },
  member: {
    title: '🧑‍💼 メンバー管理',
    color: '#6366f1',
    items: ['👥 正社員・業務委託・外国人を一元管理', '⏰ ビザ・契約期限を自動アラート', '🕐 LINE打刻で勤怠を自動記録', '💹 労務費をコスト管理へ自動連携'],
  },
  mypage: {
    title: '🪪 マイページ',
    color: '#0ea5e9',
    items: ['📋 勤怠・給与・書類を一画面で確認', '🔗 QRコードで複数企業に対応', '🌐 6言語対応の個人ポータル', '📄 書類の期限アラートを自己管理'],
  },
};

interface CheckoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  loading?: boolean;
  price?: string;
  moduleId?: string;
}

export function CheckoutPanel({ isOpen, onClose, onUpgrade, loading, price, moduleId }: CheckoutPanelProps) {
  const mod = MODULE_FEATURES[moduleId || ''] || MODULE_FEATURES.receipt;
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="checkout-panel"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#06060b]/90 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="relative w-full max-w-md bg-[#0c0c14] border border-white/10 rounded-[2.5rem] shadow-2xl p-8"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
          >
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#ff6b35] rounded-lg flex items-center justify-center text-white font-black text-lg shadow-[0_0_15px_rgba(255,107,53,0.4)]">
                  F
                </div>
                <h3 className="text-xl font-bold">{mod.title}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10">
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="text-4xl font-bold mb-4 text-[#ff6b35]">{price || '...'} <span className="text-sm font-normal text-slate-400">/ 月</span></div>
            
            <ul className="space-y-3 mb-8">
              {mod.items.map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="w-5 h-5" style={{ color: mod.color }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Button onClick={onUpgrade} disabled={loading} className="w-full h-14 bg-[#ff6b35] hover:bg-[#ff8a5e] text-white font-black rounded-2xl transition-all shadow-xl shadow-[#ff6b35]/20 group">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                 <span className="flex items-center gap-2">
                    アップグレード
                    <CreditCard className="w-5 h-5" />
                  </span>
              )}
            </Button>
            
            <p className="text-xs text-slate-500 text-center mt-6">
              お支払いは Stripe を通じて安全に処理されます。<br/>
              いつでもキャンセル可能です。
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
