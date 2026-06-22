import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/prisma";
import { VisitSummaryPrintDocument } from "@/components/appointments/visit-summary-print-document";
import { PrintSummaryButton } from "@/components/appointments/print-summary-button";
import { serializeVisitSummary } from "@/lib/appointment-completion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { getServerI18n } from "@/lib/server-i18n";
import "./print.css";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t("meta.visitSummaryTitle"),
  };
}

export default async function AppointmentSummaryPrintPage({ params }) {
  const { id } = await params;
  const { t } = await getServerI18n();
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });
  if (!user) redirect("/onboarding");

  const appointment = await db.appointment.findUnique({
    where: { id },
    include: {
      visitSummary: true,
      doctor: { select: { id: true, name: true, specialty: true } },
      patient: { select: { id: true, name: true } },
    },
  });

  if (!appointment) notFound();

  const isDoctor =
    user.role === "DOCTOR" && appointment.doctorId === user.id;
  const isPatient =
    user.role === "PATIENT" && appointment.patientId === user.id;

  if (!isDoctor && !isPatient) notFound();

  if (appointment.status !== "COMPLETED") {
    redirect("/appointments");
  }

  const role = isDoctor ? "DOCTOR" : "PATIENT";
  const summary = appointment.visitSummary
    ? serializeVisitSummary(appointment.visitSummary, role)
    : null;

  const backHref = isDoctor ? "/doctor" : "/appointments";

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      <div className="no-print container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Button variant="outline" asChild>
          <Link href={backHref}>
            <ArrowLeft className="h-4 w-4 me-2" />
            {t("common.back")}
          </Link>
        </Button>
        <PrintSummaryButton />
      </div>
      <VisitSummaryPrintDocument
        appointment={{
          startTime: appointment.startTime.toISOString(),
          endTime: appointment.endTime.toISOString(),
        }}
        summary={summary}
        doctor={appointment.doctor}
        patient={appointment.patient}
        generatedAt={new Date().toISOString()}
      />
    </div>
  );
}
