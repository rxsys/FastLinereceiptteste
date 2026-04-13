'use client';

import { useRTDBCollection, useRTDBDoc } from '@/firebase/rtdb';
import { useMemoFirebase, useUser, useDatabase } from '@/firebase';
import { ref, update, remove, get, push, set, onValue } from 'firebase/database';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Users, Trash2, Edit2, Save, Search, Building2, Link as LinkIcon, Plus, Send, ChevronRight, Loader2, Sparkles, ShieldCheck, Crown, Wallet, MessageSquare, History } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { UserWalletModal } from './lineusers/UserWalletModal';
import { UserInteractionModal } from './lineusers/UserInteractionModal';
import { EditExpenseDialog } from './expenses/EditExpenseDialog';
import { Expense } from '@/types';

function UserBalanceBadge({ userId, lineUserId, ownerId }: { userId: string; lineUserId?: string; ownerId: string }) {
  const database = useDatabase();
  const [advances, setAdvances] = useState<number>(0);
  const [expenses, setExpenses] = useState<number>(0);

  useEffect(() => {
    if (!database || !ownerId || !userId) return;

    const advRef = ref(database, `owner_data/${ownerId}/lineUsers/${userId}/wallet/advances`);
    const expRef = ref(database, `owner_data/${ownerId}/expenses`);

    const unsubAdv = onValue(advRef, (snap: any) => {
      let total = 0;
      snap.forEach((c: any) => { total += Number(c.val().amount) || 0; });
      setAdvances(total);
    });

    const unsubExp = onValue(expRef, (snap: any) => {
      let total = 0;
      snap.forEach((c: any) => {
        const e = c.val();
        if (e.userId === userId || (lineUserId && e.userId === lineUserId)) {
          if (e.reviewStatus === 'approved') {
            total += Number(e.amount) || 0;
          }
        }
      });
      setExpenses(total);
    });

    return () => { unsubAdv(); unsubExp(); };
  }, [database, ownerId, userId, lineUserId]);

  const balance = advances - expenses;
  const isUserPositive = balance < 0; // Usuário tem a receber (Vermelho)
  const isCompanyPositive = balance > 0; // Empresa tem saldo com o usuário (Azul)

  return (
    <div className={cn(
      "mt-2 flex items-center justify-between px-3 py-2 rounded-xl border font-black",
      isUserPositive ? "bg-red-50 border-red-100 text-red-600" : 
      isCompanyPositive ? "bg-blue-50 border-blue-100 text-blue-600" :
      "bg-emerald-50 border-emerald-100 text-emerald-600"
    )}>
      <div className="flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-wider opacity-70">差引残高</span>
        <span className="text-sm">
          {balance < 0 ? '-' : ''}¥{Math.abs(balance).toLocaleString()}
        </span>
      </div>
      <Badge className={cn(
        "text-[8px] border-none",
        isUserPositive ? "bg-red-500 text-white" : 
        isCompanyPositive ? "bg-blue-500 text-white" :
        "bg-emerald-500 text-white"
      )}>
        {isUserPositive ? "●要精算" : isCompanyPositive ? "●残高あり" : "●精算済み"}
      </Badge>
    </div>
  );
}

import { GuideBalloon, InfoHint } from "./GuideBalloon";

