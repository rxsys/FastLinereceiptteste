'use client';

import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, X, CheckCircle2 } from "lucide-react";
import { AnimatePresence, motion } from 'framer-motion';

interface CheckoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  loading?: boolean;
}

export function CheckoutPanel({ isOpen, onClose, onUpgrade, loading }: CheckoutPanelProps) {
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
                <h3 className="text-xl font-bold">Fast LINE Pro</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="text-4xl font-bold mb-4 text-primary">¥10,000 <span className="text-sm font-normal text-muted-foreground">/ 月</span></div>
            
            <ul className="space-y-3 mb-8">
              {[ "無制限の領収書AI解析", "複数の現場・会社管理", "Excelエクスポート機能", "LINE連携フルアクセス" ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-[#00c48c]" />
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
            
            <p className="text-xs text-muted-foreground text-center mt-6">
              お支払いは Stripe を通じて安全に処理されます。<br/>
              いつでもキャンセル可能です。
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
