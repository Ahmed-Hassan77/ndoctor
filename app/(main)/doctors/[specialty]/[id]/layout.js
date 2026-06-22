import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadDoctorProfile } from "@/lib/doctors/load-doctor-profile";
import {
  doctorProfilePath,
  specialtySlugMatches,
} from "@/lib/doctors/profile-route";
import { getLocalizedDoctor } from "@/lib/doctor-localized";
import { specialtyLabel } from "@/lib/specialty-i18n";
import { getServerI18n } from "@/lib/server-i18n";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const { doctor } = await loadDoctorProfile(id);
  const { locale, dict } = await getServerI18n();

  if (!doctor) {
    return { title: "Doctor - MediMeet" };
  }

  const localized = getLocalizedDoctor(doctor, locale, (name) =>
    specialtyLabel(dict, name)
  );

  return {
    title: `${localized.displayName} - MediMeet`,
    description: `Book an appointment with ${localized.displayName}, ${localized.displaySpecialty} specialist.`,
  };
}

export default async function DoctorProfileLayout({ children, params }) {
  const { id, specialty } = await params;
  const { doctor } = await loadDoctorProfile(id);
  const { locale, dict, t } = await getServerI18n();

  if (!doctor) {
    redirect("/doctors");
  }

  if (!specialtySlugMatches(doctor.specialty, specialty)) {
    redirect(doctorProfilePath(doctor));
  }

  const localized = getLocalizedDoctor(doctor, locale, (name) =>
    specialtyLabel(dict, name)
  );
  const specialtySlug = encodeURIComponent(doctor.specialty ?? "");

  return (
    <div className="min-w-0">
      <div className="mb-6 flex flex-wrap gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-primary/20"
        >
          <Link href="/doctors">
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("doctors.title")}
          </Link>
        </Button>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
        >
          <Link href={`/doctors/${specialtySlug}`}>
            {localized.displaySpecialty}
          </Link>
        </Button>
      </div>
      {children}
    </div>
  );
}
