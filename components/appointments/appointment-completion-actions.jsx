"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, AlertTriangle, Banknote } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import {
  markAppointmentCompleted,
  confirmPatientVisitCompleted,
  reportPatientNoShow,
  reportDoctorNoShow,
  confirmClinicPaymentReceived,
} from "@/actions/appointment-completion";
import {
  isAppointmentEnded,
  bothPartiesConfirmed,
} from "@/lib/appointment-completion";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { useLocale } from "@/components/locale-provider";
import { translateSuccessMessage } from "@/lib/i18n-errors";

function ActionBlock({ title, description, children, disabledReason }) {
  return (
    <div className="min-w-0 space-y-2 rounded-md border border-border/50 p-3">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? (
        <p className="text-xs text-muted-foreground">{description}</p>
      ) : null}
      {disabledReason ? (
        <p className="text-xs text-muted-foreground">{disabledReason}</p>
      ) : null}
      {children}
    </div>
  );
}

function ConfirmationStatus({ appointment, t, labels }) {
  const doctorYes = Boolean(appointment.doctorMarkedCompletedAt);
  const patientYes = Boolean(appointment.patientConfirmedCompletedAt);
  const fullyDone = appointment.status === "COMPLETED";

  return (
    <div className="min-w-0 space-y-2 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/10 p-3">
      <p className="text-sm font-medium text-muted-foreground">
        {t("appointments.visitConfirmation")}
      </p>
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant="outline">
          {t("appointments.doctorYesNo", {
            value: doctorYes ? t("common.yes") : t("common.no"),
          })}
        </Badge>
        <Badge variant="outline">
          {t("appointments.patientYesNo", {
            value: patientYes ? t("common.yes") : t("common.no"),
          })}
        </Badge>
        {fullyDone ? (
          <Badge className="bg-primary/10 text-primary/80">
            {t("appointments.fullyCompleted")}
          </Badge>
        ) : doctorYes || patientYes ? (
          <Badge variant="outline" className="border-primary/25 text-muted-foreground">
            {t("appointments.awaitingOtherParty")}
          </Badge>
        ) : null}
      </div>
      {appointment.disputeStatus && appointment.disputeStatus !== "NONE" ? (
        <p className="text-xs text-muted-foreground">
          {t("appointments.disputeNote")}:{" "}
          {labels.disputeStatus(appointment.disputeStatus)}
          {appointment.disputeReason ? ` — ${appointment.disputeReason}` : ""}
        </p>
      ) : null}
      {appointment.patientNoShowReportedAt ? (
        <p className="text-xs text-muted-foreground">
          {t("appointments.patientNoShowReported")}{" "}
          {formatAppointmentDateTime(appointment.patientNoShowReportedAt)}
        </p>
      ) : null}
      {appointment.doctorNoShowReportedAt ? (
        <p className="text-xs text-muted-foreground">
          {t("appointments.doctorNoShowReported")}{" "}
          {formatAppointmentDateTime(appointment.doctorNoShowReportedAt)}
        </p>
      ) : null}
    </div>
  );
}

