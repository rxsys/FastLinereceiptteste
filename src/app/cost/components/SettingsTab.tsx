'use client';

import { useRTDBCollection } from '@/firebase/rtdb';
import { useMemoFirebase, useUser, useDatabase } from '@/firebase';
import { ref, update, set, push, remove, query, orderByChild, equalTo } from 'firebase/database';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, Edit2, Users, Loader2, Mail, Lock, ShieldCheck, Trash2 } from "lucide-react";
import { useState, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function SettingsTab({ version, hideUserManagement = false, t }: { version: string, hideAddOwner?: boolean, hideUserManagement?: boolean, t: any }) {
  const { user, ownerId, role } = useUser();
  const database = useDatabase();
  const { toast } = useToast();

  const usersRef = useMemoFirebase(() => {
    if (!database) return null;
    if (role === 'developer') return ref(database, 'users'); // Desenvolvedores podem ler todos os usuários
    if (!ownerId) return null; // Sem ownerId, não pode ler a lista
    return query(ref(database, 'users'), orderByChild('ownerId'), equalTo(ownerId));
  }, [database, ownerId, role]);
  
  const { data: allUsers } = useRTDBCollection(usersRef);

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });

  const users = useMemo(() => {
    if (!allUsers) return [];
    
    const filtered = allUsers.filter(u => {
      if (user?.uid && u.id === user.uid) return true;
      if (ownerId && u.ownerId === ownerId) return true;
      return false;
    });
    
    const uniqueUsers = Array.from(new Map(filtered.map(item => [item.id, item])).values());
    
    return uniqueUsers.sort((a, b) => {
      if (a.id === user?.uid) return -1;
      if (b.id === user?.uid) return 1;
      return 0;
    });
  }, [allUsers, ownerId, user?.uid]);

  const handleAddUser = async () => {
    if (!database || !ownerId || !newUser.email) return;
    setIsAddingUser(true);
    try {
      const newRef = push(ref(database, 'users'));
      await set(newRef, {
        ...newUser,
        ownerId,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      setIsAddingUser(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      toast({ title: "ユーザーの追加が完了いたしました" });
    } catch (e) { toast({ variant: "destructive", title: "エラーが発生いたしました" }); }
    finally { setIsAddingUser(false); }
  };

  const handleUpdateUser = async () => {
    if (!database || !editingUser) return;
    setIsUpdating(true);
    try {
      await update(ref(database, `users/${editingUser.id}`), {
        name: editingUser.name,
        role: editingUser.role,
        password: editingUser.password || editingUser.passwordHint || ""
      });
      setEditingUser(null);
      toast({ title: "設定の保存が完了いたしました" });
    } catch (e) { toast({ variant: "destructive", title: "保存に失敗いたしました" }); }
    finally { setIsUpdating(false); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!database || !confirm("このユーザーを削除してもよろしいでしょうか？")) return;
    try {
      await remove(ref(database, `users/${id}`));
      toast({ title: "ユーザーの削除が完了いたしました" });
    } catch (e) { toast({ variant: "destructive", title: "削除に失敗いたしました" }); }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      
      {!hideUserManagement && (
        <Card className="rounded-[2.5rem] border shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b p-8 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl font-black flex items-center gap-2">
                <Users className="text-emerald-500"/> アクセス権限管理
              </CardTitle>
              <p className="text-xs text-slate-400 mt-1">システムを利用するユーザーを管理いたします</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="rounded-xl gap-2 font-black bg-emerald-600 hover:bg-emerald-700">
                  <UserPlus className="w-4 h-4"/> 新規ユーザーを追加する
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-[2rem]">
                <DialogHeader><DialogTitle>新規ユーザー登録</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                   <div className="space-y-1">
                      <Label>氏名</Label>
                      <Input value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                   <div className="space-y-1">
                      <Label>メールアドレス</Label>
                      <Input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                   <div className="space-y-1">
                      <Label>パスワード</Label>
                      <Input type="text" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="h-12 rounded-xl" />
                   </div>
                   <div className="space-y-1">
                      <Label>権限</Label>
                      <Select value={newUser.role} onValueChange={v => setNewUser({...newUser, role: v})}>
                        <SelectTrigger className="h-12 rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">一般ユーザー</SelectItem>
                          <SelectItem value="manager">管理者</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                </div>
                <DialogFooter><Button onClick={handleAddUser} disabled={isAddingUser} className="w-full h-12 rounded-xl font-black bg-emerald-600">登録を実行する</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-6 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-full flex items-center justify-center font-black text-white shadow-sm", u.role === 'manager' ? "bg-indigo-500" : "bg-slate-400")}>
                      {u.name?.charAt(0).toUpperCase() || u.email?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-sm text-slate-800 break-all">
                        {u.name || "名称未設定"} 
                        {u.id === user?.uid && <Badge variant="secondary" className="ml-2 text-[8px] bg-slate-200">あなた</Badge>}
                      </p>
                      <p className="text-xs text-slate-400 flex items-center gap-1"><Mail className="w-3 h-3"/> {u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={cn("text-[10px] font-black px-3 py-1", u.role === 'manager' ? "border-indigo-200 text-indigo-700 bg-indigo-50" : "border-slate-200 text-slate-600")}>
                      {u.role === 'manager' ? "管理者" : "一般"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => setEditingUser(u)} className="h-10 w-10 rounded-xl hover:bg-indigo-50 hover:text-indigo-600"><Edit2 className="w-4 h-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id)} disabled={u.id === user?.uid} className="h-10 w-10 rounded-xl hover:bg-red-50 hover:text-red-600 disabled:opacity-30"><Trash2 className="w-4 h-4"/></Button>
                  </div>
                </div>
              ))}
              {users.length === 0 && <div className="p-12 text-center text-slate-400 font-bold">登録されているユーザーは現在おりません</div>}
            </div>
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between p-6 bg-slate-900 rounded-[2rem] text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-emerald-400 w-4 h-4"/>
          <span className="text-[10px] font-black uppercase tracking-widest">FastLine Secure Management Core</span>
        </div>
        <Badge variant="outline" className="text-[10px] border-slate-700 font-mono text-slate-500">v{version}</Badge>
      </div>

      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent className="rounded-[2.5rem] max-w-md">
          <DialogHeader><DialogTitle className="font-black text-slate-800">ユーザー情報の編集</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1">
              <Label>氏名</Label>
              <Input value={editingUser?.name || ""} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="h-12 rounded-xl" />
            </div>
            <div className="space-y-1">
              <Label>権限</Label>
              <Select value={editingUser?.role || 'user'} onValueChange={v => setEditingUser({...editingUser, role: v})}>
                <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="user">一般ユーザー</SelectItem>
                  <SelectItem value="manager">管理者</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>パスワード変更 (ヒント)</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input value={editingUser?.password || editingUser?.passwordHint || ""} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="h-12 rounded-xl pl-10 font-mono" placeholder="新しいパスワード" />
              </div>
              <p className="text-[9px] text-slate-400 italic mt-1">※ 管理者用リファレンスとして保存されます</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateUser} disabled={isUpdating} className="w-full h-12 rounded-xl font-black bg-slate-900 text-white hover:bg-slate-800 transition-all">変更を保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
