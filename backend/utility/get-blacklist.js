import { configDotenv } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

configDotenv({ path: path.resolve(__dirname, "../../.env") });
console.log("ENV path: ", path.resolve(__dirname, "../../.env"));

const settingsPath = path.resolve(__dirname, "../../settings.json");

export function getBlacklist() {
  let PUBLIC_IGNORED_WINDOWS, PUBLIC_IGNORED_APPS;;
  try {
    PUBLIC_IGNORED_APPS = JSON.parse(readFileSync(settingsPath, "utf8")).blacklistedApps || [];
    PUBLIC_IGNORED_WINDOWS = JSON.parse(readFileSync(settingsPath, "utf8")).blacklistedWindows || [];
  } catch {}

  const PRIVATE_IGNORED_APPS = (process.env.PRIVATE_BLACKLISTED_APPS || "").split(",").map(s => s.trim().toLowerCase());
  const PRIVATE_IGNORED_WINDOWS = (process.env.PRIVATE_BLACKLISTED_WINDOWS || "").split(",").map(s => s.trim().toLowerCase());

  // combine public and private ignored apps and windows
  const IGNORED_APPS = [...new Set([...PUBLIC_IGNORED_APPS, ...PRIVATE_IGNORED_APPS])];
  const IGNORED_WINDOWS = [...new Set([...PUBLIC_IGNORED_WINDOWS, ...PRIVATE_IGNORED_WINDOWS])];
  return { apps : IGNORED_APPS, windows : IGNORED_WINDOWS };
}