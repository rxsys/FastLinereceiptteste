const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

initializeApp({
  databaseURL: "https://studio-3353968200-c57b0-default-rtdb.firebaseio.com"
});

const rtdb = getDatabase();

async function run() {
  const users = (await rtdb.ref('users').limitToLast(5).get()).val();
  const owners = (await rtdb.ref('owner').limitToLast(5).get()).val();
  const webhooks = (await rtdb.ref('webhook_events').limitToLast(5).get()).val();
  
  console.log("LAST 5 USERS:", JSON.stringify(users, null, 2));
  console.log("LAST 5 OWNERS:", JSON.stringify(owners, null, 2));
  console.log("LAST 5 WEBHOOK EVENTS:", JSON.stringify(webhooks, null, 2));
  process.exit(0);
}

run();
