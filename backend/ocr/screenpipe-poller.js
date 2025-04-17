import { pipe } from "@screenpipe/js";
import { getCleanedTextWithCache } from "./cache-ocr.js";
import { configDotenv } from "dotenv";
import { addToThread, finalizeOldThreads, getActiveThreads } from "../threads/thread-manager.js";
import { logToFile } from "../utility/logger.js";
import path from "path";
import { fileURLToPath } from "url";
import { startSuggestionPoller } from "../agent/agent-poller.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

configDotenv({ path: path.resolve(__dirname, "../../.env") });

const pollFreq = parseInt(process.env.POLL_FREQ || "10");
const screenpipePort = process.env.SCREENPIPE_PORT || "3030";

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
      // clean raw text using LLM
      const rawText = item.content.text;
      const { cleaned_text, topic } = await getCleanedTextWithCache(rawText);
      logToFile("🧼 Cleaned OCR", { rawText, cleaned_text, topic });

      // add to thread
      addToThread(topic, {
        timestamp: item.content.timestamp,
        app_name: item.content.appName,
        window_name: item.content.windowName,
        browser_url: item.content.browser_url,
        text: cleaned_text
      });

      // log active threads
      const activeThreads = getActiveThreads();
      for (const thread of activeThreads) {
        logToFile("🧵 Active Thread", thread.topic);
      }

      // finalise threads and log them
      const finalized = finalizeOldThreads();
      if (finalized && finalized.length > 0) {
        logToFile("🧵 Finalized Threads", finalized);
        for (const thread of finalized) {
          logToFile("\nThread:", thread.topic);
          logToFile("App:", thread.app_name);
          logToFile("Events:", thread.events.join("\n"));
        }
      }
    }
  } catch (err) {
    logToFile("❌ Poller Error", err.message);
    logToFile("Error during screenpipe polling:", err);
  }
}

startSuggestionPoller();
setInterval(extractAndCleanScreenData, pollFreq * 1000);