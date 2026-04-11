const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const serviceAccount = require('./service-account.json');

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: 'https://fastline-teste-default-rtdb.asia-southeast1.firebasedatabase.app'
});
const db = getDatabase(app);

async function check() {
  const cId = '3353968200'; // Is it this? We see it in the user's URL? No, the URL says `fastline-teste--studio-3353968200-c57b0.asia-east1.hosted.app`
  // Wait, let's just query everything under owner_data and find lineUsers with interactions
  const snap = await db.ref('owner_data').get();
  let found = false;
  snap.forEach(owner => {
     const users = owner.child('lineUsers');
     users.forEach(u => {
        const i = u.child('interactions');
        if(i.exists()) {
           console.log(`FOUND interactions for owner=${owner.key}, user=${u.key}`);
           found = true;
        }
     });
  });
  if(!found) console.log('NO interactions found anywhere!');
  process.exit(0);
}
check();
