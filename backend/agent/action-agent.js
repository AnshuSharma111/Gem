import path from "path";
import fs from "fs/promises";
import { configDotenv } from "dotenv";
import { fileURLToPath } from "url";

import { logToFile } from "../utility/logger.js";
import { parseLLMJson } from "../utility/llm-json-parser.js";

import { sendMail } from "../tools/send-mail.js";
import { summarisePdf } from "../tools/summarise-document.js";

import Groq from "groq-sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const summaryPath = path.resolve(__dirname, "../../config/manual_summary.json");

// Initialize Groq SDK
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Load .env from project root
configDotenv({ path: path.resolve(__dirname, "../../.env") });

export async function performAction(suggestion, thread) {
    try {
        logToFile("🔧 Performing action...", "Source: action-agent [action-agent.js]");
        // Return if empty suggestion or thread
        if (!suggestion || !thread) {
            logToFile("❌ Empty suggestion or thread. Exiting performAction process.", "Source: action-agent [action-agent.js]");
            return {
                "success": false,
                "message": "Empty suggestion or thread. Exiting performAction process."
            }
        }

        // Override if action is summarise_pdf
        if (suggestion.action === "summarise_pdf") {
            try {
                const manualText = await waitForManualSummary(10000);
                let text;
                for (const event of thread.events) {
                    // Congregate text from all events
                    if (event.text) {
                        text += event.text + "\n";
                    }
                }

                const content = manualText || text;

                if (!content) {
                    logToFile("❌ No content available for summarisation.");
                    return { success: false, message: "No content" };
                }

                const result = await summarisePdf({ content });
                return {
                    "success": true,
                    "message": "Action performed successfully.",
                    "service_response": result.summary
                }
            }
            catch (error) {
                logToFile(`❌ Error in summarising PDF: ${error}`, "Source: action-agent [action-agent.js]");
                return {
                    "success": false,
                    "message": error.message
                };
            }
        }

        // generate prompt based on suggestion and thread
        const prompt = generatePrompt(suggestion, thread);
        logToFile(`Prompt: ${prompt}`, "Source: action-agent [action-agent.js]");

        // Call Groq API with the prompt
        let raw = null;
        try {
            const response = await groq.chat.completions.create({
                model: "llama-3.3-70b-versatile", // "gemma2-9b-it",
                messages: [{ role: "user", content: prompt }]
            });
          
            raw = response.choices[0].message.content;
        } catch (error) {
            logToFile(`❌ Error in Groq API call, Exiting: ${error.message}`, "Source: action-agent [action-agent.js]");
            return {
                "success": false,
                "message": error.message
            };
        }

        // Parse the response
        let parsedResponse = null;
        try {
            parsedResponse = parseLLMJson(raw);
        } catch (error) {
            logToFile(`❌ Error in parsing Groq API response: ${error}`, "Source: action-agent [action-agent.js]");
            return {
                "success": false,
                "message": error.message
            };
        }

        // call different service based on action
        try {
            let serviceResponse = null;
            if (suggestion.action == "send_mail") {
                const to = parsedResponse.to;
                const subject = parsedResponse.subject;
                const body = parsedResponse.body;

                serviceResponse = await sendMail({to, subject, body});

                if (!serviceResponse || serviceResponse.method == "none") {
                    logToFile(`❌ Unable to mail. Exiting send_mail process: ${serviceResponse}`, "Source: action-agent [action-agent.js]");
                    return {
                        "success": false,
                        "message": "Unable to mail. Exiting send_mail process."
                    }
                }
            }
            else if (suggestion.action == "schedule_meeting") {
                console.log("Emulating schedule meeting action...");
            }
        } catch (error) {
            logToFile(`❌ Error in calling service: ${error}`, "Source: action-agent [action-agent.js]");
            return {
                "success": false,
                "message": error.message
            };
        }

        logToFile("✅ Action performed successfully.", "Source: action-agent [action-agent.js]");
        return {
            "success": true,
            "message": "Action performed successfully.",
            "service_response": parsedResponse
        };
    }
    catch (error) {
        logToFile(`❌ Error in performAction: ${error}`, "Source: action-agent [action-agent.js]");
        return {
            "success": false,
            "message": error.message
        };
    }
}

