"use client";

import Link from "next/link";
import { useLocale } from "@/components/locale-provider";
import { DoctorAvatar } from "@/components/doctor-avatar";
import {
  Star,
  Calendar,
  Video,
  MapPin,
  Clock,
  BadgeCheck,
  Stethoscope,
} from "lucide-react";
import { getDoctorPricingSummary } from "@/lib/doctor-display";
import { getLocalizedDoctor } from "@/lib/doctor-localized";
import { resolveConsultationDurationMinutes } from "@/lib/pricing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { doctorProfilePath } from "@/lib/doctors/profile-route";
import { FavoriteDoctorButton } from "@/components/favorites/favorite-doctor-button";

function profileHref(doctor) {
  return doctorProfilePath(doctor);
}

/**
 * @param {object} props
 * @param {import("@prisma/client").User & { supportsOnline?: boolean; supportsClinic?: boolean; availableToday?: boolean }} props.doctor
 * @param {boolean} [props.showFavorite]
 * @param {boolean} [props.initialFavorited]
 */
export function DoctorCard({
  doctor,
  variant = "marketplace",
  showFavorite = false,
  initialFavorited,
}) {
  const { t, locale, labels } = useLocale();
  const localized = getLocalizedDoctor(doctor, locale, labels.specialty);
  const pricing = getDoctorPricingSummary(doctor, locale);
  const duration = resolveConsultationDurationMinutes(doctor);
  const href = profileHref(doctor);
  const displayName = localized.displayName;

  if (variant === "compact") {
    return (
      <Card className="border-border/80 transition-all hover:border-primary/35">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <DoctorAvatar
              imageUrl={doctor.imageUrl}
              name={localized.displayName}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <DoctorCardHeader
                doctor={doctor}
                localized={localized}
                pricing={pricing}
                compact
              />
              <Button asChild className="mt-3 w-full">
                <Link href={href}>
                  <Calendar className="me-2 h-4 w-4" />
                  {t("doctors.viewProfileBook")}
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "carousel") {
    return (
      <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md ring-1 ring-primary/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-xl">
        <CardContent className="flex h-full min-w-0 flex-1 flex-col p-0">
          <div className="relative shrink-0">
            <div className="relative aspect-[16/10] max-h-[220px] overflow-hidden bg-muted">
              {showFavorite ? (
                <div className="absolute start-2 top-2 z-10 rounded-full bg-background/90 p-0.5 shadow backdrop-blur-sm">
                  <FavoriteDoctorButton
                    doctorId={doctor.id}
                    initialFavorited={initialFavorited}
                  />
                </div>
              ) : null}
              <DoctorAvatar
                imageUrl={doctor.imageUrl}
                name={localized.displayName}
                size="cover"
                className="rounded-none"
              />
              {(doctor.totalReviews ?? 0) > 0 ? (
                <div className="absolute bottom-2 end-2 flex items-center gap-1 rounded-md border border-border/50 bg-background/95 px-2 py-1 text-xs font-bold shadow-sm backdrop-blur-sm">
                  <Star className="size-3 fill-primary text-primary" />
                  {Number(doctor.averageRating ?? 0).toFixed(1)}
                  <span className="font-normal text-muted-foreground">
                    ({doctor.totalReviews})
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4 text-start sm:p-5">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  <Stethoscope className="size-3 shrink-0" />
                  <span className="line-clamp-1">{localized.displaySpecialty}</span>
                </div>
                <h3 className="text-lg font-bold leading-snug text-foreground group-hover:text-primary">
                  {displayName}
                </h3>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 border-primary/35 bg-primary/8 text-primary text-[0.65rem] uppercase tracking-wide"
              >
                <BadgeCheck className="me-0.5 h-3 w-3" />
                {t("common.verified")}
              </Badge>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {doctor.experience ? (
                <span>{t("common.yearsExperience", { count: doctor.experience })}</span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3.5 shrink-0 text-primary" />
                {t("profile.duration", { minutes: duration })}
              </span>
              {doctor.availableToday ? (
                <span className="font-medium text-primary">
                  {t("doctors.availableToday")}
                </span>
              ) : null}
            </div>

            {localized.displayLocation ? (
              <p className="mb-3 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
                <span className="line-clamp-2 break-words">{localized.displayLocation}</span>
              </p>
            ) : null}

            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="flex min-w-0 flex-col rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-xs">
                <span className="mb-0.5 inline-flex items-center gap-1 text-muted-foreground">
                  <Video className="size-3.5 shrink-0 text-primary" />
                  {t("common.online")}
                </span>
                <span className="break-words font-semibold leading-tight text-foreground">
                  {pricing.onlineLabel}
                </span>
              </div>
              <div className="flex min-w-0 flex-col rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-xs">
                <span className="mb-0.5 inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0 text-primary" />
                  {t("common.clinic")}
                </span>
                <span className="break-words font-semibold leading-tight text-foreground">
                  {pricing.clinicLabel}
                </span>
              </div>
            </div>

            {localized.displayDescription ? (
              <p className="mb-4 line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">
                {localized.displayDescription}
              </p>
            ) : (
              <div className="mb-4 flex-1" />
            )}

            <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                asChild
                size="lg"
                className="h-auto min-h-10 whitespace-normal rounded-xl px-3 py-2.5 text-sm font-semibold leading-snug shadow-sm shadow-primary/15"
              >
                <Link href={`${href}#booking-section`}>
                  <Calendar className="me-2 h-4 w-4 shrink-0" />
                  {t("doctors.bookNow")}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-auto min-h-10 whitespace-normal rounded-xl border-primary/25 px-3 py-2.5 text-sm leading-snug"
              >
                <Link href={href}>{t("common.viewDetails")}</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-all duration-200 hover:border-primary/35 hover:shadow-md">
      <CardContent className="flex h-full min-w-0 flex-1 flex-col p-0 lg:flex-row">
        <div className="relative shrink-0 lg:w-44 xl:w-48">
          <div className="relative aspect-[5/4] overflow-hidden bg-muted lg:aspect-auto lg:h-full lg:min-h-[220px]">
            {showFavorite ? (
              <div className="absolute start-2 top-2 z-10 rounded-full bg-background/90 p-0.5 shadow backdrop-blur-sm">
                <FavoriteDoctorButton
                  doctorId={doctor.id}
                  initialFavorited={initialFavorited}
                />
              </div>
            ) : null}
            <DoctorAvatar
              imageUrl={doctor.imageUrl}
              name={localized.displayName}
              size="cover"
              className="rounded-none lg:rounded-s-2xl"
            />
            {(doctor.totalReviews ?? 0) > 0 ? (
              <div className="absolute bottom-2 end-2 flex items-center gap-1 rounded-md border border-border/50 bg-background/95 px-2 py-1 text-xs font-bold shadow-sm backdrop-blur-sm">
                <Star className="size-3 fill-primary text-primary" />
                {Number(doctor.averageRating ?? 0).toFixed(1)}
                <span className="font-normal text-muted-foreground">
                  ({doctor.totalReviews})
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col p-4 text-start lg:p-5">
          <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 inline-flex max-w-full items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <Stethoscope className="size-3 shrink-0" />
                <span className="truncate">{localized.displaySpecialty}</span>
              </div>
              <h3 className="text-lg font-bold leading-snug text-foreground group-hover:text-primary sm:text-xl">
                {displayName}
              </h3>
            </div>
            <Badge
              variant="outline"
              className="shrink-0 border-primary/35 bg-primary/8 text-primary text-[0.65rem] uppercase tracking-wide"
            >
              <BadgeCheck className="me-0.5 h-3 w-3" />
              {t("common.verified")}
            </Badge>
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {doctor.experience ? (
              <span>{t("common.yearsExperience", { count: doctor.experience })}</span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5 shrink-0 text-primary" />
              {t("profile.duration", { minutes: duration })}
            </span>
            {doctor.availableToday ? (
              <span className="font-medium text-primary">
                {t("doctors.availableToday")}
              </span>
            ) : null}
          </div>

          {localized.displayLocation ? (
            <p className="mb-3 flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
              <span className="line-clamp-2 break-words">{localized.displayLocation}</span>
            </p>
          ) : null}

          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="flex min-w-0 flex-col rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-xs">
              <span className="mb-0.5 inline-flex items-center gap-1 text-muted-foreground">
                <Video className="size-3.5 shrink-0 text-primary" />
                {t("common.online")}
              </span>
              <span className="truncate font-semibold text-foreground">
                {pricing.onlineLabel}
              </span>
            </div>
            <div className="flex min-w-0 flex-col rounded-lg border border-border/60 bg-muted/30 px-2.5 py-2 text-xs">
              <span className="mb-0.5 inline-flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-3.5 shrink-0 text-primary" />
                {t("common.clinic")}
              </span>
              <span className="truncate font-semibold text-foreground">
                {pricing.clinicLabel}
              </span>
            </div>
          </div>

          {localized.displayDescription ? (
            <p className="mb-4 line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">
              {localized.displayDescription}
            </p>
          ) : (
            <div className="mb-4" />
          )}

          <div className="mt-auto grid grid-cols-2 gap-2">
            <Button
              asChild
              size="lg"
              className="h-10 min-w-0 rounded-xl font-semibold shadow-sm shadow-primary/15"
            >
              <Link href={`${href}#booking-section`}>
                <Calendar className="me-2 h-4 w-4 shrink-0" />
                <span className="truncate">{t("doctors.bookNow")}</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-10 min-w-0 rounded-xl border-primary/25"
            >
              <Link href={href}>
                <span className="truncate">{t("common.viewDetails")}</span>
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DoctorRatingLine({ doctor }) {
  const { t } = useLocale();
  if ((doctor.totalReviews ?? 0) > 0) {
    return (
      <p className="mt-1 flex items-center gap-1 text-sm">
        <Star className="h-3.5 w-3.5 fill-primary text-primary" />
        {Number(doctor.averageRating ?? 0).toFixed(1)}
        <span className="text-muted-foreground">
          ({t("common.reviews", { count: doctor.totalReviews })})
        </span>
      </p>
    );
  }
  return (
    <p className="mt-1 text-sm text-muted-foreground">{t("common.noReviews")}</p>
  );
}

function DoctorCardHeader({ doctor, localized, pricing, compact }) {
  const { t } = useLocale();
  return (
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="break-words font-medium text-foreground">
          {localized.displayName}
        </h3>
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
          {t("common.verified")}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {localized.displaySpecialty} •{" "}
        {t("common.yearsExperience", { count: doctor.experience })}
      </p>
      {!compact && (
        <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
          <p>
            {t("common.online")}: {pricing.onlineLabel}
          </p>
          <p>
            {t("common.clinic")}: {pricing.clinicLabel}
          </p>
        </div>
      )}
      <DoctorRatingLine doctor={doctor} />
    </>
  );
}
