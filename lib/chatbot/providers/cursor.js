import { ChatbotProviderError } from "@/lib/chatbot/types";

const CURSOR_DOCS = "https://cursor.com/docs/sdk/typescript";

/**
 * Cursor's official @cursor/sdk targets Cloud Agents (code/repo automation),
 * not consumer medical Q&A in a web app. This adapter documents that limitation
 * and never calls undocumented endpoints.
 */
export const cursorProvider = {
  id: "cursor",

  status() {
    const key = process.env.CURSOR_API_KEY?.trim();
    const model = process.env.CURSOR_MODEL?.trim() || "default";

    if (!key) {
      return {
        configured: false,
        reason:
          "CURSOR_API_KEY is not set. A Cursor Pro subscription does not include a production patient-chat API.",
        fallback: "gemini",
      };
    }

    return {
      configured: false,
      reason: `Cursor's official SDK (${CURSOR_DOCS}) is for Cloud Agents, not in-app medical chat. Set AI_PROVIDER=gemini with GEMINI_API_KEY for production.`,
      model,
      fallback: "gemini",
    };
  },

  async complete() {
    const status = cursorProvider.status();
    throw new ChatbotProviderError(
      "AI_PROVIDER_UNAVAILABLE",
      status.reason ??
        "Cursor runtime API is not available for this medical assistant use case."
    );
  },

  async *stream() {
    await cursorProvider.complete({ messages: [] });
    yield "";
  },
};
