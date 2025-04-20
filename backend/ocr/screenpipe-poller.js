import { pipe } from "@screenpipe/js";

import { addToThread, finalizeOldThreads, getActiveThreads } from "../threads/thread-manager.js";
import { getCleanedTextWithCache } from "./cache-ocr.js";
import { startSuggestionPoller } from "../agent/agent-poller.js";
import { logToFile } from "../utility/logger.js";
import { getBlacklist } from "../utility/get-blacklist.js";

import { configDotenv } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

configDotenv({ path: path.resolve(__dirname, "../../.env") });

const pollFreq = parseInt(process.env.POLL_FREQ || "10");
const screenpipePort = process.env.SCREENPIPE_PORT || "3030";

const IGNORED_APPS = getBlacklist().apps || [];
const IGNORED_WINDOWS = getBlacklist().windows || [];

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
      // ignore if the app name is in the ignored list
      const appName = (item.content.appName || "").toLowerCase();
      const windowName = (item.content.windowName || "").toLowerCase();

      const fromIgnoredApp = IGNORED_APPS.some(app => appName.includes(app));
      const fromIgnoredWindow = IGNORED_WINDOWS.some(win => windowName.includes(win));

      if (fromIgnoredApp || fromIgnoredWindow) {
        logToFile("🚫 Ignored App/Window", { appName, windowName });
        continue;
      }

      // clean raw text using LLM
      const rawText = item.content.text;
      const { cleaned_text, topic } = await getCleanedTextWithCache(rawText);
      logToFile("🧼 Cleaned OCR", { rawText, cleaned_text, topic });

      if (!cleaned_text) {
        logToFile("⚠️ Skipped OCR input — no cleaned text produced.");
        continue;
      }
      if (!topic) {
        logToFile("⚠️ Warning: No topic extracted from OCR.", { rawText });
      }

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