export function LineUsersTab({ ownerIdOverride, t }: { ownerIdOverride?: string, t: any }) {
  const { ownerId: userOwnerId } = useUser();
  const database = useDatabase();
  const { toast } = useToast();
  
  const effectiveOwnerId = ownerIdOverride || userOwnerId;
  const [editing, setEditing] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [walletUser, setWalletUser] = useState<any | null>(null);
  const [interactionUser, setInteractionUser] = useState<any | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [newInviteName, setNewInviteName] = useState('');
  const [selectedInviteProjectIds, setSelectedInviteProjectIds] = useState<string[]>([]);
  const [selectedInviteCostCenterIds, setSelectedInviteCostCenterIds] = useState<string[]>([]);
  const [selectedInviteLanguage, setSelectedInviteLanguage] = useState<string>('ja');
  const [inviteRole, setInviteRole] = useState<'user' | 'manager'>('user');
  const [generatedHash, setGeneratedHash] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const usersRef = useMemoFirebase(() => effectiveOwnerId && database ? ref(database, `owner_data/${effectiveOwnerId}/lineUsers`) : null, [database, effectiveOwnerId]);
  const invitesRef = useMemoFirebase(() => effectiveOwnerId && database ? ref(database, `owner_data/${effectiveOwnerId}/invites`) : null, [database, effectiveOwnerId]);
  const projectsRef = useMemoFirebase(() => effectiveOwnerId && database ? ref(database, `owner_data/${effectiveOwnerId}/projects`) : null, [database, effectiveOwnerId]);
  const ownerPath = effectiveOwnerId ? `owner/${effectiveOwnerId}` : null;
  const { data: owner } = useRTDBDoc(ownerPath);
  const { data: projects } = useRTDBCollection<any>(projectsRef);

  const allCostCenters = useMemo(() => {
    const ccs: any[] = [];
    projects?.forEach(p => {
      if (p.costcenters) {
        Object.entries(p.costcenters).forEach(([id, data]: [string, any]) => {
          ccs.push({ id, projectId: p.id, projectName: p.name, ...data });
        });
      }
    });
    return ccs;
  }, [projects]);
  
  const costCenters = allCostCenters; // Alias for the dialog prop

  const poolRef = useMemoFirebase(() => database ? ref(database, 'line_api_pool') : null, [database]);
  const { data: pool } = useRTDBCollection(poolRef);

  const { data: lineUsers, isLoading: isUsersLoading } = useRTDBCollection(usersRef);
  const { data: invitesRaw } = useRTDBCollection(invitesRef);

  const invites = useMemo(() => invitesRaw?.filter(i => !i.used) || [], [invitesRaw]);

  const poolEntry = pool?.find((k: any) => k.ownerId === effectiveOwnerId && k.lineBasicId) || pool?.find((k: any) => k.ownerId === effectiveOwnerId) || (pool?.length === 1 ? pool[0] : null);
  const botId = owner?.lineBasicId || poolEntry?.lineBasicId;
  const regMessage = generatedHash ? `#${generatedHash}` : '';
  const qrData = botId ? `https://line.me/R/oaMessage/${botId}/?${encodeURIComponent(regMessage)}` : '';
  const qrUrl = qrData ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=10&data=${encodeURIComponent(qrData)}` : '';



  const filteredLineUsers = useMemo(() => {
    if (!lineUsers) return [];
    return lineUsers.filter((u: any) => 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [lineUsers, searchTerm]);

  const handleEditStart = async (luser: any) => {
    const assignedIds = allCostCenters
      ?.filter(cc => (cc.assignedLineUserIds || []).includes(luser.id) || (luser.lineUserId && (cc.assignedLineUserIds || []).includes(luser.lineUserId)))
      .map(cc => cc.id) || [];

    // Carregar behavior atual da IA
    let aiBehavior = { autonomyLevel: 'standard', customInstructions: '', notes: '', preferredLang: 'auto' };
    if (database && effectiveOwnerId) {
      const snap = await get(ref(database, `owner_data/${effectiveOwnerId}/lineUsers/${luser.id}/aiContext/behavior`));
      if (snap.exists()) aiBehavior = { ...aiBehavior, ...snap.val() };
    }

    setEditing({ ...luser, selectedCostCenterIds: assignedIds, aiBehavior });
  };

  const handleSave = async () => {
    if (!database || !editing || !effectiveOwnerId) return;
    const { id, selectedCostCenterIds, aiBehavior, ...data } = editing;

    // Atualizar Usuário
    await update(ref(database, `owner_data/${effectiveOwnerId}/lineUsers/${id}`), {
      ...data, updatedAt: new Date().toISOString()
    });

    // Salvar behavior da IA separadamente
    if (aiBehavior) {
      await update(ref(database, `owner_data/${effectiveOwnerId}/lineUsers/${id}/aiContext/behavior`), {
        ...aiBehavior, updatedAt: new Date().toISOString()
      });
    }
    
    // Sincronizar Centros de Custo
    for (const cc of allCostCenters) {
      const currentAssigned = cc.assignedLineUserIds || [];
      const shouldBeLinked = selectedCostCenterIds.includes(cc.id);
      let newAssigned = [...currentAssigned].filter(uid => uid !== id && uid !== data.lineUserId);
      
      if (shouldBeLinked) {
        newAssigned.push(id);
        if (data.lineUserId) newAssigned.push(data.lineUserId);
      }
      
      await update(ref(database, `owner_data/${effectiveOwnerId}/projects/${cc.projectId}/costcenters/${cc.id}`), {
        assignedLineUserIds: Array.from(new Set(newAssigned))
      });
    }

    setEditing(null);
    toast({ title: "ユーザー情報を更新いたしました" });
  };

  const handleDeleteUser = async (uid: string) => {
    if (!database || !effectiveOwnerId || !confirm("このユーザーを削除してもよろしいですか？")) return;
    await remove(ref(database, `owner_data/${effectiveOwnerId}/lineUsers/${uid}`));
    toast({ title: "ユーザーを削除いたしました" });
  };

  const handleDeleteInvite = async (iid: string) => {
    if (!database || !effectiveOwnerId || !confirm("この招待を削除してもよろしいですか？")) return;
    await remove(ref(database, `owner_data/${effectiveOwnerId}/invites/${iid}`));
    toast({ title: "招待を削除いたしました" });
  };

  const handleGenerateQR = async () => {
    if (!newInviteName.trim() || !effectiveOwnerId) return;
    setIsGenerating(true);
    try {
      // Geração de hash local para evitar problemas de Server Action 'unrecognized'
      const cryptoObj = typeof window !== 'undefined' ? window.crypto || (window as any).msCrypto : null;
      let hash = "";
      if (cryptoObj?.getRandomValues) {
        const bytes = new Uint8Array(4);
        cryptoObj.getRandomValues(bytes);
        hash = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
      } else {
        // Fallback inseguro se crypto não disponível
        hash = Math.random().toString(36).substring(2, 10).toUpperCase();
      }
      
      const newInviteRef = push(ref(database!, `owner_data/${effectiveOwnerId}/invites`));
      await set(newInviteRef, {
        hash,
        inviteName: newInviteName,
        role: inviteRole,
        projectIds: inviteRole === 'user' ? selectedInviteProjectIds : [],
        costCenterIds: inviteRole === 'user' ? selectedInviteCostCenterIds : [],
        language: selectedInviteLanguage,
        used: false,
        createdAt: new Date().toISOString()
      });

      setGeneratedHash(hash);
    } catch (e) { toast({ variant: 'destructive', title: 'エラー', description: String(e) }); } 
    finally { setIsGenerating(false); }
  };

  const resetInviteForm = () => {
    setNewInviteName('');
    setSelectedInviteProjectIds([]);
    setSelectedInviteCostCenterIds([]);
    setSelectedInviteLanguage('ja');
    setInviteRole('user');
    setGeneratedHash(null);
  };

  const isEmpty = !isUsersLoading && (!lineUsers || lineUsers.length === 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border shadow-sm">
        <h2 className="text-xl font-black flex items-center gap-3"><Users className="text-primary" /> ユーザー名簿管理</h2>
        <div className="flex gap-2 relative">
           {isEmpty && (
             <GuideBalloon 
               message="QRコードを発行して、スタッフをLINEから招待しましょう！" 
               position="left" 
               className="hidden md:block"
             />
           )}
           <Dialog onOpenChange={(open) => !open && resetInviteForm()}>
              <DialogTrigger asChild><Button variant="outline" className="rounded-2xl gap-2 font-black"><Plus /> QR招待コード発行</Button></DialogTrigger>
              <DialogContent className="rounded-[2.5rem] max-w-lg max-h-[95vh] flex flex-col p-0 overflow-hidden">
                 <div className="px-8 pt-8 pb-3 shrink-0">
                   <DialogHeader><DialogTitle className="font-black text-xl text-slate-800 tracking-tight">新規招待の発行</DialogTitle></DialogHeader>
                 </div>
                 
                 <ScrollArea className="flex-1 px-8">
                   <div className="space-y-6 py-4">
                    {/* Seletor de nível */}
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase text-slate-400">招待の種類を選んでください</Label>
                       <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setInviteRole('user')}
                            className={cn(
                              'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden',
                              inviteRole === 'user'
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            )}
                          >
                            <Users className={cn('w-5 h-5', inviteRole === 'user' ? 'text-indigo-600' : 'text-slate-400')} />
                            <div className="text-center">
                              <p className={cn('text-xs font-black', inviteRole === 'user' ? 'text-indigo-700' : 'text-slate-600')}>ユーザー</p>
                              <p className="text-[9px] text-slate-400 font-medium mt-0.5">レシート送信・CC連携</p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => setInviteRole('manager')}
                            className={cn(
                              'flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-left relative overflow-hidden',
                              inviteRole === 'manager'
                                ? 'border-violet-500 bg-violet-50'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            )}
                          >
                            <Crown className={cn('w-5 h-5', inviteRole === 'manager' ? 'text-violet-600' : 'text-slate-400')} />
                            <div className="text-center">
                              <p className={cn('text-xs font-black', inviteRole === 'manager' ? 'text-violet-700' : 'text-slate-600')}>マネージャー</p>
                              <p className="text-[9px] text-slate-400 font-medium mt-0.5">管理者権限・CC不要</p>
                            </div>
                          </button>
                       </div>
                       <InfoHint message="一般スタッフ用か、管理者用かを選択します。" />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-slate-400">招待者氏名</Label>
                      <Input placeholder="例: 山田 太郎" value={newInviteName} onChange={e => setNewInviteName(e.target.value)} className="h-12 rounded-xl font-bold" />
                      <InfoHint message="管理画面の名簿で使用される名前です。" />
                    </div>

                    {inviteRole === 'user' && (
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-slate-400">担当プロジェクト及び原価センター</Label>
                      <ScrollArea className="h-64 border rounded-2xl p-4 bg-slate-50/50">
                        {projects?.map(project => (
                          <div key={project.id} className="mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Checkbox
                                id={`invite-proj-${project.id}`}
                                checked={selectedInviteProjectIds.includes(project.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedInviteProjectIds(prev => [...prev, project.id]);
                                  } else {
                                    setSelectedInviteProjectIds(prev => prev.filter(id => id !== project.id));
                                    const projectCCIds = Object.keys(project.costcenters || {});
                                    setSelectedInviteCostCenterIds(prev => prev.filter(id => !projectCCIds.includes(id)));
                                  }
                                }}
                              />
                              <Label htmlFor={`invite-proj-${project.id}`} className="font-black text-sm text-slate-700 flex items-center gap-2"><Building2 className="w-3.5 h-3.5"/> {project.name}</Label>
                            </div>
                            <div className="pl-6 space-y-2">
                              {project.costcenters && Object.entries(project.costcenters).map(([id, cc]: [string, any]) => (
                                <div key={id} className="flex items-center gap-2">
                                  <Checkbox
                                    id={`invite-cc-${id}`}
                                    disabled={!selectedInviteProjectIds.includes(project.id)}
                                    checked={selectedInviteCostCenterIds.includes(id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) setSelectedInviteCostCenterIds(prev => [...prev, id]);
                                      else setSelectedInviteCostCenterIds(prev => prev.filter(ccid => ccid !== id));
                                    }}
                                  />
                                  <Label htmlFor={`invite-cc-${id}`} className="text-xs font-bold text-slate-500">{cc.name}</Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </ScrollArea>
                      <InfoHint message="ユーザーがLINEで選択できる現場をチェックします。" />
                    </div>
                    )}

                    {inviteRole === 'manager' && (
                    <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100 flex items-start gap-3">
                      <Crown className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-violet-700">マネージャー権限で登録</p>
                        <p className="text-[10px] text-violet-500 mt-0.5 font-medium leading-relaxed">
                          QRコードをスキャンするとLINE IDが自動的に取得され、管理者権限（招待・承認・全社レポート）が付赋予されます。プロジェクトやCCへの割り当ては不要です。
                        </p>
                      </div>
                    </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase text-slate-400">優先言語</Label>
                      <Select value={selectedInviteLanguage} onValueChange={setSelectedInviteLanguage}>
                        <SelectTrigger className="h-12 rounded-xl font-bold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="ja" className="font-bold">日本語 🇯🇵</SelectItem>
                          <SelectItem value="pt" className="font-bold">Português 🇧🇷</SelectItem>
                          <SelectItem value="en" className="font-bold">English 🇺🇸</SelectItem>
                        </SelectContent>
                      </Select>
                      <InfoHint message="LINEボットがこのユーザーに返信する際の言語です。" />
                    </div>

                    {generatedHash && (
                      <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-[2rem] border border-slate-100 gap-4 animate-in zoom-in-95 duration-500">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">招待コード発行完了</p>
                        
                        <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col items-center w-full">
                            {!botId ? (
                              <div className="w-full py-6 flex flex-col items-center justify-center text-center gap-2 text-amber-600 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                                <span className="text-2xl">⚠️</span>
                                <p className="text-[10px] font-black leading-tight">LINE Bot IDが未設定のためQRコードを生成できません</p>
                                <p className="text-[8px] mt-1 text-amber-500">Ownerの設定からBot IDを登録してください</p>
                              </div>
                            ) : (
                              <img src={qrUrl} className="w-44 h-44 mb-4" alt="Invite QR" />
                            )}
                            <div className="bg-slate-50 px-4 py-3 rounded-xl text-center mb-4 border border-slate-100 w-full">
                              <p className="text-[10px] text-slate-400 font-bold mb-1">招待ハッシュコード</p>
                              <p className="text-xl font-black text-slate-700 tracking-[0.2em]">{generatedHash}</p>
                            </div>
                            {qrData && (
                              <div className="bg-slate-50 px-4 py-3 rounded-xl mb-4 border border-slate-100 w-full break-all">
                                <p className="text-[10px] text-slate-400 font-bold mb-1">招待リンク</p>
                                <p className="text-[10px] font-mono text-slate-600">{qrData}</p>
                              </div>
                            )}
                            <Button
                              variant="secondary"
                              size="sm"
                              className="h-10 rounded-full text-[12px] font-black gap-2 px-6 shadow-sm bg-slate-900 text-white hover:bg-slate-800"
                              onClick={() => {
                                const textToCopy = qrData || `招待コード: ${generatedHash}`;
                                navigator.clipboard.writeText(textToCopy);
                                toast({ title: "コピーしました" });
                              }}
                            >
                              <LinkIcon className="w-4 h-4" /> {qrData ? '招待リンクをコピーする' : 'コードをコピーする'}
                            </Button>
                        </div>
                        <div className="text-center space-y-1 px-4 mt-2">
                            <p className="text-xs font-black text-slate-900">QRコードをスキャンして完了</p>
                            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                招待された人は、LINEでこのQRを読み取り、送信ボタンを押すだけで登録が完了します。
                            </p>
                        </div>
                      </div>
                    )}
                   </div>
                 </ScrollArea>

                 <div className="px-8 pb-8 pt-4 border-t border-slate-50 shrink-0">
                   <DialogFooter>
                      {!generatedHash ? (
                        <Button onClick={handleGenerateQR} disabled={isGenerating || !newInviteName.trim()} className="w-full h-14 rounded-2xl font-black text-lg bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all">
                          {isGenerating ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                          招待コードを生成する
                        </Button>
                      ) : (
                        <Button onClick={resetInviteForm} className="w-full h-12 rounded-xl font-black variant-outline">
                          新しい招待を作成
                        </Button>
                      )}
                   </DialogFooter>
                 </div>
              </DialogContent>
           </Dialog>
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <Input placeholder="ユーザーを検索..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-64 rounded-2xl h-11 pl-10" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Convites Pendentes */}
        {invites.map((invite: any) => (
          <Card key={invite.id} className="rounded-[2.5rem] border-dashed border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/40 transition-all group relative">
            <CardHeader className="flex flex-row items-center justify-between p-6 pb-2">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-500 shadow-sm"><Send className="w-7 h-7" /></div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-black text-slate-700">{invite.inviteName}</CardTitle>
                    <Badge variant="secondary" className="text-[8px] font-black bg-indigo-100 text-indigo-700 border-none uppercase tracking-tighter">承認待ち</Badge>
                  </div>
                  <p className="text-[10px] font-mono font-black text-indigo-400 tracking-widest uppercase">{invite.hash}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDeleteInvite(invite.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4 text-red-400"/></Button>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-2">
               <div className="flex flex-wrap gap-1">
                  {invite.projectIds?.map((pid: string) => (
                    <Badge key={pid} variant="outline" className="text-[8px] font-black border-indigo-100 text-indigo-500 bg-white">
                      {projects?.find(p => p.id === pid)?.name}
                    </Badge>
                  ))}
               </div>
            </CardContent>
          </Card>
        ))}

        {/* Usuários Ativos */}
        {filteredLineUsers.map((luser: any) => (
          <Card key={luser.id} className="rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all overflow-hidden group">
            <CardHeader className="flex flex-row items-center justify-between p-6 pb-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="w-14 h-14 border-4 border-white shadow-sm transition-transform group-hover:scale-105">
                    <AvatarImage src={luser.photo} />
                    <AvatarFallback className="bg-slate-100 font-black text-slate-400 text-xl">{luser.name?.slice(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  {luser.status === 2 && <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full" />}
                </div>
                <div>
                  <CardTitle className="text-base font-black text-slate-800">{luser.name || luser.fullName}</CardTitle>
                  {(luser.displayName || luser.fullName) && (luser.displayName || luser.fullName) !== luser.name && (
                     <p className="text-[10px] text-slate-400 font-bold mt-0.5">LINE ID: {luser.displayName || luser.fullName}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={cn("text-[8px] font-black border-none", luser.status === 2 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
                      {luser.status === 2 ? "承認済み" : "未承認"}
                    </Badge>
                    <span className="text-base" title={luser.language}>{luser.language === 'pt' ? '🇧🇷' : luser.language === 'en' ? '🇺🇸' : '🇯🇵'}</span>
                    {luser.aiContext?.behavior?.autonomyLevel === 'elevated' && <Badge className="text-[8px] font-black bg-violet-100 text-violet-700 border-none gap-1"><Sparkles className="w-2.5 h-2.5"/>管理者</Badge>}
                    {luser.aiContext?.behavior?.autonomyLevel === 'developer' && <Badge className="text-[8px] font-black bg-slate-900 text-white border-none gap-1"><ShieldCheck className="w-2.5 h-2.5"/>Dev</Badge>}
                  </div>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" onClick={() => handleEditStart(luser)} className="h-9 w-9 rounded-xl hover:bg-indigo-50 hover:text-indigo-600"><Edit2 className="w-4 h-4"/></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(luser.id)} className="h-9 w-9 rounded-xl hover:bg-red-50 hover:text-red-500"><Trash2 className="w-4 h-4"/></Button>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-6 pt-0">
               <div className="space-y-3">
                  <div className="h-px bg-slate-50 w-full" />
                  <div className="flex flex-wrap gap-1">
                    {allCostCenters.filter(cc => cc.assignedLineUserIds?.includes(luser.id) || cc.assignedLineUserIds?.includes(luser.lineUserId)).map(cc => (
                      <Badge key={cc.id} className="text-[8px] font-black bg-slate-100 text-slate-500 border-none uppercase tracking-tighter">
                        {cc.name}
                      </Badge>
                    ))}
                    {allCostCenters.filter(cc => cc.assignedLineUserIds?.includes(luser.id) || cc.assignedLineUserIds?.includes(luser.lineUserId)).length === 0 && (
                      <span className="text-[9px] font-bold text-slate-300 italic">原価センター未設定</span>
                    )}
                  </div>
                  <UserBalanceBadge userId={luser.id} lineUserId={luser.lineUserId} ownerId={effectiveOwnerId!} />
                  <button
                    onClick={() => setWalletUser(luser)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all group/wallet"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                        <Wallet className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-emerald-800">立替・精算管理</p>
                        <p className="text-[9px] font-bold text-emerald-500">クレジット追加 / 取引履歴を表示</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-emerald-400 group-hover/wallet:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => setInteractionUser(luser)}
                    className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-all group/interaction"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-indigo-500 flex items-center justify-center shrink-0">
                        <History className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-[11px] font-black text-indigo-800">Bot インタラクション履歴</p>
                        <p className="text-[9px] font-bold text-indigo-500">Log de Interações detalhado</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-indigo-400 group-hover/interaction:translate-x-0.5 transition-transform" />
                  </button>
               </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <UserWalletModal
        isOpen={!!walletUser}
        onClose={() => setWalletUser(null)}
        user={walletUser}
        ownerId={effectiveOwnerId || ''}
        onOpenExpense={(exp) => setEditingExpense(exp)}
      />

      <UserInteractionModal
        isOpen={!!interactionUser}
        onClose={() => setInteractionUser(null)}
        user={interactionUser}
        ownerId={effectiveOwnerId || ''}
      />

      {/* MODAL DE EDIÇÃO DE USUÁRIO */}
      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-lg max-h-[90vh] flex flex-col overflow-hidden p-0">
           <div className="px-8 pt-8 pb-4 shrink-0">
             <DialogHeader><DialogTitle className="font-black text-xl text-slate-800 tracking-tight">ユーザー設定の編集</DialogTitle></DialogHeader>
           </div>
           <ScrollArea className="flex-1 min-h-0 px-8">
           <div className="space-y-6 pb-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase text-slate-400">ユーザー氏名</Label>
                <Input value={editing?.name || editing?.fullName || ""} onChange={e => setEditing({...editing, name: e.target.value})} className="h-12 rounded-xl font-bold" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">ステータス</Label>
                  <Select value={String(editing?.status || 1)} onValueChange={v => setEditing({...editing, status: Number(v)})}>
                    <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="1" className="font-bold">承認待ち</SelectItem>
                        <SelectItem value="2" className="font-bold">承認済み (利用中)</SelectItem>
                        <SelectItem value="3" className="font-bold text-red-500">利用停止</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">優先言語</Label>
                  <Select value={editing?.language || 'ja'} onValueChange={v => setEditing({...editing, language: v})}>
                    <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="ja" className="font-bold">日本語 🇯🇵</SelectItem>
                        <SelectItem value="pt" className="font-bold">Português 🇧🇷</SelectItem>
                        <SelectItem value="en" className="font-bold">English 🇺🇸</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">担当原価センターの割り当て (プロジェクト別)</Label>
                <ScrollArea className="h-64 border rounded-2xl p-4 bg-slate-50/50">
                  {projects?.map(project => (
                    <div key={project.id} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-2 mb-2 bg-white/50 p-2 rounded-xl border border-slate-100">
                        <Building2 className="w-3.5 h-3.5 text-indigo-500"/>
                        <span className="font-black text-sm text-slate-700">{project.name}</span>
                      </div>
                      <div className="pl-4 space-y-2 mt-2">
                        {project.costcenters && Object.entries(project.costcenters).map(([id, cc]: [string, any]) => (
                          <div key={id} className="flex items-center gap-3 p-1 hover:bg-white rounded-lg transition-colors group">
                            <Checkbox 
                              id={`edit-cc-${id}`}
                              checked={editing?.selectedCostCenterIds?.includes(id)}
                              onCheckedChange={(checked) => {
                                const current = editing.selectedCostCenterIds || [];
                                if (checked) setEditing({...editing, selectedCostCenterIds: [...current, id]});
                                else setEditing({...editing, selectedCostCenterIds: current.filter((cid: string) => cid !== id)});
                              }}
                            />
                            <Label htmlFor={`edit-cc-${id}`} className="text-xs font-bold text-slate-500 cursor-pointer group-hover:text-slate-800 transition-colors flex-1">{cc.name}</Label>
                          </div>
                        ))}
                        {(!project.costcenters || Object.keys(project.costcenters).length === 0) && (
                          <p className="text-[10px] text-slate-300 italic pl-6">原価センターがありません</p>
                        )}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
              {/* AI Behavior por usuário */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-violet-500"/>
                  <Label className="font-black text-sm text-slate-800">AI設定 (このユーザー専用)</Label>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">権限レベル</Label>
                  <Select
                    value={editing?.aiBehavior?.autonomyLevel || 'standard'}
                    onValueChange={v => setEditing({...editing, aiBehavior: {...(editing.aiBehavior||{}), autonomyLevel: v}})}
                  >
                    <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="standard" className="font-bold">標準 — 自分の経費のみ</SelectItem>
                      <SelectItem value="elevated" className="font-bold text-violet-700">👑 管理者 — 招待・承認・全社レポート</SelectItem>
                      <SelectItem value="developer" className="font-bold text-slate-900">🔧 Developer — フルアクセス</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">カスタム指示 (企業設定を上書き)</Label>
                  <Textarea
                    value={editing?.aiBehavior?.customInstructions || ''}
                    onChange={e => setEditing({...editing, aiBehavior: {...(editing.aiBehavior||{}), customInstructions: e.target.value}})}
                    placeholder="例: このユーザーには常に英語で短く答えてください。"
                    className="min-h-[80px] text-sm rounded-2xl bg-slate-50 border-slate-200 resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px] font-black uppercase text-slate-400">管理者メモ (AIが参照するが表示はしない)</Label>
                  <Textarea
                    value={editing?.aiBehavior?.notes || ''}
                    onChange={e => setEditing({...editing, aiBehavior: {...(editing.aiBehavior||{}), notes: e.target.value}})}
                    placeholder="例: プロジェクトXのリーダー。月末に集中して使用する傾向がある。"
                    className="min-h-[60px] text-sm rounded-2xl bg-slate-50 border-slate-200 resize-none"
                  />
                </div>
              </div>
           </div>
           </ScrollArea>
           <div className="px-8 pb-8 pt-4 border-t border-slate-100 shrink-0">
             <Button onClick={handleSave} className="w-full h-14 rounded-2xl font-black text-lg bg-slate-900 text-white shadow-2xl hover:bg-slate-800 transition-all">
                設定を保存する
             </Button>
           </div>
        </DialogContent>
      </Dialog>

      <EditExpenseDialog
        expense={editingExpense}
        costCenters={costCenters}
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={async (updated) => {
          if (!database || !effectiveOwnerId) return;
          const { id, ...data } = updated;
          await update(ref(database, `owner_data/${effectiveOwnerId}/expenses/${id}`), { ...data, amount: Number(updated.amount), updatedAt: new Date().toISOString() });
          setEditingExpense(null);
          toast({ title: "変更を保存しました" });
        }}
        onUpdateState={setEditingExpense}
        ownerId={effectiveOwnerId || undefined}
        t={t}
      />
    </div>
  );
}
