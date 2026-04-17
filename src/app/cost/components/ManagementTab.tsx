'use client';

import { useRTDBCollection } from '@/firebase/rtdb';
import { useMemoFirebase, useUser, useDatabase } from '@/firebase';
import { ref, query, push, set, update, remove, get } from 'firebase/database';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Trash2, Edit2, Plus, Loader2, Users } from "lucide-react";
import { useState, useMemo, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { auditAction } from '@/app/actions/audit';
import { BudgetSpeedometer, CategoryPieChart } from "./expenses/charts";

const formatCurrency = (val: string | number) => {
  if (!val && val !== 0) return '';
  const num = typeof val === 'string' ? val.replace(/[^0-9]/g, '') : String(val);
  return `¥ ${Number(num).toLocaleString('ja-JP')}`;
};

const parseCurrency = (val: string) => val.replace(/[^0-9]/g, '');

import { GuideBalloon } from "./GuideBalloon";

export function ManagementTab({ ownerIdOverride, t }: { ownerIdOverride?: string, t: any }) {
  const { ownerId: userOwnerId, user, role } = useUser();
  const database = useDatabase();
  const { toast } = useToast();
  const effectiveOwnerId = ownerIdOverride || userOwnerId;

  const PROJECT_STATUS = useMemo(() => ({
    1: { label: (t.tabs && t.tabs.management.statusBefore) || "開始前", color: 'bg-amber-100 text-amber-700' },
    2: { label: (t.tabs && t.tabs.management.statusProgress) || "進行中", color: 'bg-green-100 text-green-700' },
    3: { label: (t.tabs && t.tabs.management.statusDone) || "完了", color: 'bg-blue-100 text-blue-700' },
    4: { label: (t.tabs && t.tabs.management.statusHold) || "保留", color: 'bg-red-100 text-red-700' }
  }), [t]);
  
  const [isAddProjectDialogOpen, setIsAddProjectDialogOpen] = useState(false);
  const [isAddCCDialogOpen, setIsAddCCDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [newCC, setNewCC] = useState({ name: '', status: 2, totalValue: '', budgetLimit: '', assignedLineUserIds: [] as string[], projectId: '' });
  const [editingProject, setEditingProject] = useState<any>(null);
  const [editingCC, setEditingCC] = useState<any>(null);

  const projectsRef = useMemoFirebase(() => effectiveOwnerId && database ? ref(database, `owner_data/${effectiveOwnerId}/projects`) : null, [database, effectiveOwnerId]);
  const usersRef = useMemoFirebase(() => effectiveOwnerId && database ? ref(database, `owner_data/${effectiveOwnerId}/lineUsers`) : null, [database, effectiveOwnerId]);
  const expensesRef = useMemoFirebase(() => effectiveOwnerId && database ? ref(database, `owner_data/${effectiveOwnerId}/expenses`) : null, [database, effectiveOwnerId]);

  const { data: projects, isLoading: isProjectsLoading } = useRTDBCollection(projectsRef);
  const { data: lineUsers } = useRTDBCollection(usersRef);
  const { data: expenses } = useRTDBCollection<any>(expensesRef);

  // Agrega despesas por CC para alimentar os gráficos nos cards
  const expensesByCc = useMemo(() => {
    const map: Record<string, { total: number; categories: Record<string, number> }> = {};
    expenses?.forEach(exp => {
      const ccId = exp.costcenterId;
      if (!ccId) return;
      const isIncome = exp.type === 'income' || exp.type === 'income_amortization' || exp.type === 'income_additive';
      if (!map[ccId]) map[ccId] = { total: 0, categories: {} };
      if (!isIncome) {
        const amt = Number(exp.amount) || 0;
        map[ccId].total += amt;
        const cat = exp.category || 'Miscellaneous';
        map[ccId].categories[cat] = (map[ccId].categories[cat] || 0) + amt;
      }
    });
    return map;
  }, [expenses]);

  const actor = () => ({ type: 'user' as const, id: user?.uid || 'unknown', name: user?.displayName || user?.email || 'manager', role: role || 'manager' });

  const handleAddProject = async () => {
    if (!database || !effectiveOwnerId || !newProject.name) return;
    const newRef = push(ref(database, `owner_data/${effectiveOwnerId}/projects`));
    const payload = { ...newProject, createdAt: new Date().toISOString() };
    await set(newRef, payload);
    auditAction({ ownerId: effectiveOwnerId, actor: actor(), action: 'create', entity: { type: 'project', id: newRef.key || '', path: `owner_data/${effectiveOwnerId}/projects/${newRef.key}`, label: newProject.name }, after: payload, source: 'dashboard' }).catch(() => {});
    setNewProject({ name: '', description: '' });
    setIsAddProjectDialogOpen(false);
    toast({ title: "プロジェクトを登録しました" });
  };

  const handleAddCC = async () => {
    if (!database || !effectiveOwnerId || !newCC.name || !newCC.projectId) return;
    const newRef = push(ref(database, `owner_data/${effectiveOwnerId}/projects/${newCC.projectId}/costcenters`));
    const payload = { ...newCC, totalValue: Number(newCC.totalValue), budgetLimit: Number(newCC.budgetLimit), createdAt: new Date().toISOString() };
    await set(newRef, payload);
    auditAction({ ownerId: effectiveOwnerId, actor: actor(), action: 'create', entity: { type: 'costcenter', id: newRef.key || '', path: `owner_data/${effectiveOwnerId}/projects/${newCC.projectId}/costcenters/${newRef.key}`, label: newCC.name }, after: payload, source: 'dashboard' }).catch(() => {});
    setNewCC({ name: '', status: 2, totalValue: '', budgetLimit: '', assignedLineUserIds: [], projectId: '' });
    setIsAddCCDialogOpen(false);
    toast({ title: "原価センターを登録しました" });
  };

  const handleUpdateCC = async () => {
    if (!database || !effectiveOwnerId || !editingCC) return;
    const { id, projectId, ...data } = editingCC;
    const updatedAt = new Date().toISOString();
    const payload = { ...data, totalValue: Number(data.totalValue), budgetLimit: Number(data.budgetLimit), updatedAt };
    await update(ref(database, `owner_data/${effectiveOwnerId}/projects/${projectId}/costcenters/${id}`), payload);
    auditAction({ ownerId: effectiveOwnerId, actor: actor(), action: 'update', entity: { type: 'costcenter', id, path: `owner_data/${effectiveOwnerId}/projects/${projectId}/costcenters/${id}`, label: editingCC.name }, before: editingCC, after: payload, source: 'dashboard' }).catch(() => {});
    setEditingCC(null);
    toast({ title: "原価センターを更新しました" });
  };

  const handleUpdateProject = async () => {
    if (!database || !effectiveOwnerId || !editingProject) return;
    const { id, ...data } = editingProject;
    const updatedAt = new Date().toISOString();
    const payload = { ...data, updatedAt };
    await update(ref(database, `owner_data/${effectiveOwnerId}/projects/${id}`), payload);
    auditAction({ ownerId: effectiveOwnerId, actor: actor(), action: 'update', entity: { type: 'project', id, path: `owner_data/${effectiveOwnerId}/projects/${id}`, label: editingProject.name }, before: editingProject, after: payload, source: 'dashboard' }).catch(() => {});
    setEditingProject(null);
    toast({ title: "プロジェクトを更新しました" });
  };

  const handleDelete = async (path: string) => {
    if (!database || !effectiveOwnerId || !confirm("削除してもよろしいですか？")) return;
    // Detectar tipo pelo path (projects/X vs projects/X/costcenters/Y)
    const parts = path.split('/');
    const isCC = parts.length === 4; // projects/{pId}/costcenters/{ccId}
    const entityId = parts[parts.length - 1];
    const entityType = isCC ? 'costcenter' : 'project';
    const snapBefore = await get(ref(database, `owner_data/${effectiveOwnerId}/${path}`));
    await remove(ref(database, `owner_data/${effectiveOwnerId}/${path}`));
    auditAction({ ownerId: effectiveOwnerId, actor: actor(), action: 'delete', entity: { type: entityType, id: entityId, path: `owner_data/${effectiveOwnerId}/${path}`, label: snapBefore.val()?.name || entityId }, before: snapBefore.val() || {}, source: 'dashboard' }).catch(() => {});
    toast({ title: "削除しました" });
  };

  const isEmpty = !isProjectsLoading && (!projects || projects.length === 0);

  if (isProjectsLoading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-20">
       {/* Botão novo projeto */}
       <div className="flex justify-end relative">
         {isEmpty && (
           <GuideBalloon 
             message="ここをクリックして最初のプロジェクトを作成しましょう。現場管理の第一歩です！" 
             position="left" 
             className="hidden md:block"
           />
         )}
         <Button onClick={() => setIsAddProjectDialogOpen(true)} className="h-12 rounded-2xl gap-2 font-black bg-slate-900 shadow-lg shadow-slate-200 px-6">
           <Plus className="w-4 h-4"/> 新規プロジェクト
         </Button>
       </div>

       <div className="space-y-6">
         {projects?.map(project => (
           <div key={project.id} className="bg-white rounded-[2.5rem] border shadow-sm overflow-hidden">
             <div className="bg-slate-50 px-8 py-5 border-b flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-800">{project.name}</h3>
                  {project.description && <p className="text-sm text-slate-400 font-bold mt-0.5">{project.description}</p>}
                </div>
                <div className="flex gap-2">
                   <Button variant="ghost" size="icon" onClick={() => handleDelete(`projects/${project.id}`)}><Trash2 className="w-4 h-4 text-red-400"/></Button>
                </div>
             </div>
             <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.costcenters && Object.entries(project.costcenters).map(([id, cc]: [string, any]) => {
                  const ccStats = expensesByCc[id] || { total: 0, categories: {} };
                  return (
                  <div key={id} className="p-5 border rounded-[2rem] flex justify-between items-start hover:bg-slate-50 transition-all group relative">
                     {/* Esquerda: info */}
                     <div className="space-y-2 min-w-0 flex-1 pr-16">
                        <h4 className="font-black text-base text-slate-700">{cc.name}</h4>
                        <Badge className={cn("text-xs border-none font-black", (PROJECT_STATUS as any)[cc.status]?.color)}>{(PROJECT_STATUS as any)[cc.status]?.label}</Badge>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-tighter">予算上限: ¥{(cc.totalValue || 0).toLocaleString()}</p>
                        <p className="text-sm font-bold text-amber-400 uppercase tracking-tighter">警告閾値: ¥{(cc.budgetLimit || 0).toLocaleString()}</p>
                        <div className="flex -space-x-2 mt-3 h-6">
                           {cc.assignedLineUserIds?.map((uid: string) => {
                             const u = lineUsers?.find(user => user.id === uid || user.lineUserId === uid);
                             return u ? (
                               <Avatar key={uid} className="w-6 h-6 border-2 border-white shadow-sm grayscale-[0.2]">
                                  <AvatarImage src={u.photo} />
                                  <AvatarFallback className="text-[10px]">{u.name?.charAt(0)}</AvatarFallback>
                               </Avatar>
                             ) : null;
                           })}
                        </div>
                     </div>
                     {/* Direita: gráficos + ações */}
                     <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                        <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-indigo-50" onClick={(e) => { e.stopPropagation(); setEditingCC({...cc, id, projectId: project.id}) }}><Edit2 className="w-3.5 h-3.5 text-indigo-500"/></Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDelete(`projects/${project.id}/costcenters/${id}`) }}><Trash2 className="w-3.5 h-3.5 text-red-400"/></Button>
                        </div>
                        <div className="flex items-center gap-2 mt-6">
                           <BudgetSpeedometer totalExpense={ccStats.total} budgetLimit={Number(cc.totalValue) || 0} />
                           {Object.keys(ccStats.categories).length > 0 && (
                             <CategoryPieChart categories={ccStats.categories} />
                           )}
                        </div>
                     </div>
                  </div>
                  );
                })}

                {/* CARD VAZIO PARA ADICIONAR NOVO CENTRO DE CUSTO */}
                <div 
                  onClick={() => {setNewCC({...newCC, projectId: project.id}); setIsAddCCDialogOpen(true);}}
                  className="p-5 border-2 border-dashed border-slate-200 rounded-[2rem] flex items-center justify-center cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all group"
                >
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-primary transition-colors">
                    <Plus className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-widest">原価センターを追加</span>
                  </div>
                </div>
             </div>
           </div>
         ))}
       </div>

       <Dialog open={isAddProjectDialogOpen} onOpenChange={setIsAddProjectDialogOpen}>
          <DialogContent className="rounded-[2.5rem]"><DialogHeader><DialogTitle className="font-black">プロジェクトの新規登録</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase text-slate-400">プロジェクト名称</Label>
                <Input value={newProject.name} onChange={e => setNewProject({...newProject, name: e.target.value})} className="h-12 rounded-xl font-bold" placeholder="例: 2024年度 新築プロジェクト" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase text-slate-400">プロジェクトの説明 (任意)</Label>
                <Textarea value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} className="rounded-xl font-bold min-h-[100px]" placeholder="プロジェクトの詳細について記入してください" />
              </div>
            </div>
            <DialogFooter><Button onClick={handleAddProject} className="w-full h-12 rounded-xl font-black bg-slate-900 text-white">登録を保存する</Button></DialogFooter>
          </DialogContent>
       </Dialog>

       <Dialog open={!!editingProject} onOpenChange={() => setEditingProject(null)}>
          <DialogContent className="rounded-[2.5rem]">
            <DialogHeader><DialogTitle className="font-black">プロジェクトの編集</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase text-slate-400">プロジェクト名称</Label>
                <Input value={editingProject?.name || ""} onChange={e => setEditingProject({...editingProject, name: e.target.value})} className="h-12 rounded-xl font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase text-slate-400">プロジェクトの説明</Label>
                <Textarea value={editingProject?.description || ""} onChange={e => setEditingProject({...editingProject, description: e.target.value})} className="rounded-xl font-bold min-h-[100px]" />
              </div>
            </div>
            <DialogFooter><Button onClick={handleUpdateProject} className="w-full h-12 rounded-xl font-black bg-slate-900 text-white">変更を保存する</Button></DialogFooter>
          </DialogContent>
       </Dialog>

       {/* MODAL DE EDIÇÃO E VÍNCULO DE USUÁRIOS */}
       <Dialog open={!!editingCC} onOpenChange={() => setEditingCC(null)}>
          <DialogContent className="rounded-[2.5rem] max-w-md">
            <DialogHeader><DialogTitle className="font-black text-slate-800">原価センター情報の編集</DialogTitle></DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase text-slate-400">名称 (拠点・部門・案件名)</Label>
                <Input value={editingCC?.name || ""} onChange={e => setEditingCC({...editingCC, name: e.target.value})} className="h-12 rounded-xl font-bold" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-black uppercase text-slate-400">予算上限（合計）</Label>
                  <Input value={formatCurrency(editingCC?.totalValue || 0)} onChange={e => setEditingCC({...editingCC, totalValue: parseCurrency(e.target.value)})} className="h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black uppercase text-slate-400">警告閾値</Label>
                  <Input value={formatCurrency(editingCC?.budgetLimit || 0)} onChange={e => setEditingCC({...editingCC, budgetLimit: parseCurrency(e.target.value)})} className="h-12 rounded-xl font-bold" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-black uppercase text-slate-400">ステータス</Label>
                <Select value={String(editingCC?.status || 1)} onValueChange={v => setEditingCC({...editingCC, status: Number(v)})}>
                   <SelectTrigger className="h-12 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                   <SelectContent className="rounded-xl">
                      {Object.entries(PROJECT_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                   </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Users className="w-3 h-3"/> 担当ユーザーの割り当て</Label>
                <div className="border rounded-2xl p-4 bg-slate-50/50">
                  <ScrollArea className="h-40">
                    <div className="space-y-2">
                      {lineUsers?.filter(u => u.status === 2).map(u => (
                        <div key={u.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-xl transition-all border border-transparent hover:border-slate-100">
                          <Checkbox 
                            id={`u-${u.id}`} 
                            checked={editingCC?.assignedLineUserIds?.includes(u.id) || editingCC?.assignedLineUserIds?.includes(u.lineUserId)}
                            onCheckedChange={(checked) => {
                              const currentIds = editingCC?.assignedLineUserIds || [];
                              let newIds = checked ? [...currentIds, u.id, u.lineUserId].filter(Boolean) : currentIds.filter(id => id !== u.id && id !== u.lineUserId);
                              setEditingCC({...editingCC, assignedLineUserIds: Array.from(new Set(newIds))});
                            }}
                          />
                          <Avatar className="w-8 h-8"><AvatarImage src={u.photo}/><AvatarFallback className="text-xs">{u.name?.charAt(0)}</AvatarFallback></Avatar>
                          <Label htmlFor={`u-${u.id}`} className="text-xs font-black text-slate-700 cursor-pointer flex-1 truncate">{u.fullName || u.name}</Label>
                        </div>
                      ))}
                      {(!lineUsers || lineUsers.filter(u => u.status === 2).length === 0) && <p className="text-xs text-slate-400 italic p-4 text-center">利用可能なユーザーはいません</p>}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleUpdateCC} className="w-full h-14 rounded-2xl font-black bg-slate-900 text-white hover:bg-slate-800 shadow-xl transition-all">変更を保存する</Button></DialogFooter>
          </DialogContent>
       </Dialog>

       <Dialog open={isAddCCDialogOpen} onOpenChange={setIsAddCCDialogOpen}>
          <DialogContent className="rounded-[2.5rem] max-w-md">
            <DialogHeader><DialogTitle className="font-black">原価センターの新規追加</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1">
                <Label className="text-xs font-black uppercase text-slate-400">名称 (拠点・部門・案件名)</Label>
                <Input value={newCC.name} onChange={e => setNewCC({...newCC, name: e.target.value})} className="h-12 rounded-xl font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-black uppercase text-slate-400">予算上限（合計）</Label>
                  <Input value={formatCurrency(newCC.totalValue)} onChange={e => setNewCC({...newCC, totalValue: parseCurrency(e.target.value)})} className="h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-black uppercase text-slate-400">警告閾値</Label>
                  <Input value={formatCurrency(newCC.budgetLimit)} onChange={e => setNewCC({...newCC, budgetLimit: parseCurrency(e.target.value)})} className="h-12 rounded-xl font-bold" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-400">担当ユーザー의割り当て</Label>
                <div className="border rounded-2xl p-4 bg-slate-50/50">
                  <ScrollArea className="h-32">
                    <div className="space-y-2">
                      {lineUsers?.filter(u => u.status === 2).map(u => (
                        <div key={u.id} className="flex items-center gap-3 p-1.5 hover:bg-white rounded-xl transition-colors">
                          <Checkbox checked={newCC.assignedLineUserIds.includes(u.id) || (u.lineUserId && newCC.assignedLineUserIds.includes(u.lineUserId))} onCheckedChange={(checked) => {
                            const ids = newCC.assignedLineUserIds;
                            let newIds = checked ? [...ids, u.id, u.lineUserId].filter(Boolean) : ids.filter(id => id !== u.id && id !== u.lineUserId);
                            setNewCC({...newCC, assignedLineUserIds: Array.from(new Set(newIds))});
                          }} />
                          <Avatar className="w-6 h-6"><AvatarImage src={u.photo}/><AvatarFallback className="text-[10px]">{u.name?.charAt(0)}</AvatarFallback></Avatar>
                          <Label className="text-xs font-bold cursor-pointer flex-1 truncate">{u.name || u.fullName}</Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={handleAddCC} className="w-full h-12 rounded-xl font-black bg-slate-900 text-white">原価センターを登録</Button></DialogFooter>
          </DialogContent>
       </Dialog>
    </div>
  );
}
