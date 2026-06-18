"use client";

import { Stethoscope } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useLocale } from "@/components/locale-provider";

export function DoctorDashboardHeader() {
  const { t } = useLocale();
  return (
    <PageHeader
      icon={<Stethoscope />}
      title={t("nav.doctorDashboard")}
      backLink="/"
    />
  );
}
