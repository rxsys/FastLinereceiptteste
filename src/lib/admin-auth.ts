import { auth, rtdb } from '@/lib/firebase';

/**
 * Verifica se a requisição possui um token Firebase válido
 * com role 'developer' no Realtime Database. Lança erro se não autorizado.
 */
export async function verifyAdminRequest(req: Request): Promise<void> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  const token = authHeader.slice(7);

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    throw Object.assign(new Error('Unauthorized: invalid token'), { status: 401 });
  }

  const userSnap = await rtdb.ref(`users/${uid}`).get();
  const userData = userSnap.val();
  
  if (!userSnap.exists() || userData?.role !== 'developer') {
    throw Object.assign(new Error('Forbidden: developer role required'), { status: 403 });
  }
}
