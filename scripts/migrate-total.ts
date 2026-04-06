import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: "https://studio-3353968200-c57b0-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();
const rtdb = admin.database();

// Função para limpar chaves inválidas para o RTDB (remove pontos, etc)
function sanitizeKeys(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeKeys);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      // Substitui pontos por underscores (problema comum em campos do Firestore)
      const sanitizedKey = key.replace(/\./g, '_');
      newObj[sanitizedKey] = sanitizeKeys(obj[key]);
    }
    return newObj;
  }
  return obj;
}

async function migrate() {
  console.log('🚀 Iniciando Migração TOTAL Firestore -> RTDB (com limpeza de chaves)...');

  // 1. Owner Profile
  console.log('🏢 Migrando perfis de Owner...');
  const ownersSnap = await db.collection('owner').get();
  for (const doc of ownersSnap.docs) {
    const data = sanitizeKeys(doc.data());
    await rtdb.ref(`owner/${doc.id}`).set(data);
  }

  // 2. Users
  console.log('👥 Migrando usuários...');
  const usersSnap = await db.collection('users').get();
  for (const doc of usersSnap.docs) {
    const data = sanitizeKeys(doc.data());
    await rtdb.ref(`users/${doc.id}`).set(data);
  }

  // 3. Pool e Configurações Globais
  console.log('⚙️ Migrando configurações globais...');
  const poolSnap = await db.collection('line_api_pool').get();
  for (const doc of poolSnap.docs) {
    const data = sanitizeKeys(doc.data());
    await rtdb.ref(`line_api_pool/${doc.id}`).set(data);
  }

  const stripeSnap = await db.collection('stripe_config').get();
  for (const doc of stripeSnap.docs) {
    const data = sanitizeKeys(doc.data());
    await rtdb.ref(`stripe_config/${doc.id}`).set(data);
  }

  // 4. Versões
  console.log('🏷️ Migrando versões...');
  const versSnap = await db.collection('versions').get();
  for (const doc of versSnap.docs) {
    const data = sanitizeKeys(doc.data());
    await rtdb.ref(`versions/${doc.id}`).set(data);
  }

  console.log('✨ Migração TOTAL concluída!');
}

migrate().catch(console.error);
