
const { rtdb } = require('../src/lib/firebase');

async function run() {
  try {
    const ownerId = 'fastline-teste';
    const snap = await rtdb.ref(`owner/${ownerId}`).once('value');
    console.log(`--- OWNER: ${ownerId} ---`);
    console.log(JSON.stringify(snap.val(), null, 2));

    const apiPool = await rtdb.ref('line_api_pool').once('value');
    console.log('--- LINE API POOL ---');
    console.log(JSON.stringify(apiPool.val(), null, 2));

  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
