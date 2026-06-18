import { getPatientAppointments } from "@/actions/patient";
import { serializePatientAppointment } from "@/lib/patient-appointments";
import { PatientAppointmentsList } from "./_components/patient-appointments-list";
import { PageHeader } from "@/components/page-header";
import { Calendar, HeartPulse } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/onboarding";
import { getServerI18n } from "@/lib/server-i18n";
import { translateActionError } from "@/lib/i18n-errors";

export default async function PatientAppointmentsPage() {
  const user = await getCurrentUser();
  const { t, dir, dict } = await getServerI18n();

  if (!user || user.role !== "PATIENT") {
    redirect("/onboarding");
  }

  const { appointments, error } = await getPatientAppointments();

  return (
    <div dir={dir}>
      <PageHeader
        icon={<Calendar />}
        title={t("appointments.title")}
        backLink="/doctors"
        backLabel={t("nav.findDoctors")}
      />

      <div className="-mt-4 mb-6 flex justify-end">
        <Link href="/patient/profile">
          <Button variant="outline" size="sm" className="gap-2 border-primary/25">
            <HeartPulse className="size-4 text-primary" />
            {t("patient.medicalProfile")}
          </Button>
        </Link>
      </div>

      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Calendar className="size-5 text-primary" />
            {t("appointments.scheduled")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-destructive">
                {translateActionError(
                  dict,
                  typeof error === "object" ? error : { fallbackMessage: String(error) }
                )}
              </p>
            </div>
          ) : appointments?.length > 0 ? (
            <PatientAppointmentsList
              initialAppointments={appointments.map(serializePatientAppointment)}
              dir={dir}
            />
          ) : (
            <div className="py-8 text-center">
              <Calendar className="mx-auto mb-3 size-12 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold text-foreground">
                {t("appointments.noAppointments")}
              </h3>
              <p className="text-muted-foreground">{t("appointments.emptyBody")}</p>
              <Button asChild className="mt-6">
                <Link href="/doctors">{t("nav.findDoctors")}</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
