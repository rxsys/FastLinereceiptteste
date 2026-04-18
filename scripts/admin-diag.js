const admin = require('firebase-admin');

// Inicializa com as credenciais padrões do ambiente (assumindo que existam ou usando a app-default)
if (!admin.apps.length) {
  // Use as variáveis de ambiente ou serviço da conta localmente
  admin.initializeApp({
    databaseURL: "https://studio-3353968200-c57b0-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

async function runDiag() {
  try {
    const webhookId = "fastline1";
    console.log(`Buscando LOGS detalhados para o webhook: ${webhookId}`);
    
    // Pega os 5 últimos logs do debug
    const snap = await db.ref(`debug_webhook/${webhookId}`).orderByChild("ts").limitToLast(5).get();
    
    if (!snap.exists()) {
      console.log("NENHUM LOG ENCONTRADO no banco de dados para esse webhook. A chamanda do LINE sequer está chegando no webhook.");
    } else {
      console.log("Últimos hits registrados no Firebase:");
      const records = snap.val();
      for (const [key, val] of Object.entries(records)) {
         console.log(`\nID: ${key}`);
         console.log(JSON.stringify(val, null, 2));
      }
    }
    
    // Busca pool de APIs para verificar credenciais
    console.log('\n--- VERIFICANDO POOL DE APIs ---');
    const poolSnap = await db.ref(`line_api_pool/${webhookId}`).get();
    if (poolSnap.exists()) {
      const data = poolSnap.val();
      console.log(`Dono atribuído (ownerId): ${data.ownerId || 'NENHUM'}`);
      console.log(`Status do bot no Pool: ${data.status || 'NENHUM'}`);
      console.log(`Tem Token: ${!!data.lineChannelAccessToken}`);
    } else {
      console.log("ATENÇÃO: Este ID não existe na raiz de line_api_pool!");
      
      const poolTodosSnap = await db.ref(`line_api_pool`).get();
      if (poolTodosSnap.exists()) {
        const todos = poolTodosSnap.val();
        for(const [k, v] of Object.entries(todos)) {
          if (v.ownerId === webhookId) {
             console.log(`Mas encontrei ele como ownerId dentro da chave: ${k}`);
          }
        }
      }
    }
    
  } catch (err) {
    console.error("Erro na leitura:", err);
  }
  process.exit(0);
}

runDiag();
