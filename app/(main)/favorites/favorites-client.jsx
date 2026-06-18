"use client";

import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { DoctorCard } from "@/app/(main)/doctors/components/doctor-card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { useLocale } from "@/components/locale-provider";

export function FavoritesPageClient({ favorites = [] }) {
  const { t } = useLocale();

  return (
    <div>
      <PageHeader
        icon={<Heart className="fill-rose-500 text-rose-500" />}
        title={t("favorites.title")}
        backLink="/appointments"
        backLabel={t("nav.appointments")}
      />
      <p className="-mt-4 mb-8 text-sm text-muted-foreground">{t("favorites.emptyHint")}</p>

      {favorites.length === 0 ? (
        <div className="home-card-gradient rounded-2xl py-16 text-center ring-1 ring-primary/10">
          <Heart className="mx-auto mb-4 size-12 text-muted-foreground/40" />
          <p className="text-lg font-medium text-foreground">{t("favorites.empty")}</p>
          <Button asChild className="mt-6">
            <Link href="/doctors">
              <Search className="me-2 size-4" />
              {t("nav.findDoctors")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {favorites.map(({ doctor }) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              variant="marketplace"
              showFavorite
            />
          ))}
        </div>
      )}
    </div>
  );
}
