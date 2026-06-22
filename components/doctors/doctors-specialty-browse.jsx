"use client";

import Link from "next/link";
import { memo } from "react";
import { Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SPECIALTIES } from "@/lib/specialities";
import { SpecialtyIconBadge } from "@/components/specialties/specialty-icon";
import { useLocale } from "@/components/locale-provider";

const SpecialtyBrowseCard = memo(function SpecialtyBrowseCard({ specialty, label }) {
  return (
    <Link
      href={`/doctors/${encodeURIComponent(specialty.name)}`}
      className="group"
    >
      <Card className="h-full border-border/80 transition-all hover:border-primary/40 hover:shadow-sm">
        <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
          <SpecialtyIconBadge
            name={specialty.name}
            iconSize="md"
            className="transition-transform group-hover:scale-105"
          />
          <span className="text-sm font-medium leading-snug text-foreground">
            {label}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
});

export function DoctorsSpecialtyBrowse() {
  const { t, labels } = useLocale();

  return (
    <section className="mt-12 border-t border-border pt-10">
      <div className="mb-6 flex items-center gap-2">
        <Stethoscope className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          {t("home.browseBySpecialty")}
        </h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        {t("home.browseHint")}{" "}
        <Link href="/doctors?mode=online" className="text-primary hover:underline">
          {t("common.online")}
        </Link>{" "}
        /{" "}
        <Link href="/doctors?mode=clinic" className="text-primary hover:underline">
          {t("common.clinic")}
        </Link>
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {SPECIALTIES.map((specialty) => (
          <SpecialtyBrowseCard
            key={specialty.name}
            specialty={specialty}
            label={labels.specialty(specialty.name)}
          />
        ))}
      </div>
    </section>
  );
}
