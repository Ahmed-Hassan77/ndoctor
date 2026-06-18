"use client";

import { Badge } from "@/components/ui/badge";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { useLocale } from "@/components/locale-provider";

function YesNoTime({ yes, at, t }) {
  return (
    <span>
      {yes ? t("common.yes") : t("common.no")}
      {yes && at ? ` (${formatAppointmentDateTime(at)})` : ""}
    </span>
  );
}

function EvidenceRow({ label, children }) {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="font-medium text-foreground/80">{label}: </span>
      {children}
    </p>
  );
}

export function AppointmentEvidencePanel({ appointment }) {
  const { t, labels } = useLocale();
  const doctorConfirmed = Boolean(appointment.doctorMarkedCompletedAt);
  const patientConfirmed = Boolean(appointment.patientConfirmedCompletedAt);

  return (
    <div className="min-w-0 space-y-2 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/15 p-3">
      <h4 className="text-sm font-medium text-muted-foreground">
        {t("appointments.visitStatusEvidence")}
      </h4>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          {t("appointments.statusLabel")}:{" "}
          {labels.appointmentStatus(appointment.status)}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {t("appointments.paymentLabel")}:{" "}
          {labels.paymentStatus(appointment.paymentStatus ?? "")}
        </Badge>
        {appointment.disputeStatus && appointment.disputeStatus !== "NONE" ? (
          <Badge
            variant="outline"
            className="text-xs border-primary/25 text-muted-foreground"
          >
            {t("appointments.disputeLabel")}:{" "}
            {labels.disputeStatus(appointment.disputeStatus)}
          </Badge>
        ) : null}
        {appointment.completionSource ? (
          <Badge variant="outline" className="text-xs">
            {t("appointments.sourceLabel")}: {appointment.completionSource}
          </Badge>
        ) : null}
      </div>

      <EvidenceRow label={t("appointments.doctorConfirmed")}>
        <YesNoTime
          yes={doctorConfirmed}
          at={appointment.doctorMarkedCompletedAt}
          t={t}
        />
      </EvidenceRow>
      <EvidenceRow label={t("appointments.patientConfirmed")}>
        <YesNoTime
          yes={patientConfirmed}
          at={appointment.patientConfirmedCompletedAt}
          t={t}
        />
      </EvidenceRow>
      {appointment.completedAt ? (
        <EvidenceRow label={t("appointments.fullyCompletedAt")}>
          {formatAppointmentDateTime(appointment.completedAt)}
        </EvidenceRow>
      ) : null}

      <EvidenceRow label={t("appointments.patientNoShowReported")}>
        <YesNoTime
          yes={Boolean(appointment.patientNoShowReportedAt)}
          at={appointment.patientNoShowReportedAt}
          t={t}
        />
      </EvidenceRow>
      <EvidenceRow label={t("appointments.doctorNoShowReported")}>
        <YesNoTime
          yes={Boolean(appointment.doctorNoShowReportedAt)}
          at={appointment.doctorNoShowReportedAt}
          t={t}
        />
      </EvidenceRow>

      {appointment.noShowReason ? (
        <p className="text-xs text-muted-foreground break-words">
          {t("appointments.noShowNote")}: {appointment.noShowReason}
        </p>
      ) : null}
      {appointment.disputeReason ? (
        <p className="text-xs text-muted-foreground break-words">
          {t("appointments.disputeNote")}: {appointment.disputeReason}
        </p>
      ) : null}

      {appointment.appointmentMode === "OFFLINE" ? (
        <>
          <EvidenceRow label={t("appointments.clinicPaymentReceived")}>
            <YesNoTime
              yes={Boolean(appointment.clinicPaymentReceivedAt)}
              at={appointment.clinicPaymentReceivedAt}
              t={t}
            />
          </EvidenceRow>
          <EvidenceRow label={t("appointments.clinicAttendance")}>
            <YesNoTime
              yes={Boolean(appointment.clinicAttendanceConfirmedAt)}
              at={appointment.clinicAttendanceConfirmedAt}
              t={t}
            />
          </EvidenceRow>
        </>
      ) : null}

      {appointment.appointmentMode === "ONLINE" ? (
        <>
          <EvidenceRow label={t("appointments.patientJoinedVideo")}>
            <YesNoTime
              yes={Boolean(appointment.patientJoinedVideoAt)}
              at={appointment.patientJoinedVideoAt}
              t={t}
            />
          </EvidenceRow>
          <EvidenceRow label={t("appointments.doctorJoinedVideo")}>
            <YesNoTime
              yes={Boolean(appointment.doctorJoinedVideoAt)}
              at={appointment.doctorJoinedVideoAt}
              t={t}
            />
          </EvidenceRow>
          {appointment.patientLastSeenVideoAt ? (
            <EvidenceRow label={t("appointments.patientLastSeenVideo")}>
              {formatAppointmentDateTime(appointment.patientLastSeenVideoAt)}
            </EvidenceRow>
          ) : null}
          {appointment.doctorLastSeenVideoAt ? (
            <EvidenceRow label={t("appointments.doctorLastSeenVideo")}>
              {formatAppointmentDateTime(appointment.doctorLastSeenVideoAt)}
            </EvidenceRow>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
