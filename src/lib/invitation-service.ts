import { getDatabase, ref, push, set } from 'firebase/database';

export interface InvitationData {
  name: string;
  projectIds: string[];
  lang: string;
  ownerId: string;
  partnerId: string;
}

export const generateShortHash = (): string => {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
};

export const createInvitation = async (data: InvitationData): Promise<string> => {
  const hash = generateShortHash();
  const database = getDatabase();
  const newInviteRef = push(ref(database, `owner_data/${data.ownerId}/invites`));
  await set(newInviteRef, {
    hash,
    inviteName: data.name,
    role: 'user',
    projectIds: data.projectIds,
    costCenterIds: [],
    language: data.lang,
    used: false,
    createdAt: new Date().toISOString(),
  });
  return hash;
};
