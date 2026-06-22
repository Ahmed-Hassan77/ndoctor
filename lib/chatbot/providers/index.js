import { cursorProvider } from "@/lib/chatbot/providers/cursor";
import { geminiProvider } from "@/lib/chatbot/providers/gemini";
import { openaiProvider } from "@/lib/chatbot/providers/openai";
import { mockProvider } from "@/lib/chatbot/providers/mock";
import { randomUUID } from "crypto";

/** @type {Record<string, import("@/lib/chatbot/types").ChatProvider>} */
const REGISTRY = {
  cursor: cursorProvider,
  gemini: geminiProvider,
  openai: openaiProvider,
  mock: mockProvider,
  generic: openaiProvider,
};

function getRequestedProviderId() {
  return (process.env.AI_PROVIDER || "gemini").trim().toLowerCase();
}

/**
 * Build fallback chain — mock is NEVER included unless AI_PROVIDER=mock.
 * @param {string} requested
 */
function buildProviderChain(requested) {
  if (requested === "mock") {
    return [mockProvider];
  }

  const primary = REGISTRY[requested] ?? geminiProvider;
  /** @type {import("@/lib/chatbot/types").ChatProvider[]} */
  const chain = [primary];

  if (requested === "cursor") {
    if (cursorProvider.status().configured) {
      return [cursorProvider, geminiProvider, openaiProvider].filter(
        (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i
      );
    }
  }

  if (requested !== "openai" && openaiProvider.status().configured) {
    chain.push(openaiProvider);
  }
  if (requested !== "gemini" && geminiProvider.status().configured) {
    chain.push(geminiProvider);
  }

  return chain.filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i);
}

/**
 * @returns {import("@/lib/chatbot/types").ChatProvider}
 */
export function getChatProvider() {
  const requested = getRequestedProviderId();

  if (requested === "mock") {
    return mockProvider;
  }

  const primary = REGISTRY[requested] ?? geminiProvider;
  return primary;
}

export function getProviderStatus() {
  const requested = getRequestedProviderId();
  const primary = REGISTRY[requested] ?? geminiProvider;
  const primaryStatus = primary.status();
  const geminiStatus = geminiProvider.status();
  const openaiStatus = openaiProvider.status();

  let active = primary;
  if (!primaryStatus.configured && requested !== "mock") {
    if (geminiStatus.configured && requested !== "gemini") {
      active = geminiProvider;
    } else if (openaiStatus.configured && requested !== "openai") {
      active = openaiProvider;
    }
  }

  const activeStatus = active.status();
  const fallbackUsed = requested !== "mock" && active.id !== requested;

  return {
    requested,
    active: requested === "mock" ? "mock" : active.id,
    configured: primaryStatus.configured,
    model: primaryStatus.model ?? activeStatus.model,
    reason: primaryStatus.configured
      ? undefined
      : primaryStatus.reason ?? "Provider is not configured.",
    fallbackUsed,
    mockAllowed: requested === "mock",
    geminiConfigured: geminiStatus.configured,
    openaiConfigured: openaiStatus.configured,
    envHint:
      requested === "gemini" && !geminiStatus.configured
        ? "Set GEMINI_API_KEY in .env and restart the dev server."
        : undefined,
  };
}

/**
 * Execute chat completion using the configured provider chain (no mock unless AI_PROVIDER=mock).
 */
export async function completeWithFallback(messages, locale, requestId = randomUUID()) {
  const requested = getRequestedProviderId();
  const chain = buildProviderChain(requested);

  if (!chain.length) {
    throw new Error("No AI providers available.");
  }

  /** @type {Error | null} */
  let lastError = null;

  for (const provider of chain) {
    if (!provider.status().configured) continue;

    const started = Date.now();
    try {
      const result = await provider.complete({ messages, locale });
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "INFO",
          requestId,
          stage: provider.id === chain[0].id ? "ai" : "fallback",
          durationMs: Date.now() - started,
          providerUsed: provider.id,
          requested,
        })
      );
      return { result, providerId: provider.id };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "WARN",
          requestId,
          stage: "ai_error",
          durationMs: Date.now() - started,
          providerUsed: provider.id,
          requested,
          error: lastError.message,
        })
      );
    }
  }

  if (lastError) throw lastError;
  throw new Error(
    requested === "gemini"
      ? "Gemini is not configured. Set GEMINI_API_KEY in .env and restart the server."
      : `AI provider "${requested}" is not configured.`
  );
}

/**
 * Stream chat completion using the configured provider chain (no mock unless AI_PROVIDER=mock).
 */
export async function* streamWithFallback(messages, locale, requestId = randomUUID()) {
  const requested = getRequestedProviderId();
  const chain = buildProviderChain(requested);

  if (!chain.length) {
    throw new Error("No AI providers available.");
  }

  /** @type {Error | null} */
  let lastError = null;

  for (const provider of chain) {
    if (!provider.status().configured) continue;

    const started = Date.now();
    try {
      if (provider.stream) {
        yield* provider.stream({ messages, locale });
      } else {
        const res = await provider.complete({ messages, locale });
        yield res.content;
      }
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "INFO",
          requestId,
          stage: provider.id === chain[0].id ? "ai_stream" : "fallback_stream",
          durationMs: Date.now() - started,
          providerUsed: provider.id,
          requested,
        })
      );
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "WARN",
          requestId,
          stage: "ai_stream_error",
          durationMs: Date.now() - started,
          providerUsed: provider.id,
          requested,
          error: lastError.message,
        })
      );
    }
  }

  if (lastError) throw lastError;
  throw new Error(
    requested === "gemini"
      ? "Gemini is not configured. Set GEMINI_API_KEY in .env and restart the server."
      : `AI provider "${requested}" is not configured.`
  );
}
