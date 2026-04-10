'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/cost');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        <p className="text-sm font-bold text-slate-400 animate-pulse">Redirecting to /cost...</p>
      </div>
    </div>
  );
}
