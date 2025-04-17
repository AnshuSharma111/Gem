import { configDotenv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

import { logToFile } from "../utility/logger.js";
import { getActiveThreads } from "../threads/thread-manager.js";
import { suggestRelevantTools } from "./suggestion-agent.js";
import { performAction } from "./action-agent.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

configDotenv({ path: path.resolve(__dirname, "../../.env") });

const RESPONSE_PATH = path.resolve(__dirname, "../../user_response.json");
const SUGGESTION_PATH = path.resolve(__dirname, "../../latest_suggestion.json");

let llmIsBusy = false;

function writeLatestSuggestion(suggestion) {
    fs.writeFileSync(SUGGESTION_PATH, JSON.stringify(suggestion, null, 2));
}

function waitForUserResponse(timeoutMs = 15000) {
    return new Promise((resolve) => {
        const start = Date.now();

        const interval = setInterval(() => {
        if (fs.existsSync(RESPONSE_PATH)) {
            try {
            const data = JSON.parse(fs.readFileSync(RESPONSE_PATH));
            fs.unlinkSync(RESPONSE_PATH); // remove file after reading
            clearInterval(interval);
            resolve(data); // { accepted: true/false }
            } catch { }
        }

        if (Date.now() - start > timeoutMs) {
            clearInterval(interval);
            resolve({ accepted: false });
        }
        }, 500);
    });
}
  
export async function suggestAndAct() {
    if (llmIsBusy) {
      logToFile("⏳ LLM busy, skipping suggestion cycle.", "suggest-and-act");
      return { success: false, message: "LLM busy" };
    }
  
    const activeThreads = getActiveThreads();
  
    if (activeThreads.length === 0) {
      logToFile("❌ No active threads to analyze.", "suggest-and-act");
      return { success: false, message: "No threads" };
    }

    llmIsBusy = true;
    logToFile("🔍 Triggering suggestion agent with current threads...", "suggest-and-act");

    const suggestion = await suggestRelevantTools(activeThreads);

    if (!suggestion || !suggestion.action) {
      logToFile("🤷 No helpful action found this cycle.", "suggest-and-act");
      llmIsBusy = false;
      return { success: false, message: "No suggestions" };
    }

    writeLatestSuggestion(suggestion);
    logToFile("📤 Waiting for user to accept or reject...", suggestion);

    const userResponse = await waitForUserResponse();
    logToFile("📩 User responded:", userResponse);

    if (!userResponse.accepted) {
      llmIsBusy = false;
      logToFile("❌ User rejected the suggestion.");
      return { success: false, message: "User rejected" };
    }

    const targetThread = activeThreads.find(
      (t) => t.topic === suggestion.trigger_data?.thread_topic
    );

    const result = await performAction(suggestion, targetThread);
    llmIsBusy = false;
    return result;
}