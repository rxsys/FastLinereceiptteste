import { GoogleGenerativeAI } from "@google/generative-ai";

async function listModels() {
  const apiKey = "AIzaSyAIZJb8HO43ldFm5VfXEju8g22OVs6J-Rw";
  console.log("Listing models for key:", apiKey);
  
  try {
    const url = "https://generativelanguage.googleapis.com/v1/models?key=" + apiKey;
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok) {
      console.log("Available models:");
      data.models.forEach((m: any) => console.log("- " + m.name));
    } else {
      console.error("Error listing models:", JSON.stringify(data));
    }
  } catch (e: any) {
    console.error("Fetch error:", e.message);
  }
}

listModels();
