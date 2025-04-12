import { createClient } from "redis";
import crypto from "crypto";
import { cleanOCR } from "./clean-ocr.js";
import { parseLLMJson } from "../utility/llm-json-parser.js";

// Redis client initialization
const redis = createClient();

// connect to Redis server
try {
  await redis.connect();
} catch (err) {
  console.error("Redis failed to connect. Falling back to LLM-only mode.", err);
}

//Hashes the OCR text using SHA256 to generate a stable cache key.
function generateCacheKey(text) {
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  return `ocr:${hash}`;
}

/**
 * Attempts to retrieve cleaned OCR text from cache, or runs the LLM-based cleaner.
 * Automatically caches the cleaned result with a TTL.
 *
 * @param {string} rawText - Raw OCR output from screenpipe
 * @returns {Promise<string>} - Cleaned OCR text
 */
export async function getCleanedTextWithCache(rawText) {
  const key = generateCacheKey(rawText);

  // Check if the cleaned text is already cached in Redis
  const cached = await redis.get(key);
  if (cached) {
    console.log("Cache hit for OCR chunk");
    return cached;
  }

  console.log("Cache miss — cleaning with LLM...");
  const cleaned = await cleanOCR(rawText);
  console.log("Cleaned OCR response:", cleaned);
  const cleanedJSON = parseLLMJson(cleaned);

  if (!cleanedJSON) {
    console.error("Failed to parse LLM response:", cleaned);
    return {
      "cleaned_text": rawText,
      "context": null
    }
  }

  await redis.set(key, JSON.stringify(cleanedJSON), { EX: 60 * 10 });
  return cleanedJSON;
}

// utility function to flush the OCR cache
export async function flushOcrCache() {
  const keys = await redis.keys("ocr:*");
  for (const key of keys) {
    await redis.del(key);
  }
  console.log(`🗑️ Flushed ${keys.length} OCR cache entries`);
}