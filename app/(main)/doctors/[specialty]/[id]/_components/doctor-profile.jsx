"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DoctorAvatar } from "@/components/doctor-avatar";
import { useRouter } from "next/navigation";
import {
  Star,
  Medal,
  FileText,
  Video,
  MapPin,
  Banknote,
  Phone,
  GraduationCap,
  Languages,
  BadgeCheck,
  Clock,
  ExternalLink,
  Stethoscope,
} from "lucide-react";
import {
  getDoctorPricingSummary,
  formatClinicLocationSummary,
  hasUsableClinicLocation,
  doctorSupportsMode,
} from "@/lib/doctor-display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { DoctorBookingPanel } from "./doctor-booking-panel";
import { FavoriteDoctorButton } from "@/components/favorites/favorite-doctor-button";
import { getLocalizedDoctor, getLocalizedProfessionalFields } from "@/lib/doctor-localized";
import { getLocalizedClinic, getClinicOptionLabel } from "@/lib/clinic-localized";
import { hasUsableClinicRecord } from "@/lib/clinics";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/components/locale-provider";

function ProfileSection({ title, icon: Icon, children, hidden }) {
  if (hidden) return null;
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center gap-2">
        {Icon ? <Icon className="h-5 w-5 shrink-0 text-primary" /> : null}
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      </div>
      <div className="text-muted-foreground">{children}</div>
    </section>
  );
}

