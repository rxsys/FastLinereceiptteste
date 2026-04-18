import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, query, limitToLast } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://fastline-app-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function checkRecentActivity() {
  try {
    const webhookId = "fastline1";
    console.log(`--- ÚLTIMOS 10 HITS EM ${webhookId} ---`);
    const debugSnap = await get(query(ref(db, `debug_webhook/${webhookId}`), limitToLast(10)));
    const data = debugSnap.val();
    
    if (!data) {
      console.log("Nenhum hit encontrado para este webhookId.");
    } else {
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (err) {
    console.error(err);
  }
  process.exit();
}

checkRecentActivity();
