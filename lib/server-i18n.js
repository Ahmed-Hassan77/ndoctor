import { cookies } from "next/headers";
import { cache } from "react";
import {
  getDictionary,
  normalizeLocale,
  getDir,
  getLang,
  LOCALE_COOKIE,
  t,
} from "@/lib/i18n";

export async function getServerLocale() {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_COOKIE)?.value);
}

export const getServerI18n = cache(async () => {
  const locale = await getServerLocale();
  const dict = getDictionary(locale);
  return {
    locale,
    dir: getDir(locale),
    lang: getLang(locale),
    dict,
    t: (path, vars) => t(dict, path, vars),
  };
});
