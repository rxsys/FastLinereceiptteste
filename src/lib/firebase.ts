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
      databaseURL: "https://fastline-app-default-rtdb.asia-southeast1.firebasedatabase.app"
    };

    try {
      if (projectId && clientEmail && privateKey && privateKey.includes('BEGIN PRIVATE KEY')) {
        console.log(`[firebase] Initializing with Service Account for project: ${projectId}`);
        initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          storageBucket: `${projectId}.firebasestorage.app`,
          ...config
        });
      } else {
        console.log(`[firebase] Initializing with DEFAULT credentials for project: ${projectId}`);
        initializeApp({ 
          storageBucket: `${projectId}.firebasestorage.app`, 
          ...config 
        });
      }
    } catch (error: any) {
      console.error(`[firebase] Initialization error: ${error.message}`);
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
