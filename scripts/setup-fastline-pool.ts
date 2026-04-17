import { rtdb } from '../src/lib/firebase';

/**
 * Script para configurar manualmente um novo bot no line_api_pool.
 * Use isso para garantir que o webhookId da URL (ex: fastline3) resolva para o Owner correto.
 */
async function setupPool() {
  const WEBHOOK_ID = 'fastline3'; // O ID que vai na URL: /api/line/webhook/fastline3
  const TARGET_OWNER_ID = '9zhju6sEPCf6e2sDwszgOQ9sSj12'; // Altere para o ID do Owner real
  
  const botConfig = {
    ownerId: TARGET_OWNER_ID,
    lineChannelAccessToken: 'SEU_ACCESS_TOKEN_AQUI',
    lineChannelSecret: 'SEU_CHANNEL_SECRET_AQUI',
    lineBasicId: '@seu_bot_id',
    googleGenAiApiKey: '', // Opcional: Se vazio, usa a do Owner
    status: 'active',
    updatedAt: new Date().toISOString()
  };

  console.log(`\n--- CONFIGURANDO POOL PARA: ${WEBHOOK_ID} ---`);
  
  try {
    await rtdb.ref(`line_api_pool/${WEBHOOK_ID}`).set(botConfig);
    console.log(`✅ Sucesso! O bot '${WEBHOOK_ID}' agora está vinculado ao Owner '${TARGET_OWNER_ID}'.`);
    console.log(`Link do Webhook: https://seu-dominio.com/api/line/webhook/${WEBHOOK_ID}`);
  } catch (err: any) {
    console.error(`❌ Erro ao configurar: ${err.message}`);
  }

  process.exit(0);
}

setupPool();
