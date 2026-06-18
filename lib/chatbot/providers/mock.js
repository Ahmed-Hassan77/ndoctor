
const MOCK_REPLY_EN =
  "This is a mock assistant response for local testing. Configure GEMINI_API_KEY or OPENAI_API_KEY in .env for live AI.";

const MOCK_REPLY_AR =
  "هذا رد تجريبي للاختبار المحلي. عيّن GEMINI_API_KEY أو OPENAI_API_KEY في .env للذكاء الاصطناعي الحقيقي.";

function extractUserText(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((p) => p.type === "text")
    .map((p) => p.text)
    .join(" ");
}

function hasImages(content) {
  return Array.isArray(content) && content.some((p) => p.type === "image");
}

function pickReply(messages, locale) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = extractUserText(lastUser?.content ?? "");
  const withImage = hasImages(lastUser?.content);
  const ar = locale === "ar" || /[\u0600-\u06FF]/.test(text);
  const base = ar ? MOCK_REPLY_AR : MOCK_REPLY_EN;
  const imageNote = withImage
    ? ar
      ? "\n\n[تجريبي: تم استلام صورة — عيّن GEMINI_API_KEY للتحليل البصري.]"
      : "\n\n[Mock: image received — set GEMINI_API_KEY for vision analysis.]"
    : "";
  if (text.length > 0) {
    return `${base}${imageNote}\n\n> Echo: ${text.slice(0, 280)}`;
  }
  return `${base}${imageNote}`;
}

async function* mockStream(text) {
  const words = text.split(/(\s+)/);
  for (const chunk of words) {
    yield chunk;
    await new Promise((r) => setTimeout(r, 12));
  }
}

export const mockProvider = {
  id: "mock",

  status() {
    return { configured: true, reason: "Mock provider for development and testing." };
  },

  async complete({ messages, locale }) {
    return {
      content: pickReply(messages, locale),
      model: "mock",
    };
  },

  stream({ messages, locale }) {
    return mockStream(pickReply(messages, locale));
  },
};
