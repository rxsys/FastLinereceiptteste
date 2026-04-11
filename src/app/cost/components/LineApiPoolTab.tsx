'use client';

import { useRTDBCollection } from '@/firebase/rtdb';
import { useMemoFirebase, useDatabase } from '@/firebase';
import { ref, push, set, update, remove } from 'firebase/database';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit2, Plus, Database, Eye, EyeOff } from "lucide-react";
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export function LineApiPoolTab({ t }: { t: any }) {
  const database = useDatabase();
  const { toast } = useToast();
  
  const poolRef = useMemoFirebase(() => database ? ref(database, 'line_api_pool') : null, [database]);
  const { data: pool } = useRTDBCollection(poolRef);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<any | null>(null);
  
  const defaultBotState = { name: '', lineBasicId: '', lineChannelAccessToken: '', lineChannelSecret: '', googleGenAiApiKey: '', webhook: '' };
  const [newBot, setNewBot] = useState(defaultBotState);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const handleAddBot = async () => {
    if (!database || !newBot.name) return;
    const newRef = push(ref(database, 'line_api_pool'));
    await set(newRef, { ...newBot, status: 'available', createdAt: new Date().toISOString() });
    setNewBot(defaultBotState);
    setIsAddDialogOpen(false);
    toast({ title: "Bot adicionado ao pool" });
  };

  const handleUpdateBot = async () => {
    if (!database || !editingBot?.id) return;
    const { id, ...data } = editingBot;
    await update(ref(database, `line_api_pool/${id}`), data);
    setEditingBot(null);
    toast({ title: "Configurações do Bot atualizadas" });
  };

  const handleDelete = async (id: string) => {
    if (!database || !confirm("Remover este bot do pool?")) return;
    await remove(ref(database, `line_api_pool/${id}`));
    toast({ title: "Bot removido" });
  };

  const toggleKeyVis = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] border shadow-sm">
        <h2 className="text-xl font-black flex items-center gap-3"><Database className="text-primary"/> Pool de APIs LINE</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild><Button className="rounded-2xl gap-2 font-black"><Plus/> Novo Bot</Button></DialogTrigger>
          <DialogContent className="rounded-[2rem] max-w-2xl">
            <DialogHeader><DialogTitle>Adicionar Bot ao Pool</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nome de Referência</Label><Input value={newBot.name} onChange={e => setNewBot({...newBot, name: e.target.value})} placeholder="FastLine X"/></div>
                <div className="space-y-2"><Label>LINE Basic ID</Label><Input value={newBot.lineBasicId} onChange={e => setNewBot({...newBot, lineBasicId: e.target.value})} placeholder="@..."/></div>
              </div>
              <Label>Webhook URL</Label><Input value={newBot.webhook} onChange={e => setNewBot({...newBot, webhook: e.target.value})} placeholder="https://..."/>
              <Label>Channel Access Token</Label><Input value={newBot.lineChannelAccessToken} onChange={e => setNewBot({...newBot, lineChannelAccessToken: e.target.value})}/>
              <Label>Channel Secret</Label><Input value={newBot.lineChannelSecret} onChange={e => setNewBot({...newBot, lineChannelSecret: e.target.value})}/>
              <Label>Google Gen AI API Key</Label><Input value={newBot.googleGenAiApiKey} onChange={e => setNewBot({...newBot, googleGenAiApiKey: e.target.value})}/>
            </div>
            <DialogFooter><Button onClick={handleAddBot} className="w-full h-12 rounded-2xl font-black bg-slate-900">Salvar Bot</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pool?.map(bot => {
          const isUsed = bot.status === 'used';
          return (
            <Card key={bot.id} className={cn(
              "rounded-[2rem] border transition-all duration-300",
              isUsed 
                ? "border-amber-200 bg-amber-50/40 shadow-inner" 
                : "border-slate-100 bg-white shadow-sm"
            )}>
              <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm",
                    isUsed ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {bot.name?.charAt(0) || <Database />}
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black flex items-center gap-2">
                      {bot.name}
                      {isUsed && <Badge className="bg-amber-500 hover:bg-amber-600 text-[9px] font-black uppercase">Em Uso</Badge>}
                    </CardTitle>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={cn("text-[9px] font-black", isUsed ? "border-amber-200 text-amber-700" : "border-emerald-200 text-emerald-700")}>
                          {bot.status?.toUpperCase()}
                        </Badge>
                        {bot.ownerName && <span className="text-[10px] font-black text-amber-700 uppercase">Tenant: {bot.ownerName}</span>}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => toggleKeyVis(bot.id)} className="rounded-xl h-8 text-[10px] uppercase font-black bg-white/50">
                     {showKeys[bot.id] ? <><EyeOff className="w-3 h-3 mr-1"/> Ocultar</> : <><Eye className="w-3 h-3 mr-1"/> Ver Chaves</>}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setEditingBot(bot)} className="rounded-xl h-8 w-8 hover:bg-slate-100"><Edit2 className="w-3.5 h-3.5 text-slate-500"/></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(bot.id)} className="rounded-xl h-8 w-8 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5 text-red-500"/></Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">LINE Basic ID</p>
                  <p className="font-mono text-sm break-all font-black text-slate-700">{bot.lineBasicId || '—'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Webhook URL (Dinamíco)</p>
                  <p className="font-mono text-[9px] break-all text-blue-500 font-bold underline cursor-help" title={bot.webhook}>{bot.webhook || 'Não configurado'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">LINE Channel Secret</p>
                  <p className="font-mono text-xs break-all bg-slate-50/80 p-2 rounded-xl text-slate-600 border border-slate-100/50">
                    {showKeys[bot.id] ? (bot.lineChannelSecret || '—') : '••••••••••••••••••••••••••••••••'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Google Gen AI API Key</p>
                  <p className="font-mono text-xs break-all bg-slate-50/80 p-2 rounded-xl text-slate-600 border border-slate-100/50">
                    {showKeys[bot.id] ? (bot.googleGenAiApiKey || '—') : '••••••••••••••••••••••••••••••••••••••'}
                  </p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">LINE Channel Access Token</p>
                  <p className="font-mono text-[10px] break-all bg-slate-50/80 p-2 rounded-xl text-slate-600 border border-slate-100/50">
                    {showKeys[bot.id] ? (bot.lineChannelAccessToken || '—') : '••••••••••••••••••••••••••••••••••••••••••••••••'}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!editingBot} onOpenChange={() => setEditingBot(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-2xl bg-white border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white">
            <DialogHeader>
               <DialogTitle className="text-2xl font-black flex items-center gap-3">
                 <Edit2 className="text-primary w-6 h-6"/> Editar API Pool
               </DialogTitle>
               <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Configuração de Chaves do Robô</p>
            </DialogHeader>
          </div>
          
          <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Nome de Referência</Label>
                <Input value={editingBot?.name || ''} onChange={e => setEditingBot({...editingBot, name: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-bold" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">LINE Basic ID</Label>
                <Input value={editingBot?.lineBasicId || ''} onChange={e => setEditingBot({...editingBot, lineBasicId: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-mono" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Webhook URL</Label>
              <Input value={editingBot?.webhook || ''} onChange={e => setEditingBot({...editingBot, webhook: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-mono text-xs" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Channel Access Token</Label>
              <Input value={editingBot?.lineChannelAccessToken || ''} onChange={e => setEditingBot({...editingBot, lineChannelAccessToken: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Channel Secret</Label>
              <Input value={editingBot?.lineChannelSecret || ''} onChange={e => setEditingBot({...editingBot, lineChannelSecret: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Google Gen AI API Key</Label>
              <Input value={editingBot?.googleGenAiApiKey || ''} onChange={e => setEditingBot({...editingBot, googleGenAiApiKey: e.target.value})} className="h-12 rounded-2xl bg-slate-50 border-slate-100 font-mono text-xs" />
            </div>
          </div>
          
          <DialogFooter className="p-8 bg-slate-50 border-t border-slate-100">
             <Button variant="ghost" onClick={() => setEditingBot(null)} className="h-12 rounded-2xl font-black text-slate-400">Cancelar</Button>
             <Button onClick={handleUpdateBot} className="h-12 rounded-2xl font-black px-8 bg-slate-900 group">
               Salvar Alterações
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
