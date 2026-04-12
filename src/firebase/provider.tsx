'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Database, ref, onValue, get, set, update } from 'firebase/database';
import { FirebaseStorage } from 'firebase/storage';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  database: Database;
  auth: Auth;
  storage: FirebaseStorage;
}

interface UserHookResult {
  user: User | null;
  ownerId: string | null;
  role: string | null;
  subscriptionStatus?: string;
  validUntil?: string | null;
  graceUntil?: string | null;
  lastPaymentFailedAt?: string | null;
  companyName?: string | null;
  subscriptions?: Record<string, { status: string; id: string; updatedAt?: string }>;
  isUserLoading: boolean;
  userError: Error | null;
}

export const FirebaseContext = createContext<any>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children, firebaseApp, database, auth, storage,
}) => {
  const [userState, setUserState] = useState<any>({
    user: null, ownerId: null, role: null, subscriptions: {}, isUserLoading: true, userError: null
  });

  useEffect(() => {
    if (!auth || !database) return;

    return onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[Auth] State changed:', firebaseUser?.email);
      
      if (!firebaseUser) {
        setUserState({ user: null, ownerId: null, role: null, isUserLoading: false, userError: null });
        return;
      }

      try {
        const isDev = ["rxsysjp@gmail.com", "ricardoyukio@gmail.com"].includes(firebaseUser.email || "");
        console.log('[Auth] Is Developer:', isDev);

        const userRef = ref(database, `users/${firebaseUser.uid}`);
        let userData: any = null;
        
        try {
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            userData = snapshot.val();
          } else {
            userData = { email: firebaseUser.email, role: isDev ? 'developer' : 'user', status: 'new' };
            await set(userRef, userData);
          }
        } catch (dbErr) {
          console.error('[Auth] Database fetch error:', dbErr);
          userData = { email: firebaseUser.email, role: isDev ? 'developer' : 'user', status: 'new' };
        }

        let ownerData: any = {};
        if (userData.ownerId) {
          try {
            const ownerSnap = await get(ref(database, `owner/${userData.ownerId}`));
            ownerData = ownerSnap.val() || {};
          } catch (ownerErr) {
            console.error('[Auth] Owner fetch error:', ownerErr);
          }
        }

        const newState = {
          user: firebaseUser,
          ownerId: userData.ownerId || null,
          role: isDev ? 'developer' : (userData.role || 'user'),
          subscriptionStatus: userData.ownerId ? (ownerData.subscriptionStatus || 'trial') : 'none',
          validUntil: ownerData.validUntil || null,
          graceUntil: ownerData.graceUntil || null,
          lastPaymentFailedAt: ownerData.lastPaymentFailedAt || null,
          companyName: ownerData.name || null,
          subscriptions: ownerData.subscriptions || {},
          isUserLoading: false,
          userError: null
        };
        
        console.log('[Auth] New State set for role:', newState.role);
        setUserState(newState);
      } catch (e: any) {
        console.error('[Auth] Critical provider error:', e);
        setUserState(prev => ({ ...prev, isUserLoading: false, userError: e }));
      }
    });
  }, [auth, database]);

  const value = useMemo(() => ({
    firebaseApp, database, auth, storage, ...userState
  }), [firebaseApp, database, auth, storage, userState]);

  return (
    <FirebaseContext.Provider value={value}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
export const useUser = (): UserHookResult => {
  const ctx = useContext(FirebaseContext);
  return {
    user: ctx?.user ?? null,
    ownerId: ctx?.ownerId ?? null,
    role: ctx?.role ?? null,
    subscriptionStatus: ctx?.subscriptionStatus,
    validUntil: ctx?.validUntil,
    graceUntil: ctx?.graceUntil,
    lastPaymentFailedAt: ctx?.lastPaymentFailedAt,
    companyName: ctx?.companyName,
    subscriptions: ctx?.subscriptions || {},
    isUserLoading: ctx?.isUserLoading ?? true,
    userError: ctx?.userError ?? null
  };
};
export const useDatabase = () => useContext(FirebaseContext)?.database;
export const useAuth = () => useContext(FirebaseContext)?.auth;
export const useStorage = () => useContext(FirebaseContext)?.storage;
export const useMemoFirebase = (factory: any, deps: any) => useMemo(factory, deps);
