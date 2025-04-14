import fs from "fs";
const LOG_PATH = "./debug.log";

export function logToFile(label, data) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${label}\n${typeof data === "string" ? data : JSON.stringify(data, null, 2)}\n\n`;

  try {
    fs.appendFileSync(LOG_PATH, entry, "utf8");
  } catch (err) {
    console.error("❌ Failed to write log:", err);
  }
}