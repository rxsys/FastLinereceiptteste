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
import { Trash2, Edit2, Shield, Search, Key, Mail, Building } from "lucide-react";
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
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border shadow-sm">
        <h3 className="text-xl font-black flex items-center gap-2"><Shield className="text-amber-500"/> Global User Directory</h3>
        <Input placeholder="Buscar por email ou nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-80 rounded-xl h-11" />
      </div>

      {Object.entries(usersGrouped).map(([ownerId, group]) => {
        const owner = owners?.find(o => o.id === ownerId);
        const projectKeys = pool?.find(p => p.id === ownerId);
        const filteredGroup = group.filter(u => 
          u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          u.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredGroup.length === 0) return null;

        return (
          <Card key={ownerId} className="rounded-[2.5rem] border shadow-md overflow-hidden bg-white">
            <CardHeader className="bg-slate-900 text-white p-6 flex flex-row items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"><Building className="w-5 h-5"/></div>
                  <div>
                    <CardTitle className="text-base font-black">{owner?.name || "Empresa Não Vinculada"}</CardTitle>
                    <p className="text-[10px] font-mono opacity-50">{ownerId}</p>
                  </div>
               </div>
               <Badge className="bg-white/10 border-none">{filteredGroup.length} Usuários</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead className="pl-8">Usuário</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead className="text-right pr-8">Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredGroup.map(u => (
                    <React.Fragment key={u.id}>
                      <TableRow className="cursor-pointer hover:bg-slate-50/50" onClick={() => setExpanded(prev => ({...prev, [u.id]: !prev[u.id]}))}>
                        <TableCell className="pl-8">
                          <p className="font-black text-sm">{u.name || "---"}</p>
                          <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3"/> {u.email}</p>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] font-black">{u.role?.toUpperCase()}</Badge></TableCell>
                        <TableCell><Badge className={cn("text-[9px]", u.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100")}>{u.status?.toUpperCase() || "NEW"}</Badge></TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-1" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={() => setEditingUser(u)}><Edit2 className="w-4 h-4"/></Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}><Trash2 className="w-4 h-4 text-red-400"/></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded[u.id] && (
                        <TableRow>
                          <TableCell colSpan={4} className="p-0 border-b-0">
                            <div className="bg-slate-900 border-x-4 border-l-amber-500 border-r-transparent p-6 text-white overflow-hidden shadow-inner flex flex-col gap-6">
                              <section className="space-y-4">
                                <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 flex items-center gap-2">
                                  <Key className="w-3.5 h-3.5"/> Full Internal Record (User Raw Data)
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {Object.entries(u).map(([k, v]) => {
                                    if (typeof v === 'object' && v !== null) {
                                      return (
                                        <div key={k} className="col-span-full space-y-1 bg-white/5 p-3 rounded-xl border border-white/10">
                                          <p className="text-[10px] font-black text-amber-500 uppercase">{k}</p>
                                          <pre className="text-[10px] whitespace-pre-wrap break-all font-mono text-slate-300">
                                            {JSON.stringify(v, null, 2)}
                                          </pre>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div key={k} className="space-y-1">
                                        <p className="text-[9px] font-black text-slate-500 uppercase">{k}</p>
                                        <p className="font-mono text-xs break-all font-medium text-slate-200">
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
                                      { label: 'Webhook URL', val: projectKeys.webhook, color: 'text-blue-400' },
                                      { label: 'LINE Basic ID', val: projectKeys.lineBasicId },
                                      { label: 'Channel Secret', val: projectKeys.lineChannelSecret },
                                      { label: 'Channel Access Token', val: projectKeys.lineChannelAccessToken },
                                      { label: 'Google Gen AI Key', val: projectKeys.googleGenAiApiKey, color: 'text-amber-400' },
                                    ].map(item => (
                                      <div key={item.label} className="space-y-1">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">{item.label}</p>
                                        <p className={cn("font-mono text-[10px] break-all", item.color || "text-emerald-200")}>
                                          {item.val || '—'}
                                        </p>
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
