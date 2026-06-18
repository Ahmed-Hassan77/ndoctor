import { DoctorDashboardHeader } from "@/components/doctor/doctor-dashboard-header";
import { getServerI18n } from "@/lib/server-i18n";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t("meta.doctorDashboardTitle"),
    description: t("meta.doctorDashboardDescription"),
  };
}

export default async function DoctorDashboardLayout({ children }) {
  return (
    <>
      <DoctorDashboardHeader />
      {children}
    </>
  );
}
