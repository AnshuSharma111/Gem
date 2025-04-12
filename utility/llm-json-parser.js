// File that parses JSON object recieved from an LLM response

export function parseLLMJson(llmResponse) {
    try {
      // Match ```json\n ... \n``` or fallback
      const jsonMatch = llmResponse.match(/```json\s*([\s\S]*?)\s*```/i);
      const raw = jsonMatch ? jsonMatch[1] : llmResponse;

      return JSON.parse(raw.trim());
    } catch (error) {
      console.error("Failed to parse LLM JSON:", error.message);
      console.error("Raw input was:\n", llmResponse);
      return null;
    }
}  