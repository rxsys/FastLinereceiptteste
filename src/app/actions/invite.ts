'use server';

import { db } from '@/lib/firebase';
import crypto from 'crypto';

export async function createInvite(data: {
  ownerId: string;
  botId: string;
  inviteName: string;
  projectIds: string[];
  costCenterIds: string[];
  language: string;
}) {
  const hash = crypto.randomBytes(4).toString('hex').toUpperCase();
  
  // Note: O client-side já está inserindo no RTDB, então podemos remover esse insert ou fazer aqui.
  // Vou apenas retornar a hash gerada para não duplicar, ou utilizar rtdb para salvar e evitar salvar via client.
  // Como LineUsersTab.tsx faz o push e set localmente, só precisamos gerar a hash segura no servidor.
  
  return { id: hash, hash };
}
