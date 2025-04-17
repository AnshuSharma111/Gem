import path from "path";
import { configDotenv } from "dotenv";
import { fileURLToPath } from "url";

import { logToFile } from "../utility/logger.js";
import { parseLLMJson } from "../utility/llm-json-parser.js";

import Groq from "groq-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

configDotenv({ path: path.resolve(__dirname, "../../.env") });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const TOOLSET = [
  {
    action: "send_mail",
    description: "Draft and send a helpful response email.",
    trigger: "You are reading an email or an invitation that requires a reply."
  },
  {
    action: "summarise_pdf",
    description: "Summarise a long document or research paper.",
    trigger: "You are reading a long piece of content, like a PDF or article."
  },
  {
    action: "schedule_meeting",
    description: "Create a calendar event with time and people inferred from screen.",
    trigger: "There is a time-sensitive event or a meeting discussed in the text."
  }
];

export async function suggestRelevantTools(threads) {
  const toolListText = TOOLSET.map(
    (tool, i) =>
      `${i + 1}. ${tool.action} — ${tool.description}\n   When: ${tool.trigger}`
  ).join("\n");

  const threadsJSON = JSON.stringify(threads, null, 2);

  const prompt = `
You are an intelligent assistant agent. Based on the user's recent screen activity, decide if any of the following tools can help.

Available tools:
${toolListText}

Instructions:
- Review the provided user activity (multiple threads).
- If any tool can be applied, return a JSON object like this:
  {
    "action": "send_mail",
    "reason": "You are reading an email that seems to need a reply.",
    "trigger_data": {
      "thread_topic": "...",
      "text": "..." // from events or thread
    }
  }

- Return only one suggestion at a time.
- If none apply, return an EMPTY OBJECT {}.
- No extra text or formatting. RETURN A VALID JSON OBJECT ONLY.

User Activity:
${threadsJSON}
`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // "gemma2-9b-it",
      messages: [{ role: "user", content: prompt }]
    });

    const raw = response.choices[0].message.content;
    logToFile("🤖 Stage 1 Raw Suggestion", raw);

    const suggestion = parseLLMJson(raw);

    if (suggestion && typeof suggestion === "object" && suggestion.action) {
      logToFile("✅ Valid Suggestion Parsed", suggestion);
      return suggestion;
    }

    return {};
  } catch (err) {
    logToFile("❌ Stage 1 Suggestion Error", err.message);
    return {};
  }
}