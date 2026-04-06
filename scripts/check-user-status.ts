import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    databaseURL: "https://studio-3353968200-c57b0-default-rtdb.firebaseio.com"
  });
}

const rtdb = admin.database();

async function check() {
  const snapshot = await rtdb.ref('owner_data').get();
  console.log(JSON.stringify(snapshot.val(), null, 2));
}

check().catch(console.error);
