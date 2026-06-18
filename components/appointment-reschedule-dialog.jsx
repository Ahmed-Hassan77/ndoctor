"use client";

import { useEffect, useRef, useState } from "react";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { PLATFORM_TIME_LABEL } from "@/lib/platform-timezone";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, ArrowLeft } from "lucide-react";
import { SlotPicker } from "@/app/(main)/doctors/[specialty]/[id]/_components/slot-picker";
import { SlotTimeLabel } from "@/components/booking/slot-time-label";
import {
  getRescheduleTimeSlots,
  rescheduleAppointment,
} from "@/actions/appointments";
import { filterPastSlotsFromDays } from "@/lib/appointment-slots";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { translateActionError } from "@/lib/i18n-errors";

export function AppointmentRescheduleDialog({
  appointment: appointmentProp,
  open,
  onOpenChange,
  onRescheduled,
  dir = "ltr",
}) {
  const { t, dict } = useLocale();
  const [rescheduledAppointment, setRescheduledAppointment] = useState(null);
  const appointment = rescheduledAppointment ?? appointmentProp;
  const [step, setStep] = useState("slots");
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [days, setDays] = useState([]);
  const [slotsCutoffMs, setSlotsCutoffMs] = useState(() => Date.now());
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const successHandledRef = useRef(false);

  const {
    loading: rescheduling,
    fn: submitReschedule,
    setData: clearRescheduleData,
  } = useFetch(rescheduleAppointment);

  const isSubmitting = isPending || rescheduling;

  const modeLabel =
    appointment.appointmentMode === "OFFLINE"
      ? t("appointments.inPersonClinic")
      : t("appointments.videoConsultation");

  const formatDateTime = (dateString) =>
    formatAppointmentDateTime(dateString);

  const handleDialogChange = (nextOpen) => {
    if (!nextOpen) {
      setStep("slots");
      setSelectedSlot(null);
      setDays([]);
      setSlotsLoading(false);
      setIsPending(false);
      setRescheduledAppointment(null);
      successHandledRef.current = false;
      clearRescheduleData(undefined);
    }
    onOpenChange(nextOpen);
  };

  useEffect(() => {
    if (!open) return;

    let active = true;
    (async () => {
      setSlotsLoading(true);
      setStep("slots");
      setSelectedSlot(null);

      const clientNowIso = new Date().toISOString();
      const res = await getRescheduleTimeSlots(appointmentProp.id, clientNowIso);
      if (!active) return;

      setSlotsLoading(false);
      if (res?.success === true) {
        const cutoffMs = res.cutoffMs ?? Date.now();
        setSlotsCutoffMs(cutoffMs);
        setDays(filterPastSlotsFromDays(res.days ?? [], cutoffMs));
      } else {
        toast.error(
          res?.error
            ? translateActionError(dict, res.error)
            : t("appointments.rescheduleFailed")
        );
        handleDialogChange(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, appointmentProp.id, dict, t]);

  const handleConfirmReschedule = async () => {
    if (!selectedSlot || isSubmitting || successHandledRef.current) return;

    const appointmentId = appointment.id;
    const newStartIso = selectedSlot.startTime;
    const newEndIso = selectedSlot.endTime;

    if (!appointmentId || !newStartIso || !newEndIso) {
      toast.error(t("appointments.invalidSlotSelection"));
      return;
    }

    setIsPending(true);
    const fd = new FormData();
    fd.append("appointmentId", appointmentId);
    fd.append("startTime", newStartIso);
    fd.append("endTime", newEndIso);
    fd.append("clientNow", new Date().toISOString());

    try {
      const res = await submitReschedule(fd);

      if (
        res?.success === true &&
        res.appointment?.id === appointmentId &&
        res.appointment?.startTime &&
        new Date(res.appointment.startTime).getTime() ===
          new Date(newStartIso).getTime() &&
        !successHandledRef.current
      ) {
        successHandledRef.current = true;
        setRescheduledAppointment((prev) => ({ ...(prev ?? appointmentProp), ...res.appointment }));
        await onRescheduled?.(res.appointment);
        toast.success(t("appointments.rescheduleSuccess"));
        handleDialogChange(false);
      } else if (res?.success === false) {
        // Error toast from useFetch; keep dialog open
      } else if (res?.success === true) {
        toast.error(t("appointments.rescheduleNotSaved"));
      }
    } finally {
      setIsPending(false);
    }
  };

  const totalSlots = days.reduce((n, d) => n + (d.slots?.length ?? 0), 0);

  return (
    <Dialog open={open} onOpenChange={handleDialogChange}>
      <DialogContent className="sm:max-w-xl max-h-[min(90vh,720px)] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground">
            {t("appointments.rescheduleTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("appointments.rescheduleDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-4 py-2" dir={dir}>
          <div className="min-w-0 space-y-2 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/20 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t("appointments.visitType")}
              </span>
              <Badge
                variant="outline"
                className={
                  appointment.appointmentMode === "OFFLINE"
                    ? "bg-slate-800/60 border-slate-600/40 text-slate-200"
                    : "bg-primary/5 border-primary/20 text-muted-foreground"
                }
              >
                {modeLabel}
              </Badge>
            </div>
            <div className="flex min-w-0 items-start gap-2 text-sm text-foreground">
              <Calendar className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {t("appointments.currentTime")}
                </p>
                <p className="break-words">
                  {formatDateTime(appointment.startTime)}
                </p>
              </div>
            </div>
          </div>

          {step === "slots" && (
            <div className="min-w-0 space-y-3">
              <p className="text-sm font-medium text-muted-foreground">
                {t("appointments.selectNewSlot")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("common.timesIn", { zone: PLATFORM_TIME_LABEL })}
              </p>
              {slotsLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t("appointments.loadingAvailableSlots")}
                </div>
              ) : totalSlots === 0 ? (
                <p className="text-sm text-muted-foreground italic py-4 text-center">
                  {t("appointments.noSlotsReschedule")}
                </p>
              ) : (
                <SlotPicker
                  days={days}
                  cutoffMs={slotsCutoffMs}
                  dir={dir}
                  onSelectSlot={(slot) => {
                    setSelectedSlot(slot);
                    setStep("confirm");
                  }}
                />
              )}
            </div>
          )}

          {step === "confirm" && selectedSlot && (
            <div className="min-w-0 space-y-4">
              <p className="text-sm font-medium text-muted-foreground">
                {t("appointments.confirmNewTime")}
              </p>
              <div className="rounded-md border border-primary/25 bg-primary/5 p-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  {t("appointments.newTimeLabel")}
                </p>
                <p className="font-medium break-words text-foreground">
                  {selectedSlot.day}
                </p>
                <SlotTimeLabel
                  startTime={selectedSlot.startTime}
                  endTime={selectedSlot.endTime}
                  variant="stacked"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-primary"
                disabled={isSubmitting}
                onClick={() => {
                  setStep("slots");
                  setSelectedSlot(null);
                }}
              >
                <ArrowLeft className="h-4 w-4 me-1.5" />
                {t("appointments.backToSlotSelection")}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="w-full border-primary/20 sm:w-auto"
            onClick={() => handleDialogChange(false)}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          {step === "confirm" && (
            <Button
              type="button"
              className="w-full  sm:w-auto"
              disabled={isSubmitting || !selectedSlot}
              onClick={handleConfirmReschedule}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                  {t("appointments.rescheduling")}
                </>
              ) : (
                t("appointments.confirmReschedule")
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
