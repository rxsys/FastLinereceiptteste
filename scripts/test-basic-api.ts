async function testBasicApi() {
  const testKey = "AIzaSyAIZJb8HO43ldFm5VfXEju8g22OVs6J-Rw";
  console.log("Testing Basic Google AI API call with NEW key...");
  
  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + testKey;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Say hello" }] }]
      })
    });
    
    const data = await response.json();
    if (response.ok) {
      console.log("✅ BASIC API SUCCESS!");
      console.log("Response:", JSON.stringify(data.candidates?.[0]?.content?.parts?.[0]?.text));
    } else {
      console.error("❌ BASIC API FAILED:", JSON.stringify(data));
    }
  } catch (e: any) {
    console.error("❌ FETCH ERROR:", e.message);
  }
}

testBasicApi();
