"use client";

import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatAppointmentDate } from "@/lib/appointment-display";
import { PLATFORM_TIME_LABEL } from "@/lib/platform-timezone";
import { SlotTimeLabel } from "@/components/booking/slot-time-label";
import {
  Loader2,
  Clock,
  ArrowLeft,
  Calendar,
  Banknote,
  Video,
  MapPin,
} from "lucide-react";
import { bookAppointment } from "@/actions/appointments";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";

/**
 * @param {object} props
 * @param {'concern' | 'confirm'} props.phase
 */
export function AppointmentForm({
  doctorId,
  clinicId = null,
  slot,
  appointmentMode = "ONLINE",
  priceLabel,
  paymentNote,
  visitTypeLabel,
  phase = "confirm",
  description = "",
  onDescriptionChange,
  onBack,
  onContinue,
  onComplete,
  dir: dirProp,
}) {
  const { t, dir: localeDir, policy } = useLocale();
  const dir = dirProp ?? localeDir;
  const router = useRouter();
  const { loading, data, fn: submitBooking } = useFetch(bookAppointment);
  const [policyAccepted, setPolicyAccepted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!policyAccepted) {
      toast.error(policy.checkboxLabel);
      return;
    }
    const formData = new FormData();
    formData.append("doctorId", doctorId);
    formData.append("startTime", slot.startTime);
    formData.append("endTime", slot.endTime);
    formData.append("description", description);
    formData.append("appointmentMode", appointmentMode);
    if (clinicId) formData.append("clinicId", clinicId);
    formData.append("clientNow", new Date().toISOString());
    formData.append("policyAccepted", "true");
    await submitBooking(formData);
  };

  useEffect(() => {
    if (!data) return;
    if (data.success === true) {
      toast.success(
        data.checkoutUrl ? t("booking.bookedCheckout") : t("booking.bookedSuccess")
      );
      if (data.checkoutUrl) {
        router.push(data.checkoutUrl);
      } else {
        onComplete();
      }
    }
  }, [data, onComplete, router, t]);

  const summaryBlock = (
    <div className="min-w-0 space-y-3 rounded-lg border border-border bg-muted/20 p-4">
      <div className="flex min-w-0 items-start gap-2">
        <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span className="break-words font-medium text-foreground">
          {formatAppointmentDate(slot.startTime)}
        </span>
      </div>
      <div className="flex min-w-0 items-start gap-2">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <SlotTimeLabel
            startTime={slot.startTime}
            endTime={slot.endTime}
            variant="stacked"
            showIcon={false}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {t("common.timesIn", { zone: PLATFORM_TIME_LABEL })}
          </span>
        </div>
      </div>
      <div className="flex min-w-0 items-start gap-2">
        {appointmentMode === "OFFLINE" ? (
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        ) : (
          <Video className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        )}
        <span className="break-words text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{visitTypeLabel}</span>
        </span>
      </div>
      <div className="flex min-w-0 items-start gap-2 border-t border-border/50 pt-3">
        <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{priceLabel}</p>
          {paymentNote ? (
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {paymentNote}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (phase === "concern") {
    return (
      <div className="min-w-0 space-y-5" dir={dir}>
        {summaryBlock}
        <div className="space-y-2">
          <Label htmlFor="description">{t("booking.concernLabel")}</Label>
          <Textarea
            id="description"
            placeholder={t("booking.concernPlaceholder")}
            value={description}
            onChange={(e) => onDescriptionChange?.(e.target.value)}
            className="min-h-[120px]"
          />
          <p className="break-words text-xs text-muted-foreground">
            {t("booking.concernHint")}
          </p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onBack} className="w-full sm:w-auto">
            <ArrowLeft className="me-2 h-4 w-4" />
            {t("common.changeTime")}
          </Button>
          <Button type="button" onClick={onContinue} className="w-full sm:w-auto">
            {t("booking.continueToConfirm")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-5" dir={dir}>
      <p className="text-sm font-medium text-foreground">{t("booking.reviewConfirm")}</p>
      {summaryBlock}
      {description?.trim() ? (
        <div className="min-w-0 rounded-lg border border-border bg-muted/15 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {t("booking.yourNote")}
          </p>
          <p className="mt-1 break-words whitespace-pre-line text-sm text-foreground">
            {description}
          </p>
        </div>
      ) : null}
      <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-4 space-y-3">
        <p className="text-sm font-medium text-foreground">{policy.title}</p>
        <ul className="list-disc ps-5 space-y-1 text-xs text-muted-foreground">
          {policy.bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={policyAccepted}
            onChange={(e) => setPolicyAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-border accent-primary"
          />
          <span className="text-sm text-foreground leading-snug">
            {policy.checkboxLabel}
          </span>
        </label>
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="me-2 h-4 w-4" />
          {t("common.back")}
        </Button>
        <Button type="submit" disabled={loading || !policyAccepted} className="w-full sm:w-auto">
          {loading ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {t("booking.booking")}
            </>
          ) : (
            t("booking.confirmBooking")
          )}
        </Button>
      </div>
    </form>
  );
}
