'use client';

import { useRTDBCollection } from '@/firebase/rtdb';
import { useMemoFirebase, useUser, useDatabase } from '@/firebase';
import { ref, push, set, update, remove } from 'firebase/database';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, Save, Plus, Database, Link as LinkIcon, Unlink, Activity, CheckCircle2, XCircle } from "lucide-react";
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
  const [newBot, setNewBot] = useState({ name: '', lineBasicId: '', lineChannelAccessToken: '', lineChannelSecret: '', googleGenAiApiKey: '', webhook: '' });
  const [assigningBotId, setAssigningBotId] = useState<string | null>(null);
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  
  const [editingBot, setEditingBot] = useState<any | null>(null);
  const [testingBotId, setTestingBotId] = useState<string | null>(null);

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

  const handleEditBot = async () => {
    if (!database || !editingBot) return;
    const { id, ...data } = editingBot;
    await update(ref(database, `line_api_pool/${id}`), data);
    setEditingBot(null);
    toast({ title: "Bot atualizado com sucesso" });
  };

  const handleTestConnection = async (botId: string, accessToken: string) => {
    if (!accessToken) {
      toast({ variant: 'destructive', title: "Token não configurado", description: "O Bot precisa de um Channel Access Token" });
      return;
    }
    setTestingBotId(botId);
    try {
      const res = await fetch('/api/admin/test-line-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelAccessToken: accessToken })
      });
      const data = await res.json();
      if (data.success) {
        toast({
          title: "Conexão bem-sucedida! ✅",
          description: `Bot conectado: ${data.botInfo.displayName || 'Desconhecido'} (${data.botInfo.basicId || 'Sem Basic ID'})`
        });
      } else {
        toast({ variant: 'destructive', title: "Falha na conexão ❌", description: data.error });
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: "Erro", description: e.message });
    } finally {
      setTestingBotId(null);
    }
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
              <Label>Webhook URL</Label><Input value={newBot.webhook || ''} onChange={e => setNewBot({...newBot, webhook: e.target.value})} placeholder="https://..."/>
              <Label>AI API Key (Gemini)</Label><Input value={newBot.googleGenAiApiKey || ''} onChange={e => setNewBot({...newBot, googleGenAiApiKey: e.target.value})}/>
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
                <Button variant="ghost" size="icon" onClick={() => setEditingBot(bot)} title="Editar"><Edit2 className="w-4 h-4 text-blue-500"/></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(bot.id)}><Trash2 className="w-4 h-4 text-red-400"/></Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3 pb-4">
               <div className="grid grid-cols-2 gap-2 text-[9px] font-mono bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-slate-400 font-bold uppercase truncate">Channel Secret</p>
                    <p className="truncate text-slate-800">{bot.lineChannelSecret || '---'}</p>
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <p className="text-slate-400 font-bold uppercase truncate">AI Key</p>
                    <p className="truncate text-slate-800">{bot.googleGenAiApiKey ? '***************' : '---'}</p>
                  </div>
                  <div className="col-span-2 space-y-1 overflow-hidden pt-1 border-t border-slate-200 mt-1">
                    <p className="text-slate-400 font-bold uppercase truncate">Webhook URL</p>
                    <p className="truncate text-blue-600 underline">{bot.webhook || '---'}</p>
                  </div>
                  <div className="col-span-2 space-y-1 overflow-hidden pt-1 mt-1">
                    <p className="text-slate-400 font-bold uppercase truncate">Token</p>
                    <p className="truncate text-slate-800">{bot.lineChannelAccessToken ? `${bot.lineChannelAccessToken.substring(0,20)}...` : '---'}</p>
                  </div>
               </div>
               <Button 
                onClick={() => handleTestConnection(bot.id, bot.lineChannelAccessToken)}
                disabled={testingBotId === bot.id}
                variant="outline" 
                className="w-full h-8 text-[11px] font-black border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
               >
                 {testingBotId === bot.id ? <><Activity className="w-3 h-3 mr-2 animate-pulse"/> Testando...</> : <><Activity className="w-3 h-3 mr-2"/> Testar Conexão LINE</>}
               </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editingBot} onOpenChange={(open) => { if (!open) setEditingBot(null); }}>
        <DialogContent className="rounded-[2rem]">
          <DialogHeader><DialogTitle>Editar Credenciais do Bot</DialogTitle></DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <Label className="text-xs uppercase font-black text-slate-400">Nome (Referência Interna)</Label>
            <Input value={editingBot?.name || ''} onChange={e => setEditingBot({...editingBot, name: e.target.value})} className="font-bold bg-slate-50"/>
            
            <Label className="text-xs uppercase font-black text-slate-400">LINE Basic ID</Label>
            <Input value={editingBot?.lineBasicId || ''} onChange={e => setEditingBot({...editingBot, lineBasicId: e.target.value})} className="font-bold bg-slate-50"/>
            
            <Label className="text-xs uppercase font-black text-slate-400">Channel Access Token</Label>
            <Input value={editingBot?.lineChannelAccessToken || ''} onChange={e => setEditingBot({...editingBot, lineChannelAccessToken: e.target.value})} className="font-mono text-xs bg-slate-50"/>
            
            <Label className="text-xs uppercase font-black text-slate-400">Channel Secret</Label>
            <Input value={editingBot?.lineChannelSecret || ''} onChange={e => setEditingBot({...editingBot, lineChannelSecret: e.target.value})} className="font-mono text-xs bg-slate-50"/>
            
            <Label className="text-xs uppercase font-black text-slate-400">Webhook URL</Label>
            <Input value={editingBot?.webhook || ''} onChange={e => setEditingBot({...editingBot, webhook: e.target.value})} className="font-mono text-xs bg-slate-50 text-blue-600"/>

            <Label className="text-xs uppercase font-black text-slate-400">AI API Key (Gemini) - Opcional</Label>
            <Input value={editingBot?.googleGenAiApiKey || ''} onChange={e => setEditingBot({...editingBot, googleGenAiApiKey: e.target.value})} className="font-mono text-xs bg-slate-50"/>
          </div>
          <DialogFooter>
            <Button onClick={handleEditBot} className="w-full bg-slate-900 font-black">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


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
