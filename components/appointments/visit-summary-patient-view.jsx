"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatAppointmentDate } from "@/lib/appointment-display";
import { CalendarClock, Printer } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

function SummaryField({ label, value }) {
  if (!value?.trim()) return null;
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground whitespace-pre-line break-words">
        {value}
      </p>
    </div>
  );
}

export function VisitSummaryPatientView({ appointment, summary }) {
  const { t } = useLocale();

  if (appointment.status !== "COMPLETED") {
    return null;
  }

  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground italic">
        {t("appointments.noSummaryYet")}
      </p>
    );
  }

  const followUpHref = appointment.doctor
    ? `/doctors/${encodeURIComponent(appointment.doctor.specialty ?? "General")}/${appointment.doctor.id}#booking-section`
    : null;

  return (
    <div className="min-w-0 space-y-3 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/15 p-3">
      <h4 className="text-sm font-medium text-muted-foreground">
        {t("appointments.visitSummaryTitle")}
      </h4>
      <SummaryField label={t("appointments.diagnosis")} value={summary.diagnosis} />
      <SummaryField
        label={t("appointments.prescription")}
        value={summary.prescription}
      />
      <SummaryField
        label={t("appointments.recommendations")}
        value={summary.recommendations}
      />
      <SummaryField
        label={t("appointments.summaryForYou")}
        value={summary.patientFriendlySummary}
      />
      <SummaryField
        label={t("appointments.followUpInstructions")}
        value={summary.followUpInstructions}
      />
      {summary.followUpDate ? (
        <p className="text-sm text-muted-foreground">
          {t("appointments.followUpDate")}:{" "}
          {formatAppointmentDate(summary.followUpDate)}
        </p>
      ) : null}
      <SummaryField label={t("appointments.redFlags")} value={summary.redFlags} />
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" variant="outline" className="border-primary/20" asChild>
          <Link href={`/appointments/${appointment.id}/summary`}>
            <Printer className="h-4 w-4 me-1" />
            {t("appointments.viewAndPrint")}
          </Link>
        </Button>
        {summary.followUpDate && followUpHref ? (
          <Button size="sm" asChild>
            <Link href={followUpHref}>
              <CalendarClock className="h-4 w-4 me-1" />
              {t("appointments.bookFollowUp")}
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
