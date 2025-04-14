import { pipe } from "@screenpipe/js";
import { getCleanedTextWithCache } from "./cache-ocr.js";
import { configDotenv } from "dotenv";
import { addToThread, finalizeOldThreads } from "../threads/thread-manager.js";
import { logToFile } from "../utility/logger.js";

configDotenv();

const pollFreq = parseInt(process.env.POLL_FREQ || "10");
const screenpipePort = process.env.SCREENPIPE_PORT || "3010";

if (typeof globalThis.self === "undefined") {
  globalThis.self = globalThis;
}

await pipe.settings.update({ server: `http://localhost:${screenpipePort}` });

async function extractAndCleanScreenData() {
  try {
    const now = new Date();
    const results = await pipe.queryScreenpipe({
      contentType: "ocr",
      limit: 1,
      startTime: new Date(now - pollFreq * 1000).toISOString(),
      endTime: now.toISOString(),
      includeFrames: false,
    });

    logToFile("📷 Screenpipe Raw Response", results);

    for (const item of results.data) {
      const rawText = item.content.text;
      const { cleaned_text, topic } = await getCleanedTextWithCache(rawText);
      logToFile("🧼 Cleaned OCR", { rawText, cleaned_text, topic });

      addToThread({
        timestamp: item.content.timestamp,
        app_name: item.content.appName,
        window_name: item.content.windowName,
        browser_url: item.content.browser_url,
        text: cleaned_text,
        topic
      });

      const finalized = finalizeOldThreads();
      if (finalized.length > 0) {
        logToFile("🧵 Finalized Threads", finalized);
        for (const thread of finalized) {
          console.log("\nThread:", thread.topic);
          console.log("App:", thread.app_name);
          console.log("Events:", thread.events.join("\n"));
        }
      }
    }
  } catch (err) {
    logToFile("❌ Poller Error", err.message);
    console.error("Error during screenpipe polling:", err);
  }
}

setInterval(extractAndCleanScreenData, pollFreq * 1000);