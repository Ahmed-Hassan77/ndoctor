import { ChatbotProviderError } from "@/lib/chatbot/types";
import {
  createOpenAICompatibleProvider,
} from "@/lib/chatbot/providers/openai-compatible";

function resolveConfig() {
  return {
    apiKey:
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.AI_API_KEY?.trim() ||
      "",
    baseUrl: (
      process.env.OPENAI_BASE_URL?.trim() ||
      process.env.AI_BASE_URL?.trim() ||
      "https://api.openai.com/v1"
    ).replace(/\/$/, ""),
    model:
      process.env.OPENAI_MODEL?.trim() ||
      process.env.AI_MODEL?.trim() ||
      "gpt-4.1-mini",
  };
}

export const openaiProvider = createOpenAICompatibleProvider({
  id: "openai",
  resolveConfig,
  missingKeyMessage:
    "Set OPENAI_API_KEY (and optionally OPENAI_MODEL, default gpt-4.1-mini).",
});
