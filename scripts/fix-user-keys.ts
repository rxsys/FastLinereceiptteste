import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: "https://studio-3353968200-c57b0-default-rtdb.firebaseio.com"
  });
}

const rtdb = admin.database();

async function fix() {
  console.log('🔧 Corrigindo chaves de usuários no RTDB...');
  const ownersRef = rtdb.ref('owner_data');
  const snapshot = await ownersRef.get();
  const data = snapshot.val();

  for (const ownerId in data) {
    const lineUsers = data[ownerId].lineUsers;
    if (!lineUsers) continue;

    for (const key in lineUsers) {
      const user = lineUsers[key];
      // Se a chave não for o lineUserId, precisamos mover
      if (key !== user.lineUserId && user.lineUserId) {
        console.log(`Merging record ${key} into ${user.lineUserId} for owner ${ownerId}`);
        
        const correctPath = `owner_data/${ownerId}/lineUsers/${user.lineUserId}`;
        const oldPath = `owner_data/${ownerId}/lineUsers/${key}`;
        
        // Pega os dados atuais da chave correta (se houver) para não sobrescrever status 2 com status 0
        const existingCorrectSnap = await rtdb.ref(correctPath).get();
        const existingCorrect = existingCorrectSnap.val();

        if (user.status === 2 || !existingCorrect || existingCorrect.status < user.status) {
          await rtdb.ref(correctPath).update(user);
          await rtdb.ref(oldPath).remove();
          console.log('✅ Unificação concluída.');
        } else {
          await rtdb.ref(oldPath).remove();
          console.log('🗑️ Registro antigo removido (o novo já estava correto).');
        }
      }
    }
  }
  console.log('✨ Sincronização concluída!');
}

fix().catch(console.error);
