import { exec } from "child_process";
import {
  isContextActive,
  getRelevantThreadsByKeywords
} from "../threads/thread-manager.js";

export async function sendMail({ to, subject, body }) {
  const subjectEncoded = encodeURIComponent(subject);
  const bodyEncoded = encodeURIComponent(body);
  const toEncoded = encodeURIComponent(to);

  // Define keyword categories
  const mailKeywords = ["gmail", "mail.google.com", "inbox", "compose", "outlook", "email"];
  const gmailKeywords = ["gmail", "mail.google.com", "inbox", "compose"];
  const outlookKeywords = ["outlook", "office365", "compose email"];

  // Use enhanced context-aware thread checks
  const inGmail = isContextActive(gmailKeywords);
  const inOutlook = isContextActive(outlookKeywords);
  const inMailContext = isContextActive(mailKeywords);

  if (inGmail) {
    const gmailURL = `https://mail.google.com/mail/?view=cm&fs=1&to=${toEncoded}&su=${subjectEncoded}&body=${bodyEncoded}`;
    exec(`start chrome "${gmailURL}"`);
    return {
      method: "gmail",
      status: "opened Gmail compose",
      context: getRelevantThreadsByKeywords(gmailKeywords)
    };
  } else if (inOutlook) {
    const mailto = `mailto:${to}?subject=${subjectEncoded}&body=${bodyEncoded}`;
    exec(`start "" "${mailto}"`);
    return {
      method: "outlook",
      status: "opened Outlook or system mail client",
      context: getRelevantThreadsByKeywords(outlookKeywords)
    };
  } else if (inMailContext) {
    const fallbackMailto = `mailto:${to}?subject=${subjectEncoded}&body=${bodyEncoded}`;
    exec(`start "" "${fallbackMailto}"`);
    return {
      method: "default",
      status: "opened fallback mail client",
      context: getRelevantThreadsByKeywords(mailKeywords)
    };
  } else {
    // No context detected — safe fallback
    return {
      method: "none",
      status: "mail context not active — aborting",
      suggestion: "Assistant did not detect any email apps open.",
      context: []
    };
  }
}

const res = await sendMail({to:"keyboardstudios001@gmail.com", body:"Sample", subject:"Sample Subject"});
console.log(res);