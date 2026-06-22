"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildDoctorSearchQueryString,
  parseDoctorSearchParams,
} from "@/lib/doctor-discovery-params";
import { localizedLocationOptionLabel } from "@/lib/doctor-localized";
import { useLocale } from "@/components/locale-provider";

/**
 * @param {object} props
 * @param {ReturnType<typeof parseDoctorSearchParams>} props.filters
 * @param {{ governorates?: Array<{ value: string; en: string; ar: string }>; areas?: Array<{ value: string; en: string; ar: string }> }} [props.filterOptions]
 */
export function DoctorsActiveFilters({ filters, filterOptions = {} }) {
  const { t, locale, labels } = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const chips = [];

  if (filters.q) {
    chips.push({ key: "q", label: `"${filters.q}"` });
  }
  if (filters.specialty) {
    chips.push({
      key: "specialty",
      label: labels.specialty(filters.specialty) || filters.specialty,
    });
  }
  if (filters.governorate) {
    const row = filterOptions.governorates?.find(
      (g) => g.value.toLowerCase() === filters.governorate.toLowerCase()
    );
    chips.push({
      key: "governorate",
      label: row
        ? localizedLocationOptionLabel(row, locale)
        : filters.governorate,
    });
  }
  if (filters.area) {
    const row = filterOptions.areas?.find(
      (a) => a.value.toLowerCase() === filters.area.toLowerCase()
    );
    chips.push({
      key: "area",
      label: row ? localizedLocationOptionLabel(row, locale) : filters.area,
    });
  }
  if (filters.mode !== "all") {
    chips.push({
      key: "mode",
      label:
        filters.mode === "online"
          ? t("doctors.onlineVideo")
          : t("doctors.inPerson"),
    });
  }
  if (filters.minRating != null) {
    chips.push({ key: "minRating", label: `≥ ${filters.minRating} ★` });
  }
  if (filters.minExperience != null) {
    chips.push({
      key: "minExperience",
      label: t("doctors.experienceChip", { count: filters.minExperience }),
    });
  }
  if (filters.minPrice != null || filters.maxPrice != null) {
    chips.push({
      key: "price",
      label: t("doctors.priceChip", {
        min: filters.minPrice ?? "…",
        max: filters.maxPrice ?? "…",
      }),
    });
  }
  if (filters.availableToday) {
    chips.push({ key: "availableToday", label: t("doctors.availableToday") });
  }

  if (chips.length === 0) return null;

  const removeChip = (chipKey) => {
    const current = parseDoctorSearchParams(
      Object.fromEntries(searchParams.entries())
    );
    const next = { ...current };
    if (chipKey === "q") next.q = "";
    if (chipKey === "specialty") next.specialty = "";
    if (chipKey === "governorate") next.governorate = "";
    if (chipKey === "area") next.area = "";
    if (chipKey === "mode") next.mode = "all";
    if (chipKey === "minRating") next.minRating = null;
    if (chipKey === "minExperience") next.minExperience = null;
    if (chipKey === "price") {
      next.minPrice = null;
      next.maxPrice = null;
    }
    if (chipKey === "availableToday") next.availableToday = false;
    const qs = buildDoctorSearchQueryString(next);
    router.push(qs ? `/doctors?${qs}` : "/doctors");
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground">
        {t("doctors.activeFilters")}:
      </span>
      {chips.map((chip) => (
        <Badge
          key={chip.key}
          variant="secondary"
          className="gap-1 rounded-full py-1 pe-1 ps-2.5 text-xs font-normal"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => removeChip(chip.key)}
            className="rounded-full p-0.5 hover:bg-muted"
            aria-label={t("doctors.removeFilter")}
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs text-muted-foreground"
        onClick={() => router.push("/doctors")}
      >
        {t("common.reset")}
      </Button>
    </div>
  );
}
