"use client";

import Link from "next/link";
import { Star, MapPin, Video, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

/**
 * @param {{ recommendations?: { emergency?: boolean; doctors?: Array<object> }; urgency?: string }} props
 */
export function ChatRecommendations({ recommendations, urgency }) {
  const { t } = useLocale();

  if (urgency === "emergency" || recommendations?.emergency) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
        <p className="flex items-center gap-2 font-medium text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t("chatbot.emergencyTitle")}
        </p>
        <p className="mt-1 text-muted-foreground">{t("chatbot.emergencyBody")}</p>
      </div>
    );
  }

  const doctors = recommendations?.doctors ?? [];
  if (!doctors.length) return null;

  return (
    <div className="space-y-2 rounded-lg border border-primary/15 bg-muted/30 p-3">
      <p className="text-xs font-medium text-foreground">
        {t("chatbot.recommendedDoctors")}
      </p>
      <ul className="space-y-2">
        {doctors.map((doctor) => (
          <li
            key={doctor.id}
            className="flex flex-col gap-2 rounded-md border border-border/50 bg-background p-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{doctor.name}</p>
              <p className="text-xs text-muted-foreground">{doctor.specialty}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {doctor.averageRating ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Star className="h-3 w-3 text-amber-500" />
                    {doctor.averageRating.toFixed(1)}
                  </span>
                ) : null}
                {doctor.governorate ? (
                  <span className="inline-flex items-center gap-0.5">
                    <MapPin className="h-3 w-3" />
                    {doctor.area ? `${doctor.area}, ` : ""}
                    {doctor.governorate}
                  </span>
                ) : null}
                {doctor.supportsOnline ? (
                  <span className="inline-flex items-center gap-0.5">
                    <Video className="h-3 w-3" />
                    {t("chatbot.onlineAvailable")}
                  </span>
                ) : null}
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link href={doctor.bookingPath}>{t("chatbot.bookDoctor")}</Link>
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
