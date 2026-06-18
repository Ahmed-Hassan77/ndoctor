import { redirect } from "next/navigation";
import { getDoctorsBySpecialty } from "@/actions/doctors-listing";
import { DoctorCard } from "../components/doctor-card";
import { PageHeader } from "@/components/page-header";
import { getServerI18n } from "@/lib/server-i18n";
import { specialtyLabel } from "@/lib/specialty-i18n";

export default async function DoctorSpecialtyPage({ params }) {
  const { specialty } = await params;
  const { t, dict } = await getServerI18n();

  if (!specialty) {
    redirect("/doctors");
  }

  const decodedSpecialty = specialty.split("%20").join(" ");
  const { doctors, error } = await getDoctorsBySpecialty(specialty);

  if (error) {
    console.error("Error fetching doctors:", error);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={specialtyLabel(dict, decodedSpecialty)}
        backLink="/doctors"
        backLabel={t("admin.doctorSearchBack")}
      />

      {doctors && doctors.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} variant="compact" />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-foreground mb-2">
            {t("admin.noDoctorsAvailable")}
          </h3>
          <p className="text-muted-foreground">
            {t("admin.noDoctorsInSpecialty")}
          </p>
        </div>
      )}
    </div>
  );
}
