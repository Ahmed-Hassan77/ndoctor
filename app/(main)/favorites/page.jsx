import { redirect } from "next/navigation";
import { checkUser } from "@/lib/checkUser";
import { getMyFavoriteDoctors } from "@/actions/favorites";
import { FavoritesPageClient } from "./favorites-client";

import { getServerI18n } from "@/lib/server-i18n";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("meta.favoritesTitle") };
}

export default async function FavoritesPage() {
  const user = await checkUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "PATIENT") redirect("/onboarding");

  const result = await getMyFavoriteDoctors();
  const favorites =
    result?.success === true ? result.favorites ?? [] : [];

  return <FavoritesPageClient favorites={favorites} />;
}
