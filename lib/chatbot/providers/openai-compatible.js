import { ChatbotProviderError } from "@/lib/chatbot/types";

function toOpenAIContent(content) {
  if (typeof content === "string") return content;
  return content.map((part) => {
    if (part.type === "text") {
      return { type: "text", text: part.text };
    }
    if (part.type === "image" && part.base64) {
      return {
        type: "image_url",
        image_url: {
          url: `data:${part.mimeType || "image/jpeg"};base64,${part.base64}`,
        },
      };
    }
    return null;
  }).filter(Boolean);
}

function buildBody(messages, model, stream) {
  return {
    model,
    messages: messages.map((m) => ({
      role: m.role,
      content: toOpenAIContent(m.content),
    })),
    stream: Boolean(stream),
    temperature: 0.4,
  };
}

async function parseJsonResponse(res) {
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      payload?.error?.message ||
      payload?.message ||
      `Provider request failed (${res.status})`;
    throw new ChatbotProviderError("AI_PROVIDER_ERROR", detail);
  }
  const content = payload?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new ChatbotProviderError(
      "AI_PROVIDER_ERROR",
      "Provider returned an empty response."
    );
  }
  return { content, model: payload?.model };
}

async function* parseStreamResponse(res) {
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new ChatbotProviderError(
      "AI_PROVIDER_ERROR",
      text || `Streaming failed (${res.status})`
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        // ignore malformed SSE chunks
      }
    }
  }
}

/**
 * @param {{ id: string; resolveConfig: () => { apiKey: string; baseUrl: string; model: string }; missingKeyMessage: string }} options
 */
export function createOpenAICompatibleProvider(options) {
  const { id, resolveConfig, missingKeyMessage } = options;

  return {
    id,

    status() {
      const { apiKey } = resolveConfig();
      if (!apiKey) {
        return { configured: false, reason: missingKeyMessage };
      }
      return { configured: true, model: resolveConfig().model };
    },

    async complete({ messages }) {
      const status = this.status();
      if (!status.configured) {
        throw new ChatbotProviderError("AI_PROVIDER_UNAVAILABLE", status.reason);
      }
      const { apiKey, baseUrl, model } = resolveConfig();
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(buildBody(messages, model, false)),
      });
      return parseJsonResponse(res);
    },

    stream({ messages }) {
      const status = this.status();
      if (!status.configured) {
        throw new ChatbotProviderError("AI_PROVIDER_UNAVAILABLE", status.reason);
      }
      const { apiKey, baseUrl, model } = resolveConfig();
      return (async function* () {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildBody(messages, model, true)),
        });
        yield* parseStreamResponse(res);
      })();
    },
  };
}
