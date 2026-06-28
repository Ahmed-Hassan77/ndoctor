import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { searchDoctors, getDiscoveryFilterOptions } from "@/actions/doctors-listing";
import { getFavoriteDoctorIds } from "@/actions/favorites";
import { parseDoctorSearchParams, hasActiveDiscoveryFilters } from "@/lib/doctor-discovery-params";
import { DoctorCard } from "@/app/(main)/doctors/components/doctor-card";
import { DoctorsCarouselList } from "./components/doctors-carousel-list";
import { DoctorsMarketplaceFilters } from "./components/doctors-marketplace-filters";
import { DoctorsActiveFilters } from "./components/doctors-active-filters";
import { DoctorsPageIntro } from "@/components/doctors/doctors-page-intro";
import { DoctorsEmptyResults } from "@/components/doctors/doctors-empty-results";
import { getServerI18n } from "@/lib/server-i18n";
import { checkUser } from "@/lib/checkUser";
import { DB_UNAVAILABLE } from "@/lib/db-safe";

const DoctorsSpecialtyBrowse = dynamic(
  () =>
    import("@/components/doctors/doctors-specialty-browse").then(
      (mod) => mod.DoctorsSpecialtyBrowse
    ),
  { loading: () => null }
);
export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t("meta.doctorsTitle"),
    description: t("meta.doctorsSearchDescription"),
  };
}

async function DoctorsResults({ searchParams }) {
  const params = await searchParams;
  const parsed = parseDoctorSearchParams(params);
  const user = await checkUser();
  const showFavorite = user?.role === "PATIENT";
  const { t } = await getServerI18n();
  const [{ doctors, total, error }, filterOptions, favoriteIdsRes] =
    await Promise.all([
      searchDoctors(params),
      getDiscoveryFilterOptions(),
      showFavorite ? getFavoriteDoctorIds() : Promise.resolve(null),
    ]);

  const favoriteIds = new Set(
    favoriteIdsRes?.success ? favoriteIdsRes.doctorIds ?? [] : []
  );

  const filtersActive = hasActiveDiscoveryFilters(parsed);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(280px,320px)_1fr]">
      <aside className="min-w-0">
        <Suspense fallback={<FiltersSkeleton />}>
          <DoctorsMarketplaceFilters
            initialFilters={parsed}
            filterOptions={filterOptions}
          />
        </Suspense>
      </aside>

      <div className="min-w-0">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">
              {error
                ? error === DB_UNAVAILABLE
                  ? t("doctors.databaseError")
                  : t("doctors.resultsError")
                : t("doctors.results", { count: total })}
            </p>
          </div>
        </div>

        {filtersActive && !error ? (
          <DoctorsActiveFilters filters={parsed} filterOptions={filterOptions} />
        ) : null}

        {error ? (
          <DoctorsEmptyResults
            titleKey="doctors.errorTitle"
            descriptionKey={
              error === DB_UNAVAILABLE
                ? "doctors.databaseError"
                : "doctors.resultsError"
            }
            showReset
          />
        ) : doctors.length === 0 ? (
          <DoctorsEmptyResults
            titleKey="doctors.noResultsTitle"
            descriptionKey="doctors.noResultsDesc"
            showReset={filtersActive}
          />
        ) : (
          <>
            <div className="hidden lg:block">
              <DoctorsCarouselList
                doctors={doctors}
                showFavorite={showFavorite}
                favoriteDoctorIds={[...favoriteIds]}
              />
            </div>
            <div className="flex flex-col gap-4 lg:hidden">
              {doctors.map((doctor) => (
                <DoctorCard
                  key={doctor.id}
                  doctor={doctor}
                  variant="marketplace"
                  showFavorite={showFavorite}
                  initialFavorited={
                    showFavorite ? favoriteIds.has(doctor.id) : undefined
                  }
                />
              ))}
            </div>
          </>
        )}

        <DoctorsSpecialtyBrowse />
      </div>
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <Card className="hidden h-96 animate-pulse rounded-2xl border-0 bg-muted/40 ring-1 ring-border/60 lg:block">
      <CardContent className="h-96 animate-pulse rounded-lg bg-muted/20" />
    </Card>
  );
}

export default async function DoctorsPage({ searchParams }) {
  return (
    <>
      <DoctorsPageIntro />

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
            <FiltersSkeleton />
            <div className="flex gap-4 overflow-hidden px-10">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  className="h-96 min-w-[85%] shrink-0 animate-pulse rounded-3xl border-0 bg-muted/40 ring-1 ring-border/50 md:min-w-[48%] xl:min-w-[32%]"
                />
              ))}
            </div>
          </div>
        }
      >
        <DoctorsResults searchParams={searchParams} />
      </Suspense>
    </>
  );
}