export function AppointmentCompletionActions({
  appointment,
  userRole,
  onUpdated,
}) {
  const { t, labels, dict } = useLocale();
  const [noShowReason, setNoShowReason] = useState("");
  const ended = isAppointmentEnded(appointment.endTime);
  const cancelled = appointment.status === "CANCELLED";
  const fullyCompleted = appointment.status === "COMPLETED";
  const bothConfirmed = bothPartiesConfirmed(appointment);

  const { loading: doctorConfirmLoading, fn: submitDoctorConfirm } = useFetch(
    markAppointmentCompleted
  );
  const { loading: confirmLoading, fn: submitConfirm } = useFetch(
    confirmPatientVisitCompleted
  );
  const { loading: patientNoShowLoading, fn: submitPatientNoShow } = useFetch(
    reportPatientNoShow
  );
  const { loading: doctorNoShowLoading, fn: submitDoctorNoShow } = useFetch(
    reportDoctorNoShow
  );
  const { loading: clinicPayLoading, fn: submitClinicPay } = useFetch(
    confirmClinicPaymentReceived
  );

  const handleResult = async (res, fallbackMsg) => {
    if (res?.success === true && res.appointment) {
      const msg = res.messageKey
        ? translateSuccessMessage(dict, res.messageKey)
        : res.message ?? fallbackMsg;
      toast.success(msg);
      await onUpdated?.(res.appointment);
      return true;
    }
    return false;
  };

  const runAction = async (fn, msg) => {
    const fd = new FormData();
    fd.append("appointmentId", appointment.id);
    if (noShowReason.trim()) fd.append("reason", noShowReason.trim());
    return handleResult(await fn(fd), msg);
  };

  if (cancelled) {
    return (
      <p className="text-sm text-muted-foreground italic">
        {t("appointments.appointmentCancelledNote")}
      </p>
    );
  }

  if (userRole === "DOCTOR") {
    const canConfirm =
      ended &&
      !appointment.doctorMarkedCompletedAt &&
      (appointment.status === "SCHEDULED" ||
        appointment.status === "CONFIRMED");
    const canClinicPay =
      ended &&
      appointment.appointmentMode === "OFFLINE" &&
      !appointment.clinicPaymentReceivedAt;

    return (
      <div className="min-w-0 space-y-3">
        <ConfirmationStatus appointment={appointment} t={t} labels={labels} />

        {fullyCompleted && bothConfirmed ? (
          <p className="text-sm text-primary/80">
            {t("appointments.visitFullyCompletedBoth")}
          </p>
        ) : null}

        <ActionBlock
          title={t("appointments.confirmVisitHappened")}
          description={t("appointments.confirmVisitDoctorDesc")}
          disabledReason={
            !ended ? t("appointments.availableAfterEnd") : null
          }
        >
          {appointment.doctorMarkedCompletedAt ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {appointment.patientConfirmedCompletedAt
                ? t("appointments.youConfirmedPatientToo")
                : t("appointments.youConfirmedWaitingPatient")}
            </p>
          ) : (
            <Button
              size="sm"
              disabled={!canConfirm || doctorConfirmLoading}
              onClick={() =>
                runAction(
                  submitDoctorConfirm,
                  t("appointments.confirmationRecorded")
                )
              }
            >
              {doctorConfirmLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 me-1" />
                  {t("appointments.confirmVisitHappened")}
                </>
              )}
            </Button>
          )}
        </ActionBlock>

        {appointment.appointmentMode === "OFFLINE" ? (
          <ActionBlock
            title={t("appointments.confirmClinicPaymentTitle")}
            description={t("appointments.confirmClinicPaymentDesc")}
            disabledReason={
              !ended
                ? t("appointments.availableAfterEnd")
                : appointment.clinicPaymentReceivedAt
                  ? t("appointments.paymentAlreadyConfirmed")
                  : null
            }
          >
            <Button
              size="sm"
              variant="outline"
              disabled={!canClinicPay || clinicPayLoading}
              className="border-primary/20"
              onClick={() =>
                runAction(
                  submitClinicPay,
                  t("appointments.clinicPaymentConfirmed")
                )
              }
            >
              {clinicPayLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Banknote className="h-4 w-4 me-1" />
                  {t("appointments.confirmPaymentReceived")}
                </>
              )}
            </Button>
          </ActionBlock>
        ) : null}

        <ActionBlock
          title={t("appointments.reportPatientNoShow")}
          description={t("appointments.noShowDisputeDesc")}
          disabledReason={!ended ? t("appointments.availableAfterEnd") : null}
        >
          <div className="space-y-2">
            <Label className="text-xs">{t("doctorDash.reasonOptional")}</Label>
            <Textarea
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
              className="min-h-[60px] text-sm"
              placeholder={t("appointments.adminNotePlaceholder")}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!ended || patientNoShowLoading}
              className="border-primary/30 text-foreground"
              onClick={() =>
                runAction(
                  submitPatientNoShow,
                  t("appointments.noShowReportSubmitted")
                )
              }
            >
              {patientNoShowLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 me-1" />
                  {t("appointments.reportPatientNoShow")}
                </>
              )}
            </Button>
          </div>
        </ActionBlock>
      </div>
    );
  }

  if (userRole === "PATIENT") {
    const canConfirm =
      ended &&
      !appointment.patientConfirmedCompletedAt &&
      (appointment.status === "SCHEDULED" ||
        appointment.status === "CONFIRMED");

    return (
      <div className="min-w-0 space-y-3">
        <ConfirmationStatus appointment={appointment} t={t} labels={labels} />

        {fullyCompleted && bothConfirmed ? (
          <p className="text-sm text-primary/80">
            {t("appointments.visitFullyCompletedBoth")}
          </p>
        ) : null}

        <ActionBlock
          title={t("appointments.confirmVisitHappened")}
          description={t("appointments.confirmVisitPatientDesc")}
          disabledReason={
            !ended ? t("appointments.availableAfterEnd") : null
          }
        >
          {appointment.patientConfirmedCompletedAt ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0" />
              {appointment.doctorMarkedCompletedAt
                ? t("appointments.youConfirmedDoctorToo")
                : t("appointments.youConfirmedWaitingDoctor")}
            </p>
          ) : (
            <Button
              size="sm"
              disabled={!canConfirm || confirmLoading}
              onClick={() =>
                runAction(submitConfirm, t("appointments.confirmationRecorded"))
              }
            >
              {confirmLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 me-1" />
                  {t("appointments.confirmVisitHappened")}
                </>
              )}
            </Button>
          )}
        </ActionBlock>

        <ActionBlock
          title={t("appointments.reportDoctorNoShow")}
          description={t("appointments.noShowDisputeDesc")}
          disabledReason={!ended ? t("appointments.availableAfterEnd") : null}
        >
          <div className="space-y-2">
            <Label className="text-xs">{t("doctorDash.reasonOptional")}</Label>
            <Textarea
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
              className="min-h-[60px] text-sm"
              placeholder={t("appointments.adminNotePlaceholder")}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!ended || doctorNoShowLoading}
              className="border-primary/30 text-foreground"
              onClick={() =>
                runAction(
                  submitDoctorNoShow,
                  t("appointments.noShowReportSubmitted")
                )
              }
            >
              {doctorNoShowLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 me-1" />
                  {t("appointments.reportDoctorNoShow")}
                </>
              )}
            </Button>
          </div>
        </ActionBlock>
      </div>
    );
  }

  return null;
}
