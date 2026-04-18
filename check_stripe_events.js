require('dotenv').config({ path: '.env.local' });
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function checkEvents() {
  try {
    const events = await stripe.events.list({ limit: 5 });
    console.log("=== ÚLTIMOS 5 EVENTOS NO STRIPE ===");
    events.data.forEach(e => {
      console.log(`- Data: ${new Date(e.created * 1000).toLocaleString()} | Tipo: ${e.type} | ID: ${e.id}`);
    });

    const webhooks = await stripe.webhookEndpoints.list({ limit: 5 });
    console.log("\n=== ENDPOINTS DE WEBHOOK REGISTRADOS ===");
    webhooks.data.forEach(w => {
      console.log(`- URL: ${w.url}`);
      console.log(`  Ouvindo: ${w.enabled_events.join(', ')}`);
      console.log(`  Ativo: ${w.status} | Secret (parcial): ${w.secret ? w.secret.substring(0,10)+'...' : 'null'}`);
    });

  } catch (error) {
    console.error("Erro na API do Stripe:", error);
  }
}

checkEvents();
