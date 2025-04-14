import { spawn } from "child_process";
import fetch from "node-fetch";
import { setTimeout as sleep } from "timers/promises";
import { logToFile } from "./logger.js";
import path from "path";
import { configDotenv } from "dotenv";
import fs from "fs";
const stateFile = "./assistant-state.json";

configDotenv();

// === Step 1: Start Screenpipe ===
function launchScreenpipe() {
  const cmd = "screenpipe";

  const child = spawn("powershell.exe", ["-Command", cmd], {
    detached: true,
    stdio: "ignore",
    windowsHide: false
  });

  child.unref();

  // Save PID from child
  saveAssistantState({ screenpipePID: child.pid });
  logToFile("🎬 SCREENPIPE", `Launched via PowerShell (PID: ${child.pid})`);
  console.log("✅ Screenpipe launched");
}

// === Step 2: Wait for /health to be ready ===
async function waitForHealth(timeoutMs = 15000) {
    const url = `http://localhost:${process.env.SCREENPIPE_PORT}/health`;
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                logToFile("🩺 HEALTH CHECK", "Screenpipe is healthy and ready");
                console.log("✅ Screenpipe is healthy!");
                return true;
            }
        } catch (err) {
            // Still booting up
            console.error("❌ Screenpipe failed to respond, retrying...", err.message);
        }
        await sleep(1000);
    }

    logToFile("❌ TIMEOUT", "Screenpipe did not respond in time");
    throw new Error("❌ Screenpipe health check timed out");
}

// === Step 3: Start screenpipe-poller ===
function launchPoller() {
  const pollerPath = path.resolve("./ocr/screenpipe-poller.js");
  const poller = spawn("node", [pollerPath], {
    detached: true,
    stdio: "ignore",
  });

  poller.unref();

  saveAssistantState({ pollerPID: poller.pid });
  logToFile("🧠 POLLER", `Launched (PID: ${poller.pid})`);
}

// === Entire flow ===
async function startAssistantFlow() {
  launchScreenpipe();

  try {
    await waitForHealth();
    launchPoller();
  } catch (err) {
    console.error(err.message);
  }
}

function saveAssistantState(newData) {
  let current = {};
  if (fs.existsSync(stateFile)) {
    current = JSON.parse(fs.readFileSync(stateFile, "utf8"));
  }
  const updated = { ...current, ...newData };
  fs.writeFileSync(stateFile, JSON.stringify(updated, null, 2));
}

startAssistantFlow();