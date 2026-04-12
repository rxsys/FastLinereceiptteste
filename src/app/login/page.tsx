'use client';

import { useState, useEffect } from 'react';
import { useAuth, useUser, useDatabase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Lock, Eye, EyeOff, Loader2, AlertCircle, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, AuthError, sendEmailVerification } from 'firebase/auth';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ref, set } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userName, setUserName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  const auth = useAuth();
  const database = useDatabase();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/cost');
    }
  }, [user, isUserLoading, router]);

  const sendVerificationEmail = async (firebaseUser: any) => {
    try {
      const functions = getFunctions(auth!.app, 'asia-east1');
      const fn = httpsCallable(functions, 'sendCustomVerificationEmail');
      await fn({ uid: firebaseUser.uid, lang: 'ja' });
    } catch (err: any) {
      if (auth) auth.languageCode = 'ja';
      await sendEmailVerification(firebaseUser, {
        url: process.env.NEXT_PUBLIC_APP_URL || window.location.origin,
        handleCodeInApp: false,
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "ログイン完了" });
    } catch (error: any) {
      let message = "ログインに失敗しました。";
      if (error.code === 'auth/invalid-credential') message = "メールアドレスまたはパスワードが正しくありません。";
      setAuthError(message);
    } finally { setIsLoading(false); }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !userName) return;
    setIsLoading(true);
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await set(ref(database!, `users/${cred.user.uid}`), {
        email,
        displayName: userName,
        status: 'new',
        emailVerified: false,
        createdAt: new Date().toISOString(),
        role: 'user'
      });
      await sendVerificationEmail(cred.user);
      toast({ title: "確認メールを送信しました", description: "メールボックスをご確認ください。" });
    } catch (error: any) {
      let message = "アカウント作成に失敗しました。";
      if (error.code === 'auth/email-already-in-use') message = "このメールアドレスは既に登録されています。";
      setAuthError(message);
    } finally { setIsLoading(false); }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <Loader2 className="w-8 h-8 animate-spin text-[#ff6b35]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-6">
      <div className="w-full max-w-[400px] space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center space-y-4">
          <div className="mx-auto w-14 h-14 bg-[#ff6b35] rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl rotate-3">
            F
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">ACCESS FASTLINE</h1>
            <p className="text-slate-400 text-xs font-bold tracking-[0.2em] uppercase">FastLine Platform Access</p>
          </div>
        </div>

        {authError && (
          <Alert variant="destructive" className="border-red-500/20 bg-red-50 text-red-600 rounded-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="font-black">エラー</AlertTitle>
            <AlertDescription className="font-bold">{authError}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-2xl mb-6">
            <TabsTrigger value="login" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">ログイン</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-xl font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">新規登録</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <Card className="border-slate-200 shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden border-none">
              <div className="h-1 bg-gradient-to-r from-[#ff6b35] to-[#ff9f1c]" />
              <form onSubmit={handleSignIn}>
                <CardHeader>
                  <CardTitle className="text-xl font-black">おかえりなさい</CardTitle>
                  <CardDescription className="font-medium">登録済みのメールアドレスでログイン</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">メールアドレス</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#ff6b35] transition-colors" />
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        className="bg-slate-50 border-slate-200 h-12 pl-11 rounded-xl focus:border-[#ff6b35]/50 focus:ring-0 transition-all text-slate-900"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between ml-1">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">パスワード</Label>
                      <button type="button" className="text-[9px] font-black text-[#ff6b35]/80 hover:text-[#ff6b35] transition-colors uppercase tracking-widest">忘れた場合</button>
                    </div>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-[#ff6b35] transition-colors" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className="bg-slate-50 border-slate-200 h-12 pl-11 pr-11 rounded-xl focus:border-[#ff6b35]/50 focus:ring-0 transition-all text-slate-900"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button className="w-full h-12 bg-[#ff6b35] hover:bg-[#ff8555] text-white font-black rounded-xl shadow-lg shadow-[#ff6b35]/20 group relative overflow-hidden transition-all active:scale-[0.98]" type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="relative z-10">ログイン</span>}
                    {!isLoading && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card className="border-slate-200 shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden border-none">
              <div className="h-1 bg-gradient-to-r from-slate-900 to-slate-700" />
              <form onSubmit={handleSignUp}>
                <CardHeader>
                  <CardTitle className="text-xl font-black">無料アカウント作成</CardTitle>
                  <CardDescription className="font-medium">今すぐFastLineを始めましょう</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">会社名またはお名前</Label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <Input
                        placeholder="株式会社○○ / 山田太郎"
                        className="bg-slate-50 border-slate-200 h-12 pl-11 rounded-xl focus:border-slate-900/50 focus:ring-0 transition-all text-slate-900"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">メールアドレス</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        className="bg-slate-50 border-slate-200 h-12 pl-11 rounded-xl focus:border-slate-900/50 focus:ring-0 transition-all text-slate-900"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">パスワード</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        className="bg-slate-50 border-slate-200 h-12 pl-11 rounded-xl focus:border-slate-900/50 focus:ring-0 transition-all text-slate-900"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg shadow-slate-200 group relative overflow-hidden transition-all active:scale-[0.98]" type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="relative z-10">アカウント作成</span>}
                    {!isLoading && <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500" />}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          © 2024 FastLine Intelligence
        </p>
      </div>
    </div>
  );
}
