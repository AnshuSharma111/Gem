import fs from "fs";
import { execSync } from "child_process";
import path from "path";
import { logToFile } from "./logger.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stateFile = path.resolve(__dirname, "../../config/assistant-state.json");

// --- Kill Process by PID (with fallback by name) ---
function kill(pid, label, fallbackProcessName = null) {
  if (pid) {
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /PID ${pid} /F /T`);
      } else {
        process.kill(pid, "SIGTERM");
      }

      console.log(`🛑 Stopped ${label} (PID ${pid})`);
      logToFile(`🛑 STOPPED ${label}`, `PID: ${pid}`);
      return true;
    } catch (err) {
      console.warn(`⚠️ Failed to stop ${label} by PID ${pid}:`, err.message);
    }
  }

  if (fallbackProcessName && process.platform === "win32") {
    try {
      execSync(`taskkill /IM ${fallbackProcessName} /F /T`);
      console.log(`🛑 Fallback: Killed ${fallbackProcessName} by name`);
      logToFile(`🛑 FALLBACK STOPPED ${label}`, fallbackProcessName);
      return true;
    } catch (e) {
      console.error(`❌ Failed to kill ${fallbackProcessName} by name:`, e.message);
    }
  }

  return false;
}

// --- WSL-safe Redis Kill ---// --- WSL-safe Redis Kill ---
function killRedisWSL() {
  try {
    execSync(`wsl pkill -f redis-server`);
    console.log("🛑 Redis (inside WSL) stopped");
    logToFile("🛑 STOPPED Redis", "Killed via wsl:pkill");
    return true;
  } catch (err) {
    console.warn("⚠️ Could not kill Redis with normal pkill. Skipping Redis kill.");
    logToFile("⚠️ REDIS KILL FAILED", err.message);
    return false;
  }
}

// --- Main Stop Routine ---
async function stopAssistantFlow() {
  if (!fs.existsSync(stateFile)) {
    console.error("❌ No assistant state found. Is it running?");
    process.exit(1); // Important: Qt needs to know
  }

  try {
    const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));

    const pollerKilled = kill(state.pollerPID, "Poller", "node.exe");
    const screenpipeKilled = kill(state.screenpipePID, "Screenpipe", "screenpipe.exe");
    const redisKilled = killRedisWSL();

    if (!pollerKilled && !screenpipeKilled && !redisKilled) {
      console.warn("⚠️ Nothing was running.");
    }
  } 
  catch (err) {
    console.error("❌ Failed during stop flow:", err.message);
    logToFile("❌ FAILED TO STOP APPLICATION", err.message);
    process.exit(1);
  }

  // Cleanup
  try {
    fs.unlinkSync(stateFile);
    console.log("✅ Assistant fully stopped and state cleared");
  } catch (err) {
    console.error("⚠️ Failed to remove state file:", err.message);
  }

  process.exit(0);
}

stopAssistantFlow();