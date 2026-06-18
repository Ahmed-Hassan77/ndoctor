import { t } from "@/lib/i18n";

/**
 * @param {import("@/lib/dictionaries/en").default} dict
 * @param {import("zod").ZodError} zodError
 */
export function firstZodValidationKey(zodError) {
  const msg = zodError.issues[0]?.message;
  if (typeof msg === "string" && msg.startsWith("validation.")) return msg;
  return null;
}

/**
 * @param {import("@/lib/dictionaries/en").default} dict
 * @param {import("zod").ZodError} zodError
 */
export function translateZodError(dict, zodError) {
  const key = firstZodValidationKey(zodError);
  if (key) return t(dict, key);
  const raw = zodError.issues[0]?.message;
  return translateValidationMessage(dict, raw);
}

/**
 * @param {import("@/lib/dictionaries/en").default} dict
 * @param {string | undefined} message
 */
export function translateValidationMessage(dict, message) {
  if (typeof message === "string" && message.startsWith("validation.")) {
    const translated = t(dict, message);
    if (translated !== message) return translated;
  }
  if (typeof message === "string" && message.length > 0) return message;
  return t(dict, "validation.invalid");
}
