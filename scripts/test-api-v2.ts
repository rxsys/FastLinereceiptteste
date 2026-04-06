import { extractExpenseDetailsDirect } from '../src/ai/direct-extract';

async function test() {
  try {
    const result = await extractExpenseDetailsDirect({
      message: "Lunch 1500 JPY",
      apiKey: "AIzaSyAIZJb8HO43ldFm5VfXEju8g22OVs6J-Rw"
    });
    console.log("✅ AI SUCCESS! Result:", JSON.stringify(result));
  } catch (e: any) {
    console.error("❌ AI FAILED AGAIN:", e.message);
  }
}
test();
