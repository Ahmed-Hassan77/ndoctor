import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { HeartPulse } from "lucide-react";
import Link from "next/link";
import { getCurrentUser } from "@/actions/onboarding";
import {
  getPatientMedicalAttachments,
  getPatientMedicalProfile,
} from "@/actions/patient-medical-profile";
import { PageHeader } from "@/components/page-header";
import { PatientMedicalProfileForm } from "./_components/patient-medical-profile-form";
import { PatientMedicalAttachmentsSection } from "./_components/patient-medical-attachments-section";
import { Button } from "@/components/ui/button";
import { getServerI18n } from "@/lib/server-i18n";

export default async function PatientMedicalProfilePage() {
  const user = await getCurrentUser();
  const { t, dir } = await getServerI18n();

  if (!user || user.role !== "PATIENT") {
    redirect("/onboarding");
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value ?? "en";
  const pageDir = dir ?? (locale.toLowerCase().startsWith("ar") ? "rtl" : "ltr");

  const [profileResult, attachmentsResult] = await Promise.all([
    getPatientMedicalProfile(),
    getPatientMedicalAttachments(),
  ]);
  const profile = profileResult?.success ? profileResult.profile : null;
  const attachments = attachmentsResult?.success
    ? attachmentsResult.attachments
    : [];

  return (
    <div dir={pageDir} className="mx-auto max-w-3xl">
      <PageHeader
        icon={<HeartPulse />}
        title={t("patient.medicalProfile")}
        backLink="/appointments"
        backLabel={t("nav.appointments")}
      />

      <p className="-mt-4 mb-6 text-muted-foreground">{t("patient.profilePrivacyHint")}</p>

      <PatientMedicalProfileForm profile={profile} dir={pageDir} />

      <div className="mt-6">
        <PatientMedicalAttachmentsSection attachments={attachments} dir={pageDir} />
      </div>

      <div className="mt-6">
        <Link href="/appointments">
          <Button variant="outline" className="border-primary/20">
            {t("patient.backToAppointments")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
