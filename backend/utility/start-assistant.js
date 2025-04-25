import { exec, spawn } from "child_process";
import { logToFile } from "./logger.js";
import fetch from "node-fetch";
import { setTimeout as sleep } from "timers/promises";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { configDotenv } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const stateFile = path.resolve(__dirname, "../../config/assistant-state.json");

// Load .env from project root
configDotenv({ path: path.resolve(__dirname, "../../.env") });

// --- PID Save Helpers ---
function updateState(update) {
  let current = {};
  if (fs.existsSync(stateFile)) {
    current = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  }
  const updated = { ...current, ...update };
  fs.writeFileSync(stateFile, JSON.stringify(updated, null, 2));
}

// --- Launch Redis via WSL ---
function launchRedisViaWSL() {
  const redisProc = spawn("wsl", ["redis-server"], {
    detached: true,
    stdio: "ignore"
  });
  redisProc.unref();
  updateState({ redisPID: redisProc.pid });
  logToFile("🟥 REDIS", `Launched via WSL (PID: ${redisProc.pid})`);
  console.log("✅ Redis launched via WSL");
}

// --- Launch Screenpipe ---
function launchScreenpipe() {
  const cmd = "screenpipe";
  const child = exec(cmd, {
    windowsHide: false
  });
  updateState({ screenpipePID: child.pid });
  logToFile("🎬 SCREENPIPE", `Launched via exec (PID: ${child.pid})`);
  console.log("✅ Screenpipe launched");
}

// --- Wait for Screenpipe /health ---
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
    } catch {}
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
  updateState({ pollerPID: poller.pid });
  logToFile("🧠 POLLER", `Launched (PID: ${poller.pid})`);
  console.log("🚀 Poller launched");
}

// --- Orchestrator ---
async function startAssistantFlow() {
  launchRedisViaWSL();
  launchScreenpipe();

  try {
    await waitForHealth();
    launchPoller();
  } catch (err) {
    console.error(err.message);
  }
}

startAssistantFlow();