'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage'
import { getDatabase } from 'firebase/database'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (!getApps().length) {
    let firebaseApp;
    try {
      firebaseApp = initializeApp();
    } catch (e) {
      if (process.env.NODE_ENV === "production") {
        console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
      }
      firebaseApp = initializeApp(firebaseConfig);
    }

    return getSdks(firebaseApp);
  }

  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  const auth = getAuth(firebaseApp);
  const storage = getStorage(firebaseApp);
  const database = getDatabase(firebaseApp);

  return {
    firebaseApp,
    auth,
    database,
    storage,
    firestore: null // Desativado
  };
}

export * from './provider';
export * from './client-provider';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';

// Mocking useFirestore e useCollection para evitar erros de importação
export const useFirestore = () => null;
export const useCollection = (query: any) => ({ data: [], isLoading: false, error: null });
export const useDoc = (path: string) => ({ data: null, isLoading: false, error: null });
