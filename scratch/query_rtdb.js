
const admin = require('firebase-admin');

// Hardcoded config matching src/lib/firebase.ts fallback
const config = {
  databaseURL: "https://studio-3353968200-c57b0-default-rtdb.firebaseio.com"
};

if (!admin.apps.length) {
  admin.initializeApp(config);
}

const rtdb = admin.database();

async function debug() {
  console.log("Checking RTDB Invites...");
  const ownersSnap = await rtdb.ref('owner_data').get();
  if (!ownersSnap.exists()) {
    console.log("No owner_data found in RTDB.");
    return;
  }

  const owners = ownersSnap.val();
  for (const ownerId in owners) {
    console.log(`\nOwner: ${ownerId}`);
    const invites = owners[ownerId].invites;
    if (invites) {
      console.log("Invites:");
      Object.entries(invites).forEach(([id, data]) => {
        console.log(` - ID: ${id}, Hash: ${data.hash}, Used: ${data.used}, Name: ${data.inviteName}`);
      });
    } else {
      console.log(" - No invites found for this owner.");
    }
    
    // Check webhook logs
    const debugLogsSnap = await rtdb.ref(`debug_webhook/${ownerId}`).limitToLast(5).get();
    if (debugLogsSnap.exists()) {
      console.log("Recent Webhook Logs (RTDB):");
      debugLogsSnap.forEach(log => {
        console.log(` - Log ${log.key}: stage=${log.val().stage}, msg=${JSON.stringify(log.val().msg)}`);
      });
    }
    
    // Check invite debug logs
    const inviteDebugSnap = await rtdb.ref(`debug_invite/${ownerId}`).get();
     if (inviteDebugSnap.exists()) {
      console.log("Invite Debug Logs:");
       inviteDebugSnap.forEach(user => {
         console.log(` - User ${user.key}: ${JSON.stringify(user.val())}`);
       });
    }
  }
}

debug().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
