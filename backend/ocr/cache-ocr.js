import { createClient } from "redis";
import crypto from "crypto";
import { cleanOCR } from "./clean-ocr.js";
import { parseLLMJson } from "../utility/llm-json-parser.js";
import { logToFile } from "../utility/logger.js";

const redis = createClient();

try {
  await redis.connect();
} catch (err) {
  logToFile("❌ Redis failed to connect. Using LLM-only mode.");
}

function generateCacheKey(text) {
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  return `ocr:${hash}`;
}

export async function getCleanedTextWithCache(rawText, app_name, window_name, browser_url) {
  const key = generateCacheKey(rawText);
  let cached = null;
  if (isRedisAvailable()) {
    try {
      cached = await redis.get(key);
    } catch (err) {
      logToFile("❌ Redis GET failed — fallback to LLM", err);
    }
  } else {
    logToFile("⚠️ Redis not available — skipping cache.");
  }
  if (cached) {
    try {
      const json = JSON.parse(cached);
      logToFile("🧠 Cached OCR", json);
      return json;
    } catch (e) {
      logToFile("❌ Failed to parse cached OCR JSON", cached);
      if (isRedisAvailable()) {
        await redis.del(key);
      }
    }
  }

  const cleaned = await cleanOCR(rawText, app_name, window_name, browser_url);
  logToFile("🧼 LLM Cleaned OCR", cleaned);

  const cleanedJSON = parseLLMJson(cleaned);
  if (!cleanedJSON) {
    return { cleaned_text: rawText, topic: "unrecognised" };
  }

  if (isRedisAvailable()) {
    await redis.set(key, JSON.stringify(cleanedJSON), { EX: 600 });
    logToFile("✅ OCR Cache Updated", cleanedJSON);
  }
  return cleanedJSON;
}

export async function flushOcrCache() {
  const keys = await redis.keys("ocr:*");
  for (const key of keys) await redis.del(key);
  logToFile(`🗑️ Flushed ${keys.length} OCR cache entries`);
}

function isRedisAvailable() {
  return redis?.isReady || redis?.status === "ready";
}