import { ChatbotProviderError } from "@/lib/chatbot/types";
import {
  isRateLimitError,
  parseRetryAfterSeconds,
  sleep,
} from "@/lib/chatbot/providers/history";

function resolveConfig() {
  return {
    apiKey: process.env.GEMINI_API_KEY?.trim() || "",
    model: process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash",
  };
}

/** New AI Studio keys (AQ.*) require x-goog-api-key; legacy AIza keys work with ?key= query. */
function buildGeminiFetch(apiKey, model, action) {
  const isStream = action === "streamGenerateContent";
  const base = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${action}`;
  const useHeaderAuth = apiKey.startsWith("AQ.");

  if (useHeaderAuth) {
    const url = isStream ? `${base}?alt=sse` : base;
    return {
      url,
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
    };
  }

  const query = isStream
    ? `?alt=sse&key=${encodeURIComponent(apiKey)}`
    : `?key=${encodeURIComponent(apiKey)}`;
  return {
    url: `${base}${query}`,
    headers: { "Content-Type": "application/json" },
  };
}

function toGeminiParts(content) {
  if (typeof content === "string") {
    return [{ text: content }];
  }
  /** @type {Array<Record<string, unknown>>} */
  const parts = [];
  for (const part of content) {
    if (part.type === "text" && part.text) {
      parts.push({ text: part.text });
    } else if (part.type === "image" && part.base64) {
      parts.push({
        inlineData: {
          mimeType: part.mimeType || "image/jpeg",
          data: part.base64,
        },
      });
    }
  }
  return parts.length ? parts : [{ text: "" }];
}

function toGeminiPayload(messages) {
  const systemParts = messages
    .filter((m) => m.role === "system")
    .map((m) => (typeof m.content === "string" ? m.content : ""))
    .join("\n\n");

  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: toGeminiParts(m.content),
    }));

  /** @type {Record<string, unknown>} */
  const body = { contents };
  if (systemParts) {
    body.systemInstruction = { parts: [{ text: systemParts }] };
  }
  body.generationConfig = { temperature: 0.4 };
  return body;
}

function parseRetryAfterFromResponse(res, detail) {
  const fromBody = parseRetryAfterSeconds(detail);
  if (fromBody != null) return fromBody;

  const retryAfterHeader = res?.headers?.get?.("retry-after");
  if (retryAfterHeader) {
    const seconds = parseFloat(retryAfterHeader);
    if (!Number.isNaN(seconds) && seconds > 0) {
      return Math.min(Math.ceil(seconds), 120);
    }
  }
  return undefined;
}

function providerErrorFromPayload(status, payload, fallback, res) {
  const detail =
    payload?.error?.message ||
    payload?.message ||
    fallback ||
    `Gemini request failed (${status})`;

  if (status === 429 || isRateLimitError(detail)) {
    const retryAfterSeconds = parseRetryAfterFromResponse(res, detail);
    return new ChatbotProviderError("AI_PROVIDER_RATE_LIMIT", detail, {
      retryAfterSeconds,
    });
  }
  return new ChatbotProviderError("AI_PROVIDER_ERROR", detail);
}

async function geminiFetch(url, headers, body, { maxRetries = 1, initialDelayMs = 400, maxDelayMs = 2500 } = {}) {
  let lastRes = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      lastRes = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
    } catch (fetchErr) {
      if (attempt < maxRetries) {
        const delay = calculateDelay(attempt, initialDelayMs, maxDelayMs);
        console.warn(`[chatbot:gemini] Network fetch error. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`, fetchErr);
        await sleep(delay);
        continue;
      }
      throw fetchErr;
    }

    if (lastRes.ok) {
      return lastRes;
    }

    const status = lastRes.status;

    if (status === 429) {
      return lastRes;
    }

    const isTransient = status === 502 || status === 503 || status === 504;

    if (attempt < maxRetries && isTransient) {
      const payload = await lastRes.clone().json().catch(() => ({}));
      const detail = payload?.error?.message || "";

      let waitMs = 0;
      const retryAfterHeader = lastRes.headers.get("retry-after");
      if (retryAfterHeader) {
        const seconds = parseFloat(retryAfterHeader);
        if (!isNaN(seconds)) {
          waitMs = seconds * 1000;
        }
      } else {
        const parsedSec = parseRetryAfterSeconds(detail);
        if (parsedSec) {
          waitMs = parsedSec * 1000;
        }
      }

      const backoffMs = calculateDelay(attempt, initialDelayMs, maxDelayMs);
      const delay = waitMs > 0 ? waitMs : backoffMs;

      if (delay > maxDelayMs) {
        console.warn(`[chatbot:gemini] Retry delay of ${delay}ms exceeds maximum limit of ${maxDelayMs}ms. Failing fast.`);
        return lastRes;
      }

      console.warn(`[chatbot:gemini] Transient error ${status}. Retrying in ${delay}ms... (Attempt ${attempt + 1}/${maxRetries})`);
      await sleep(delay);
      continue;
    }

    return lastRes;
  }
  return lastRes;
}

function calculateDelay(attempt, initialDelayMs, maxDelayMs) {
  const exponential = initialDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * exponential;
  return Math.min(jitter, maxDelayMs);
}

async function parseGeminiResponse(res) {
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw providerErrorFromPayload(res.status, payload, undefined, res);
  }
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  const content = parts.map((p) => p.text ?? "").join("");
  if (!content) {
    const blockReason = payload?.candidates?.[0]?.finishReason;
    throw new ChatbotProviderError(
      "AI_PROVIDER_ERROR",
      blockReason
        ? `Gemini blocked the response (${blockReason}).`
        : "Gemini returned an empty response."
    );
  }
  return { content, model: resolveConfig().model };
}

async function* parseGeminiStream(res) {
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    let payload = {};
    try {
      payload = JSON.parse(text);
    } catch {
      // not JSON
    }
    throw providerErrorFromPayload(
      res.status,
      payload,
      text || `Gemini streaming failed (${res.status})`,
      res
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let yieldedText = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const raw = trimmed.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const json = JSON.parse(raw);
        const parts = json?.candidates?.[0]?.content?.parts ?? [];
        for (const part of parts) {
          if (part.text) {
            yieldedText = true;
            yield part.text;
          }
        }
      } catch {
        // ignore malformed chunks
      }
    }
  }

  if (!yieldedText) {
    throw new ChatbotProviderError(
      "AI_PROVIDER_ERROR",
      "Gemini returned an empty streaming response."
    );
  }
}

export const geminiProvider = {
  id: "gemini",

  status() {
    const { apiKey, model } = resolveConfig();
    if (!apiKey) {
      return {
        configured: false,
        reason:
          "GEMINI_API_KEY is missing. Add it to .env and restart the dev server.",
      };
    }
    if (process.env.NODE_ENV === "development") {
      console.log(`[chatbot:gemini] configured=true model=${model}`);
    }
    return { configured: true, model };
  },

  async complete({ messages }) {
    const status = geminiProvider.status();
    if (!status.configured) {
      throw new ChatbotProviderError("AI_PROVIDER_UNAVAILABLE", status.reason);
    }
    const { apiKey, model } = resolveConfig();
    const { url, headers } = buildGeminiFetch(apiKey, model, "generateContent");
    const body = toGeminiPayload(messages);
    const res = await geminiFetch(url, headers, body);
    return parseGeminiResponse(res);
  },

  stream({ messages }) {
    const status = geminiProvider.status();
    if (!status.configured) {
      throw new ChatbotProviderError("AI_PROVIDER_UNAVAILABLE", status.reason);
    }
    const { apiKey, model } = resolveConfig();
    const { url, headers } = buildGeminiFetch(apiKey, model, "streamGenerateContent");

    return (async function* () {
      const body = toGeminiPayload(messages);
      const res = await geminiFetch(url, headers, body);
      yield* parseGeminiStream(res);
    })();
  },
};
