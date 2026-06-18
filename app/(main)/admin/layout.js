import { verifyAdmin } from "@/actions/admin";
import { redirect } from "next/navigation";
import { AdminTabsNav } from "./components/admin-tabs-nav";

import { getServerI18n } from "@/lib/server-i18n";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t("meta.adminTitle"),
    description: t("meta.adminDescription"),
  };
}

export default async function AdminLayout({ children }) {
  const isAdmin = await verifyAdmin();

  if (!isAdmin) {
    redirect("/onboarding");
  }

  return (
    <div className="min-w-0">
      <AdminTabsNav>{children}</AdminTabsNav>
    </div>
  );
}
