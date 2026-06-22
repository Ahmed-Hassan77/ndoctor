import { t } from "@/lib/i18n";

/**
 * @param {import("@/lib/dictionaries/en").default} dict
 * @param {{ code?: string; message?: string; fallbackMessage?: string; validationKey?: string; vars?: Record<string, string | number> }} error
 */
export function translateActionError(dict, error) {
  if (!error) return t(dict, "errors.genericDescription");

  if (error.validationKey) {
    const translated = t(dict, error.validationKey, error.vars ?? {});
    if (translated !== error.validationKey) return translated;
  }

  const msg = error.fallbackMessage ?? error.message;
  if (msg?.startsWith("validation.")) {
    const translated = t(dict, msg, error.vars ?? {});
    if (translated !== msg) return translated;
  }

  if (error.code) {
    const fromCode = t(dict, `errors.codes.${error.code}`, error.vars ?? {});
    if (fromCode !== `errors.codes.${error.code}`) return fromCode;
  }

  if (msg) return msg;
  return t(dict, "errors.genericDescription");
}

/**
 * @param {import("@/lib/dictionaries/en").default} dict
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 */
export function translateSuccessMessage(dict, key, vars = {}) {
  const path = key.startsWith("success.") ? key : `success.${key}`;
  const translated = t(dict, path, vars);
  return translated !== path ? translated : key;
}
