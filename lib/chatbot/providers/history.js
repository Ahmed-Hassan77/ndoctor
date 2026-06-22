/** @typedef {import("@/lib/chatbot/types").ChatMessage} ChatMessage */

const DISCLAIMER_SNIPPETS = [
  "This assistant is informational only",
  "هذا المساعد للمعلومات فقط",
  "— This assistant",
  "— هذا المساعد",
];

const MAX_ASSISTANT_HISTORY_CHARS = 5000;
const MAX_USER_HISTORY_CHARS = 2000;

/**
 * Trim stored assistant replies before resending as context (disclaimers are re-applied).
 * @param {string} content
 */
function trimStoredAssistantContent(content) {
  let text = content;
  for (const snippet of DISCLAIMER_SNIPPETS) {
    const idx = text.indexOf(snippet);
    if (idx > 0) {
      text = text.slice(0, idx).trim();
    }
  }
  if (text.length > MAX_ASSISTANT_HISTORY_CHARS) {
    return `${text.slice(0, MAX_ASSISTANT_HISTORY_CHARS)}…`;
  }
  return text;
}

/**
 * @param {string | import("@/lib/chatbot/types").ChatContentPart[]} content
 */
function mergeMessageContent(a, b) {
  if (typeof a === "string" && typeof b === "string") {
    return `${a}\n\n${b}`.trim();
  }
  /** @type {import("@/lib/chatbot/types").ChatContentPart[]} */
  const parts = [];
  if (Array.isArray(a)) parts.push(...a);
  else if (typeof a === "string" && a) parts.push({ type: "text", text: a });
  if (Array.isArray(b)) parts.push(...b);
  else if (typeof b === "string" && b) parts.push({ type: "text", text: b });
  return parts.length === 1 && parts[0].type === "text" ? parts[0].text : parts;
}

/**
 * Gemini requires alternating user/model turns. Merge consecutive same-role messages.
 * @param {ChatMessage[]} messages
 */
export function normalizeAlternatingRoles(messages) {
  /** @type {ChatMessage[]} */
  const out = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      out.push(msg);
      continue;
    }

    const last = out[out.length - 1];
    if (last && last.role === msg.role) {
      out[out.length - 1] = {
        role: msg.role,
        content: mergeMessageContent(last.content, msg.content),
      };
    } else {
      out.push({ ...msg });
    }
  }

  while (out.length && out[0].role !== "system" && out[0].role === "assistant") {
    out.shift();
  }

  return out;
}

/**
 * Prepare DB history + current turn for provider APIs.
 * @param {ChatMessage[]} messages
 */
export function prepareMessagesForProvider(messages) {
  const trimmed = messages.map((msg) => {
    if (msg.role !== "assistant" || typeof msg.content !== "string") {
      if (msg.role === "user" && typeof msg.content === "string") {
        const text =
          msg.content.length > MAX_USER_HISTORY_CHARS
            ? `${msg.content.slice(0, MAX_USER_HISTORY_CHARS)}…`
            : msg.content;
        return { ...msg, content: text };
      }
      return msg;
    }
    return { ...msg, content: trimStoredAssistantContent(msg.content) };
  });

  return normalizeAlternatingRoles(trimmed);
}

/**
 * @param {string} message
 */
export function isRateLimitError(message) {
  return /quota|rate.?limit|resource.?exhausted|too many requests|429/i.test(
    message || ""
  );
}

/**
 * Parse retry delay from Gemini error text ("Please retry in 31.3s").
 * @param {string} message
 */
export function parseRetryAfterSeconds(message) {
  const match = message?.match(/retry in ~?([0-9.]+)\s*s/i);
  if (match) {
    return Math.min(Math.ceil(Number(match[1])), 120);
  }
  return null;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
