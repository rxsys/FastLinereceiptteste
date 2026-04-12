import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';

function getFirebaseAdmin() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'studio-3353968200-c57b0';
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '');
    }

    // URL original do projeto
    const config = {
      databaseURL: "https://studio-3353968200-c57b0-default-rtdb.firebaseio.com"
    };

    try {
      if (projectId && clientEmail && privateKey && privateKey.includes('BEGIN PRIVATE KEY')) {
        initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          storageBucket: `${projectId}.firebasestorage.app`,
          ...config
        });
      } else {
        initializeApp({ 
          storageBucket: `${projectId}.firebasestorage.app`, 
          ...config 
        });
      }
    } catch (error) {
      if (!getApps().length) initializeApp({ storageBucket: `${projectId}.firebasestorage.app`, ...config });
    }
  }
  return {
    auth: getAuth(),
    rtdb: getDatabase(),
    storage: getStorage()
  };
}

export const { auth, rtdb, storage: adminStorage } = getFirebaseAdmin();
export const db = null as any;
