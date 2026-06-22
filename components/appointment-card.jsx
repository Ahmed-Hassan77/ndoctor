"use client";

import { useState } from "react";
import {
  formatAppointmentDateTime,
  formatAppointmentTime,
} from "@/lib/appointment-display";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Clock,
  User,
  Video,
  Stethoscope,
  X,
  Edit,
  Loader2,
  Star,
  CalendarClock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cancelAppointment, addAppointmentNotes } from "@/actions/doctor";
import { generateVideoToken } from "@/actions/appointments";
import { submitRating } from "@/actions/ratings";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppointmentPatientMedicalProfile } from "@/components/appointment-patient-medical-profile";
import { AppointmentRescheduleDialog } from "@/components/appointment-reschedule-dialog";
import { canPatientRescheduleAppointment } from "@/lib/appointment-reschedule";
import { mergePatientAppointment } from "@/lib/patient-appointments";
import { AppointmentEvidencePanel } from "@/components/appointments/appointment-evidence-panel";
import { AppointmentPaymentPanel } from "@/components/appointments/appointment-payment-panel";
import { AppointmentCompletionActions } from "@/components/appointments/appointment-completion-actions";
import { VisitSummaryForm } from "@/components/appointments/visit-summary-form";
import { VisitSummaryPatientView } from "@/components/appointments/visit-summary-patient-view";
import { useLocale } from "@/components/locale-provider";

