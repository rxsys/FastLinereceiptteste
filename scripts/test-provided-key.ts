import { extractExpenseDetails } from '../src/ai/flows/extract-expense-details-flow';

async function test() {
  const testKey = "AIzaSyAIZJb8HO43ldFm5VfXEju8g22OVs6J-Rw";
  console.log(`Testing extraction with confirmed key: ${testKey}...`);
  try {
    const result = await extractExpenseDetails({
      message: "Test receipt 1500 JPY",
      apiKey: testKey
    });
    console.log(`✅ SUCCESS! AI is working with the new key.`);
    console.log(`Result:`, JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error(`❌ FAILED: ${e.message}`);
  }
}

test();
