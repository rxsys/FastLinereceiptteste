import { rtdb } from '../src/lib/firebase';

async function verify() {
  console.log('--- DIAGNÓSTICO DE CONFIGURAÇÃO LINE ---');
  
  const poolSnap = await rtdb.ref('line_api_pool').get();
  const ownersSnap = await rtdb.ref('owner').get();
  
  const pool = poolSnap.val() || {};
  const owners = ownersSnap.val() || {};
  
  console.log('\n1. Mapeamento de Bots (line_api_pool):');
  Object.entries(pool).forEach(([key, data]: [string, any]) => {
    console.log(`   - Webhook ID: ${key} -> Vinculado ao Owner: ${data.ownerId || 'SEM OWNER'}`);
    if (data.lineChannelAccessToken) {
      console.log(`     Token: ${data.lineChannelAccessToken.substring(0, 15)}...`);
    } else {
      console.log('     ⚠️ Token de Acesso AUSENTE!');
    }
  });
  
  console.log('\n2. Verificação de Integridade por Owner:');
  Object.entries(owners).forEach(([id, data]: [string, any]) => {
    const name = data.name || 'Empresa Sem Nome';
    const hasBot = Object.values(pool).some((p: any) => p.ownerId === id) || !!pool[id];
    
    if (hasBot) {
      console.log(`   ✅ [${name}] (${id}): Monitorando corretamente.`);
    } else {
       // Se não tem bot no pool, talvez o id do pool seja o próprio id do owner
       console.log(`   ❌ [${name}] (${id}): NENHUM BOT ENCONTRADO NO POOL!`);
    }
  });
  
  console.log('\n--- FIM DO DIAGNÓSTICO ---');
  process.exit(0);
}

verify();
