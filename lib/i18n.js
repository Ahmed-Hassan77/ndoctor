import en from "@/lib/dictionaries/en";
import ar from "@/lib/dictionaries/ar";

export const LOCALE_COOKIE = "locale";
export const DEFAULT_LOCALE = "en";
export const SUPPORTED_LOCALES = ["en", "ar"];

const dictionaries = { en, ar };

/** @param {string | undefined | null} raw */
export function normalizeLocale(raw) {
  if (!raw) return DEFAULT_LOCALE;
  const lower = String(raw).toLowerCase();
  if (lower.startsWith("ar")) return "ar";
  return "en";
}

/** @param {string} locale */
export function getDictionary(locale) {
  return dictionaries[normalizeLocale(locale)] ?? dictionaries.en;
}

/** @param {string} locale */
export function getDir(locale) {
  return normalizeLocale(locale) === "ar" ? "rtl" : "ltr";
}

/** @param {string} locale */
export function getLang(locale) {
  return normalizeLocale(locale) === "ar" ? "ar" : "en";
}

/**
 * @param {typeof en} dict
 * @param {string} path - dot path e.g. "home.headline"
 * @param {Record<string, string | number>} [vars]
 */
export function t(dict, path, vars = {}) {
  const keys = path.split(".");
  let value = dict;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) break;
  }
  if (typeof value !== "string") return path;
  return value.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    vars[key] != null ? String(vars[key]) : ""
  );
}
