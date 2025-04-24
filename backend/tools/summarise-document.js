import Groq from "groq-sdk";
import { logToFile } from "../utility/logger.js";

import { configDotenv } from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

import clipboard from 'clipboardy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

configDotenv({ path: path.resolve(__dirname, "../../.env") });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function summarisePdf({ content }) {
  try {
    if (!content || content.trim().length === 0) {
      return { success: false, message: "No content provided." };
    }

    const prompt = `
    You are a concise summarization assistant. Summarise the following text clearly and precisely in a few paragraphs. Focus on the main ideas, remove any redundant details.
    AND ONLY RETURN THE SUMMARY. NO ADDITIONAL TEXT OR EXPLANATIONS.

    Text:
    ${content}
    `;

    const response = await groq.chat.completions.create({
        model: "gemma2-9b-it", // "llama-3.3-70b-versatile"
        messages: [{ role: "user", content: prompt }]
    });

    const summary = response.choices[0].message.content;

    if (!summary || summary.trim().length === 0) {
      return { success: false, message: "Summary was empty." };
    }

    logToFile("📝 Summary generated");
    await clipboard.writeSync(summary); // copy summary to clipboard
    logToFile("📋 Summary copied to clipboard", summary);

    return {
      success: true,
      summary
    };
  } catch (err) {
    logToFile("❌ Failed to summarise PDF", err);
    return {
      success: false,
      message: "Error during summarisation",
      error: err.message
    };
  }
}