
const { rtdb } = require('../src/lib/firebase');

async function run() {
  try {
    const pool = await rtdb.ref('line_api_pool').once('value');
    console.log('--- LINE API POOL ---');
    console.log(JSON.stringify(pool.val(), null, 2));

    const owners = await rtdb.ref('owner').once('value');
    console.log('--- OWNERS ---');
    console.log(JSON.stringify(owners.val(), null, 2));

    const users = await rtdb.ref('users').once('value');
    console.log('--- USERS ---');
    console.log(JSON.stringify(users.val(), null, 2));

  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

run();