function generatePrompt(suggestion, thread) {
    let prompt;
    if (suggestion.action == "send_mail") {
        prompt = `
        You are an intelligent assistant agent. The user is performing some activity on the screen that suggests they need to send an email.
        Based on the user's activity, you need to draft an email response. You need to:
        1) Identify the recipient's email address.
        2) Generate a subject line for the email based on the user's activity.
        3) Generate the body of the email based on the user's activity.
        4) Provide the email address, subject, and body in a JSON format. Example:
        {
            "to": string,
            "subject": string,
            "body": string
        }
        5) Do not include any extra text of formatting. Just return the JSON object (without markdown).
        6) If you cannot infer any of the fields, return an empty string for that field.

        The user's activity summary is as follows:
        Topic: ${thread.topic}
        Events: ${JSON.stringify(thread.events, null, 2)}
        `
    }
    else if (suggestion.action == "schedule_meeting") {
        return `Create a calendar event with the following details:\n\n${thread.text}`;
    }
    return prompt;
}

/*
Suggestion format:
 {
    "action": "send_mail",
    "reason": "You are reading an email that seems to need a reply.",
    "trigger_data": { "thread_topic": "meeting invite", "text": "..." }
 }

 Thread format:
 "browsing cyberpunk 2077 products on amazon": {
    "topic": "browsing cyberpunk 2077 products on amazon",
    "events": [
      {
        "timestamp": "2025-04-17T08:57:41.421507800Z",
        "app_name": "Google Chrome",
        "window_name": "Amazon.com : cyberpunk 2077 - Google Chrome",
        "text": "amazon cyberpunk 2077 Account & Lists = All Today's Deals Prime Video Registry Gift Cards 1-16 of 755 results for \"cyberpunk 2077\" Customer Service sell Returns & Orders Sort by: Featured Video Games PlayStation 5 Games PlayStation 4 Games, Consoles & Accessories Toys & Games Price $25 - $80+ Deals & Discounts All Discounts Condition New Used Seller CIM+L Amazon.com  See more Brands Warner Bros Microsoft Results Check each product page for other buying options. Price and other details may vary based on product size and color. æ_f5 P-f-a. Cyberpunk 2077: Ultimate Edition - PlayStation 5 ESRB Rating: Mature I Dec 5, 2023 | by CD Projekt 388 700* bought in past month PlayStation 5 $5999 FREE delivery May 5 - 23 to Argentina on $99 of eligible items More Buying Choices $54.99 (4 used & new offers) Cyberpunk 2077: Ultimate Edition - Xbox Series X ESRB Rating: Mature I Dec 5, 2023 | by CD Projekt 157 200* bought in past month Xbox Series X $5999 FREE delivery to Argentina on $99 of eligible items Cyberpunk 2077 - PlayStation 4 ESRB Rating: Mature I Dec 10, 2020 | by Warner Bros 23,453 PlayStation 4 $2647 Delivery May 5 - 23 to Argentina Only 4 left in stock - order soon. More Buying Choices $19.99 (11+ used & new offers)"
      }
    ],
    "created": 1744880263220,
    "last_updated": 1744880263220,
    "finalized": false
}
 */

export async function waitForManualSummary(maxWaitMs = 10000) {
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    try {
      const content = await fs.readFile(summaryPath, "utf8");

      // Always try to clean up the file immediately
      try {
        await fs.unlink(summaryPath);
      } catch (e) {
        console.warn("⚠️ Could not delete summary file:", e.message);
      }

      const json = JSON.parse(content);
      if (json.manual === false) return null;
      if (json.manual === true && json.text?.trim()) return json.text.trim();

    } catch (e) {
      // Likely file doesn't exist yet — ignore silently
    }

    await new Promise(res => setTimeout(res, 500));
  }

  // Timeout: simulate user chose "No"
  try {
    await fs.writeFile(summaryPath, JSON.stringify({ manual: false }));
  } catch (e) {
    console.warn("⚠️ Failed to write timeout fallback file:", e.message);
  }

  return null;
}