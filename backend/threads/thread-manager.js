const threads = new Map();
const THREAD_TTL_MS = 2 * 60 * 1000;

import { logToFile } from "../utility/logger.js";

export function addToThread({ timestamp, app_name, window_name, browser_url, text, topic }) {
  const key = normalizeTopic(topic);

  if (!threads.has(key)) {
    threads.set(key, {
      thread_id: `thread_${key}_${Date.now()}`,
      topic,
      window_name,
      app_name,
      browser_url,
      start_time: timestamp,
      end_time: timestamp,
      events: [text],
      finalized: false,
      last_updated: Date.now()
    });
  } else {
    const thread = threads.get(key);
    thread.events.push(text);
    thread.end_time = timestamp;
    thread.last_updated = Date.now();
  }

  logToFile("🔗 Added to thread", { topic, text });
}

function normalizeTopic(topic) {
  return topic.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
}

export function finalizeOldThreads() {
  const now = Date.now();
  const finalized = [];

  for (const [key, thread] of threads.entries()) {
    if (!thread.finalized && now - thread.last_updated > THREAD_TTL_MS) {
      thread.finalized = true;
      finalized.push(thread);
      threads.delete(key);
    }
  }

  return finalized;
}

export function getActiveThreads() {
  return Array.from(threads.values()).filter(t => !t.finalized);
}

export function getThreadByTopic(topic) {
  return threads.get(normalizeTopic(topic));
}

export function clearThreads() {
  threads.clear();
}