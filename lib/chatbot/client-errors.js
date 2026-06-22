import { ChatbotProviderError } from "@/lib/chatbot/types";

/** @type {Record<"en" | "ar", string>} */
const RATE_LIMIT_USER_MESSAGE = {
  en: "The AI service is busy right now. Please try again shortly.",
  ar: "خدمة الذكاء الاصطناعي مشغولة حالياً. حاول مرة أخرى بعد قليل.",
};

/** @type {Record<"en" | "ar", string>} */
const PROVIDER_UNAVAILABLE_MESSAGE = {
  en: "The AI assistant is temporarily unavailable. Please try again later.",
  ar: "مساعد الذكاء الاصطناعي غير متاح مؤقتاً. حاول مرة أخرى لاحقاً.",
};

/** @type {Record<"en" | "ar", string>} */
const PROVIDER_ERROR_MESSAGE = {
  en: "Something went wrong while generating a response. Please try again.",
  ar: "حدث خطأ أثناء إنشاء الرد. حاول مرة أخرى.",
};

/** @type {Record<"en" | "ar", string>} */
const GENERIC_CHAT_ERROR_MESSAGE = {
  en: "Could not complete your request. Please try again.",
  ar: "تعذر إكمال طلبك. حاول مرة أخرى.",
};

/**
 * @param {string} [locale]
 * @returns {"en" | "ar"}
 */
function normalizeLocale(locale) {
  return locale === "ar" ? "ar" : "en";
}

/**
 * Log provider errors server-side without exposing secrets.
 * @param {unknown} error
 */
export function logChatbotProviderError(error) {
  if (error instanceof ChatbotProviderError) {
    const detail = error.message?.replace(/key[=:]\s*\S+/gi, "key=[redacted]");
    console.error(`[chatbot:provider] ${error.code}:`, detail);
    return;
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error("[chatbot:error]", message.replace(/key[=:]\s*\S+/gi, "key=[redacted]"));
}

/**
 * Map internal errors to safe client-facing payloads (no raw quota/billing text).
 * @param {unknown} error
 * @param {string} [locale]
 * @returns {{ code: string; message: string; retryAfterSeconds?: number }}
 */
export function mapChatbotErrorForClient(error, locale = "en") {
  const lang = normalizeLocale(locale);

  if (error instanceof ChatbotProviderError) {
    if (error.code === "AI_PROVIDER_RATE_LIMIT") {
      /** @type {{ code: string; message: string; retryAfterSeconds?: number }} */
      const mapped = {
        code: error.code,
        message: RATE_LIMIT_USER_MESSAGE[lang],
      };
      if (error.retryAfterSeconds != null && error.retryAfterSeconds > 0) {
        mapped.retryAfterSeconds = error.retryAfterSeconds;
      }
      return mapped;
    }

    if (error.code === "AI_PROVIDER_UNAVAILABLE") {
      return {
        code: error.code,
        message: PROVIDER_UNAVAILABLE_MESSAGE[lang],
      };
    }

    if (error.code === "AI_PROVIDER_ERROR") {
      return {
        code: error.code,
        message: PROVIDER_ERROR_MESSAGE[lang],
      };
    }

    return {
      code: error.code,
      message: GENERIC_CHAT_ERROR_MESSAGE[lang],
    };
  }

  const message = error instanceof Error ? error.message : "Chat failed.";
  if (/ChatConversation|ChatMessage|does not exist|relation/i.test(message)) {
    return {
      code: "CHATBOT_DB_NOT_READY",
      message:
        lang === "ar"
          ? "تخزين المحادثات غير جاهز. تواصل مع الدعم."
          : "Chat storage is not initialized. Run: npx prisma migrate deploy",
    };
  }

  return {
    code: "CHATBOT_FAILED",
    message: GENERIC_CHAT_ERROR_MESSAGE[lang],
  };
}
