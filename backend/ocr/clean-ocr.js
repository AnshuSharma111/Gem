import { configDotenv } from "dotenv";
import Groq from "groq-sdk";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
configDotenv({ path: path.resolve(__dirname, "../../.env") });

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function cleanOCR(text, app_name, window_name, browser_url) {
  const prompt = `
You are an intelligent screen text cleaner. You receive noisy OCR data from user screens and must extract only the relevant content.

Instructions:
- Remove noise such as browser tabs, bookmarks, IDE folders, or sidebar menus.
- Identify the primary activity from the screen text.
- Label this as a topic (e.g. "reading event email", "coding in VSCode", "reading article").
- Return a **valid JSON** object in this format:
{
  "cleaned_text": "...",
  "topic": "..."
}

For example, if the raw text is:
  event '25: Invitation t X + C mail.google.com/mail/u/O/#inbox/FMfcgzQZVJwfJsnC in LinkedIn GitHub Google dev Google Colab cu outlook Google Careers Ims Devfolio Calendar ibm cuims Duolingo Coercive control : th... Adobe Acrobat C: Compiler Explorer SMS reqLkst format Gmail Compose Inbox 
    Starred C) Snoozed Sent Drafts More Labels Q Search mail Google VO 2025 lof90 
    < Invitation to attend Opening Ceremony of EVENT '25- Largest and most epic event IT'S TIME TO GET STARTED' We are beyond 
    thrilled to announce the OPENING CEREMONY event '25; largest and most epic event' Join the Opening Ceremony LIVE! 
    https://wwwyoutube/live/ 17 Date: April 11th A Time: 9 PM of During the ceremony we'll take you through the entire event 
    process, addressing major areas of common doubts Mark your clocks and get ready to EMBARK ON THIS ADVENTURE' Stay tuned for 
    more updates and get ready to YOUR WAY TO SUCCESS! e', Best regards, event '25 Organizing Team
then the output should be:
{
  "cleaned_text": "Invitation to attend Opening Ceremony of EVENT '25- Largest and most epic event IT'S TIME TO GET STARTED' We are beyond 
    thrilled to announce the OPENING CEREMONY event '25; largest and most epic event' Join the Opening Ceremony LIVE! 
    https://wwwyoutube/live/ 17 Date: April 11th A Time: 9 PM of During the ceremony we'll take you through the entire event 
    process, addressing major areas of common doubts Mark your clocks and get ready to EMBARK ON THIS ADVENTURE' Stay tuned for 
    more updates and get ready to YOUR WAY TO SUCCESS! e', Best regards, event '25 Organizing Team",
  "topic": "reading event email"
}
AND NO EXTRA TEXT OR EXPLANATIONS. ONLY RETURN A PARSABLE NO MARKDOWN JSON OBJECT.
If nothing useful is found, return the original text as "cleaned_text" and "unrecognised" as the topic.

The app name is "${app_name}", the window name is "${window_name}", and the browser url is "${browser_url}".
Return the { "cleaned_text": str , "topic" : str} JSON ONLY
OCR input:
${text}
`;

  const response = await groq.chat.completions.create({
    model: "gemma2-9b-it", // "llama-3.3-70b-versatile"
    messages: [{ role: "user", content: prompt }]
  });

  return response.choices[0].message.content;
}