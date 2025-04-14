// ocr/cache-ocr.js
import { createClient } from "redis";
import crypto from "crypto";
import { cleanOCR } from "./clean-ocr.js";
import { parseLLMJson } from "../utility/llm-json-parser.js";
import { logToFile } from "../utility/logger.js";

const redis = createClient();

try {
  await redis.connect();
} catch (err) {
  console.error("❌ Redis failed to connect. Using LLM-only mode.");
}

function generateCacheKey(text) {
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  return `ocr:${hash}`;
}

export async function getCleanedTextWithCache(rawText) {
  const key = generateCacheKey(rawText);
  const cached = await redis.get(key);

  if (cached) {
    try {
      const json = JSON.parse(cached);
      logToFile("🧠 Cached OCR", json);
      return json;
    } catch (e) {
      logToFile("❌ Failed to parse cached OCR JSON", cached);
      await redis.del(key); // Invalidate corrupt entry
    }
  }

  const cleaned = await cleanOCR(rawText);
  logToFile("🧼 LLM Cleaned OCR", cleaned);

  const cleanedJSON = parseLLMJson(cleaned);
  if (!cleanedJSON) {
    return { cleaned_text: rawText, topic: "unrecognised" };
  }

  await redis.set(key, JSON.stringify(cleanedJSON), { EX: 600 });
  logToFile("✅ OCR Cache Updated", cleanedJSON);
  return cleanedJSON;
}

export async function flushOcrCache() {
  const keys = await redis.keys("ocr:*");
  for (const key of keys) await redis.del(key);
  console.log(`🗑️ Flushed ${keys.length} OCR cache entries`);
}