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
      return;
    } catch (err) {
      console.warn(`⚠️ Failed to stop ${label} by PID ${pid}:`, err.message);
    }
  }

  // Only run fallback if PID was missing or failed
  if (fallbackProcessName && process.platform === "win32") {
    try {
      execSync(`taskkill /IM ${fallbackProcessName} /F /T`);
      console.log(`🛑 Fallback: Killed ${fallbackProcessName} by name`);
      logToFile(`🛑 FALLBACK STOPPED ${label}`, fallbackProcessName);
    } catch (e) {
      console.error(`❌ Failed to kill ${fallbackProcessName} by name:`, e.message);
    }
  }
}

// --- Main Stop Routine ---
if (!fs.existsSync(stateFile)) {
  console.log("No assistant state found. Is it running?");
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));

// Kill both with fallback
if (state.pollerPID) {
  kill(state.pollerPID, "Poller", "node.exe");
} else {
  kill(null, "Poller", "node.exe");
}

if (state.screenpipePID) {
  kill(state.screenpipePID, "Screenpipe", "screenpipe.exe");
} else {
  kill(null, "Screenpipe", "screenpipe.exe");
}

// Remove state file
try {
  fs.unlinkSync(stateFile);
  console.log("✅ Assistant fully stopped");
} catch (err) {
  console.error("⚠️ Failed to remove state file:", err.message);
}