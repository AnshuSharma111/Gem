import { exec, spawn } from "child_process";
import { logToFile } from "./logger.js";
import fetch from "node-fetch";
import { setTimeout as sleep } from "timers/promises";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { configDotenv } from "dotenv";

const stateFile = path.resolve("./assistant-state.json");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
configDotenv({ path: path.resolve(__dirname, "../../.env") });

// --- Save Poller PID ---
function savePollerPID(pollerPID) {
  let current = {};
  if (fs.existsSync(stateFile)) {
    current = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  }
  const updated = { ...current, pollerPID };
  fs.writeFileSync(stateFile, JSON.stringify(updated, null, 2));
}

// --- Launch Screenpipe ---
function launchScreenpipe() {
  const cmd = "screenpipe";

  const child = exec(cmd, {
    windowsHide: false
  });

  logToFile("🎬 SCREENPIPE", `Launched via exec`);
  console.log("✅ Screenpipe launched");
}

// --- Wait for /health endpoint ---
async function waitForHealth(timeoutMs = 15000) {
  const url = `http://localhost:${process.env.SCREENPIPE_PORT || 3030}/health`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        logToFile("🩺 HEALTH CHECK", "Screenpipe is healthy and ready");
        console.log("✅ Screenpipe is healthy!");
        return true;
      }
    } catch {
      // retry
    }
    await sleep(1000);
  }

  logToFile("❌ TIMEOUT", "Screenpipe did not respond in time");
  throw new Error("❌ Screenpipe health check timed out");
}

// --- Launch screenpipe-poller ---
function launchPoller() {
  const pollerPath = path.resolve(__dirname, "../ocr/screenpipe-poller.js");

  const poller = spawn("node", [pollerPath], {
    detached: true,
    stdio: "inherit"
  });

  poller.unref();
  savePollerPID(poller.pid);
  logToFile("🧠 POLLER", `Launched (PID: ${poller.pid})`);
  console.log("🚀 Poller launched");
}

// --- Orchestrator ---
async function startAssistantFlow() {
  launchScreenpipe();

  try {
    await waitForHealth();
    launchPoller();
  } catch (err) {
    console.error(err.message);
  }
}

startAssistantFlow();