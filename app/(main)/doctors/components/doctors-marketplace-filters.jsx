"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SPECIALTIES } from "@/lib/specialities";
import { SpecialtyIcon } from "@/components/specialties/specialty-icon";
import {
  buildDoctorSearchQueryString,
  hasActiveDiscoveryFilters,
  parseDoctorSearchParams,
} from "@/lib/doctor-discovery-params";
import { localizedLocationOptionLabel } from "@/lib/doctor-localized";
import { useLocale } from "@/components/locale-provider";

const EMPTY_SELECT = "__any__";

function FilterField({ id, label, children, className }) {
  return (
    <div className={className ?? "space-y-2"}>
      <Label
        htmlFor={id}
        className="flex min-h-10 items-end text-sm leading-tight"
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function FilterSection({ title, children }) {
  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-muted/15 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {ReturnType<typeof parseDoctorSearchParams>} props.initialFilters
 * @param {{ governorates: Array<{ value: string; en: string; ar: string }>; areas: Array<{ value: string; en: string; ar: string }>; specialties: string[] }} props.filterOptions
 */
export function DoctorsMarketplaceFilters({ initialFilters, filterOptions }) {
  const { t, labels, locale } = useLocale();
  const router = useRouter();

  const modeOptions = [
    { value: "all", label: t("doctors.modeAll") },
    { value: "online", label: t("doctors.onlineVideo") },
    { value: "clinic", label: t("doctors.inPerson") },
  ];
  const sortOptions = [
    { value: "rating", label: t("doctors.sortRating") },
    { value: "online_price", label: t("doctors.sortOnlinePrice") },
    { value: "clinic_price", label: t("doctors.sortClinicPrice") },
    { value: "experience", label: t("doctors.sortExperience") },
    { value: "name", label: t("doctors.sortName") },
  ];
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  const [form, setForm] = useState({
    q: initialFilters.q,
    specialty: initialFilters.specialty || EMPTY_SELECT,
    governorate: initialFilters.governorate || EMPTY_SELECT,
    area: initialFilters.area || EMPTY_SELECT,
    mode: initialFilters.mode,
    minRating: initialFilters.minRating?.toString() ?? "",
    minExperience: initialFilters.minExperience?.toString() ?? "",
    minPrice: initialFilters.minPrice?.toString() ?? "",
    maxPrice: initialFilters.maxPrice?.toString() ?? "",
    availableToday: initialFilters.availableToday,
    sort: initialFilters.sort,
  });

  const specialtyOptions = useMemo(() => {
    const fromDb = filterOptions.specialties ?? [];
    const names = new Set([...SPECIALTIES.map((s) => s.name), ...fromDb]);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [filterOptions.specialties]);

  const applyFilters = useCallback(
    (nextForm) => {
      const filters = {
        q: nextForm.q.trim(),
        specialty: nextForm.specialty === EMPTY_SELECT ? "" : nextForm.specialty,
        governorate:
          nextForm.governorate === EMPTY_SELECT ? "" : nextForm.governorate,
        area: nextForm.area === EMPTY_SELECT ? "" : nextForm.area,
        mode: nextForm.mode,
        minRating: nextForm.minRating ? parseFloat(nextForm.minRating) : null,
        minExperience: nextForm.minExperience
          ? parseInt(nextForm.minExperience, 10)
          : null,
        minPrice: nextForm.minPrice ? parseInt(nextForm.minPrice, 10) : null,
        maxPrice: nextForm.maxPrice ? parseInt(nextForm.maxPrice, 10) : null,
        availableToday: nextForm.availableToday,
        sort: nextForm.sort,
      };
      const qs = buildDoctorSearchQueryString(filters);
      startTransition(() => {
        router.push(qs ? `/doctors?${qs}` : "/doctors");
        setMobileOpen(false);
      });
    },
    [router]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    applyFilters(form);
  };

  const handleReset = () => {
    const cleared = {
      q: "",
      specialty: EMPTY_SELECT,
      governorate: EMPTY_SELECT,
      area: EMPTY_SELECT,
      mode: "all",
      minRating: "",
      minExperience: "",
      minPrice: "",
      maxPrice: "",
      availableToday: false,
      sort: "rating",
    };
    setForm(cleared);
    startTransition(() => {
      router.push("/doctors");
      setMobileOpen(false);
    });
  };

  const filtersActive = hasActiveDiscoveryFilters(
    parseDoctorSearchParams(Object.fromEntries(searchParams.entries()))
  );

  const filterFields = (
    <div className="space-y-4">
      <FilterSection title={t("doctors.filterSearch")}>
        <div className="space-y-2">
          <Label htmlFor="q">{t("common.search")}</Label>
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="q"
              name="q"
              placeholder={t("doctors.searchPlaceholder")}
              value={form.q}
              onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
              className="ps-9"
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("doctors.searchHint")}</p>
        </div>
      </FilterSection>

      <FilterSection title={t("doctors.filterSpecialtyLocation")}>
        <FilterField label={t("home.specialty")}>
          <Select
            value={form.specialty}
            onValueChange={(v) => setForm((f) => ({ ...f, specialty: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("doctors.anySpecialty")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY_SELECT}>{t("doctors.anySpecialty")}</SelectItem>
              {specialtyOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  <span className="flex items-center gap-2">
                    <SpecialtyIcon name={name} size="sm" />
                    <span>{labels.specialty(name)}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <div className="grid grid-cols-1 gap-3">
          <FilterField label={t("home.governorate")}>
            <Select
              value={form.governorate}
              onValueChange={(v) => setForm((f) => ({ ...f, governorate: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("doctors.anyGovernorate")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT}>
                  {t("doctors.anyGovernorate")}
                </SelectItem>
                {(filterOptions.governorates ?? []).map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {localizedLocationOptionLabel(g, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label={t("home.area")}>
            <Select
              value={form.area}
              onValueChange={(v) => setForm((f) => ({ ...f, area: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("doctors.anyArea")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT}>{t("doctors.anyArea")}</SelectItem>
                {(filterOptions.areas ?? []).map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {localizedLocationOptionLabel(a, locale)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterField>
        </div>
      </FilterSection>

      <FilterSection title={t("doctors.filterVisitPrice")}>
        <FilterField label={t("home.visitMode")}>
          <Select
            value={form.mode}
            onValueChange={(v) => setForm((f) => ({ ...f, mode: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modeOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <div className="grid grid-cols-1 gap-3">
          <FilterField id="minPrice" label={t("doctors.minPrice")}>
            <Input
              id="minPrice"
              type="number"
              min={1}
              placeholder={t("doctors.minPriceShort")}
              value={form.minPrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, minPrice: e.target.value }))
              }
            />
          </FilterField>
          <FilterField id="maxPrice" label={t("doctors.maxPrice")}>
            <Input
              id="maxPrice"
              type="number"
              min={1}
              placeholder={t("doctors.maxPriceShort")}
              value={form.maxPrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxPrice: e.target.value }))
              }
            />
          </FilterField>
        </div>
      </FilterSection>

      <FilterSection title={t("doctors.filterQuality")}>
        <div className="grid grid-cols-1 gap-3">
          <FilterField id="minRating" label={t("doctors.minRating")}>
            <Input
              id="minRating"
              type="number"
              min={1}
              max={5}
              step={0.5}
              placeholder={t("doctors.ratingPlaceholder")}
              value={form.minRating}
              onChange={(e) =>
                setForm((f) => ({ ...f, minRating: e.target.value }))
              }
            />
          </FilterField>
          <FilterField id="minExperience" label={t("doctors.experienceShort")}>
            <Input
              id="minExperience"
              type="number"
              min={1}
              placeholder={t("doctors.experiencePlaceholder")}
              value={form.minExperience}
              onChange={(e) =>
                setForm((f) => ({ ...f, minExperience: e.target.value }))
              }
            />
          </FilterField>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.availableToday}
            onChange={(e) =>
              setForm((f) => ({ ...f, availableToday: e.target.checked }))
            }
            className="rounded border-primary/25"
          />
          <span>{t("doctors.availableTodayOnly")}</span>
        </label>
      </FilterSection>

      <div className="space-y-2">
        <Label className="flex min-h-10 items-end text-sm leading-tight">
          <span className="flex items-center gap-1.5">
            <ArrowUpDown className="size-3.5 shrink-0 text-primary" />
            {t("doctors.sortBy")}
          </span>
        </Label>
        <Select
          value={form.sort}
          onValueChange={(v) => setForm((f) => ({ ...f, sort: v }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 pt-2 sm:flex-row lg:flex-col">
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? t("common.loading") : t("doctors.applyFilters")}
        </Button>
        {filtersActive && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleReset}
            disabled={pending}
          >
            <RotateCcw className="me-2 h-4 w-4" />
            {t("common.reset")}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div className="mb-4 flex gap-2 lg:hidden">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => setMobileOpen((o) => !o)}
        >
          <SlidersHorizontal className="me-2 h-4 w-4" />
          {mobileOpen ? t("home.hideFilters") : t("home.filtersAndSort")}
        </Button>
        {filtersActive && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleReset}
            aria-label={t("doctors.resetFilters")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {mobileOpen && (
        <Card className="home-card-gradient mb-6 rounded-2xl border-0 shadow-md ring-1 ring-primary/10 lg:hidden">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit}>{filterFields}</form>
          </CardContent>
        </Card>
      )}

      <Card className="sticky top-[5.25rem] z-30 hidden rounded-2xl border-0 bg-card shadow-lg ring-1 ring-border/70 lg:block">
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground">
            <Filter className="size-5 text-primary" />
            {t("doctors.filters")}
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1 text-muted-foreground hover:text-primary"
            onClick={handleReset}
            disabled={pending}
          >
            <RotateCcw className="size-4" />
            <span className="hidden xl:inline">{t("common.reset")}</span>
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>{filterFields}</form>
        </CardContent>
      </Card>
    </>
  );
}
