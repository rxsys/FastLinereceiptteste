'use client';

import { useState, useEffect, useRef } from 'react';
import { useDatabase } from '@/firebase';
import { ref, onValue } from 'firebase/database';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Image as ImageIcon, FileText, Bot, User, Clock, X, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface UserInteractionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  ownerId: string;
}

export function UserInteractionModal({ isOpen, onClose, user, ownerId }: UserInteractionModalProps) {
  const database = useDatabase();
  const [interactions, setInteractions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollBottomRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const scrollToBottom = () => {
    if (scrollBottomRef.current) {
      scrollBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [interactions]);

  useEffect(() => {
    if (!isOpen || !database || !ownerId || !user) return;

    setLoading(true);

    // IDs candidatos para localizar as interações gravadas pelo webhook
    // (o webhook sempre grava em owner_data/${ownerId}/lineUsers/${lineUserId})
    const candidateIds = Array.from(new Set([
      user.lineUserId,
      user.id,
      user.userId,
    ].filter(Boolean))) as string[];

    if (candidateIds.length === 0) {
      setInteractions([]);
      setLoading(false);
      return;
    }

    const mergedMap = new Map<string, any>();
    const unsubs: Array<() => void> = [];
    let pending = candidateIds.length;

    const flush = () => {
      const list = Array.from(mergedMap.values()).sort((a, b) => (a.ts || 0) - (b.ts || 0));
      setInteractions(list);
    };

    candidateIds.forEach((cid) => {
      const logRef = ref(database, `owner_data/${ownerId}/lineUsers/${cid}/interactions`);
      const unsub = onValue(
        logRef,
        (snap) => {
          // Remove itens anteriores desta origem e re-adiciona a partir do snapshot atual
          for (const key of Array.from(mergedMap.keys())) {
            if (key.startsWith(`${cid}::`)) mergedMap.delete(key);
          }
          if (snap.exists()) {
            snap.forEach((child) => {
              mergedMap.set(`${cid}::${child.key}`, { id: child.key, ...child.val() });
            });
          }
          flush();
          if (pending > 0) {
            pending -= 1;
            if (pending === 0) setLoading(false);
          }
        },
        (err) => {
          console.warn('[UserInteractionModal] onValue error:', cid, err);
          if (pending > 0) {
            pending -= 1;
            if (pending === 0) setLoading(false);
          }
        }
      );
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [isOpen, database, ownerId, user?.id, user?.lineUserId, user?.userId]);

  const formatTime = (ts: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('ja-JP', { month: '2-digit', day: '2-digit' });
  };

  if (!user) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="rounded-[2.5rem] max-w-2xl h-[85vh] flex flex-col overflow-hidden p-0 bg-slate-50 border-none shadow-2xl">
          {/* Header Styler */}
          <div className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <Avatar className="w-12 h-12 border-2 border-indigo-50">
                <AvatarImage src={user.photo} />
                <AvatarFallback className="bg-indigo-500 text-white font-black">
                  {(user.name || 'U').slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-slate-900 font-black text-lg tracking-tight">
                  Bot インタラクション履歴 (Bot Interaction History)
                </DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                   <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-none text-[8px] font-black uppercase tracking-tighter">Live Log</Badge>
                   <p className="text-[10px] text-slate-400 font-bold">{user.name || user.fullName}</p>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full text-slate-300 hover:text-slate-600 hover:bg-slate-100">
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-hidden relative">
            {loading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm z-10">
                <div className="flex flex-col items-center gap-3">
                   <Bot className="w-10 h-10 text-indigo-400 animate-pulse" />
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading History...</p>
                </div>
              </div>
            ) : null}

            <ScrollArea className="h-full px-6 py-6">
              <div className="space-y-6">
                {interactions.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                     <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center shadow-sm border border-slate-100 text-slate-200">
                        <MessageSquare className="w-8 h-8" />
                     </div>
                     <p className="text-xs font-black text-slate-400">
                       履歴がまだありません<br/>
                       <span className="text-[10px] font-medium opacity-70 block mt-1">No interactions recorded yet.</span>
                       <span className="text-[8px] opacity-30 mt-4 block font-mono">Listening on ID: {user?.lineUserId || user?.id}</span>
                     </p>
                  </div>
                )}

                {interactions.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const showDate = idx === 0 || formatDate(msg.ts) !== formatDate(interactions[idx - 1].ts);

                  return (
                    <div key={msg.id} className="space-y-4">
                      {showDate && (
                        <div className="flex justify-center my-6">
                          <span className="bg-slate-200/50 text-slate-500 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-widest">
                            {formatDate(msg.ts)}
                          </span>
                        </div>
                      )}

                      <div className={cn(
                        "flex items-start gap-3",
                        isUser ? "flex-row-reverse" : "flex-row"
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm border",
                          isUser ? "bg-white border-slate-200 text-slate-400" : "bg-indigo-500 border-indigo-600 text-white"
                        )}>
                          {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>

                        <div className={cn(
                          "max-w-[80%] space-y-1",
                          isUser ? "items-end" : "items-start"
                        )}>
                          <div className={cn(
                            "rounded-[1.5rem] px-4 py-3 shadow-sm text-sm break-words relative overflow-hidden",
                            isUser 
                              ? "bg-white text-slate-700 rounded-tr-none border border-slate-100" 
                              : "bg-indigo-600 text-white rounded-tl-none font-medium"
                          )}>
                            {msg.imageUrl && (
                              <div className="mb-2 group relative">
                                <img 
                                  src={msg.imageUrl} 
                                  alt="User Input" 
                                  className="rounded-xl w-full max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => setSelectedImage(msg.imageUrl)}
                                />
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                  <div className="bg-black/50 p-1.5 rounded-lg backdrop-blur-sm">
                                    <Maximize2 className="w-3.5 h-3.5 text-white" />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {msg.text && (
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                            )}

                            {msg.metadata && (
                               <div className={cn(
                                 "mt-2 p-3 rounded-xl border text-[10px] font-bold space-y-1",
                                 isUser ? "bg-slate-50 border-slate-100 text-slate-500" : "bg-white/10 border-white/20 text-indigo-100"
                               )}>
                                  <p className="uppercase tracking-widest opacity-70 flex items-center gap-1.5 border-b border-current/10 pb-1 mb-1">
                                    <FileText className="w-3 h-3" /> Extracted Info
                                  </p>
                                  {Object.entries(msg.metadata).map(([key, val]) => (
                                    <div key={key} className="flex justify-between gap-10">
                                      <span className="opacity-60">{key}:</span>
                                      <span className="text-right">{String(val)}</span>
                                    </div>
                                  ))}
                               </div>
                            )}
                          </div>
                          <div className={cn(
                            "flex items-center gap-1.5 px-1",
                            isUser ? "justify-end" : "justify-start"
                          )}>
                            <Clock className="w-3 h-3 text-slate-300" />
                            <span className="text-[9px] font-black text-slate-300 tracking-tighter">
                              {formatTime(msg.ts)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={scrollBottomRef} />
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Detail View */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/95 flex items-center justify-center overflow-hidden">
          {selectedImage && (
            <div className="relative w-full h-full flex items-center justify-center p-4">
               <img src={selectedImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Full Preview" />
               <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 text-white/50 hover:text-white hover:bg-white/10 rounded-full"
               >
                 <X className="w-6 h-6" />
               </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
