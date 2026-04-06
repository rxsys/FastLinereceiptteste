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

async function deleteSubcollections(docRef: admin.firestore.DocumentReference) {
  const subcollections = await docRef.listCollections();
  for (const sub of subcollections) {
    console.log(`    - Deletando subcoleção: ${sub.path}`);
    const snap = await sub.get();
    for (const doc of snap.docs) {
      await deleteSubcollections(doc.ref);
      await doc.ref.delete();
    }
  }
}

async function cleanupTotal() {
  const rootCollections = [
    'users', 'owner', 'line_api_pool', 'stripe_config', 
    'versions', 'logs', 'webhook_events', 'invites', 
    'expenses', 'projects', 'costcenter', 'lineuser'
  ];
  
  console.log('🧨 INICIANDO LIMPEZA TOTAL DO FIRESTORE...');
  
  for (const collName of rootCollections) {
    console.log(`📦 Processando coleção raiz: ${collName}...`);
    
    // Para coleções como 'owner', precisamos deletar subcoleções recursivamente
    const snap = await db.collection(collName).get();
    for (const doc of snap.docs) {
      await deleteSubcollections(doc.ref);
      await doc.ref.delete();
    }
    
    console.log(`✅ Coleção ${collName} (e suas subcoleções) removida.`);
  }

  console.log('✨ FIRESTORE LIMPO COM SUCESSO!');
}

cleanupTotal().catch(console.error);
