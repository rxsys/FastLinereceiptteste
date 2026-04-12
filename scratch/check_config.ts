
import { rtdb } from './src/lib/firebase';

async function checkConfig() {
  try {
    const snap = await rtdb.ref('stripe_config/keys').get();
    console.log('RTDB Config:', JSON.stringify(snap.val(), null, 2));
  } catch (e) {
    console.error('Error:', e);
  }
}

checkConfig();
