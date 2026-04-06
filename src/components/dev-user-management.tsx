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
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function DevUserManagement() {
  const database = useDatabase();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<any>(null);

  const usersRef = useMemo(() => database ? ref(database, 'users') : null, [database]);
  const ownersRef = useMemo(() => database ? ref(database, 'owner') : null, [database]);

  const { data: usersRaw } = useRTDBCollection(usersRef);
  const { data: owners } = useRTDBCollection(ownersRef);

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
    if (!database || !confirm("Deletar usuário permanentemente?")) return;
    await remove(ref(database, `users/${id}`));
    toast({ title: "Usuário removido" });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border shadow-sm">
        <h3 className="text-xl font-black flex items-center gap-2"><Shield className="text-amber-500"/> Global User Directory</h3>
        <Input placeholder="Buscar por email ou nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-80 rounded-xl h-11" />
      </div>

      {Object.entries(usersGrouped).map(([ownerId, group]) => {
        const owner = owners?.find(o => o.id === ownerId);
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
                    <TableRow key={u.id}>
                      <TableCell className="pl-8">
                        <p className="font-black text-sm">{u.name || "---"}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3"/> {u.email}</p>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px] font-black">{u.role?.toUpperCase()}</Badge></TableCell>
                      <TableCell><Badge className={cn("text-[9px]", u.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100")}>{u.status?.toUpperCase() || "NEW"}</Badge></TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setEditingUser(u)}><Edit2 className="w-4 h-4"/></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id)}><Trash2 className="w-4 h-4 text-red-400"/></Button>
                        </div>
                      </TableCell>
                    </TableRow>
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
