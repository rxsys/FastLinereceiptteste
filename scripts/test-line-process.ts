import { extractExpenseDetails } from '../src/ai/flows/extract-expense-details-flow';

async function test() {
  const keys = [
    { name: "Pool Key 1", key: "AIzaSyCRM7SeKOylbyRgIq6RAiXrmu4YSArPNQI" },
  ];

  for (const item of keys) {
    console.log(`Testing key: ${item.name}...`);
    try {
      const result = await extractExpenseDetails({
        message: "Lunch 1000 JPY",
        apiKey: item.key
      });
      console.log(`✅ ${item.name} is working!`);
    } catch (e: any) {
      console.error(`❌ ${item.name} failed: ${e.message}`);
    }
  }
}

test();
