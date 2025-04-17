import { getActiveThreads } from "../threads/thread-manager.js";
import { suggestAndAct } from "./suggest-and-act.js";
import { logToFile } from "../utility/logger.js";

let lastHash = null;
let debounceTimer = null;
const DEBOUNCE_DELAY_MS = 5000;

function hashThreads(threads) {
  const simplified = threads.map(t => ({
    topic: t.topic,
    last_updated: t.last_updated
  }));
  return JSON.stringify(simplified);
}

function checkForChangesAndDebounce() {
  const threads = getActiveThreads();
  const currentHash = hashThreads(threads);

  if (currentHash !== lastHash) {
    lastHash = currentHash;
    logToFile("🌀 Thread change detected, resetting debounce...", "suggestion-poller");

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      logToFile("🧠 Threads idle — triggering LLM agent.", "suggestion-poller");
      suggestAndAct();
    }, DEBOUNCE_DELAY_MS);
  }
}

export function startSuggestionPoller(pollInterval = 1000) {
  logToFile("⏱️ Suggestion poller started...", "suggestion-poller");
  setInterval(checkForChangesAndDebounce, pollInterval);
}