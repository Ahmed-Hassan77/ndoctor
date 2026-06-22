"use server";

import { unstable_cache } from "next/cache";
import { db } from "@/lib/prisma";
import {
  DB_UNAVAILABLE,
  databaseErrorCode,
  logDatabaseIssue,
} from "@/lib/db-safe";
import { parseDoctorSearchParams } from "@/lib/doctor-discovery-params";
import {
  doctorSupportsMode,
  isAvailableToday,
} from "@/lib/doctor-availability";
import {
  resolveClinicPriceEgp,
  resolveOnlinePriceEgp,
} from "@/lib/pricing";

const DOCTOR_LIST_SELECT = {
  id: true,
  name: true,
  nameEn: true,
  nameAr: true,
  imageUrl: true,
  specialty: true,
  specialtyAr: true,
  experience: true,
  description: true,
  descriptionEn: true,
  descriptionAr: true,
  averageRating: true,
  totalReviews: true,
  clinicGovernorate: true,
  clinicGovernorateEn: true,
  clinicGovernorateAr: true,
  clinicArea: true,
  clinicAreaEn: true,
  clinicAreaAr: true,
  clinicAddress: true,
  clinicAddressEn: true,
  clinicAddressAr: true,
  clinicGoogleMapsUrl: true,
  practiceAddress: true,
  onlineConsultationPriceEgp: true,
  clinicConsultationPriceEgp: true,
  consultationDurationMinutes: true,
  workTimeZone: true,
  workTimes: {
    where: { isActive: true },
    select: {
      dayOfWeek: true,
      startTime: true,
      endTime: true,
      mode: true,
      isActive: true,
    },
  },
};

/**
 * @param {string | undefined | null} q
 */
function textSearchOr(q) {
  if (!q?.trim()) return null;
  const term = q.trim();
  return [
    { name: { contains: term, mode: "insensitive" } },
    { nameEn: { contains: term, mode: "insensitive" } },
    { nameAr: { contains: term, mode: "insensitive" } },
    { specialty: { contains: term, mode: "insensitive" } },
    { specialtyAr: { contains: term, mode: "insensitive" } },
    { description: { contains: term, mode: "insensitive" } },
    { descriptionEn: { contains: term, mode: "insensitive" } },
    { descriptionAr: { contains: term, mode: "insensitive" } },
    { clinicGovernorate: { contains: term, mode: "insensitive" } },
    { clinicGovernorateEn: { contains: term, mode: "insensitive" } },
    { clinicGovernorateAr: { contains: term, mode: "insensitive" } },
    { clinicArea: { contains: term, mode: "insensitive" } },
    { clinicAreaEn: { contains: term, mode: "insensitive" } },
    { clinicAreaAr: { contains: term, mode: "insensitive" } },
    { clinicAddress: { contains: term, mode: "insensitive" } },
    { clinicAddressEn: { contains: term, mode: "insensitive" } },
    { clinicAddressAr: { contains: term, mode: "insensitive" } },
  ];
}

/**
 * @param {import("@prisma/client").Prisma.UserWhereInput} where
 */
function applyTextAndLocationFilters(where, filters) {
  const searchOr = textSearchOr(filters.q);
  if (searchOr) {
    where.OR = searchOr;
  }

  if (filters.specialty) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { specialty: { equals: filters.specialty, mode: "insensitive" } },
          { specialtyAr: { equals: filters.specialty, mode: "insensitive" } },
        ],
      },
    ];
  }

  if (filters.governorate) {
    const gov = filters.governorate;
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { clinicGovernorateEn: { equals: gov, mode: "insensitive" } },
          { clinicGovernorate: { equals: gov, mode: "insensitive" } },
          { clinicGovernorateAr: { equals: gov, mode: "insensitive" } },
        ],
      },
    ];
  }

  if (filters.area) {
    const area = filters.area;
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { clinicAreaEn: { equals: area, mode: "insensitive" } },
          { clinicArea: { equals: area, mode: "insensitive" } },
          { clinicAreaAr: { equals: area, mode: "insensitive" } },
        ],
      },
    ];
  }

  if (filters.minRating != null) {
    where.averageRating = { gte: filters.minRating };
  }

  if (filters.minExperience != null) {
    where.experience = { gte: filters.minExperience };
  }
}

/**
 * @param {ReturnType<typeof parseDoctorSearchParams>} filters
 */
function matchesPriceRange(doctor, filters) {
  const { minPrice, maxPrice, mode } = filters;
  if (minPrice == null && maxPrice == null) return true;

  const online = resolveOnlinePriceEgp(doctor);
  const clinic = resolveClinicPriceEgp(doctor);

  const inRange = (price) => {
    if (minPrice != null && price < minPrice) return false;
    if (maxPrice != null && price > maxPrice) return false;
    return true;
  };

  if (mode === "online") return inRange(online);
  if (mode === "clinic") return inRange(clinic);
  return inRange(online) || inRange(clinic);
}

/**
 * @param {Array<Record<string, unknown>>} doctors
 * @param {ReturnType<typeof parseDoctorSearchParams>} filters
 */
