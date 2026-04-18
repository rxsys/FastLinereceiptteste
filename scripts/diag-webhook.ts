import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, query, limitToLast } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://fastline-app-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function checkDiagnostics() {
  try {
    console.log("--- BOT POOL ---");
    const poolSnap = await get(ref(db, 'line_api_pool'));
    console.log(JSON.stringify(poolSnap.val(), null, 2));

    console.log("\n--- ÚLTIMOS HITS WEBHOOK ---");
    const debugSnap = await get(query(ref(db, 'debug_webhook'), limitToLast(5)));
    console.log(JSON.stringify(debugSnap.val(), null, 2));

  } catch (err) {
    console.error(err);
  }
  process.exit();
}

checkDiagnostics();
