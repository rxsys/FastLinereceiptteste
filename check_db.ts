import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, query, limitToFirst } from "firebase/database";

const firebaseConfig = {
  databaseURL: "https://fastline-app-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function checkUsers() {
  try {
    const ownersSnap = await get(query(ref(db, 'owner_data'), limitToFirst(3)));
    if (ownersSnap.exists()) {
      const owners = ownersSnap.val();
      for (const ownerId in owners) {
        console.log(`Owner: ${ownerId}`);
        const usersSnap = await get(query(ref(db, `owner_data/${ownerId}/lineUsers`), limitToFirst(2)));
        if (usersSnap.exists()) {
           console.log('Users structure:', JSON.stringify(usersSnap.val(), null, 2));
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
  process.exit();
}

checkUsers();
