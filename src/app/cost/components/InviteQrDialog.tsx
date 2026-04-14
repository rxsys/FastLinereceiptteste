'use client';

import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Copy, 
  Loader2, 
  Check, 
  AlertTriangle,
  Globe
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { createInvitation } from '@/lib/invitation-service';

interface InviteQrDialogProps {
  projects: any[];
  owners: any[];
  pool?: any[]; // Mantido para compatibilidade, mas não usado
  effectiveOwnerId: string | null;
  t: any;
}

export function InviteQrDialog({ projects, owners, pool, effectiveOwnerId, t }: InviteQrDialogProps) {
  const { toast } = useToast();
  
  // States
  const [isOpen, setIsOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('ja');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHash, setGeneratedHash] = useState<string | null>(null);

  const handleGenerateInvite = async () => {
    if (!inviteName || selectedProjectIds.length === 0) {
      toast({ 
        variant: "destructive", 
        title: t('common.error'), 
        description: "名前とプロジェクトを選択してください。" 
      });
      return;
    }

    setIsGenerating(true);
    try {
      const hash = await createInvitation({
        name: inviteName,
        projectIds: selectedProjectIds,
        lang: selectedLanguage,
        ownerId: effectiveOwnerId || '',
        partnerId: 'unassigned'
      });
      setGeneratedHash(hash);
      toast({ title: t('tabs.users.qrTitle'), description: "QRコードが生成されました。" });
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: t('common.error') });
    } finally {
      setIsGenerating(false);
    }
  };

  const resetForm = () => {
    setInviteName('');
    setSelectedProjectIds([]);
    setSelectedLanguage('ja');
    setGeneratedHash(null);
  };

  const getBotId = () => {
    const targetId = effectiveOwnerId || (owners as any)?.[0]?.id;
    const ownerObj = owners?.find((o: any) => o.id === targetId);
    const basicId = ownerObj?.lineBasicId;
    if (!basicId) return null;
    return basicId.startsWith('@') ? basicId : `@${basicId}`;
  };

  const botId = getBotId();
  const regMessage = generatedHash ? `REGISTRO / #${generatedHash}` : '';
  const qrData = botId ? `https://line.me/R/oaMessage/${botId}/?${encodeURIComponent(regMessage)}` : '';
  const qrUrl = qrData ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(qrData)}` : '';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex-1 sm:flex-none h-11 rounded-2xl gap-2 font-black text-xs border-primary/20 text-primary hover:bg-primary/5 shadow-sm">
          <Plus className="w-4 h-4" /> QR招待コード発行
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-white rounded-[2.5rem]">
        <DialogHeader>
          <DialogTitle className="font-black flex items-center gap-2 text-primary">
            <Users className="w-5 h-5" /> 招待用QRコード
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">招待する人の名前</Label>
              <Input 
                placeholder="氏名を入力" 
                className="h-11 rounded-xl text-sm font-bold bg-slate-50/50 border-slate-100"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">参加するプロジェクト (複数選択可)</Label>
              <ScrollArea className="h-36 rounded-2xl border border-slate-100 p-3 bg-slate-50/50">
                <div className="space-y-2">
                  {projects?.map(p => (
                    <div key={p.id} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white transition-all border border-transparent hover:border-slate-100 group">
                      <Checkbox 
                        id={`p-${p.id}`} 
                        checked={selectedProjectIds.includes(p.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedProjectIds([...selectedProjectIds, p.id]);
                          else setSelectedProjectIds(selectedProjectIds.filter(id => id !== p.id));
                        }}
                        className="rounded-md"
                      />
                      <label htmlFor={`p-${p.id}`} className="text-xs font-bold text-slate-600 cursor-pointer flex-1 group-hover:text-slate-900">
                        {p.name}
                      </label>
                    </div>
                  ))}
                  {(!projects || projects.length === 0) && (
                    <p className="text-[10px] text-slate-400 p-2 italic">プロジェクトが登録されていません</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">言語設定</Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger className="h-11 rounded-xl text-xs font-bold bg-slate-50/50 border-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ja" className="text-xs font-bold">日本語 🇯🇵</SelectItem>
                  <SelectItem value="en" className="text-xs font-bold">English 🇺🇸</SelectItem>
                  <SelectItem value="pt" className="text-xs font-bold">Português 🇧🇷</SelectItem>
                  <SelectItem value="es" className="text-xs font-bold">Español 🇪🇸</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleGenerateInvite} 
              disabled={isGenerating || !inviteName || selectedProjectIds.length === 0}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black rounded-xl gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              QRコードを生成
            </Button>
          </div>

          {generatedHash && (
            <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100 gap-4 animate-in zoom-in-95 duration-500">
              <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl shadow-primary/5 border border-slate-100">
                 <div className="space-y-4 flex flex-col items-center w-full">
                   {!botId ? (
                     <div className="w-full py-4 flex flex-col items-center text-center gap-2 text-amber-600 bg-amber-50 rounded-xl border border-amber-100">
                       <AlertTriangle className="w-6 h-6" />
                       <p className="text-[10px] font-black">LINE Bot ID未設定</p>
                     </div>
                   ) : (
                     <img src={qrUrl} className="w-44 h-44" alt="Invite QR" />
                   )}
                   <div className="bg-slate-50 px-3 py-2 rounded-lg text-center border border-slate-100 w-full">
                     <p className="text-[9px] text-slate-400 font-bold mb-0.5">ハッシュコード</p>
                     <p className="text-lg font-black text-slate-700 tracking-[0.15em]">{generatedHash}</p>
                   </div>
                   {qrData && (
                     <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 w-full break-all">
                       <p className="text-[9px] text-slate-400 font-bold mb-0.5">招待リンク</p>
                       <p className="text-[9px] font-mono text-slate-600">{qrData}</p>
                     </div>
                   )}
                   <Button
                     variant="secondary"
                     size="sm"
                     className="h-8 rounded-full text-[10px] font-black gap-2 px-4 shadow-sm bg-white border border-slate-100"
                     onClick={() => {
                       const textToCopy = qrData || `招待コード: ${generatedHash}`;
                       navigator.clipboard.writeText(textToCopy);
                       toast({ title: "コピーしました" });
                     }}
                   >
                     <Copy className="w-3.5 h-3.5" /> {qrData ? 'リンクをコピー' : 'コードをコピー'}
                   </Button>
                 </div>
              </div>
              <div className="text-center space-y-2 px-4">
                <p className="text-xs font-black text-slate-900">QRコードをスキャンして登録</p>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                  招待された人は、LINEでこのQRを読み取り、送信ボタンを押すだけで登録が完了します。
                </p>
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={resetForm} className="h-10 rounded-xl text-[10px] font-black text-slate-400 hover:text-slate-600">
            リセット
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}