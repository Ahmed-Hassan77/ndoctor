/** @typedef {'user' | 'assistant' | 'system'} ChatRole */

/**
 * @typedef {object} ChatTextPart
 * @property {'text'} type
 * @property {string} text
 */

/**
 * @typedef {object} ChatImagePart
 * @property {'image'} type
 * @property {string} mimeType
 * @property {string} base64
 */

/** @typedef {ChatTextPart | ChatImagePart} ChatContentPart */

/**
 * @typedef {object} ChatMessage
 * @property {ChatRole} role
 * @property {string | ChatContentPart[]} content
 */

/**
 * @typedef {object} ChatCompletionOptions
 * @property {ChatMessage[]} messages
 * @property {boolean} [stream]
 * @property {string} [locale]
 */

/**
 * @typedef {object} ChatCompletionResult
 * @property {string} content
 * @property {string} [model]
 */

export class ChatbotProviderError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {{ retryAfterSeconds?: number }} [meta]
   */
  constructor(code, message, meta = {}) {
    super(message);
    this.name = "ChatbotProviderError";
    this.code = code;
    this.retryAfterSeconds = meta.retryAfterSeconds;
  }
}

/** @typedef {(options: ChatCompletionOptions) => Promise<ChatCompletionResult>} ChatCompletionFn */

/** @typedef {(options: ChatCompletionOptions) => AsyncGenerator<string>} ChatStreamFn */

/**
 * @typedef {object} ChatProvider
 * @property {string} id
 * @property {ChatCompletionFn} complete
 * @property {ChatStreamFn} [stream]
 * @property {() => { configured: boolean; reason?: string }} status
 */

export const MEDICAL_DISCLAIMER = {
  en: "This assistant is informational only and does not replace a licensed physician.",
  ar: "هذا المساعد للمعلومات فقط ولا يغني عن استشارة طبيب مرخّص.",
};

export const EMERGENCY_NOTICE = {
  en: "If you may be having a medical emergency, call emergency services or go to the nearest emergency department immediately.",
  ar: "إذا كنت تعتقد أن حالتك طارئة، اتصل بخدمات الطوارئ أو توجه إلى أقرب قسم طوارئ فوراً.",
};
