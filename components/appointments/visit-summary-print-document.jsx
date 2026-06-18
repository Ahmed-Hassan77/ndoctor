"use client";

import {
  formatAppointmentDate,
  formatAppointmentDateTime,
  formatAppointmentRange,
} from "@/lib/appointment-display";
import { useLocale } from "@/components/locale-provider";
import { specialtyLabel } from "@/lib/specialty-i18n";

function PrintSection({ title, children }) {
  if (!children) return null;
  return (
    <section className="print-section mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-1">
        {title}
      </h2>
      <div className="text-sm text-gray-900 whitespace-pre-line">{children}</div>
    </section>
  );
}

export function VisitSummaryPrintDocument({
  appointment,
  summary,
  doctor,
  patient,
  generatedAt,
}) {
  const { t, dict } = useLocale();
  const { dateLine, timeLine } = formatAppointmentRange(
    appointment.startTime,
    appointment.endTime
  );

  return (
    <article className="print-document mx-auto max-w-3xl bg-white text-gray-900 p-8">
      <header className="border-b border-gray-300 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("appointments.brandName")}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {t("appointments.printDocumentTitle")}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p className="font-semibold">{t("appointments.doctorLabel")}</p>
          <p>
            {t("common.drPrefix")} {doctor?.name ?? "—"}
          </p>
          <p className="text-gray-600">
            {doctor?.specialty
              ? specialtyLabel(dict, doctor.specialty)
              : ""}
          </p>
        </div>
        <div>
          <p className="font-semibold">{t("appointments.patientLabel")}</p>
          <p>{patient?.name ?? "—"}</p>
        </div>
        <div className="sm:col-span-2">
          <p className="font-semibold">{t("checkout.appointment")}</p>
          <p>
            {dateLine} · {timeLine}
          </p>
        </div>
      </div>

      {summary ? (
        <>
          <PrintSection title={t("appointments.diagnosis")}>
            {summary.diagnosis}
          </PrintSection>
          <PrintSection title={t("appointments.prescription")}>
            {summary.prescription}
          </PrintSection>
          <PrintSection title={t("appointments.recommendations")}>
            {summary.recommendations}
          </PrintSection>
          <PrintSection title={t("appointments.patientFriendlySummary")}>
            {summary.patientFriendlySummary}
          </PrintSection>
          <PrintSection title={t("appointments.followUpInstructions")}>
            {summary.followUpInstructions}
          </PrintSection>
          {summary.followUpDate ? (
            <p className="text-sm mb-4">
              <span className="font-semibold">
                {t("appointments.followUpDate")}:{" "}
              </span>
              {formatAppointmentDate(summary.followUpDate)}
            </p>
          ) : null}
          <PrintSection title={t("appointments.redFlagsShort")}>
            {summary.redFlags}
          </PrintSection>
        </>
      ) : (
        <p className="text-sm text-gray-600 italic">
          {t("appointments.noSummaryRecorded")}
        </p>
      )}

      <footer className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500">
        {t("appointments.generated")}{" "}
        {formatAppointmentDateTime(generatedAt)}
      </footer>
    </article>
  );
}
