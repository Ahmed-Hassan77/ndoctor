import { RouteLoading } from "@/components/route-loading";
import { getServerI18n } from "@/lib/server-i18n";

export default async function DoctorsLoading() {
  const { t } = await getServerI18n();
  return <RouteLoading label={t("doctors.loading")} variant="skeleton" />;
}
