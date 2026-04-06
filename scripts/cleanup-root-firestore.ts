import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function deleteCollection(collectionPath: string) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(500);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query: admin.firestore.Query, resolve: any) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function cleanup() {
  const collections = ['projects', 'costcenter', 'lineUsers', 'invites', 'expenses'];
  
  console.log('🧹 Iniciando limpeza das coleções raiz no Firestore...');
  
  for (const coll of collections) {
    console.log(`🗑️ Deletando coleção: ${coll}...`);
    await deleteCollection(coll);
    console.log(`✅ Coleção ${coll} removida.`);
  }

  console.log('✨ Limpeza concluída!');
}

cleanup().catch(console.error);
