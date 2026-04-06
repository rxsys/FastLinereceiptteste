const { db } = require('../src/lib/firebase');
const dotenv = require('dotenv');
const path = require('path');

// Carrega as variáveis de ambiente do arquivo .env na raiz do projeto
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function seedStripeKeys() {
  console.log('Iniciando o processo de seeding das chaves do Stripe...');

  const stripeConfig = {
    // Modo Padrão: comece com 'test'
    mode: process.env.STRIPE_DEFAULT_MODE || 'test',

    // Chaves de Teste
    testSecretKey: process.env.STRIPE_TEST_SECRET_KEY || '',
    testPublishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY || '',
    testPriceId: process.env.STRIPE_TEST_PRICE_ID || '',
    testWebhookSecret: process.env.STRIPE_TEST_WEBHOOK_SECRET || '',

    // Chaves de Produção (Live)
    liveSecretKey: process.env.STRIPE_LIVE_SECRET_KEY || '',
    livePublishableKey: process.env.STRIPE_LIVE_PUBLISHABLE_KEY || '',
    livePriceId: process.env.STRIPE_LIVE_PRICE_ID || '',
    liveWebhookSecret: process.env.STRIPE_LIVE_WEBHOOK_SECRET || '',
  };

  // Validação: Garante que as chaves essenciais para o modo de teste ou produção existam
  if (!stripeConfig.testSecretKey || !stripeConfig.liveSecretKey) {
    console.error('Erro Crítico: As variáveis de ambiente STRIPE_TEST_SECRET_KEY e STRIPE_LIVE_SECRET_KEY devem ser definidas no seu arquivo .env.');
    console.log('Por favor, adicione as chaves e tente novamente.');
    process.exit(1); // Encerra o script com um código de erro
  }

  console.log(`Modo configurado: ${stripeConfig.mode}`);
  console.log('Chaves a serem salvas (parcialmente ocultas por segurança):');
  console.log(`- Test Secret Key: ${stripeConfig.testSecretKey.substring(0, 8)}...`);
  console.log(`- Live Secret Key: ${stripeConfig.liveSecretKey.substring(0, 8)}...`);

  try {
    const configDocRef = db.collection('stripe_config').doc('keys');
    
    console.log('Conectando ao Firestore e salvando o documento em: stripe_config/keys');
    
    await configDocRef.set(stripeConfig, { merge: true });

    console.log('\n✅ Sucesso! As chaves do Stripe foram salvas no Firestore.');
    console.log('O painel de administração do Stripe agora deve funcionar corretamente.');

  } catch (error) {
    console.error('\n❌ Erro ao salvar as chaves no Firestore:', error);
    console.log('\nPor favor, verifique suas credenciais do Firebase (arquivo de chave de serviço) e as permissões do Firestore.');
    process.exit(1);
  }
}

seedStripeKeys();
