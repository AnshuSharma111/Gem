import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { logToFile } from "../utility/logger.js";

const stateFile = path.resolve("./assistant-state.json");

if (!fs.existsSync(stateFile)) {
  console.log("No assistant state found. Is it running?");
  process.exit(1);
}

const state = JSON.parse(fs.readFileSync(stateFile, "utf8"));

function kill(pid, label) {
  try {
    process.platform === "win32"
      ? execSync(`taskkill /PID ${pid} /F`)
      : process.kill(pid, "SIGTERM");

    console.log(`🛑 Stopped ${label} (PID ${pid})`);
    logToFile(`🛑 STOPPED ${label}`, `PID: ${pid}`);
  } catch (err) {
    console.error(`⚠️ Failed to stop ${label}:`, err.message);
  }
}

if (state.screenpipePID) kill(state.screenpipePID, "Screenpipe");
if (state.pollerPID) kill(state.pollerPID, "Poller");

try {
    fs.unlinkSync(stateFile);
} catch (err) {
    console.error("⚠️ Failed to delete state file:", err.message);
}
console.log("✅ Assistant fully stopped");