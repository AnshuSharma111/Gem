import { pipe } from "@screenpipe/js";
import { getCleanedTextWithCache } from "./cache-ocr.js";
import { configDotenv } from "dotenv";

configDotenv();

// Load required environment variables from .env file
const poll_freq = process.env.POLL_FREQ || 10;

// Screenpipe set up
if (typeof globalThis.self === "undefined") {
  globalThis.self = globalThis;
}

await pipe.settings.update({ 
  server: 'http://localhost:3030',
  port: 3210
});

async function extractAndCleanScreenData() {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

  const results = await pipe.queryScreenpipe({
    contentType: "ocr",
    startTime: oneMinuteAgo.toISOString(),
    endTime: now.toISOString(),
    limit: 10,
    includeFrames: false,
  });

  for (const item of results.data) {
    const rawText = item.content.text;
    const { cleaned_text, context } = await getCleanedTextWithCache(rawText);

    const payload = {
      timestamp: item.content.timestamp,
      app_name: item.content.app_name,
      browser_url: item.content.browser_url,
      cleaned_text,
      context
    };

    // Send to Tauri backend
    await sendToTauri(payload);
  }
}

// Placeholder for Tauri communication (next step)
async function sendToTauri(payload) {
  // This will later call the Rust command in Tauri via window.__TAURI__
  console.log("📤 Send to Tauri backend:", payload);
}

// Run every N seconds
setInterval(extractAndCleanScreenData, poll_freq * 1000); // every 10 seconds