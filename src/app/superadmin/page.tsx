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
import { Plus, ShieldCheck, Calendar, Building2, AlertTriangle, Edit2, Loader2, ArrowLeft, Trash2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { cn } from "@/lib/utils";
import { LineApiPoolTab } from '@/app/dashboard/components/LineApiPoolTab';

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

  const { data: owners } = useRTDBCollection(ownersRef);
  const { data: pool } = useRTDBCollection(poolRef);

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
    await update(ref(database, `owner/${id}`), { ...data, updatedAt: new Date().toISOString() });
    setEditingOwner(null);
    toast({ title: '更新完了' });
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
          <Card className="p-6 rounded-[2rem] bg-slate-900 text-white"><p className="text-xs font-black opacity-50 uppercase">Total Tenants</p><p className="text-5xl font-black mt-2">{owners?.length || 0}</p></Card>
        </div>

        <Card className="rounded-[2.5rem] border shadow-xl overflow-hidden bg-white">
          <Table>
             <TableHeader className="bg-slate-50"><TableRow><TableHead className="pl-10">Tenant</TableHead><TableHead>Status</TableHead><TableHead>Expira</TableHead><TableHead className="text-right pr-10">Ação</TableHead></TableRow></TableHeader>
             <TableBody>
                {owners?.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-10 font-black">{o.name}<p className="text-[9px] font-mono opacity-30">{o.id}</p></TableCell>
                    <TableCell><Badge className={cn("text-[9px] border-none", (SUBSCRIPTION_STATUS as any)[o.subscriptionStatus]?.color)}>{(SUBSCRIPTION_STATUS as any)[o.subscriptionStatus]?.label}</Badge></TableCell>
                    <TableCell className="text-xs font-bold">{o.validUntil || "S/ Data"}</TableCell>
                    <TableCell className="text-right pr-10"><Button variant="ghost" size="icon" onClick={() => setEditingOwner(o)}><Edit2 className="w-4 h-4"/></Button></TableCell>
                  </TableRow>
                ))}
             </TableBody>
          </Table>
        </Card>

        <LineApiPoolTab t={{}} />
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="rounded-[2rem]">
           <DialogHeader><DialogTitle>Registrar Empresa</DialogTitle></DialogHeader>
           <div className="space-y-4 py-4">
              <Label>Nome da Empresa</Label><Input value={newOwner.name} onChange={e => setNewOwner({...newOwner, name: e.target.value})} />
              <Label>Expiração</Label><Input type="date" value={newOwner.validUntil} onChange={e => setNewOwner({...newOwner, validUntil: e.target.value})} />
           </div>
           <DialogFooter><Button onClick={handleAddOwner} className="w-full h-12 rounded-xl font-black">Criar Tenant</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
