'use client';

import { useRTDBCollection } from '@/firebase/rtdb';
import { useMemoFirebase, useUser, useDatabase } from '@/firebase';
import { ref, update, set, push, remove, get } from 'firebase/database';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, ShieldCheck, Calendar, Building2, AlertTriangle, Edit2, Loader2, ArrowLeft, Trash2, Check } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { LineApiPoolTab } from '@/app/cost/components/LineApiPoolTab';

const SUBSCRIPTION_STATUS = {
  active:    { label: '利用中 (Active)',     color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  trial:     { label: 'トライアル (Trial)',   color: 'bg-blue-100 text-blue-700 border-blue-200' },
  overdue:   { label: '未払い (Overdue)',     color: 'bg-red-100 text-red-700 border-red-200' },
  pending:   { label: '保留 (Pending)',       color: 'bg-amber-100 text-amber-700 border-amber-200' },
  cancelled: { label: '解約済 (Cancelled)',   color: 'bg-slate-100 text-slate-500 border-slate-200' },
};

export default function SuperAdminPage() {
  const { user, isUserLoading, role } = useUser();
  const database = useDatabase();
  const router = useRouter();
  const { toast } = useToast();

  const [editingOwner, setEditingOwner] = useState<any | null>(null);
  const [newOwner, setNewOwner] = useState({ name: '', subscriptionStatus: 'trial', validUntil: '' });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const ownersRef = useMemoFirebase(() => database ? ref(database, 'owner') : null, [database]);
  const poolRef = useMemoFirebase(() => database ? ref(database, 'line_api_pool') : null, [database]);
  const usersRef = useMemoFirebase(() => database ? ref(database, 'users') : null, [database]);

  const { data: owners, isLoading: isOwnersLoading, error: ownersError } = useRTDBCollection(ownersRef);
  const { data: pool, isLoading: isPoolLoading, error: poolError } = useRTDBCollection(poolRef);

  useEffect(() => {
    if (!isUserLoading && role !== 'developer') router.push('/');
  }, [user, isUserLoading, role, router]);

  const handleAddOwner = async () => {
    if (!database || !newOwner.name) return;
    try {
      const availableBot = pool?.find(b => b.status === 'available');
      if (!availableBot) {
        toast({ variant: 'destructive', title: 'APIキー不足' });
        return;
      }

      const poolId = availableBot.id;
      const ownerData = {
        name: newOwner.name,
        subscriptionStatus: newOwner.subscriptionStatus,
        validUntil: newOwner.validUntil,
        createdAt: new Date().toISOString(),
      };

      await update(ref(database, `owner/${poolId}`), ownerData);
      await update(ref(database, `line_api_pool/${poolId}`), { status: 'used', ownerId: poolId, ownerName: newOwner.name });

      setIsAddDialogOpen(false);
      toast({ title: 'テナント登録完了' });
    } catch (e: any) { toast({ variant: 'destructive', title: 'エラー', description: e.message }); }
  };

  const handleUpdateLicense = async () => {
    if (!database || !editingOwner) return;
    const { id, ...data } = editingOwner;
    try {
      await update(ref(database, `owner/${id}`), { ...data, updatedAt: new Date().toISOString() });
      await update(ref(database, `line_api_pool/${id}`), { ownerName: data.name });
      setEditingOwner(null);
      toast({ title: '更新完了' });
    } catch (e: any) { toast({ variant: 'destructive', title: 'エラー', description: e.message }); }
  };

  const handleDeleteOwner = async (id: string, name: string) => {
    if (!database || !confirm(`Remover permanentemente o tenant "${name}"?`)) return;
    try {
      await remove(ref(database, `owner/${id}`));
      await update(ref(database, `line_api_pool/${id}`), { status: 'available', ownerId: null, ownerName: null });
      toast({ title: 'Tenant removido com sucesso' });
    } catch (e: any) { toast({ variant: 'destructive', title: 'Erro ao remover', description: e.message }); }
  };

  const toggleSubscription = (moduleId: string) => {
    if (!editingOwner) return;
    const currentSubs = editingOwner.subscriptions || {};
    const isCurrentlyActive = currentSubs[moduleId]?.status === 'active';
    
    const newSubs = {
      ...currentSubs,
      [moduleId]: {
        status: isCurrentlyActive ? 'inactive' : 'active',
        updatedAt: new Date().toISOString()
      }
    };
    
    setEditingOwner({ ...editingOwner, subscriptions: newSubs });
  };

  if (isUserLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-50 p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">License Manager</h1>
            <p className="text-slate-400 font-bold uppercase text-xs">RTDB Control Center</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setIsAddDialogOpen(true)} className="rounded-xl h-11"><Plus /> Novo Tenant</Button>
            <Button variant="outline" onClick={() => router.push('/developer/settings')} className="rounded-xl h-11">Voltar</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 rounded-[2rem] bg-slate-900 text-white group overflow-hidden relative">
            <div className="relative z-10">
              <p className="text-xs font-black opacity-50 uppercase">Total Tenants</p>
              <div className="flex items-center gap-3">
                <p className="text-5xl font-black mt-2">{owners?.length || 0}</p>
                {isOwnersLoading && <Loader2 className="w-6 h-6 animate-spin opacity-30 mt-3" />}
              </div>
            </div>
            {ownersError && <p className="text-[10px] text-red-400 mt-2 font-bold select-all">ERR: {ownersError.message}</p>}
            <Building2 className="absolute -right-4 -bottom-4 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity" />
          </Card>
        </div>

        <Card className="rounded-[2.5rem] border shadow-xl overflow-hidden bg-white">
          <Table>
             <TableHeader className="bg-slate-50"><TableRow><TableHead className="pl-10">Tenant</TableHead><TableHead>Status</TableHead><TableHead>Expira</TableHead><TableHead className="text-right pr-10">Ação</TableHead></TableRow></TableHeader>
             <TableBody>
                {owners?.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-10 font-black">
                      <div className="flex flex-col">
                        <span>{o.name}</span>
                        <span className="text-[9px] font-mono opacity-30 mt-1">ID: {o.id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("text-[9px] border-none font-black", (SUBSCRIPTION_STATUS as any)[o.subscriptionStatus]?.color)}>
                        {(SUBSCRIPTION_STATUS as any)[o.subscriptionStatus]?.label || o.subscriptionStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      {o.validUntil ? format(new Date(o.validUntil), 'yyyy/MM/dd') : "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {Object.entries(o.subscriptions || {}).filter(([, s]: any) => s.status === 'active').map(([id]) => (
                          <Badge key={id} variant="outline" className="text-[8px] uppercase border-emerald-200 text-emerald-600 bg-emerald-50 px-1">{id}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right pr-10 space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => setEditingOwner(o)} className="h-9 w-9 rounded-xl hover:bg-slate-100"><Edit2 className="w-4 h-4"/></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteOwner(o.id, o.name)} className="h-9 w-9 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isOwnersLoading && (!owners || owners.length === 0) && (
                  <TableRow>
                     <TableCell colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-400 font-bold italic">
                           <AlertTriangle className="w-8 h-8 opacity-20" />
                           <p>Nenhum Tenant encontrado no caminho "/owner"</p>
                           <p className="text-[10px] uppercase opacity-50">Tente cadastrar uma nova empresa acima</p>
                        </div>
                     </TableCell>
                  </TableRow>
                )}
             </TableBody>
          </Table>
        </Card>

        <LineApiPoolTab t={{}} />
      </div>

      <Dialog open={!!editingOwner} onOpenChange={() => setEditingOwner(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-2xl overflow-hidden p-0 border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <Edit2 className="text-primary w-6 h-6"/> Editar Tenant
              </DialogTitle>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Configuração de Licenciamento</p>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-8 bg-white max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome da Empresa</Label>
                <Input value={editingOwner?.name || ""} onChange={e => setEditingOwner({...editingOwner, name: e.target.value})} className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold focus:ring-primary/20" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vencimento da Licença</Label>
                <Input type="date" value={editingOwner?.validUntil || ""} onChange={e => setEditingOwner({...editingOwner, validUntil: e.target.value})} className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Status Global</Label>
              <Select value={editingOwner?.subscriptionStatus || "trial"} onValueChange={v => setEditingOwner({...editingOwner, subscriptionStatus: v})}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                  {Object.entries(SUBSCRIPTION_STATUS).map(([key, value]) => (
                    <SelectItem key={key} value={key} className="font-bold py-3">{value.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-50">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Módulos Contratados (Licenças Individualizadas)</Label>
              <div className="grid grid-cols-2 gap-3">
                {['receipt', 'project', 'staff', 'career', 'id', 'kaigyo', 'attendance', 'assets', 'sales', 'docs', 'settings'].map(modId => {
                  const isActive = editingOwner?.subscriptions?.[modId]?.status === 'active';
                  return (
                    <div 
                      key={modId} 
                      onClick={() => toggleSubscription(modId)}
                      className={cn(
                        "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group hover:scale-[1.02] active:scale-[0.98]",
                        isActive ? "bg-emerald-50 border-emerald-100 shadow-sm" : "bg-slate-50 border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-bold", isActive ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400")}>
                          {modId.charAt(0).toUpperCase()}
                        </div>
                        <span className={cn("text-xs font-black uppercase tracking-tight", isActive ? "text-emerald-700" : "text-slate-400")}>{modId}</span>
                      </div>
                      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border-2", isActive ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300")}>
                        {isActive && <Check className="w-3 h-3 text-white" strokeWidth={4}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setEditingOwner(null)} className="h-12 rounded-2xl font-black text-slate-400">Cancelar</Button>
            <Button onClick={handleUpdateLicense} className="h-12 rounded-2xl font-black px-8 bg-slate-900 group relative overflow-hidden">
              <span className="relative z-10">Salvar Alterações</span>
              <div className="absolute inset-0 bg-primary translate-x-[-100%] group-hover:translate-x-0 transition-transform duration-300" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-md">
           <DialogHeader>
             <DialogTitle className="text-xl font-black">Nova Empresa (Tenant)</DialogTitle>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Registrar novo cliente no sistema</p>
           </DialogHeader>
           <div className="space-y-5 py-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome da Empresa</Label>
                <Input value={newOwner.name} onChange={e => setNewOwner({...newOwner, name: e.target.value})} placeholder="Ex: Construtora Fast" className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Vencimento da Licença</Label>
                <Input type="date" value={newOwner.validUntil} onChange={e => setNewOwner({...newOwner, validUntil: e.target.value})} className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Status Inicial</Label>
                <Select value={newOwner.subscriptionStatus} onValueChange={v => setNewOwner({...newOwner, subscriptionStatus: v})}>
                  <SelectTrigger className="h-12 rounded-2xl border-slate-100 bg-slate-50 font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-100 shadow-xl">
                    {Object.entries(SUBSCRIPTION_STATUS).map(([key, value]) => (
                      <SelectItem key={key} value={key} className="font-bold py-3">{value.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
           </div>
           <DialogFooter>
             <Button onClick={handleAddOwner} className="w-full h-12 rounded-2xl font-black bg-slate-900 shadow-lg shadow-slate-200">Criar Tenant & Alocar API</Button>
           </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
