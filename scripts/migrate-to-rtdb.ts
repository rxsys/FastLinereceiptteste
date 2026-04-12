
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getDatabase } = require('firebase-admin/database');

// Credenciais do ambiente (App Hosting já as possui ou usa as do sistema)
const projectId = 'studio-3353968200-c57b0';

async function migrateKeys() {
  console.log('--- Iniciando Migração Firestore -> RTDB ---');
  
  // Inicializa Admin com privilégios totais
  const app = initializeApp({
    projectId: projectId,
    databaseURL: `https://${projectId}-default-rtdb.asia-east1.firebasedatabase.app`
  }, 'migrator');

  const fs = getFirestore(app);
  const rtdb = getDatabase(app);

  try {
    console.log('Lendo do Firestore: stripe_config/keys...');
    const doc = await fs.collection('stripe_config').doc('keys').get();
    
    if (!doc.exists) {
      console.error('ERRO: Nenhuma chave encontrada no Firestore!');
      process.exit(1);
    }

    const data = doc.data();
    console.log('Chaves encontradas! Migrando para o RTDB...');
    
    // Oculta chaves no log por segurança
    const maskedData = { ...data };
    Object.keys(maskedData).forEach(k => {
      if (typeof maskedData[k] === 'string') maskedData[k] = maskedData[k].substring(0, 8) + '...';
    });
    console.log('Dados detectados:', JSON.stringify(maskedData, null, 2));

    await rtdb.ref('stripe_config/keys').set({
      ...data,
      migratedAt: new Date().toISOString()
    });

    console.log('✅ SUCESSO! As chaves foram migradas para o Realtime Database.');
  } catch (err) {
    console.error('FALHA NA MIGRAÇÃO:', err);
  } finally {
    process.exit(0);
  }
}

migrateKeys();
