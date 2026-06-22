import { getServerI18n } from "@/lib/server-i18n";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t("meta.doctorsTitle"),
    description: t("meta.doctorsDescription"),
  };
}

export default async function DoctorsLayout({ children }) {
  return <div className="min-w-0">{children}</div>;
}
