import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: "https://studio-3353968200-c57b0-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();
const rtdb = admin.database();
const newKey = "AIzaSyAIZJb8HO43ldFm5VfXEju8g22OVs6J-Rw";

async function update() {
  console.log('Updating Google AI API Key in Firestore and RTDB...');

  // 1. Atualizar no Firestore (Coleção Global line_api_pool)
  const poolSnap = await db.collection('line_api_pool').get();
  for (const doc of poolSnap.docs) {
    await doc.ref.update({ googleGenAiApiKey: newKey });
    console.log(`✅ Firestore: line_api_pool/${doc.id} atualizado.`);
  }

  // 2. Atualizar no Firestore (Coleção owner)
  const ownerSnap = await db.collection('owner').get();
  for (const doc of ownerSnap.docs) {
    await doc.ref.update({ googleGenAiApiKey: newKey });
    console.log(`✅ Firestore: owner/${doc.id} atualizado.`);
  }

  // 3. Atualizar no RTDB (Sincronizar)
  await rtdb.ref('line_api_pool').get().then(async (snap) => {
    const data = snap.val();
    if (data) {
      for (const id in data) {
        await rtdb.ref(`line_api_pool/${id}`).update({ googleGenAiApiKey: newKey });
      }
    }
  });
  console.log('✅ RTDB: line_api_pool sincronizado.');

  console.log('✨ Todas as instâncias da chave foram atualizadas!');
}

update().catch(console.error);
