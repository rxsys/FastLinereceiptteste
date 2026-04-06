'use client';

import { useRTDBCollection, useRTDBDoc } from '@/firebase/rtdb';
import { useMemoFirebase, useUser, useDatabase } from '@/firebase';
import { ref, update, set, push, remove, query, orderByChild, equalTo } from 'firebase/database';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings, Save, Trash2, ShieldCheck, UserPlus, Edit2, Users, Loader2, Mail, Lock, Bot, MessageSquare, LayoutDashboard, Sparkles, BarChart2 } from "lucide-react";
import { OwnerAIUsagePanel } from '@/components/owner-ai-usage-panel';
import { Textarea } from "@/components/ui/textarea";
import { useState, useMemo } from 'react';
import { Switch } from "@/components/ui/switch";
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

  // AI config
  const aiConfigPath = ownerId ? `owner/${ownerId}/aiConfig` : null;
  const { data: aiConfig } = useRTDBDoc(aiConfigPath);
  const [isSavingAi, setIsSavingAi] = useState(false);
  const [systemPromptDraft, setSystemPromptDraft] = useState('');
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  const handleAiToggle = async (field: 'lineAiEnabled' | 'dashboardAiEnabled', value: boolean) => {
    if (!database || !ownerId) return;
    setIsSavingAi(true);
    try {
      await update(ref(database, `owner/${ownerId}/aiConfig`), { [field]: value });
      toast({ title: value ? "AIアシスタントを有効にしました" : "AIアシスタントを無効にしました" });
    } catch { toast({ variant: "destructive", title: "保存に失敗いたしました" }); }
    finally { setIsSavingAi(false); }
  };
  
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

      <Card className="rounded-[2.5rem] border shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-slate-50 border-b p-8">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            <Bot className="text-violet-500"/> AIアシスタント設定
          </CardTitle>
          <p className="text-xs text-slate-400 mt-1">各チャネルのAIアシスタントを個別に管理いたします</p>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-green-600"/>
              </div>
              <div>
                <p className="font-black text-sm text-slate-800">LINEアシスタント</p>
                <p className="text-[11px] text-slate-400 mt-0.5">LINEユーザーへのAI自動応答を有効にします</p>
              </div>
            </div>
            <Switch
              checked={!!aiConfig?.lineAiEnabled}
              onCheckedChange={(v) => handleAiToggle('lineAiEnabled', v)}
              disabled={isSavingAi}
            />
          </div>

          <div className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-violet-600"/>
              </div>
              <div>
                <p className="font-black text-sm text-slate-800">ダッシュボードアシスタント</p>
                <p className="text-[11px] text-slate-400 mt-0.5">管理画面内のAIチャットアシスタントを有効にします</p>
              </div>
            </div>
            <Switch
              checked={!!aiConfig?.dashboardAiEnabled}
              onCheckedChange={(v) => handleAiToggle('dashboardAiEnabled', v)}
              disabled={isSavingAi}
            />
          </div>

          {(aiConfig?.lineAiEnabled || aiConfig?.dashboardAiEnabled) && (
            <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100">
              <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest mb-1">AI使用状況</p>
              <p className="text-xs text-violet-500">AIアシスタントが有効です。使用量はトークン単位で計測されます。</p>
            </div>
          )}

          {/* Script de personalidade configurável */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500"/>
              <p className="font-black text-sm text-slate-800">AIの個性・対応スクリプト</p>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              AIがユーザーに対してどのように振る舞うかを自由に設定できます。空白の場合はデフォルト設定が使用されます。
            </p>
            <Textarea
              value={systemPromptDraft || aiConfig?.systemPrompt || ''}
              onChange={e => setSystemPromptDraft(e.target.value)}
              placeholder={`例: あなたは株式会社○○の経費管理アシスタントです。社員の質問に丁寧かつ親しみやすく対応してください。経費以外の質問にも積極的に答えてください。`}
              className="min-h-[120px] text-sm rounded-2xl bg-slate-50 border-slate-200 resize-none"
            />
            <Button
              onClick={async () => {
                if (!database || !ownerId) return;
                setIsSavingPrompt(true);
                try {
                  await update(ref(database, `owner/${ownerId}/aiConfig`), { systemPrompt: systemPromptDraft });
                  toast({ title: "AIスクリプトを保存しました" });
                } catch { toast({ variant: "destructive", title: "保存に失敗しました" }); }
                finally { setIsSavingPrompt(false); }
              }}
              disabled={isSavingPrompt}
              className="rounded-xl h-10 gap-2 bg-violet-600 hover:bg-violet-700 text-white"
            >
              {isSavingPrompt ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
              スクリプトを保存
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI Token Usage */}
      <Card className="rounded-[2.5rem] border shadow-sm overflow-hidden">
        <CardHeader className="p-6 bg-white border-b border-slate-100">
          <CardTitle className="text-base font-black text-slate-800 flex items-center gap-2">
            <BarChart2 className="text-violet-500 w-5 h-5"/> AI使用量・トークン
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <OwnerAIUsagePanel />
        </CardContent>
      </Card>

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
