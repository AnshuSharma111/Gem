import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THREAD_TTL_MS = 5 * 60 * 1000;
const THREADS_FILE = path.resolve(__dirname, "../../thread-data/threads.json");

let threads = new Map();

// Normalize a string for keyword comparison
function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]/gi, " ").trim();
}

// Get active (non-finalized) threads
function getActiveThreads() {
  finalizeOldThreads();
  return Array.from(threads.values()).filter(t => !t.finalized);
}

// Get the most recently updated thread
function getMostRecentThread() {
  const activeThreads = getActiveThreads();
  return activeThreads.sort((a, b) => b.last_updated - a.last_updated)[0] || null;
}

// Add cleaned OCR to a thread (or create new one)
function addToThread(topic, event) {
  const now = Date.now();

  // Always use normalized string keys
  const topicKey = normalizeText(
    typeof topic === "string" ? topic : topic.topic || JSON.stringify(topic)
  );

  // If thread exists, update
  if (threads.has(topicKey)) {
    const thread = threads.get(topicKey);
    if (event) thread.events.push(event);
    thread.last_updated = now;
    thread.finalized = false;
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

// Finalize threads that are too old
function finalizeOldThreads() {
  const now = Date.now();
  for (const thread of threads.values()) {
    if (!thread.finalized && now - thread.last_updated > THREAD_TTL_MS) {
      thread.finalized = true;
    }
  }
}

// Check if any active thread includes relevant keywords
function isContextActive(keywords = []) {
  const activeThreads = getActiveThreads();

  return activeThreads.some(thread => {
    const topic = normalizeText(thread.topic || "");
    const eventStrings = (thread.events || []).map(e => normalizeText(e));

    return keywords.some(keyword => {
      const normKeyword = normalizeText(keyword);
      return topic.includes(normKeyword) || eventStrings.some(e => e.includes(normKeyword));
    });
  });
}

// Return matching threads for debugging or logs
function getRelevantThreadsByKeywords(keywords = []) {
  const activeThreads = getActiveThreads();
  return activeThreads.filter(thread =>
    keywords.some(keyword =>
      normalizeText(thread.topic).includes(normalizeText(keyword)) ||
      thread.events.some(e => normalizeText(e).includes(normalizeText(keyword)))
    )
  );
}

// Save threads to disk
function saveThreadsToDisk() {
  const obj = Object.fromEntries(threads);
  fs.mkdirSync(path.dirname(THREADS_FILE), { recursive: true });
  fs.writeFileSync(THREADS_FILE, JSON.stringify(obj, null, 2));
}

// Load threads from disk
function loadThreadsFromDisk() {
  if (!fs.existsSync(THREADS_FILE)) return;
  const raw = JSON.parse(fs.readFileSync(THREADS_FILE, "utf8"));
  threads = new Map(Object.entries(raw));
}

// clear file
function clearThreadsFile() {
  if (fs.existsSync(THREADS_FILE)) fs.unlinkSync(THREADS_FILE);
  threads.clear();
}

// --- Initialize ---
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