function sortDoctors(doctors, filters) {
  const list = [...doctors];
  switch (filters.sort) {
    case "online_price":
      list.sort(
        (a, b) =>
          resolveOnlinePriceEgp(a) - resolveOnlinePriceEgp(b) ||
          (b.averageRating ?? 0) - (a.averageRating ?? 0)
      );
      break;
    case "clinic_price":
      list.sort(
        (a, b) =>
          resolveClinicPriceEgp(a) - resolveClinicPriceEgp(b) ||
          (b.averageRating ?? 0) - (a.averageRating ?? 0)
      );
      break;
    case "experience":
      list.sort(
        (a, b) =>
          (b.experience ?? 0) - (a.experience ?? 0) ||
          (b.averageRating ?? 0) - (a.averageRating ?? 0)
      );
      break;
    case "name":
      list.sort((a, b) =>
        (a.nameEn ?? a.name ?? "").localeCompare(
          b.nameEn ?? b.name ?? "",
          undefined,
          { sensitivity: "base" }
        )
      );
      break;
    case "rating":
    default:
      list.sort(
        (a, b) =>
          (b.averageRating ?? 0) - (a.averageRating ?? 0) ||
          (b.totalReviews ?? 0) - (a.totalReviews ?? 0)
      );
      break;
  }
  return list;
}

function uniqueLocationOptions(rows, enKey, arKey, legacyKey) {
  /** @type {Map<string, { value: string; en: string; ar: string }>} */
  const map = new Map();
  for (const row of rows) {
    const en = String(row[enKey] ?? row[legacyKey] ?? "").trim();
    if (!en) continue;
    const key = en.toLowerCase();
    const ar = String(row[arKey] ?? "").trim();
    if (!map.has(key)) {
      map.set(key, { value: en, en, ar: ar || en });
    } else if (ar && !map.get(key).ar) {
      map.set(key, { ...map.get(key), ar });
    }
  }
  return [...map.values()].sort((a, b) => a.en.localeCompare(b.en));
}

/**
 * @param {Record<string, string | string[] | undefined> | undefined} searchParams
 */
export async function searchDoctors(searchParams) {
  const filters = parseDoctorSearchParams(searchParams);

  try {
    /** @type {import('@prisma/client').Prisma.UserWhereInput} */
    const where = {
      role: "DOCTOR",
      verificationStatus: "VERIFIED",
    };

    applyTextAndLocationFilters(where, filters);

    let doctors = await db.user.findMany({
      where,
      select: DOCTOR_LIST_SELECT,
      orderBy: [{ averageRating: "desc" }, { name: "asc" }],
    });

    doctors = doctors
      .map((doctor) => {
        const supportsOnline = doctorSupportsMode(
          doctor,
          doctor.workTimes,
          "ONLINE"
        );
        const supportsClinic = doctorSupportsMode(
          doctor,
          doctor.workTimes,
          "OFFLINE"
        );
        const availableTodayFlag = isAvailableToday(
          doctor,
          doctor.workTimes,
          filters.mode === "online"
            ? "ONLINE"
            : filters.mode === "clinic"
              ? "OFFLINE"
              : "any"
        );

        return {
          ...doctor,
          supportsOnline,
          supportsClinic,
          availableToday: availableTodayFlag,
        };
      })
      .filter((doctor) => {
        if (filters.mode === "online" && !doctor.supportsOnline) return false;
        if (filters.mode === "clinic" && !doctor.supportsClinic) return false;
        if (filters.availableToday && !doctor.availableToday) return false;
        if (!matchesPriceRange(doctor, filters)) return false;
        return true;
      });

    const sorted = sortDoctors(doctors, filters);

    return {
      doctors: sorted,
      total: sorted.length,
      filters,
    };
  } catch (error) {
    logDatabaseIssue("searchDoctors", error);
    return {
      doctors: [],
      total: 0,
      filters,
      error: databaseErrorCode(error) ?? "SEARCH_FAILED",
    };
  }
}

export async function getDiscoveryFilterOptions() {
  return getDiscoveryFilterOptionsCached();
}

const getDiscoveryFilterOptionsCached = unstable_cache(
  async () => {
  try {
    const rows = await db.user.findMany({
      where: { role: "DOCTOR", verificationStatus: "VERIFIED" },
      select: {
        clinicGovernorate: true,
        clinicGovernorateEn: true,
        clinicGovernorateAr: true,
        clinicArea: true,
        clinicAreaEn: true,
        clinicAreaAr: true,
        specialty: true,
        specialtyAr: true,
      },
    });

    const governorates = uniqueLocationOptions(
      rows,
      "clinicGovernorateEn",
      "clinicGovernorateAr",
      "clinicGovernorate"
    );
    const areas = uniqueLocationOptions(
      rows,
      "clinicAreaEn",
      "clinicAreaAr",
      "clinicArea"
    );

    const specialties = new Set();
    for (const row of rows) {
      const s = row.specialty?.trim();
      if (s) specialties.add(s);
    }

    return {
      governorates,
      areas,
      specialties: [...specialties].sort((a, b) => a.localeCompare(b)),
    };
  } catch (error) {
    logDatabaseIssue("getDiscoveryFilterOptions", error);
    return {
      governorates: [],
      areas: [],
      specialties: [],
      error: databaseErrorCode(error) ?? null,
    };
  }
  },
  ["discovery-filter-options"],
  { revalidate: 300 }
);

/**
 * Get doctors by specialty (legacy specialty browse route)
 */
export async function getDoctorsBySpecialty(specialty) {
  const decoded = specialty.split("%20").join(" ");
  const result = await searchDoctors({
    specialty: decoded,
    sort: "rating",
  });
  return {
    doctors: result.doctors ?? [],
    error: result.error,
  };
}
