import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';
import { getStorage } from 'firebase-admin/storage';

function getFirebaseAdmin() {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'studio-3353968200-c57b0';
  const databaseURL = process.env.FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.asia-east1.firebasedatabase.app`;
  
  // Fallback para URL padrão se a regional falhar (comum em projetos antigos)
  const legacyDatabaseURL = `https://${projectId}-default-rtdb.firebaseio.com`;

  if (!getApps().length) {
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/"/g, '');
    }

    try {
      if (projectId && clientEmail && privateKey && privateKey.includes('BEGIN PRIVATE KEY')) {
        console.log('[FirebaseAdmin] Initializing with Service Account');
        initializeApp({
          credential: cert({ projectId, clientEmail, privateKey }),
          storageBucket: `${projectId}.firebasestorage.app`,
          databaseURL: databaseURL
        });
      } else {
        console.log('[FirebaseAdmin] Initializing with Default Credentials');
        initializeApp({ 
          storageBucket: `${projectId}.firebasestorage.app`,
          databaseURL: databaseURL
        });
      }
    } catch (error) {
      console.error('[FirebaseAdmin] Init error, trying legacy URL:', error);
      if (!getApps().length) {
        initializeApp({ 
          storageBucket: `${projectId}.firebasestorage.app`,
          databaseURL: legacyDatabaseURL
        });
      }
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
