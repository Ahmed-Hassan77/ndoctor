import { arEG, enUS } from "date-fns/locale";

/** @param {string} locale */
export function getDateFnsLocale(locale) {
  return locale === "ar" || String(locale).startsWith("ar") ? arEG : enUS;
}
