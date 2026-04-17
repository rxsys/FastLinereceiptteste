'use client';

import { useRTDBCollection } from '@/firebase/rtdb';
import { useMemoFirebase, useUser, useDatabase } from '@/firebase';
import { ref, push, set, update, remove } from 'firebase/database';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, Save, Plus, Database, Link as LinkIcon, Unlink } from "lucide-react";
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LineApiPoolTab({ t }: { t: any }) {
  const database = useDatabase();
  const { toast } = useToast();

  const poolRef = useMemoFirebase(() => database ? ref(database, 'line_api_pool') : null, [database]);
  const { data: pool } = useRTDBCollection(poolRef);

  const ownersRef = useMemoFirebase(() => database ? ref(database, 'owner') : null, [database]);
  const { data: owners } = useRTDBCollection<any>(ownersRef);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBot, setNewBot] = useState({ name: '', lineBasicId: '', lineChannelAccessToken: '', lineChannelSecret: '', googleGenAiApiKey: '' });
  const [assigningBotId, setAssigningBotId] = useState<string | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');

  const handleAddBot = async () => {
    if (!database || !newBot.name) return;
    const newRef = push(ref(database, 'line_api_pool'));
    await set(newRef, { ...newBot, status: 'available', createdAt: new Date().toISOString() });
    setNewBot({ name: '', lineBasicId: '', lineChannelAccessToken: '', lineChannelSecret: '', googleGenAiApiKey: '' });
    setIsAddDialogOpen(false);
    toast({ title: "Bot adicionado ao pool" });
  };

  const handleDelete = async (id: string) => {
    if (!database || !confirm("Remover este bot do pool?")) return;
    await remove(ref(database, `line_api_pool/${id}`));
    toast({ title: "Bot removido" });
  };

  const handleAssign = async (botId: string) => {
    if (!database || !selectedOwnerId) return;
    const ownerObj = owners?.find((o: any) => o.id === selectedOwnerId);
    const ownerName = ownerObj?.companyName || ownerObj?.name || 'Unknown';
    await update(ref(database, `line_api_pool/${botId}`), {
      ownerId: selectedOwnerId,
      ownerName,
      status: 'used',
      assignedAt: new Date().toISOString(),
    });
    setAssigningBotId(null);
    setSelectedOwnerId('');
    toast({ title: `Bot vinculado a ${ownerName}` });
  };

  const handleUnassign = async (botId: string) => {
    if (!database || !confirm("Desvincular este bot do owner? O bot voltará para o pool disponível.")) return;
    await update(ref(database, `line_api_pool/${botId}`), {
      ownerId: null,
      ownerName: null,
      status: 'available',
      assignedAt: null,
    });
    toast({ title: "Bot desvinculado" });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border shadow-sm">
        <h2 className="text-xl font-black flex items-center gap-3"><Database className="text-primary"/> Pool de APIs LINE</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild><Button className="rounded-2xl gap-2 font-black"><Plus/> Novo Bot</Button></DialogTrigger>
          <DialogContent className="rounded-[2rem]">
            <DialogHeader><DialogTitle>Adicionar Bot ao Pool</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <Label>Nome de Referência</Label><Input value={newBot.name} onChange={e => setNewBot({...newBot, name: e.target.value})} placeholder="FastLine X"/>
              <Label>LINE Basic ID</Label><Input value={newBot.lineBasicId} onChange={e => setNewBot({...newBot, lineBasicId: e.target.value})} placeholder="@..."/>
              <Label>Channel Access Token</Label><Input value={newBot.lineChannelAccessToken} onChange={e => setNewBot({...newBot, lineChannelAccessToken: e.target.value})}/>
              <Label>Channel Secret</Label><Input value={newBot.lineChannelSecret} onChange={e => setNewBot({...newBot, lineChannelSecret: e.target.value})}/>
            </div>
            <DialogFooter><Button onClick={handleAddBot} className="w-full">Salvar Bot</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pool?.map(bot => (
          <Card key={bot.id} className="rounded-[2rem] border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="min-w-0 flex-1">
                <CardTitle className="text-base font-black truncate">{bot.name}</CardTitle>
                <p className="text-xs text-slate-400">{bot.lineBasicId}</p>
                {bot.ownerId && (
                  <p className="text-[10px] font-bold text-emerald-600 mt-1 truncate">
                    🔗 {bot.ownerName || bot.ownerId}
                  </p>
                )}
              </div>
              <div className="flex gap-1 items-center shrink-0">
                <Badge variant={bot.status === 'available' ? 'outline' : 'default'} className="text-[9px]">{bot.status?.toUpperCase()}</Badge>
                {bot.ownerId ? (
                  <Button variant="ghost" size="icon" onClick={() => handleUnassign(bot.id)} title="Desvincular"><Unlink className="w-4 h-4 text-amber-500"/></Button>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => { setAssigningBotId(bot.id); setSelectedOwnerId(''); }} title="Vincular a owner"><LinkIcon className="w-4 h-4 text-indigo-500"/></Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => handleDelete(bot.id)}><Trash2 className="w-4 h-4 text-red-400"/></Button>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Dialog open={!!assigningBotId} onOpenChange={(open) => { if (!open) { setAssigningBotId(null); setSelectedOwnerId(''); } }}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader><DialogTitle>Vincular Bot a Owner</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Selecione o Owner</Label>
            <Select value={selectedOwnerId} onValueChange={setSelectedOwnerId}>
              <SelectTrigger><SelectValue placeholder="Escolha uma empresa"/></SelectTrigger>
              <SelectContent>
                {owners?.map((o: any) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.companyName || o.name || o.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={() => assigningBotId && handleAssign(assigningBotId)} disabled={!selectedOwnerId} className="w-full">
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
