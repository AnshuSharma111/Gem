import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve this file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Final log path — rooted at project root (2 levels up from /backend/utility/logger.js)
const LOG_PATH = path.resolve(__dirname, "../../config/debug.log");
console.log("Log path:", LOG_PATH);

export function logToFile(label, data) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${label}\n${typeof data === "string" ? data : JSON.stringify(data, null, 2)}\n\n`;

  try {
    fs.appendFileSync(LOG_PATH, entry, "utf8");
  } catch (err) {
    console.error("❌ Failed to write log:", err);
  }
}