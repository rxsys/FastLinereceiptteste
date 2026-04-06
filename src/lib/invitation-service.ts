import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';

export interface InvitationData {
  name: string;
  projectIds: string[];
  lang: string;
  ownerId: string;
  partnerId: string;
}

/**
 * Gera uma string aleatória curta de 8 caracteres.
 */
export const generateShortHash = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Cria um convite no Firestore vinculado a uma hash curta.
 */
export const createInvitation = async (data: InvitationData): Promise<string> => {
  const hash = generateShortHash();
  
  await addDoc(collection(db, 'invitations'), {
    hash,
    name: data.name,
    projectIds: data.projectIds,
    lang: data.lang,
    ownerId: data.ownerId,
    partnerId: data.partnerId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  return hash;
};

/**
 * Busca os dados do convite no Firestore através da hash.
 */
export const getInvitationByHash = async (hash: string) => {
  const q = query(
    collection(db, 'invitations'), 
    where('hash', '==', hash), 
    limit(1)
  );
  
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};