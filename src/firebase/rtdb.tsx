'use client';

import { useFirebase, useMemoFirebase } from '@/firebase';
import { ref, onValue, off, Query as RTDBQuery } from 'firebase/database';
import { useState, useEffect } from 'react';

/**
 * Hook to subscribe to a Realtime Database reference and return the data as an array.
 * @param queryRef The RTDB reference or query to subscribe to.
 */
export function useRTDBCollection<T = any>(queryRef: RTDBQuery | null) {
  const [data, setData] = useState<T[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!queryRef) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    // Subscribe to value changes
    const unsubscribe = onValue(queryRef, 
      (snapshot) => {
        const val = snapshot.val();
        if (!val) {
          setData([]);
        } else {
          // RTDB returns an object of objects, convert to array with IDs
          const dataArray = Object.entries(val).map(([id, item]: [string, any]) => ({
            id,
            ...item
          }));
          setData(dataArray as T[]);
        }
        setIsLoading(false);
      }, 
      (err) => {
        console.error("RTDB useRTDBCollection error:", err);
        setError(err);
        setIsLoading(false);
      }
    );

    return () => {
      // In RTDB, unsubscribe is done via off() or by the callback returned by onValue in newer SDKs
      // but the compatible way with onValue is usually returning the off handler.
      // Firebase v9+ onValue returns an Unsubscribe function.
      unsubscribe();
    };
  }, [queryRef]);

  return { data, isLoading, error };
}

/**
 * Hook to subscribe to a single Realtime Database document/node.
 */
export function useRTDBDoc<T = any>(path: string | null) {
  const { database } = useFirebase() || {};
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!database || !path) {
      setData(undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const docRef = ref(database, path);

    const unsubscribe = onValue(docRef, 
      (snapshot) => {
        setData(snapshot.val() || undefined);
        setIsLoading(false);
      },
      (err) => {
        setError(err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [database, path]);

  return { data, isLoading, error };
}
