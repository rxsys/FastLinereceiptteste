import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: "https://studio-3353968200-c57b0-default-rtdb.firebaseio.com"
  });
}

const db = admin.firestore();
const rtdb = admin.database();

async function migrate() {
  console.log('🚀 Iniciando migração completa Firestore -> Realtime Database...');

  // 1. Migrar Usuários (Crítico para as Regras de Segurança)
  console.log('👥 Migrando perfis de usuários...');
  const usersSnap = await db.collection('users').get();
  const usersData: any = {};
  usersSnap.forEach(doc => { usersData[doc.id] = doc.data(); });
  await rtdb.ref('users').set(usersData);

  // 2. Migrar Dados de Owners
  const ownersSnap = await db.collection('owner').get();
  for (const ownerDoc of ownersSnap.docs) {
    const ownerId = ownerDoc.id;
    console.log(`📦 Processando Owner: ${ownerId}`);
    
    const ownerData: any = {};

    // lineUsers
    const lineUsersSnap = await db.collection('owner').doc(ownerId).collection('lineUsers').get();
    ownerData.lineUsers = {};
    lineUsersSnap.forEach(doc => { ownerData.lineUsers[doc.id] = doc.data(); });

    // invites
    const invitesSnap = await db.collection('owner').doc(ownerId).collection('invites').get();
    ownerData.invites = {};
    invitesSnap.forEach(doc => { ownerData.invites[doc.id] = doc.data(); });

    // expenses
    const expensesSnap = await db.collection('owner').doc(ownerId).collection('expenses').get();
    ownerData.expenses = {};
    expensesSnap.forEach(doc => { ownerData.expenses[doc.id] = doc.data(); });

    // projects e costcenters
    const projectsSnap = await db.collection('owner').doc(ownerId).collection('projects').get();
    ownerData.projects = {};
    for (const projDoc of projectsSnap.docs) {
      const projId = projDoc.id;
      const projData = projDoc.data();
      
      const ccsSnap = await db.collection('owner').doc(ownerId).collection('projects').doc(projId).collection('costcenter').get();
      const costcenters: any = {};
      ccsSnap.forEach(doc => { costcenters[doc.id] = doc.data(); });
      
      ownerData.projects[projId] = { ...projData, costcenters };
    }

    await rtdb.ref(`owner_data/${ownerId}`).set(ownerData);
  }

  // 3. Coleções Globais
  console.log('🌍 Migrando coleções globais...');
  const poolSnap = await db.collection('line_api_pool').get();
  const poolData: any = {};
  poolSnap.forEach(doc => { poolData[doc.id] = doc.data(); });
  await rtdb.ref('line_api_pool').set(poolData);

  const configSnap = await db.collection('stripe_config').get();
  const configData: any = {};
  configSnap.forEach(doc => { configData[doc.id] = doc.data(); });
  await rtdb.ref('stripe_config').set(configData);

  console.log('✨ Migração concluída!');
}

migrate().catch(console.error);