function RatingStars({ value }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i <= rounded
              ? "fill-primary text-primary"
              : "text-muted-foreground/40"
          }`}
        />
      ))}
    </span>
  );
}

/**
 * @param {object} props
 * @param {import("@prisma/client").User & { workTimes?: unknown[] }} props.doctor
 * @param {Array<{ id: string; value: number; review?: string | null; patientName?: string }>} [props.reviewPreview]
 * @param {string} [props.dir]
 */
export function DoctorProfile({
  doctor,
  reviewPreview = [],
  dir: dirProp,
  showFavorite = false,
  initialFavorited = false,
}) {
  const router = useRouter();
  const { t, locale, labels, dir: localeDir } = useLocale();
  const dir = dirProp ?? localeDir;
  const [selectedClinicId, setSelectedClinicId] = useState(null);

  const activeClinics = useMemo(
    () =>
      (doctor.clinics ?? []).filter(
        (clinic) =>
          hasUsableClinicRecord(clinic, locale) ||
          hasUsableClinicRecord(clinic, locale === "ar" ? "en" : "ar")
      ),
    [doctor.clinics, locale]
  );

  useEffect(() => {
    if (activeClinics.length === 0) {
      setSelectedClinicId(null);
      return;
    }
    setSelectedClinicId((current) => {
      if (current && activeClinics.some((c) => c.id === current)) {
        return current;
      }
      return activeClinics[0].id;
    });
  }, [activeClinics]);

  const selectedClinic =
    activeClinics.find((c) => c.id === selectedClinicId) ?? activeClinics[0] ?? null;
  const localizedClinic = getLocalizedClinic(selectedClinic, locale);
  const professional = getLocalizedProfessionalFields(doctor, locale);

  const pricing = getDoctorPricingSummary(doctor, locale);
  const localized = getLocalizedDoctor(doctor, locale, labels.specialty);
  const clinicSummary = selectedClinic
    ? localizedClinic.displaySummary
    : formatClinicLocationSummary(doctor, locale);
  const clinicReady =
    Boolean(selectedClinic) ||
    hasUsableClinicLocation(doctor, locale);
  const workTimes = doctor.workTimes ?? [];
  const supportsOnline = doctorSupportsMode(doctor, workTimes, "ONLINE");
  const supportsClinic = doctorSupportsMode(doctor, workTimes, "OFFLINE");

  const ratingsHref = `/doctors/${encodeURIComponent(doctor.specialty ?? "")}/${doctor.id}/ratings`;
  const displayName = localized.displayName;

  const locationLine = selectedClinic
    ? localizedClinic.displayLocation
    : localized.displayLocation;

  return (
    <div dir={dir} className="min-w-0 w-full">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
        {/* Booking first on mobile */}
        <aside className="min-w-0 lg:sticky lg:top-24 lg:order-2">
          <DoctorBookingPanel
            doctor={doctor}
            onBookingComplete={() => router.push("/appointments")}
            dir={dir}
            selectedClinicId={selectedClinicId}
            onClinicChange={setSelectedClinicId}
          />
        </aside>

        <main className="min-w-0 space-y-8 lg:order-1">
          {/* Hero overview */}
          <header className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
            <DoctorAvatar
              imageUrl={doctor.imageUrl}
              name={displayName}
              size="profile"
              className="mx-auto border border-primary/25 bg-primary/10 sm:mx-0"
            />

            <div className="min-w-0 flex-1 text-center sm:text-start">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="break-words text-2xl font-bold text-foreground sm:text-3xl">
                  {displayName}
                </h1>
                {showFavorite ? (
                  <FavoriteDoctorButton
                    key={`${doctor.id}-${initialFavorited}`}
                    doctorId={doctor.id}
                    initialFavorited={initialFavorited}
                    showLabel
                  />
                ) : null}
                <Badge
                  variant="outline"
                  className="shrink-0 border-primary/40 bg-primary/10 text-primary"
                >
                  <BadgeCheck className="me-1 h-3.5 w-3.5" />
                  {t("common.verified")}
                </Badge>
              </div>

              <p className="mt-1 flex items-center justify-center gap-2 text-primary sm:justify-start">
                <Stethoscope className="h-4 w-4 shrink-0" />
                <span className="break-words font-medium">
                  {localized.displaySpecialty}
                </span>
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm sm:justify-start">
                {(doctor.totalReviews ?? 0) > 0 ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <RatingStars value={doctor.averageRating ?? 0} />
                    <span className="font-medium text-foreground">
                      {Number(doctor.averageRating ?? 0).toFixed(1)}
                    </span>
                    <span className="text-muted-foreground">
                      ({t("common.reviews", { count: doctor.totalReviews })})
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t("common.noReviews")}</span>
                )}
                {doctor.experience != null && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Medal className="h-4 w-4 text-primary" />
                    {t("common.yearsExperience", { count: doctor.experience })}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary" />
                  {t("profile.duration", { minutes: pricing.durationMinutes })}
                </span>
              </div>

              {locationLine ? (
                <p className="mt-2 flex items-center justify-center gap-1 text-sm text-muted-foreground sm:justify-start">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span className="break-words">{locationLine}</span>
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                {supportsOnline && (
                  <Badge
                    variant="outline"
                    className="whitespace-normal border-primary/35 text-primary dark:text-primary"
                  >
                    <Video className="me-1 h-3 w-3" />
                    {t("common.online")}
                  </Badge>
                )}
                {supportsClinic && clinicReady && (
                  <Badge variant="outline" className="whitespace-normal">
                    <MapPin className="me-1 h-3 w-3" />
                    {t("common.clinic")}
                  </Badge>
                )}
              </div>
            </div>
          </header>

          {/* Pricing */}
          <section className="min-w-0 rounded-xl border border-border/80 bg-muted/15 p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
              <Banknote className="h-5 w-5 text-primary" />
              {t("profile.pricing")}
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 rounded-lg border border-border/50 bg-background/50 p-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Video className="h-4 w-4 text-primary" />
                  {t("profile.onlineConsultation")}
                </p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {pricing.onlineLabel}
                </p>
              </div>
              <div className="min-w-0 rounded-lg border border-border/50 bg-background/50 p-4">
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 text-primary" />
                  {t("profile.clinicVisit")}
                </p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {pricing.clinicLabel}
                </p>
              </div>
            </div>
            {pricing.followUpLabel ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("profile.followUpVisit")}:{" "}
                <span className="font-medium text-foreground">
                  {pricing.followUpLabel}
                </span>
              </p>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {t("profile.duration", { minutes: pricing.durationMinutes })}
            </p>
          </section>

          <Separator className="bg-border/80" />

          <ProfileSection
            title={t("profile.about")}
            icon={FileText}
            hidden={!localized.displayDescription?.trim()}
          >
            <p className="break-words whitespace-pre-line leading-relaxed">
              {localized.displayDescription}
            </p>
          </ProfileSection>

          <ProfileSection
            title={t("profile.services")}
            hidden={!professional.servicesOffered?.trim()}
          >
            <p className="break-words whitespace-pre-line">
              {professional.servicesOffered}
            </p>
          </ProfileSection>

          <ProfileSection
            title={t("profile.education")}
            icon={GraduationCap}
            hidden={!professional.education?.trim() && !doctor.credentialUrl}
          >
            {professional.education ? (
              <p className="break-words whitespace-pre-line">{professional.education}</p>
            ) : null}
            {doctor.credentialUrl ? (
              <a
                href={doctor.credentialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex max-w-full break-all items-center gap-1 text-sm text-primary hover:underline"
              >
                View credentials
                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
              </a>
            ) : null}
          </ProfileSection>

          <ProfileSection
            title={t("profile.languages")}
            icon={Languages}
            hidden={!professional.languages?.trim()}
          >
            <p className="break-words">{professional.languages}</p>
          </ProfileSection>

          <ProfileSection title={t("profile.location")} icon={MapPin}>
            {activeClinics.length > 1 ? (
              <div className="mb-3 space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t("clinics.selectForBooking")}
                </p>
                <Select
                  value={selectedClinicId ?? ""}
                  onValueChange={setSelectedClinicId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("clinics.selectClinic")} />
                  </SelectTrigger>
                  <SelectContent>
                    {activeClinics.map((clinic) => (
                      <SelectItem key={clinic.id} value={clinic.id}>
                        {getClinicOptionLabel(clinic, locale)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {clinicSummary ? (
              <div className="min-w-0 space-y-2 text-sm">
                {(localizedClinic.displayArea ||
                  localizedClinic.displayGovernorate ||
                  localized.displayArea ||
                  localized.displayGovernorate) && (
                  <p className="font-medium text-foreground">
                    {[
                      selectedClinic
                        ? localizedClinic.displayArea
                        : localized.displayArea,
                      selectedClinic
                        ? localizedClinic.displayGovernorate
                        : localized.displayGovernorate,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {(selectedClinic
                  ? localizedClinic.displayAddress
                  : localized.displayAddress) ? (
                  <p className="break-words whitespace-pre-line">
                    {selectedClinic
                      ? localizedClinic.displayAddress
                      : localized.displayAddress}
                  </p>
                ) : null}
                {(selectedClinic
                  ? localizedClinic.displayBuildingInfo
                  : professional.buildingInfo) ? (
                  <p className="break-words text-muted-foreground">
                    {selectedClinic
                      ? localizedClinic.displayBuildingInfo
                      : professional.buildingInfo}
                  </p>
                ) : null}
                {!localized.displayAddress &&
                !localizedClinic.displayAddress &&
                clinicSummary ? (
                  <p className="break-words">{clinicSummary}</p>
                ) : null}
                {(selectedClinic?.phone ?? doctor.clinicPhone) ? (
                  <p>
                    <a
                      href={`tel:${selectedClinic?.phone ?? doctor.clinicPhone}`}
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      <span className="break-all">
                        {selectedClinic?.phone ?? doctor.clinicPhone}
                      </span>
                    </a>
                  </p>
                ) : null}
                {(selectedClinic?.googleMapsUrl ?? doctor.clinicGoogleMapsUrl) ? (
                  <a
                    href={
                      selectedClinic?.googleMapsUrl ?? doctor.clinicGoogleMapsUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {t("profile.openMaps")}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : null}
              </div>
            ) : (
              <p className="text-sm">{t("profile.clinicNotReady")}</p>
            )}
          </ProfileSection>

          <ProfileSection
            title={t("profile.cancellationPolicy")}
            hidden={!professional.cancellationPolicy?.trim()}
          >
            <p className="break-words whitespace-pre-line">
              {professional.cancellationPolicy}
            </p>
          </ProfileSection>

          <Separator className="bg-border/80" />

          <section className="min-w-0">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Star className="h-5 w-5 text-primary" />
                  {t("profile.reviews")}
                </h2>
                {(doctor.totalReviews ?? 0) > 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {Number(doctor.averageRating ?? 0).toFixed(1)}
                    </span>{" "}
                    {t("profile.averageFrom", { count: doctor.totalReviews })}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("profile.noReviewsSection")}
                  </p>
                )}
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href={ratingsHref}>{t("profile.seeAllReviews")}</Link>
              </Button>
            </div>

            {reviewPreview.length > 0 ? (
              <ul className="space-y-3">
                {reviewPreview.map((r) => (
                  <li
                    key={r.id}
                    className="min-w-0 rounded-lg border border-border/50 bg-muted/10 p-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <RatingStars value={r.value} />
                      <span className="text-xs text-muted-foreground">
                        {r.patientName ?? "Patient"}
                      </span>
                    </div>
                    {r.review ? (
                      <p className="break-words text-sm leading-relaxed text-foreground/90">
                        {r.review}
                      </p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        No written review
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (doctor.totalReviews ?? 0) === 0 ? (
              <p className="rounded-lg border border-dashed border-border/80 py-8 text-center text-sm text-muted-foreground">
                {t("common.noReviews")}
              </p>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
