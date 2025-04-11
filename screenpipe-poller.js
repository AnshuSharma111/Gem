import { pipe } from "@screenpipe/js";
import { configDotenv } from "dotenv";

configDotenv();

// Screenpipe set up
if (typeof globalThis.self === "undefined") {
    globalThis.self = globalThis;
}
  
await pipe.settings.update({ 
    server: 'http://localhost:3030'
});

// Groq API key
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
    throw new Error("GROQ_API_KEY is not set in the environment variables.");
}

// Preprocessing middleware
function cleanOCR(text) {
}

// async function extractAndCleanScreenData() {
//   const now = new Date();
//   const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

//   const results = await pipe.queryScreenpipe({
//     contentType: "ocr",
//     startTime: oneMinuteAgo.toISOString(),
//     endTime: now.toISOString(),
//     limit: 10,
//     includeFrames: false,
//   });

//   for (const item of results.data) {
//     const rawText = item.content.text;
//     const cleaned = cleanOCR(rawText);

//     const payload = {
//       timestamp: item.content.timestamp,
//       app_name: item.content.app_name,
//       browser_url: item.content.browser_url,
//       cleaned_text: cleaned,
//       raw_ocr: rawText
//     };

//     // Send to Tauri backend
//     await sendToTauri(payload);
//   }
// }

// // Placeholder for Tauri communication (next step)
// async function sendToTauri(payload) {
//   // This will later call the Rust command in Tauri via window.__TAURI__
//   console.log("📤 Send to Tauri backend:", payload);
// }

// // Run every N seconds
// setInterval(extractAndCleanScreenData, 10 * 1000); // every 10 seconds
