"use client";

import { useEffect, useState } from "react";
import {
  Video,
  MapPin,
  Loader2,
  Calendar,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDoctorPricingSummary } from "@/lib/doctor-display";
import {
  doctorSupportsMode,
  hasUsableClinicLocation,
} from "@/lib/doctor-display";
import { getAppointmentPriceEgp, formatPriceEgp } from "@/lib/pricing";
import { getPublicDoctorClinics } from "@/actions/clinics";
import { formatClinicSummary, hasUsableClinicRecord } from "@/lib/clinics";
import { getClinicOptionLabel } from "@/lib/clinic-localized";
import { PLATFORM_TIME_LABEL } from "@/lib/platform-timezone";
import { MonthSlotPicker } from "@/components/calendar/month-slot-picker";
import { AppointmentForm } from "./appointment-form";
import { BookingStepIndicator } from "./booking-step-indicator";
import { useLocale } from "@/components/locale-provider";

export function DoctorBookingPanel({
  doctor,
  onBookingComplete,
  dir: dirProp,
  selectedClinicId: controlledClinicId,
  onClinicChange,
}) {
  const { t, locale, dir: localeDir } = useLocale();
  const dir = dirProp ?? localeDir;
  const [bookingStep, setBookingStep] = useState("mode");
  const [appointmentMode, setAppointmentMode] = useState(null);
  const [internalClinicId, setInternalClinicId] = useState(null);
  const selectedClinicId = controlledClinicId ?? internalClinicId;
  const setSelectedClinicId = onClinicChange ?? setInternalClinicId;
  const [clinics, setClinics] = useState([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [concern, setConcern] = useState("");

  const pricing = getDoctorPricingSummary(doctor, locale);
  const clinicReady =
    hasUsableClinicLocation(doctor) ||
    clinics.some((c) => hasUsableClinicRecord(c, locale));
  const supportsOnline = doctorSupportsMode(
    doctor,
    doctor.workTimes ?? [],
    "ONLINE"
  );
  const supportsClinic = doctorSupportsMode(
    doctor,
    doctor.workTimes ?? [],
    "OFFLINE"
  );

  useEffect(() => {
    if (appointmentMode !== "OFFLINE") return;
    let active = true;
    (async () => {
      setClinicsLoading(true);
      const res = await getPublicDoctorClinics(doctor.id);
      if (!active) return;
      const list = res?.success ? res.clinics ?? [] : [];
      setClinics(list);
      if (list.length === 1) {
        setSelectedClinicId(list[0].id);
      } else if (
        controlledClinicId &&
        list.some((c) => c.id === controlledClinicId)
      ) {
        setSelectedClinicId(controlledClinicId);
      }
      setClinicsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [appointmentMode, doctor.id, controlledClinicId, setSelectedClinicId]);

  const selectedClinic = clinics.find((c) => c.id === selectedClinicId);
  const priceLabel = appointmentMode
    ? formatPriceEgp(
        selectedClinic?.consultationPriceEgp ??
          getAppointmentPriceEgp(doctor, appointmentMode),
        pricing.currency
      )
    : null;

  const paymentNote =
    appointmentMode === "OFFLINE"
      ? t("booking.payAtClinic")
      : t("booking.payOnlineNote");

  const visitTypeLabel =
    appointmentMode === "OFFLINE"
      ? t("booking.clinicVisit")
      : t("booking.onlineVideo");

  const handleSelectMode = (mode) => {
    if (mode === "OFFLINE" && !clinicReady && !supportsClinic) return;
    setAppointmentMode(mode);
    setSelectedSlot(null);
    setConcern("");
    if (!onClinicChange) {
      setSelectedClinicId(null);
    }
    setBookingStep(mode === "OFFLINE" ? "clinic" : "slot");
  };

  const resetToMode = () => {
    setBookingStep("mode");
    setAppointmentMode(null);
    if (!onClinicChange) {
      setSelectedClinicId(null);
    }
    setSelectedSlot(null);
    setConcern("");
  };

  const resetToSlot = () => {
    setBookingStep(appointmentMode === "OFFLINE" ? "clinic" : "slot");
    setSelectedSlot(null);
  };

  const canPickSlots =
    appointmentMode === "ONLINE" ||
    (appointmentMode === "OFFLINE" && selectedClinicId);

  return (
    <Card id="booking-section" className="min-w-0 overflow-hidden border-border shadow-sm" dir={dir}>
      <CardHeader className="space-y-3 border-b border-border/50 px-4 pb-4 pt-5 sm:px-6">
        <div>
          <CardTitle className="text-lg text-foreground">{t("booking.title")}</CardTitle>
          <CardDescription className="break-words">{t("booking.subtitle")}</CardDescription>
        </div>
        <BookingStepIndicator current={bookingStep} />
      </CardHeader>

      <CardContent className="min-w-0 overflow-x-hidden px-4 pt-5 sm:px-6">
        {bookingStep === "mode" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("booking.selectVisitType")}</p>
            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                disabled={!supportsOnline}
                onClick={() => handleSelectMode("ONLINE")}
                className="min-w-0 rounded-lg border border-primary/15 bg-primary/5 p-4 text-start transition-colors hover:border-primary/30 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Video className="mb-2 h-6 w-6 text-primary" />
                <p className="font-semibold text-foreground">{t("booking.onlineVideo")}</p>
                <p className="mt-1 text-sm font-medium text-primary">{pricing.onlineLabel}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">{t("booking.onlineDesc")}</p>
              </button>
              <button
                type="button"
                disabled={!clinicReady || !supportsClinic}
                onClick={() => handleSelectMode("OFFLINE")}
                className={`min-w-0 rounded-lg border p-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  clinicReady && supportsClinic
                    ? "border-primary/15 bg-muted/20 hover:border-primary/30"
                    : "cursor-not-allowed border-amber-900/30 bg-amber-950/15 opacity-80"
                }`}
              >
                <MapPin className="mb-2 h-6 w-6 text-primary" />
                <p className="font-semibold text-foreground">{t("booking.clinicVisit")}</p>
                <p className="mt-1 text-sm font-medium text-primary">{pricing.clinicLabel}</p>
                <p className="mt-1 break-words text-xs text-muted-foreground">
                  {clinicReady && supportsClinic ? t("booking.clinicDesc") : t("booking.clinicUnavailable")}
                </p>
              </button>
            </div>
          </div>
        )}

        {bookingStep === "clinic" && appointmentMode === "OFFLINE" && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("clinics.selectForBooking")}</p>
            {clinicsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : clinics.length === 0 ? (
              <p className="text-sm text-destructive">{t("booking.clinicUnavailable")}</p>
            ) : (
              <div className="space-y-2">
                <Select value={selectedClinicId ?? ""} onValueChange={setSelectedClinicId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("clinics.selectClinic")} />
                  </SelectTrigger>
                  <SelectContent>
                    {clinics.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {getClinicOptionLabel(c, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClinic ? (
                  <p className="text-xs text-muted-foreground break-words">
                    {formatClinicSummary(selectedClinic, locale)}
                  </p>
                ) : null}
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <Button type="button" variant="ghost" size="sm" onClick={resetToMode}>
                <ArrowLeft className="me-1 h-3.5 w-3.5" />
                {t("common.changeType")}
              </Button>
              <Button
                type="button"
                disabled={!selectedClinicId}
                onClick={() => setBookingStep("slot")}
              >
                {t("common.continue")}
              </Button>
            </div>
          </div>
        )}

        {bookingStep === "slot" && appointmentMode && canPickSlots && (
          <div className="min-w-0 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="break-words text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{visitTypeLabel}</span>
                {" · "}
                {priceLabel}
              </p>
              <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 self-start px-2 text-primary" onClick={resetToMode}>
                <ArrowLeft className="me-1 h-3.5 w-3.5" />
                {t("common.changeType")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("common.timesIn", { zone: PLATFORM_TIME_LABEL })}
            </p>
            <MonthSlotPicker
              key={`${appointmentMode}-${selectedClinicId ?? "online"}`}
              doctorId={doctor.id}
              mode={appointmentMode}
              clinicId={selectedClinicId}
              dir={dir}
              onSelectSlot={(slot) => {
                setSelectedSlot(slot);
                setBookingStep("concern");
              }}
            />
          </div>
        )}

        {(bookingStep === "concern" || bookingStep === "confirm") && selectedSlot && appointmentMode && (
          <AppointmentForm
            doctorId={doctor.id}
            clinicId={selectedClinicId}
            slot={selectedSlot}
            appointmentMode={appointmentMode}
            priceLabel={priceLabel}
            paymentNote={paymentNote}
            visitTypeLabel={visitTypeLabel}
            phase={bookingStep}
            description={concern}
            onDescriptionChange={setConcern}
            onBack={bookingStep === "confirm" ? () => setBookingStep("concern") : resetToSlot}
            onContinue={() => setBookingStep("confirm")}
            onComplete={onBookingComplete}
            dir={dir}
          />
        )}
      </CardContent>
    </Card>
  );
}
