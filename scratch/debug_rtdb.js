
const { rtdb } = require('./src/lib/firebase');

async function debugRoot() {
  try {
    const snap = await rtdb.ref('/').get();
    const val = snap.val() || {};
    console.log('Root keys:', Object.keys(val));
    if (val.line_api_pool) {
      console.log('line_api_pool keys:', Object.keys(val.line_api_pool));
    }
    if (val.fastline4) {
      console.log('Detected fastline4 at ROOT!');
    }
  } catch (e) {
    console.error(e);
  }
}

debugRoot();
