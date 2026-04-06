import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';

export async function GET() {
  const results = [];
  const DEFAULT_GEMINI_KEY = "AIzaSyCRM7SeKOylbyRgIq6RAiXrmu4YSArPNQI";

  try {
    // 1. Get all owners
    const ownersSnap = await db.collection('owner').get();
    
    for (const ownerDoc of ownersSnap.docs) {
      const ownerId = ownerDoc.id;
      const ownerData = ownerDoc.data();
      const geminiKey = ownerData.googleGenAiApiKey;
      
      // 2. Find matching pool entry
      // It could be linked by ownerId field OR the pool document ID might be the ownerId itself
      let poolDocToUpdate = null;
      
      const poolSnap = await db.collection('line_api_pool').where('ownerId', '==', ownerId).limit(1).get();
      if (!poolSnap.empty) {
        poolDocToUpdate = poolSnap.docs[0].ref;
      } else {
        const directPoolDoc = await db.collection('line_api_pool').doc(ownerId).get();
        if (directPoolDoc.exists) {
          poolDocToUpdate = directPoolDoc.ref;
        }
      }

      if (poolDocToUpdate) {
        // Move key to pool
        await poolDocToUpdate.update({ 
          googleGenAiApiKey: geminiKey || DEFAULT_GEMINI_KEY 
        });
        
        // Remove key from owner (optional but cleaner)
        await ownerDoc.ref.update({
          googleGenAiApiKey: null // or remove it entirely
        });
        
        results.push({ owner: ownerData.name, status: 'migrated', key: geminiKey || 'default' });
      } else {
        results.push({ owner: ownerData.name, status: 'no_pool_match', key: geminiKey });
      }
    }

    // 3. Also update all available pool entries with the default key
    const availablePoolSnap = await db.collection('line_api_pool').where('status', '==', 'available').get();
    for (const pDoc of availablePoolSnap.docs) {
      const pData = pDoc.data();
      if (!pData.googleGenAiApiKey) {
        await pDoc.ref.update({ googleGenAiApiKey: DEFAULT_GEMINI_KEY });
        results.push({ poolId: pDoc.id, status: 'default_applied' });
      }
    }

    return NextResponse.json({ success: true, count: results.length, details: results });
  } catch (error: any) {
    console.error("Migration error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
