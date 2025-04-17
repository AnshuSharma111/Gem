import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logToFile } from "../utility/logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THREAD_TTL_MS = 60 * 60 * 1000; // 1 hour for testing
const THREADS_FILE = path.resolve(__dirname, "../../threads.json");

let threads = new Map();

// normalise text for processing
function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]/gi, " ").trim();
}

// get all currently non-finalized threads
function getActiveThreads() {
  finalizeOldThreads();
  return Array.from(threads.values()).filter(t => !t.finalized);
}

// get the most recent thread
function getMostRecentThread() {
  const activeThreads = getActiveThreads();
  return activeThreads.sort((a, b) => b.last_updated - a.last_updated)[0] || null;
}

// add a new event to a thread or create a new thread if it doesn't exist
function addToThread(topic, event) {
  const now = Date.now();
  const topicKey = normalizeText(
    typeof topic === "string" ? topic : topic.topic || JSON.stringify(topic)
  );

  if (threads.has(topicKey)) {
    const thread = threads.get(topicKey);
    if (event) thread.events.push(event);
    thread.last_updated = now;
    thread.finalized = false; // thread is not stale
  } else {
    threads.set(topicKey, {
      topic,
      events: event ? [event] : [],
      created: now,
      last_updated: now,
      finalized: false,
    });
  }

  saveThreadsToDisk();
}

// if a thread has not been updated for a while, mark it as finalized
function finalizeOldThreads() {
  const now = Date.now();
  for (const thread of threads.values()) {
    if (!thread.finalized && now - thread.last_updated > THREAD_TTL_MS) {
      thread.finalized = true;
    }
  }
}

function isContextActive(keywords = []) {
  const activeThreads = getActiveThreads();

  return activeThreads.some(thread => {
    const rawTopic = typeof thread.topic === "string" ? thread.topic : thread.topic?.topic || "";
    const topic = normalizeText(rawTopic);
    const eventStrings = (thread.events || []).map(e => normalizeText(e));

    return keywords.some(keyword => {
      const normKeyword = normalizeText(keyword);
      return topic.includes(normKeyword) || eventStrings.some(e => e.includes(normKeyword));
    });
  });
}

function getRelevantThreadsByKeywords(keywords = []) {
  const activeThreads = getActiveThreads();
  return activeThreads.filter(thread => {
    const topicText = normalizeText(
      typeof thread.topic === "string" ? thread.topic : thread.topic?.topic || ""
    );
    return keywords.some(keyword =>
      topicText.includes(normalizeText(keyword)) ||
      thread.events.some(e => normalizeText(e).includes(normalizeText(keyword)))
    );
  });
}

// save threads to disk, called whenever a thread is added or modified
function saveThreadsToDisk() {
  const obj = Object.fromEntries(threads);
  fs.mkdirSync(path.dirname(THREADS_FILE), { recursive: true });
  fs.writeFileSync(THREADS_FILE, JSON.stringify(obj, null, 2));
}

function loadThreadsFromDisk() {
  if (!fs.existsSync(THREADS_FILE)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(THREADS_FILE, "utf8"));
    threads = new Map(Object.entries(raw));
  } catch (err) {
    logToFile("❌ Failed to load threads from disk", err.message);
    logToFile("Error Origin: loadThreadsFromDisk [thread-manager.js]", err);
    threads = new Map();
  }
}

function clearThreadsFile() {
  if (fs.existsSync(THREADS_FILE)) fs.unlinkSync(THREADS_FILE);
  threads.clear();
}

loadThreadsFromDisk();

export {
  addToThread,
  getActiveThreads,
  getMostRecentThread,
  isContextActive,
  getRelevantThreadsByKeywords,
  finalizeOldThreads,
  saveThreadsToDisk,
  loadThreadsFromDisk,
  clearThreadsFile
};