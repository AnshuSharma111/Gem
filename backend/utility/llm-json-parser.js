// File that parses JSON object recieved from an LLM response

export function parseLLMJson(llmResponse) {
  const cleaned = llmResponse.replace(/```(?:json)?|```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse:", e.message);
    return null;
  }
}