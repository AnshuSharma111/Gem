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

// --- Check if Screenpipe is Installed ---
function checkScreenpipeExists() {
  return new Promise((resolve, reject) => {
    exec("where screenpipe", (error, stdout) => {
      if (error || !stdout.trim()) {
        reject(new Error("Screenpipe required to run app"));
      } else {
        resolve();
      }
    });
  });
}

// --- Check if WSL is Installed ---
function checkWSLExists() {
  return new Promise((resolve) => {
    exec("where wsl", (error, stdout) => {
      resolve(!error && stdout.trim());
    });
  });
}

// --- Check if Redis is Installed in WSL ---
function checkRedisExistsInWSL() {
  return new Promise((resolve) => {
    exec("wsl which redis-server", (error, stdout) => {
      resolve(!error && stdout.trim());
    });
  });
}

// --- Launch Redis via WSL ---
async function launchRedisViaWSL() {
  const wslExists = await checkWSLExists();
  if (!wslExists) {
    console.warn("⚠️ WSL not found, skipping Redis launch");
    logToFile("⚠️ WSL CHECK", "WSL not found, skipping Redis launch");
    return;
  }

  const redisExists = await checkRedisExistsInWSL();
  if (!redisExists) {
    console.warn("⚠️ redis-server not found inside WSL, skipping Redis launch");
    logToFile("⚠️ REDIS CHECK", "redis-server not found inside WSL, skipping Redis launch");
    return;
  }

  const redisProc = spawn("wsl", ["redis-server"], {
    detached: true,
    stdio: "ignore",
  });
  redisProc.unref();
  updateState({ redisPID: redisProc.pid });
  logToFile("🟥 REDIS", `Launched via WSL (PID: ${redisProc.pid})`);
  console.log("✅ Redis launched via WSL");
}

// --- Launch Screenpipe ---
function launchScreenpipe() {
  const child = exec("screenpipe", {
    windowsHide: false,
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
        return;
      }
    } catch {}
    await sleep(1000);
  }

  throw new Error("❌ Screenpipe health check timed out");
}

// --- Launch screenpipe-poller ---
function launchPoller() {
  const pollerPath = path.resolve(__dirname, "../ocr/screenpipe-poller.js");
  const poller = spawn("node", [pollerPath], {
    detached: true,
    stdio: "inherit",
  });
  poller.unref();
  updateState({ pollerPID: poller.pid });
  logToFile("🧠 POLLER", `Launched (PID: ${poller.pid})`);
  console.log("🚀 Poller launched");
}

// --- Orchestrator ---
async function startAssistantFlow() {
  try {
    await checkScreenpipeExists();
  } catch (err) {
    logToFile("❌ SCREENPIPE", "Screenpipe not found. Please install it.");
    console.error(err.message);
    process.exit(1);
  }

  try {
    launchRedisViaWSL();
    launchScreenpipe();
  } catch (err) {
    logToFile("❌ LAUNCH ERROR", "Failed to launch Redis or Screenpipe");
    console.error("Failed to launch Redis or Screenpipe:", err.message);
    process.exit(1);
  }

  try {
    await waitForHealth();
    launchPoller();
  } catch (err) {
    logToFile("❌ HEALTH CHECK", "Screenpipe health check failed");
    console.error(err.message);
    process.exit(1);
  }
  logToFile("✅ Gem", "Gem started successfully");
}

await startAssistantFlow();