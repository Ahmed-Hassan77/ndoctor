"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { normalizeLocale, LOCALE_COOKIE } from "@/lib/i18n";

/**
 * Persist UI language (cookie only — no DB).
 * @param {FormData} formData
 */
export async function setLocale(formData) {
  const raw = formData.get("locale");
  const locale = normalizeLocale(typeof raw === "string" ? raw : "");
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
  return { success: true, locale };
}
