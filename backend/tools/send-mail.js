import { logToFile } from "../utility/logger.js";
import { isContextActive, getRelevantThreadsByKeywords } from "../threads/thread-manager.js";

import { exec } from "child_process";

import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function sendMail({ to, subject, body }) {
  const subjectEncoded = encodeURIComponent(subject);
  const bodyEncoded = encodeURIComponent(body);
  const toEncoded = encodeURIComponent(to);

  const settingsPath = path.resolve(__dirname, "../../settings.json");
  let preferredMethod = null;
  try {
    preferredMethod = JSON.parse(readFileSync(settingsPath, "utf8")).preferredMailMethod;
  } catch {}

  const gmailURL = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEncoded}&su=${subjectEncoded}&body=${bodyEncoded}`;
  const outlookWebURL = `https://outlook.office.com/mail/deeplink/compose?to=${toEncoded}&subject=${subjectEncoded}&body=${bodyEncoded}`;

  const methods = {
    gmail: {
      name: "Gmail",
      url: gmailURL,
      keywords: ["gmail", "mail.google.com", "inbox", "compose", "mail", "email"],
    },
    outlook: {
      name: "Outlook Web",
      url: outlookWebURL,
      keywords: ["outlook", "office365", "compose email"],
    }
  };

  function openURL(url) {
    const command =
      process.platform === "win32"
        ? `start "" "${url}"`
        : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;

    exec(command, (err) => {
      if (err) logToFile("❌ Failed to open email URL", err.message);
    });
  }

  // Use preferred method first
  if (preferredMethod && methods[preferredMethod]) {
    openURL(methods[preferredMethod].url);
    return {
      method: preferredMethod,
      status: `Opened ${methods[preferredMethod].name} (via settings)`,
      context: [],
    };
  }

  // Fallback to context
  for (const [key, config] of Object.entries(methods)) {
    if (isContextActive(config.keywords)) {
      openURL(config.url);
      return {
        method: key,
        status: `Opened ${config.name} (via screen context)`,
        context: getRelevantThreadsByKeywords(config.keywords),
      };
    }
  }

  return {
    method: "none",
    status: "Mail context not detected and no preference set",
    suggestion: "Ask the user to select their preferred email method in settings.",
    context: [],
  };
}