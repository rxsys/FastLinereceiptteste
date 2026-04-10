'use client';

import { AlertCircle, CheckCircle, Clock, FileText } from 'lucide-react';

interface Props { member: any; lang: string; }

const LABELS: Record<string, any> = {
  ja: { title: '書類管理', visa: 'ビザ', passport: 'パスポート', insurance: '健康保険証', contract: '契約書', residence: '在留カード', expired: '期限切れ', expiring: '期限が近い', valid: '有効', notSet: '未登録', expiry: '有効期限' },
  en: { title: 'Documents', visa: 'Visa', passport: 'Passport', insurance: 'Health Insurance', contract: 'Contract', residence: 'Residence Card', expired: 'Expired', expiring: 'Expiring soon', valid: 'Valid', notSet: 'Not set', expiry: 'Expiry' },
  pt: { title: 'Documentos', visa: 'Visto', passport: 'Passaporte', insurance: 'Plano de Saúde', contract: 'Contrato', residence: 'Cartão de Residência', expired: 'Expirado', expiring: 'Expirando', valid: 'Válido', notSet: 'Não informado', expiry: 'Validade' },
  es: { title: 'Documentos', visa: 'Visa', passport: 'Pasaporte', insurance: 'Seguro Médico', contract: 'Contrato', residence: 'Tarjeta de Residencia', expired: 'Vencido', expiring: 'Por vencer', valid: 'Válido', notSet: 'No registrado', expiry: 'Vencimiento' },
  zh: { title: '文件管理', visa: '签证', passport: '护照', insurance: '医疗保险', contract: '合同', residence: '居留卡', expired: '已过期', expiring: '即将到期', valid: '有效', notSet: '未登记', expiry: '到期日' },
  tr: { title: 'Belgeler', visa: 'Vize', passport: 'Pasaport', insurance: 'Sağlık Sigortası', contract: 'Sözleşme', residence: 'İkamet Kartı', expired: 'Süresi doldu', expiring: 'Yakında doluyor', valid: 'Geçerli', notSet: 'Kayıtsız', expiry: 'Son geçerlilik' },
};

const TODAY = new Date().toISOString().split('T')[0];
const IN30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

function getStatus(date?: string) {
  if (!date) return 'none';
  if (date < TODAY) return 'expired';
  if (date <= IN30) return 'expiring';
  return 'valid';
}

export function DocumentsTab({ member, lang }: Props) {
  const t = LABELS[lang] || LABELS.ja;

  const docTypes = [
    { key: 'visaExpiry',       label: t.visa,       icon: '🛂', tab: 'visa' },
    { key: 'passportExpiry',   label: t.passport,   icon: '📕', tab: 'passport' },
    { key: 'insuranceExpiry',  label: t.insurance,  icon: '🏥', tab: 'insurance' },
    { key: 'contractExpiry',   label: t.contract,   icon: '📄', tab: 'contract' },
    { key: 'residenceExpiry',  label: t.residence,  icon: '🆔', tab: 'residence' },
  ];

  const STATUS_CONFIG = {
    expired:  { label: t.expired,  color: '#ef4444', bg: '#fef2f2', border: '#fecaca', icon: <AlertCircle className="w-4 h-4" /> },
    expiring: { label: t.expiring, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a', icon: <Clock className="w-4 h-4" /> },
    valid:    { label: t.valid,    color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', icon: <CheckCircle className="w-4 h-4" /> },
    none:     { label: t.notSet,   color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', icon: <FileText className="w-4 h-4" /> },
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-black text-slate-900">{t.title}</h2>

      <div className="space-y-3">
        {docTypes.map(doc => {
          const status = getStatus(member[doc.key]);
          const cfg = STATUS_CONFIG[status];
          return (
            <div
              key={doc.key}
              className="flex items-center gap-4 p-5 rounded-3xl border"
              style={{ background: cfg.bg, borderColor: cfg.border }}
            >
              <span className="text-3xl">{doc.icon}</span>
              <div className="flex-1">
                <div className="font-black text-slate-900 text-[15px]">{doc.label}</div>
                {member[doc.key] ? (
                  <div className="text-[12px] text-slate-500 mt-0.5">{t.expiry}: <strong>{member[doc.key]}</strong></div>
                ) : (
                  <div className="text-[12px] text-slate-400 mt-0.5">{t.notSet}</div>
                )}
              </div>
              <div className="flex items-center gap-1.5" style={{ color: cfg.color }}>
                {cfg.icon}
                <span className="text-[11px] font-black whitespace-nowrap">{cfg.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
