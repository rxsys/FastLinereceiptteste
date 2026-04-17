'use client';

import { useRTDBCollection } from '@/firebase/rtdb';
import { useDatabase } from '@/firebase';
import { ref, update, remove } from 'firebase/database';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Edit2, Shield, Search, Key, Mail, Building, Database, Copy } from "lucide-react";
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function DevUserManagement() {
  const database = useDatabase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const usersRef = useMemo(() => database ? ref(database, 'users') : null, [database]);
  const ownersRef = useMemo(() => database ? ref(database, 'owner') : null, [database]);
  const poolRef = useMemo(() => database ? ref(database, 'line_api_pool') : null, [database]);

  const { data: usersRaw } = useRTDBCollection(usersRef);
  const { data: owners } = useRTDBCollection(ownersRef);
  const { data: pool } = useRTDBCollection(poolRef);

  const usersGrouped = useMemo(() => {
    if (!usersRaw) return {};
    const grouped: Record<string, any[]> = {};
    usersRaw.forEach(u => {
      const oid = u.ownerId || 'unassigned';
      if (!grouped[oid]) grouped[oid] = [];
      grouped[oid].push(u);
    });
    return grouped;
  }, [usersRaw]);

  const handleUpdate = async () => {
    if (!database || !editingUser) return;
    const { id, ...data } = editingUser;
    await update(ref(database, `users/${id}`), data);
    setEditingUser(null);
    toast({ title: "Usuário atualizado" });
  };

  const handleDelete = async (id: string) => {
    if (!database || !confirm("Deletar usuário permanentemente do Banco e do Authentication?")) return;
    
    try {
      // 1. Deletar do Firebase Authentication via API Admin
      const res = await fetch(`/api/admin/users/upsert?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (!res.ok) {
        console.warn('Falha ao remover do Auth (pode não existir):', data.error);
      }

      // 2. Deletar do Realtime Database
      await remove(ref(database, `users/${id}`));
      toast({ title: "Usuário removido com sucesso" });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      toast({ variant: "destructive", title: "Erro ao remover usuário" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white px-8 py-6 rounded-[2.5rem] border shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100">
            <Shield className="w-5 h-5 text-amber-500"/>
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">Global User Directory</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
          <Input 
            placeholder="Buscar por email ou nome..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            className="w-96 pl-11 rounded-2xl h-12 bg-slate-50 border-none shadow-inner font-medium text-sm focus-visible:ring-amber-500/20" 
          />
        </div>
      </div>

      {Object.entries(usersGrouped).map(([ownerId, group]) => {
        const ownerData = owners?.find(o => o.id === ownerId) || {};
        const poolData = pool?.find(p => p.id === ownerId || p.ownerId === ownerId) || {};
        
        // Combina dados do perfil da empresa com as chaves técnicas do bot
        const projectKeys = { ...ownerData, ...poolData };
        const filteredGroup = group.filter(u => 
          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          u.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredGroup.length === 0) return null;

        return (
          <Card key={ownerId} className="rounded-[2.5rem] border shadow-md overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white px-8 py-6 flex flex-row items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/5 shadow-inner">
                    <Building className="w-6 h-6 text-slate-300"/>
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black tracking-tight">{ownerData?.name || "Empresa Não Vinculada"}</CardTitle>
                    <p className="text-[10px] font-mono text-slate-400 tracking-tighter">{ownerId}</p>
                  </div>
               </div>
               <Badge className="bg-white/10 text-white border-white/10 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{filteredGroup.length} Usuários</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b bg-slate-50/50">
                    <TableHead className="pl-8 h-12 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuário</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-widest text-slate-400">Role</TableHead>
                    <TableHead className="h-12 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</TableHead>
                    <TableHead className="text-right pr-8 h-12 text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroup.map(u => (
                    <React.Fragment key={u.id}>
                      <TableRow className="cursor-pointer hover:bg-slate-50/50 group transition-colors" onClick={() => setExpanded(prev => ({...prev, [u.id]: !prev[u.id]}))}>
                        <TableCell className="pl-8 py-5">
                          <p className="font-black text-slate-800 text-sm">{u.name || "---"}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5"><Mail className="w-3.5 h-3.5 text-slate-300"/> {u.email}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200 px-2 py-0.5 rounded-md text-slate-600 bg-white">
                            {u.role || "user"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-none", 
                            u.status === 'active' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                          )}>
                            {u.status || "NEW"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100" onClick={() => setEditingUser(u)}>
                              <Edit2 className="w-4 h-4 text-slate-600"/>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-red-50" onClick={() => handleDelete(u.id)}>
                              <Trash2 className="w-4 h-4 text-red-400"/>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded[u.id] && (
                        <TableRow className="hover:bg-transparent !border-b-0">
                          <TableCell colSpan={4} className="p-0">
                            <div className="bg-slate-950 border-l-[6px] border-l-amber-500 p-8 text-white shadow-inner animate-in slide-in-from-top-1 duration-200">
                              <section className="space-y-6">
                                <div className="flex items-center gap-2">
                                  <Key className="w-4 h-4 text-amber-500"/>
                                  <p className="text-[11px] font-black tracking-[0.2em] uppercase text-slate-400">Full Internal Record (User Raw Data)</p>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-6">
                                  {[
                                    { k: 'ID', v: u.id },
                                    { k: 'EMAIL', v: u.email },
                                    { k: 'NAME', v: u.name },
                                    { k: 'OWNERID', v: u.ownerId },
                                    { k: 'ROLE', v: u.role },
                                    { k: 'STATUS', v: u.status },
                                    { k: 'UPDATEDAT', v: u.updatedAt },
                                  ].filter(item => item.v !== undefined).map(item => (
                                    <div key={item.k} className="space-y-1.5">
                                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.k}</p>
                                      <p className="font-mono text-xs break-all font-medium text-slate-100 bg-white/5 py-1 px-2 rounded-md -ml-2 w-fit">
                                        {String(item.v)}
                                      </p>
                                    </div>
                                  ))}
                                  
                                  {/* Render complex objects separately */}
                                  {Object.entries(u).filter(([k]) => !['id', 'email', 'name', 'ownerId', 'role', 'status', 'updatedAt'].includes(k)).map(([k, v]) => {
                                      if (typeof v === 'object' && v !== null) {
                                        return (
                                          <div key={k} className="col-span-full space-y-2 bg-white/5 p-4 rounded-xl border border-white/5">
                                            <p className="text-[10px] font-black text-amber-500/80 uppercase tracking-widest">{k}</p>
                                            <pre className="text-[10px] whitespace-pre-wrap break-all font-mono text-slate-300">
                                              {JSON.stringify(v, null, 2)}
                                            </pre>
                                          </div>
                                        );
                                      }
                                      return (
                                        <div key={k} className="space-y-1.5">
                                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{k}</p>
                                          <p className="font-mono text-xs break-all font-medium text-slate-100">
                                            {String(v)}
                                          </p>
                                        </div>
                                      );
                                  })}
                                </div>
                              </section>

                              {projectKeys && (
                                <section className="space-y-4 pt-4 border-t border-white/10">
                                  <p className="text-[10px] font-black tracking-widest uppercase text-emerald-500 flex items-center gap-2">
                                    <Database className="w-3.5 h-3.5"/> Associated Project Credentials (Owner Level)
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-emerald-950/30 p-4 rounded-2xl border border-emerald-900/30">
                                    {[
                                      { label: 'Webhook URL (USE ESTA URL NO LINE CONSOLE)', val: projectKeys.webhook, color: 'text-blue-400', important: true },
                                      { label: 'LINE Basic ID', val: projectKeys.lineBasicId },
                                      { label: 'Channel Secret', val: projectKeys.lineChannelSecret },
                                      { label: 'Channel Access Token', val: projectKeys.lineChannelAccessToken },
                                      { label: 'Google Gen AI Key', val: projectKeys.googleGenAiApiKey, color: 'text-amber-400' },
                                    ].map(item => (
                                      <div key={item.label} className={cn("space-y-1", item.important && "col-span-full bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 mb-2")}>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">{item.label}</p>
                                        <div className="flex items-center gap-2">
                                          <p className={cn("font-mono text-[10px] break-all flex-1", item.color || "text-emerald-200", item.important && "text-blue-300 text-xs font-bold")}>
                                            {item.val || '—'}
                                          </p>
                                          {item.val && (
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-6 w-6 shrink-0 hover:bg-white/10" 
                                              onClick={() => {
                                                navigator.clipboard.writeText(item.val);
                                                window.alert('Copiado!');
                                              }}
                                            >
                                              <Copy className="w-3 h-3 text-slate-500" />
                                            </Button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </section>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="rounded-[2.5rem]">
           <DialogHeader><DialogTitle>Editar Usuário Master</DialogTitle></DialogHeader>
           <div className="space-y-4 py-4">
              <Label>Nome</Label><Input value={editingUser?.name || ""} onChange={e => setEditingUser({...editingUser, name: e.target.value})} />
              <Label>Role</Label>
              <Select value={editingUser?.role} onValueChange={v => setEditingUser({...editingUser, role: v})}>
                 <SelectTrigger><SelectValue /></SelectTrigger>
                 <SelectContent><SelectItem value="user">User</SelectItem><SelectItem value="manager">Manager</SelectItem><SelectItem value="developer">Developer</SelectItem></SelectContent>
              </Select>
              <Label>Owner ID (Mover de empresa)</Label><Input value={editingUser?.ownerId || ""} onChange={e => setEditingUser({...editingUser, ownerId: e.target.value})} />
           </div>
           <DialogFooter><Button onClick={handleUpdate} className="w-full h-12 rounded-xl font-black">Aplicar Alterações</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