export function AppointmentCard({
  appointment: appointmentProp,
  userRole,
  refetchAppointments,
  onAppointmentUpdated,
  onRescheduled,
  dir = "ltr",
}) {
  const [appointment, setAppointment] = useState(appointmentProp);
  const [open, setOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [ratingValue, setRatingValue] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState(appointmentProp.notes || "");
  const router = useRouter();
  const { t, labels, dir: localeDir } = useLocale();
  const effectiveDir = dir ?? localeDir;

  const handleCompletionUpdated = async (updated) => {
    if (!updated?.id) return;
    setAppointment((prev) => mergePatientAppointment(prev, updated));
    onAppointmentUpdated?.(updated);
    if (refetchAppointments) await refetchAppointments();
    else router.refresh();
  };

  const handleSummarySaved = async (updatedAppt, summary) => {
    if (updatedAppt?.id) {
      const merged = {
        ...mergePatientAppointment(appointment, updatedAppt),
        visitSummary: summary ?? updatedAppt.visitSummary,
      };
      setAppointment(merged);
      onAppointmentUpdated?.(merged);
    }
    if (refetchAppointments) await refetchAppointments();
    else router.refresh();
  };

  // UseFetch hooks for server actions
  const {
    loading: cancelLoading,
    fn: submitCancel,
  } = useFetch(cancelAppointment);
  const {
    loading: notesLoading,
    fn: submitNotes,
  } = useFetch(addAppointmentNotes);
  const {
    loading: tokenLoading,
    fn: submitTokenRequest,
  } = useFetch(generateVideoToken);
  const {
    loading: ratingLoading,
    fn: submitRatingFn,
    setData: clearRatingFetch,
  } = useFetch(submitRating);

  const canPatientRate =
    userRole === "PATIENT" &&
    appointment.status === "COMPLETED" &&
    appointment.isPaid !== false &&
    !appointment.rating;

  const canReschedule =
    userRole === "PATIENT" && canPatientRescheduleAppointment(appointment);
  const formatDateTime = (dateString) => formatAppointmentDateTime(dateString);
  const formatTime = (dateString) => formatAppointmentTime(dateString);

  // Handle cancel appointment
  const handleCancelAppointment = async () => {
    if (cancelLoading) return;

    if (
      window.confirm(
        t("appointments.cancelConfirmLong")
      )
    ) {
      const formData = new FormData();
      formData.append("appointmentId", appointment.id);
      const res = await submitCancel(formData);
      if (res?.success) {
        toast.success(t("appointments.cancelledSuccess"));
        setOpen(false);
        if (refetchAppointments) {
          refetchAppointments();
        } else {
          router.refresh();
        }
      }
    }
  };

  // Handle save notes (doctor only)
  const handleSaveNotes = async () => {
    if (notesLoading || userRole !== "DOCTOR") return;

    const formData = new FormData();
    formData.append("appointmentId", appointment.id);
    formData.append("notes", notes);
    const res = await submitNotes(formData);
    if (res?.success) {
      toast.success(t("appointments.notesSavedSuccess"));
      setAction(null);
      if (refetchAppointments) {
        refetchAppointments();
      } else {
        router.refresh();
      }
    }
  };

  // Handle join video call
  const handleJoinVideoCall = async () => {
    if (tokenLoading) return;

    setAction("video");

    const formData = new FormData();
    formData.append("appointmentId", appointment.id);
    const res = await submitTokenRequest(formData);
    if (res?.success === true && res.token && res.videoSessionId) {
      router.push(
        `/video-call?sessionId=${res.videoSessionId}&token=${res.token}&appointmentId=${appointment.id}`
      );
    } else if (res?.success === false) {
      setAction(null);
    }
  };

  const handleRatingSubmit = async (e) => {
    e.preventDefault();
    if (ratingLoading || ratingValue < 1) return;
    const fd = new FormData();
    fd.append("appointmentId", appointment.id);
    fd.append("value", String(ratingValue));
    if (reviewText.trim()) fd.append("review", reviewText.trim());
    const res = await submitRatingFn(fd);
    if (res?.success) {
      toast.success(t("appointments.thankYouFeedback"));
      clearRatingFetch(undefined);
      setRateOpen(false);
      setHoverStar(0);
      setRatingValue(0);
      setReviewText("");
      if (refetchAppointments) refetchAppointments();
      else router.refresh();
    }
  };

  // Handle successful operations — handled inline in action handlers above

  // Determine if appointment is active (within 30 minutes of start time)
  const isAppointmentActive = () => {
    const now = new Date();
    const appointmentTime = new Date(appointment.startTime);
    const appointmentEndTime = new Date(appointment.endTime);

    // Can join 30 minutes before start until end time
    return (
      (appointmentTime.getTime() - now.getTime() <= 30 * 60 * 1000 &&
        now < appointmentTime) ||
      (now >= appointmentTime && now <= appointmentEndTime)
    );
  };

  // Determine other party information based on user role
  const otherParty =
    userRole === "DOCTOR" ? appointment.patient : appointment.doctor;

  const otherPartyLabel =
    userRole === "DOCTOR"
      ? t("appointments.patientLabel")
      : t("appointments.doctorLabel");
  const otherPartyIcon = userRole === "DOCTOR" ? <User /> : <Stethoscope />;

  return (
    <div dir={dir}>
    <>
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10 hover:border-primary/20 transition-all">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-muted/20 rounded-full p-2 mt-1">
                {otherPartyIcon}
              </div>
              <div>
                <h3 className="font-medium text-foreground">
                  {userRole === "DOCTOR"
                    ? otherParty.name
                    : `Dr. ${otherParty.name}`}
                </h3>
                {userRole === "DOCTOR" && (
                  <p className="text-sm text-muted-foreground">
                    {otherParty.email}
                  </p>
                )}
                {userRole === "PATIENT" && otherParty.specialty && (
                  <p className="text-sm text-muted-foreground">
                    {labels.specialty(otherParty.specialty)}
                  </p>
                )}
                <div className="flex items-center mt-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>{formatDateTime(appointment.startTime)}</span>
                </div>
                <div className="flex items-center mt-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>
                    {formatTime(appointment.startTime)} -{" "}
                    {formatTime(appointment.endTime)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 self-end md:self-start">
              <div className="flex flex-wrap gap-2 justify-end md:justify-start">
                <Badge
                  variant="outline"
                  className={
                    appointment.status === "COMPLETED"
                      ? "bg-primary/10 border-primary/20 text-primary"
                      : appointment.status === "CANCELLED"
                        ? "bg-red-900/20 border-red-900/30 text-red-400"
                        : "bg-muted/40 border-border/60 text-foreground"
                  }
                >
                  {labels.appointmentStatus(appointment.status)}
                </Badge>
                {appointment.appointmentMode === "OFFLINE" ? (
                  <Badge
                    variant="outline"
                    className="bg-slate-800/60 border-slate-600/40 text-slate-200"
                  >
                    {t("appointments.inPersonShort")}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="bg-primary/5 border-primary/20 text-muted-foreground"
                  >
                    {labels.appointmentMode("ONLINE")}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {canPatientRate && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="border-border/60 bg-muted/40 text-foreground hover:bg-muted/60"
                    onClick={() => setRateOpen(true)}
                  >
                    <Star className="h-4 w-4 me-1 fill-primary text-primary" />
                    {t("appointments.rateDoctor")}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/20"
                  onClick={() => setOpen(true)}
                >
                  {t("appointments.viewDetails")}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appointment Details Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-foreground">
              {t("appointments.appointmentDetails")}
            </DialogTitle>
            <DialogDescription>
              {appointment.status === "SCHEDULED" ||
              appointment.status === "CONFIRMED"
                ? t("appointments.manageUpcoming")
                : t("appointments.viewAppointmentInfo")}
            </DialogDescription>
          </DialogHeader>

          <div className="min-w-0 space-y-4 py-4">
            {/* Other Party Information */}
            <div className="min-w-0 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {otherPartyLabel}
              </h4>
              <div className="flex min-w-0 items-start gap-2">
                <div className="h-5 w-5 shrink-0 text-primary">
                  {otherPartyIcon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-foreground">
                    {userRole === "DOCTOR"
                      ? otherParty.name
                      : `Dr. ${otherParty.name}`}
                  </p>
                  {userRole === "DOCTOR" && (
                    <p className="break-all text-sm text-muted-foreground">
                      {otherParty.email}
                    </p>
                  )}
                  {userRole === "PATIENT" && otherParty.specialty && (
                    <p className="break-words text-sm text-muted-foreground">
                      {labels.specialty(otherParty.specialty)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Appointment Time */}
            <div className="min-w-0 space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t("appointments.scheduledTime")}
              </h4>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex min-w-0 items-start gap-2">
                  <Calendar className="h-5 w-5 shrink-0 text-primary" />
                  <p className="min-w-0 break-words text-foreground">
                    {formatDateTime(appointment.startTime)}
                  </p>
                </div>
                <div className="flex min-w-0 items-start gap-2">
                  <Clock className="h-5 w-5 shrink-0 text-primary" />
                  <p className="min-w-0 break-words text-foreground">
                    {formatTime(appointment.startTime)} -{" "}
                    {formatTime(appointment.endTime)}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-wrap gap-2">
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t("appointments.visitType")}
                </h4>
                <Badge
                  variant="outline"
                  className={
                    appointment.appointmentMode === "OFFLINE"
                      ? "max-w-full whitespace-normal bg-slate-800/60 border-slate-600/40 text-slate-200"
                      : "max-w-full whitespace-normal bg-primary/5 border-primary/20 text-muted-foreground"
                  }
                >
                  {labels.appointmentMode(appointment.appointmentMode)}
                </Badge>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t("appointments.statusLabel")}
                </h4>
                <Badge
                  variant="outline"
                  className={
                    appointment.status === "COMPLETED"
                      ? "max-w-full whitespace-normal bg-primary/10 border-primary/20 text-primary"
                      : appointment.status === "CANCELLED"
                        ? "max-w-full whitespace-normal bg-red-900/20 border-red-900/30 text-red-400"
                        : "max-w-full whitespace-normal bg-muted/40 border-border/60 text-foreground"
                  }
                >
                  {labels.appointmentStatus(appointment.status)}
                </Badge>
              </div>
            </div>

            {/* Patient Description */}
            {appointment.patientDescription && (
              <div className="min-w-0 space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {userRole === "DOCTOR"
                    ? t("appointments.patientDescription")
                    : t("appointments.yourDescription")}
                </h4>
                <div className="min-w-0 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/20 p-3">
                  <p className="break-words whitespace-pre-line text-foreground [overflow-wrap:anywhere]">
                    {appointment.patientDescription}
                  </p>
                </div>
              </div>
            )}

            {userRole === "DOCTOR" && (
              <AppointmentPatientMedicalProfile
                appointmentId={appointment.id}
                open={open}
                userRole={userRole}
              />
            )}

            <AppointmentPaymentPanel
              appointment={appointment}
              userRole={userRole}
            />

            <AppointmentEvidencePanel appointment={appointment} />

            <AppointmentCompletionActions
              appointment={appointment}
              userRole={userRole}
              onUpdated={handleCompletionUpdated}
            />

            {userRole === "DOCTOR" && appointment.status === "COMPLETED" ? (
              <VisitSummaryForm
                appointment={appointment}
                onSaved={handleSummarySaved}
              />
            ) : null}

            {userRole === "PATIENT" ? (
              <VisitSummaryPatientView
                appointment={appointment}
                summary={appointment.visitSummary}
              />
            ) : null}

            {userRole === "PATIENT" && (
              <div className="min-w-0 space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t("patient.medicalProfile")}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {t("appointments.keepHealthUpdated")}
                </p>
                <Button
                  variant="outline"
                  className="w-full border-primary/20"
                  asChild
                  onClick={() => setOpen(false)}
                >
                  <Link href="/patient/profile">{t("appointments.editMedicalProfile")}</Link>
                </Button>
              </div>
            )}

            {/* Rate doctor (patient, completed, paid, not yet rated) */}
            {canPatientRate && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t("appointments.yourFeedback")}
                </h4>
                <Button
                  type="button"
                  className="w-full bg-muted/50 border border-border/60 text-foreground hover:bg-muted/70"
                  onClick={() => {
                    setOpen(false);
                    setRateOpen(true);
                  }}
                >
                  <Star className="h-4 w-4 me-2 inline fill-primary text-primary" />
                  {t("appointments.rateThisVisit")}
                </Button>
              </div>
            )}

            {/* Join Video Call Button */}
            {(appointment.status === "SCHEDULED" ||
              appointment.status === "CONFIRMED") &&
              appointment.appointmentMode !== "OFFLINE" && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t("appointments.videoConsultation")}
                </h4>
                {appointment.paymentStatus !== "PAID" ? (
                  <p className="text-xs text-muted-foreground mb-2">
                    {t("appointments.payBeforeVideo")}
                  </p>
                ) : null}
                <Button
                  className="h-auto w-full max-w-full whitespace-normal  py-3 text-left hover:bg-primary/90"
                  disabled={
                    appointment.paymentStatus !== "PAID" ||
                    !isAppointmentActive() ||
                    action === "video" ||
                    tokenLoading
                  }
                  onClick={handleJoinVideoCall}
                >
                  {tokenLoading || action === "video" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                      <span className="break-words">{t("appointments.preparingVideoCall")}</span>
                    </>
                  ) : (
                    <>
                      <Video className="mr-2 h-4 w-4 shrink-0" />
                      <span className="break-words">
                        {appointment.paymentStatus !== "PAID"
                          ? t("appointments.payUnlockVideo")
                          : isAppointmentActive()
                            ? t("appointments.joinVideo")
                            : t("appointments.videoAvailableBefore")}
                      </span>
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Doctor Notes (Doctor can view/edit, Patient can only view) */}
            <div className="min-w-0 space-y-2">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t("appointments.doctorNotes")}
                </h4>
                {userRole === "DOCTOR" &&
                  action !== "notes" &&
                  appointment.status !== "CANCELLED" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAction("notes")}
                      className="h-7 text-primary hover:text-primary/80 hover:bg-primary/10"
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      {appointment.notes
                        ? t("appointments.editNotesShort")
                        : t("appointments.addNotesShort")}
                    </Button>
                  )}
              </div>

              {userRole === "DOCTOR" && action === "notes" ? (
                <div className="space-y-3">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("appointments.clinicalNotesPlaceholder")}
                    className="bg-background home-card-gradient border-0 ring-1 ring-primary/10 min-h-[100px]"
                  />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAction(null);
                        setNotes(appointment.notes || "");
                      }}
                      disabled={notesLoading}
                      className="w-full border-primary/20 sm:w-auto"
                    >
                      {t("common.cancel")}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveNotes}
                      disabled={notesLoading}
                      className="w-full  sm:w-auto"
                    >
                      {notesLoading ? (
                        <>
                          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          {t("doctorDash.saving")}
                        </>
                      ) : (
                        t("appointments.saveNotes")
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="min-w-0 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/20 p-3 min-h-[80px]">
                  {appointment.notes ? (
                    <p className="break-words whitespace-pre-line text-foreground [overflow-wrap:anywhere]">
                      {appointment.notes}
                    </p>
                  ) : (
                    <p className="text-muted-foreground italic">
                      {t("appointments.noNotesAdded")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="flex-col gap-3 sm:items-stretch">
            <div className="flex min-w-0 w-full flex-col gap-2 sm:flex-row sm:flex-wrap">
              {canReschedule && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    setRescheduleOpen(true);
                  }}
                  className="w-full shrink-0 border-primary/20 text-primary/80 hover:bg-primary/10 sm:w-auto"
                >
                  <CalendarClock className="mr-2 h-4 w-4 shrink-0" />
                  <span className="break-words">{t("appointments.reschedule")}</span>
                </Button>
              )}

              {(appointment.status === "SCHEDULED" ||
                appointment.status === "CONFIRMED") && (
                <Button
                  variant="outline"
                  onClick={handleCancelAppointment}
                  disabled={cancelLoading}
                  className="w-full shrink-0 border-red-900/30 text-red-400 hover:bg-red-900/10 sm:w-auto"
                >
                  {cancelLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 shrink-0 animate-spin" />
                      {t("appointments.cancelling")}
                    </>
                  ) : (
                    <>
                      <X className="mr-1 h-4 w-4 shrink-0" />
                      <span className="break-words">{t("appointments.cancelAppointment")}</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            <Button
              onClick={() => setOpen(false)}
              className="w-full shrink-0  sm:ms-auto sm:w-auto"
            >
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canReschedule && (
        <AppointmentRescheduleDialog
          appointment={appointment}
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          dir={dir}
          onRescheduled={
            onRescheduled ??
            (async (updated) => {
              if (updated?.id) {
                onAppointmentUpdated?.(updated);
              }
              if (refetchAppointments) {
                await refetchAppointments();
              }
              router.refresh();
            })
          }
        />
      )}

      <Dialog
        open={rateOpen}
        onOpenChange={(v) => {
          setRateOpen(v);
          if (!v) {
            setHoverStar(0);
            setRatingValue(0);
            setReviewText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md home-card-gradient border-0 ring-1 ring-primary/10" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-foreground">{t("appointments.rateVisit")}</DialogTitle>
            <DialogDescription>
              {t("appointments.howWasVisit", {
                name: appointment.doctor?.name ?? "",
              })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRatingSubmit} className="space-y-4">
            <div
              className="flex justify-center gap-1 py-2"
              onMouseLeave={() => setHoverStar(0)}
            >
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  className="p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                  onMouseEnter={() => setHoverStar(i)}
                  onClick={() => setRatingValue(i)}
                  aria-label={`${i} stars`}
                >
                  <Star
                    className={`h-9 w-9 transition-colors ${
                      i <= (hoverStar || ratingValue)
                        ? "fill-primary text-primary"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="review-text"
                className="text-sm text-muted-foreground"
              >
                {t("appointments.writeReview")}
              </label>
              <Textarea
                id="review-text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value.slice(0, 1000))}
                maxLength={1000}
                rows={4}
                placeholder={t("appointments.shareExperience")}
                className="bg-background home-card-gradient border-0 ring-1 ring-primary/10"
              />
              <p className="text-xs text-muted-foreground text-end">
                {reviewText.length}/1000
              </p>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRateOpen(false)}
                disabled={ratingLoading}
                className="w-full sm:w-auto"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={ratingLoading || ratingValue < 1}
                className="w-full  sm:w-auto"
              >
                {ratingLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("appointments.submitRating")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
    </div>
  );
}
