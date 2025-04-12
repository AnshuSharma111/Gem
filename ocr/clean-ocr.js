import { configDotenv } from "dotenv";
import Groq from "groq-sdk";

configDotenv();

// Groq API key
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
    throw new Error("GROQ_API_KEY is not set in the environment variables.");
}

// Groq client initialization
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Preprocessing middleware
export async function cleanOCR(text) {
    const prompt = `
    The following text has been extracted by OCR from a screen. It contains a lot of noise clutter, for example:
    1) If chrome is open, it contains the bookmarks bar text, the text of all tabs, and the text of the address bar.
    2) If Gmail is open, it contains all the tabs as text (primary, inbox, spam, etc.)
    3) If an IDE is open, apart from the code, it contains the folder text (node_modules, src, filename.txt, etc.)
    4) If a browser is open, it contains the text of all the tabs.
    And so on..

    Your task is to clean the text and return only the relevant information. For example, if the text is:

    event '25: Invitation t X + C mail.google.com/mail/u/O/#inbox/FMfcgzQZVJwfJsnC in LinkedIn GitHub Google dev Google Colab cu outlook Google Careers Ims Devfolio Calendar ibm cuims Duolingo Coercive control : th... Adobe Acrobat C: Compiler Explorer SMS reqLkst format Gmail Compose Inbox 
    Starred C) Snoozed Sent Drafts More Labels Q Search mail Google VO 2025 lof90 
    < Invitation to attend Opening Ceremony of EVENT '25- Largest and most epic event IT'S TIME TO GET STARTED' We are beyond 
    thrilled to announce the OPENING CEREMONY event '25; largest and most epic event' Join the Opening Ceremony LIVE! 
    https://wwwyoutube/live/ 17 Date: April 11th A Time: 9 PM Best regards, event '25 Organizing Team

    The cleaned text should be:
    Invitation to attend Opening Ceremony of EVENT '25- Largest and most epic event IT'S TIME TO GET STARTED' We are beyond 
    thrilled to announce the OPENING CEREMONY event '25; largest and most epic event' Join the Opening Ceremony LIVE! 
    https://wwwyoutube/live/ 17 Date: April 11th A Time: 9 PM Best regards, event '25 Organizing Team

    As that is the primary activity that is happening on the screen.

    Please clean the text and return only the relevant information. Do not add any extra information or context.
    Just return a JSON object:
    {
        cleaned_text: "cleaned text here",
        context: "context here" (what you believe is going on in the screen)
    }
    where cleaned_text is the cleaned text and context is the context of the text. ONLY RETURN THE JSON OBJECT.
    ${text}
    `;

    let response = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.3-70b-versatile",
    });
    return response.choices[0].message.content;
}