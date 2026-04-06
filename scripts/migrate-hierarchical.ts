import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Admin SDK - assume credentials from environment or default
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrate() {
  console.log('🚀 Iniciando migração para estrutura hierárquica...');

  // 1. Migrar Projetos e seus Centros de Custo
  console.log('--- Migrando Projetos e Centros de Custo ---');
  const projectsSnap = await db.collection('projects').get();
  for (const projDoc of projectsSnap.docs) {
    const data = projDoc.data();
    const ownerId = data.ownerId;
    if (!ownerId) {
      console.warn(`⚠️ Projeto ${projDoc.id} sem ownerId. Pulando.`);
      continue;
    }

    // Criar projeto no novo caminho
    await db.collection('owner').doc(ownerId).collection('projects').doc(projDoc.id).set(data);
    console.log(`✅ Projeto ${projDoc.id} movido para owner ${ownerId}`);

    // Migrar Centros de Custo vinculados a este projeto
    const ccSnap = await db.collection('costcenter').where('projectId', '==', projDoc.id).get();
    for (const ccDoc of ccSnap.docs) {
      await db.collection('owner').doc(ownerId).collection('projects').doc(projDoc.id).collection('costcenter').doc(ccDoc.id).set(ccDoc.data());
      console.log(`   📦 Centro de Custo ${ccDoc.id} movido.`);
    }
  }

  // 2. Migrar Usuários LINE
  console.log('--- Migrando Usuários LINE ---');
  const lineUsersSnap = await db.collection('lineUsers').get();
  for (const userDoc of lineUsersSnap.docs) {
    const data = userDoc.data();
    const ownerId = data.ownerId;
    if (!ownerId || ownerId === 'unassigned') continue;

    await db.collection('owner').doc(ownerId).collection('lineUsers').doc(userDoc.id).set(data);
    console.log(`✅ Usuário ${userDoc.id} movido para owner ${ownerId}`);
  }

  // 3. Migrar Convites
  console.log('--- Migrando Convites ---');
  const invitesSnap = await db.collection('invites').get();
  for (const invDoc of invitesSnap.docs) {
    const data = invDoc.data();
    const ownerId = data.ownerId;
    if (!ownerId) continue;

    await db.collection('owner').doc(ownerId).collection('invites').doc(invDoc.id).set(data);
    console.log(`✅ Convite ${invDoc.id} movido para owner ${ownerId}`);
  }

  // 4. Migrar Despesas
  console.log('--- Migrando Despesas ---');
  const expensesSnap = await db.collection('expenses').get();
  for (const expDoc of expensesSnap.docs) {
    const data = expDoc.data();
    const ownerId = data.ownerId;
    if (!ownerId) continue;

    await db.collection('owner').doc(ownerId).collection('expenses').doc(expDoc.id).set(data);
    console.log(`✅ Despesa ${expDoc.id} movida para owner ${ownerId}`);
  }

  console.log('✨ Migração concluída com sucesso!');
  console.log('Nota: Os dados antigos ainda permanecem nas coleções raiz. Verifique o dashboard antes de deletá-los manualmente.');
}

migrate().catch(console.error);
