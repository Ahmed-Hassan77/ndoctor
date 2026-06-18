import { cursorProvider } from "@/lib/chatbot/providers/cursor";
import { geminiProvider } from "@/lib/chatbot/providers/gemini";
import { openaiProvider } from "@/lib/chatbot/providers/openai";
import { mockProvider } from "@/lib/chatbot/providers/mock";

/** @type {Record<string, import("@/lib/chatbot/types").ChatProvider>} */
const REGISTRY = {
  cursor: cursorProvider,
  gemini: geminiProvider,
  openai: openaiProvider,
  mock: mockProvider,
  generic: openaiProvider,
};

const FALLBACK_CHAIN = [geminiProvider, openaiProvider, mockProvider];

/**
 * Resolve provider with automatic fallback when Cursor is unavailable or misconfigured.
 * @returns {import("@/lib/chatbot/types").ChatProvider}
 */
export function getChatProvider() {
  const requested = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  const primary = REGISTRY[requested] ?? geminiProvider;

  if (requested === "mock") {
    return mockProvider;
  }

  if (requested === "cursor") {
    const cursorStatus = cursorProvider.status();
    if (cursorStatus.configured) {
      return cursorProvider;
    }
    for (const candidate of FALLBACK_CHAIN) {
      if (candidate.status().configured) {
        return candidate;
      }
    }
    return mockProvider;
  }

  if (primary.status().configured) {
    return primary;
  }

  for (const candidate of FALLBACK_CHAIN) {
    if (candidate.id !== primary.id && candidate.status().configured) {
      return candidate;
    }
  }

  return mockProvider;
}

export function getProviderStatus() {
  const requested = (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
  const active = getChatProvider();
  const activeStatus = active.status();

  return {
    requested,
    active: active.id,
    configured: activeStatus.configured,
    model: activeStatus.model,
    reason: activeStatus.reason,
    fallbackUsed: requested !== active.id,
    cursorAvailable: false,
    cursorNote:
      "Cursor Pro / @cursor/sdk targets Cloud Agents for code automation, not production medical chat APIs.",
  };
}
