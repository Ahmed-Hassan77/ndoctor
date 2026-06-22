import { db } from "@/lib/prisma";
import { databaseErrorCode, isDatabaseUnavailableError, logDatabaseIssue } from "@/lib/db-safe";
import { doctorSupportsMode, isAvailableToday } from "@/lib/doctor-availability";
import { resolveClinicPriceEgp, resolveOnlinePriceEgp } from "@/lib/pricing";
import {
  resolveSpecialtyFromText,
  isPlatformSpecialty,
  PLATFORM_SPECIALTY_NAMES,
} from "@/lib/chatbot/intent/specialty-map";

const DOCTOR_SELECT = {
  id: true,
  name: true,
  nameAr: true,
  specialty: true,
  specialtyAr: true,
  imageUrl: true,
  averageRating: true,
  totalReviews: true,
  clinicGovernorate: true,
  clinicGovernorateAr: true,
  clinicArea: true,
  clinicAreaAr: true,
  onlineConsultationPriceEgp: true,
  clinicConsultationPriceEgp: true,
  verificationStatus: true,
  accountStatus: true,
  workTimes: {
    where: { isActive: true },
    select: { mode: true, dayOfWeek: true, startTime: true, endTime: true, isActive: true },
  },
  clinics: {
    where: { isActive: true },
    select: { id: true, name: true, governorate: true, governorateAr: true, area: true, areaAr: true },
  },
  availabilities: {
    where: {
      status: "AVAILABLE",
      startTime: { gte: new Date() },
    },
    select: { id: true, startTime: true, appointmentMode: true },
    take: 3,
    orderBy: { startTime: "asc" },
  },
};

/**
 * Resolve specialty input (string label or resolved alias object) to search criteria.
 * @param {string | { canonical?: string | null; searchTerms?: string[] } | null | undefined} input
 */
function normalizeSpecialtyInput(input) {
  if (!input) return null;
  if (typeof input === "string") {
    const legacy = input.trim();
    const legacyMap = {
      "Obstetrics and Gynecology": "Obstetrics & Gynecology",
      "Internal Medicine": "General Medicine",
    };
    const mapped = legacyMap[legacy] ?? legacy;
    const resolved = resolveSpecialtyFromText(mapped);
    if (resolved?.canonical && isPlatformSpecialty(resolved.canonical)) {
      return resolved;
    }
    if (PLATFORM_SPECIALTY_NAMES.some((n) => n.toLowerCase() === mapped.toLowerCase())) {
      return { canonical: mapped, searchTerms: [mapped] };
    }
    return resolved ?? { canonical: null, searchTerms: [mapped] };
  }
  if (input.canonical || input.searchTerms?.length) {
    return input;
  }
  return null;
}

/**
 * Keep only specialties that exist on the platform (User.specialty values).
 * @param {ReturnType<typeof normalizeSpecialtyInput>[]} resolvedList
 */
function platformSpecialtyNames(resolvedList) {
  const names = [];
  for (const resolved of resolvedList) {
    if (!resolved) continue;
    if (resolved.canonical && isPlatformSpecialty(resolved.canonical)) {
      names.push(resolved.canonical);
    }
  }
  return [...new Set(names)];
}

/**
 * Score doctors: verified (pre-filtered) → rating → reviews → availability.
 * @param {object} doctor
 * @param {{ canonical?: string | null; searchTerms?: string[] } | null} specialtyResolved
 */
function scoreDoctor(doctor, specialtyResolved) {
  const supportsOnline = doctorSupportsMode(doctor, doctor.workTimes, "ONLINE");
  const supportsClinic = doctorSupportsMode(doctor, doctor.workTimes, "OFFLINE");
  const availableToday = isAvailableToday(doctor, doctor.workTimes, "any");
  const hasOpenSlots = (doctor.availabilities?.length ?? 0) > 0;

  let specialtyMatch = 1;
  if (specialtyResolved) {
    const docSpec = (doctor.specialty ?? "").toLowerCase();
    const docSpecAr = (doctor.specialtyAr ?? "").toLowerCase();
    const canonical = specialtyResolved.canonical?.toLowerCase();
    if (canonical && docSpec === canonical) {
      specialtyMatch = 3;
    } else if (
      specialtyResolved.searchTerms?.some(
        (term) =>
          docSpec.includes(term.toLowerCase()) || docSpecAr.includes(term.toLowerCase())
      )
    ) {
      specialtyMatch = 2;
    } else {
      specialtyMatch = 0;
    }
  }

  const score =
    specialtyMatch * 100 +
    (doctor.verificationStatus === "VERIFIED" ? 50 : 0) +
    (doctor.averageRating ?? 0) * 10 +
    Math.min(doctor.totalReviews ?? 0, 100) * 0.5 +
    (availableToday ? 8 : 0) +
    (hasOpenSlots ? 6 : 0) +
    (supportsOnline ? 2 : 0) +
    (supportsClinic ? 2 : 0) +
    (doctor.clinics?.length ? 1 : 0);

  return { score, supportsOnline, supportsClinic, availableToday, hasOpenSlots };
}

/**
 * Query verified, active doctors from Prisma with specialty + optional governorate filters.
 * @param {{ specialties?: Array<string | object>; governorate?: string; limit?: number }} params
 * @returns {Promise<{ doctors: object[]; error: string | null }>}
 */
export async function recommendDoctors(params = {}) {
  const { specialties = [], governorate, limit = 5 } = params;
  const safeLimit = Math.max(0, Math.min(limit, 20));

  if (safeLimit === 0) {
    return { doctors: [], error: null };
  }

  /** @type {import('@prisma/client').Prisma.UserWhereInput} */
  const where = {
    role: "DOCTOR",
    verificationStatus: "VERIFIED",
    accountStatus: "ACTIVE",
  };

  const resolvedList = specialties.map(normalizeSpecialtyInput).filter(Boolean);
  const platformNames = platformSpecialtyNames(resolvedList);

  if (resolvedList.length > 0 && platformNames.length === 0) {
    return { doctors: [], error: null, unavailableSpecialty: true };
  }

  if (platformNames.length > 0) {
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: platformNames.map((name) => ({
          specialty: { equals: name, mode: "insensitive" },
        })),
      },
    ];
  }

  if (governorate?.trim()) {
    const gov = governorate.trim();
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { clinicGovernorate: { contains: gov, mode: "insensitive" } },
          { clinicGovernorateEn: { contains: gov, mode: "insensitive" } },
          { clinicGovernorateAr: { contains: gov, mode: "insensitive" } },
        ],
      },
    ];
  }

  // Log the full query for debugging
  console.log(
    "[chatbot:recommendation] database_query_where",
    JSON.stringify({
      specialties: specialties.map((s) => (typeof s === "string" ? s : s?.canonical ?? s)),
      resolvedCount: resolvedList.length,
      governorate: governorate ?? null,
      whereClause: JSON.stringify(where),
    })
  );

  try {
    const dbStart = Date.now();
    const doctors = await db.user.findMany({
      where,
      select: DOCTOR_SELECT,
      take: Math.min(safeLimit * 4, 40),
      orderBy: [{ averageRating: "desc" }, { totalReviews: "desc" }],
    });
    const dbMs = Date.now() - dbStart;
    console.log(`[chatbot:timing] database_query took ${dbMs}ms, returned ${doctors.length} rows`);

    console.log(
      "[chatbot:recommendation] database_result",
      JSON.stringify({
        rawDoctorCount: doctors.length,
        doctorNames: doctors.map((d) => d.name ?? d.nameAr ?? "unnamed"),
        doctorSpecialties: doctors.map((d) => d.specialty ?? "none"),
      })
    );

    const primaryResolved = platformNames[0]
      ? { canonical: platformNames[0], searchTerms: [platformNames[0]] }
      : resolvedList[0] ?? null;

    const ranked = doctors
      .map((doctor) => {
        const { score, supportsOnline, supportsClinic, availableToday, hasOpenSlots } =
          scoreDoctor(doctor, primaryResolved);

        const clinic = doctor.clinics?.[0];
        const slug = encodeURIComponent(doctor.specialty || "General");

        return {
          id: doctor.id,
          name: doctor.nameAr || doctor.name,
          specialty: doctor.specialty,
          specialtyAr: doctor.specialtyAr,
          imageUrl: doctor.imageUrl,
          averageRating: doctor.averageRating,
          totalReviews: doctor.totalReviews,
          governorate: doctor.clinicGovernorate || clinic?.governorate,
          governorateAr: doctor.clinicGovernorateAr || clinic?.governorateAr,
          area: doctor.clinicArea || clinic?.area,
          areaAr: doctor.clinicAreaAr || clinic?.areaAr,
          supportsOnline,
          supportsClinic,
          availableToday,
          hasOpenSlots,
          onlinePriceEgp: resolveOnlinePriceEgp(doctor),
          clinicPriceEgp: resolveClinicPriceEgp(doctor),
          bookingPath: `/doctors/${slug}/${doctor.id}`,
          score,
        };
      })
      // Prisma WHERE already matched specialty — rank by score only, do not drop rows
      .sort((a, b) => b.score - a.score)
      .slice(0, safeLimit);

    console.log(
      "[chatbot:recommendation] final_result",
      JSON.stringify({
        rankedDoctorCount: ranked.length,
        rankedDoctors: ranked.map((d) => ({ name: d.name, specialty: d.specialty, score: d.score })),
      })
    );

    return { doctors: ranked, error: null };
  } catch (error) {
    console.error("[chatbot:recommendation] database_error", error?.message);
    logDatabaseIssue("recommendDoctors", error);
    const code = isDatabaseUnavailableError(error)
      ? "DATABASE_UNAVAILABLE"
      : "RECOMMENDATION_FAILED";
    if (databaseErrorCode(error)) {
      return { doctors: [], error: "DATABASE_UNAVAILABLE" };
    }
    return { doctors: [], error: code };
  }
}

/**
 * @param {string} urgency
 * @param {string[]} specialties
 * @param {string} [governorate]
 */
export async function getRecommendationsForTriage(urgency, specialties, governorate) {
  if (urgency === "emergency") {
    return { emergency: true, doctors: [], error: null };
  }
  const result = await recommendDoctors({ specialties, governorate, limit: 5 });
  return { emergency: false, doctors: result.doctors, error: result.error };
}

/**
 * High-level helper for chatbot doctor recommendation turns.
 * @param {{ message: string; governorate?: string; triageSpecialties?: string[]; limit?: number }} input
 */
export async function recommendDoctorsForMessage(input) {
  const { message, governorate, triageSpecialties = [], limit = 5 } = input;

  const fromMessage = extractSpecialtyFromMessage(message);
  const rawInputs = [];

  if (fromMessage) rawInputs.push(fromMessage);
  for (const s of triageSpecialties) {
    if (s) rawInputs.push(s);
  }

  // Deduplicate specialty inputs by canonical name
  const seen = new Set();
  const specialtyInputs = [];
  for (const item of rawInputs) {
    const key = typeof item === "string" ? item.toLowerCase() : (item?.canonical ?? item?.matchedLabel ?? "").toLowerCase();
    if (key && seen.has(key)) continue;
    if (key) seen.add(key);
    specialtyInputs.push(item);
  }

  console.log(
    "[chatbot:recommendation] specialty_detection",
    JSON.stringify({
      userMessage: message?.slice(0, 100),
      detectedFromMessage: fromMessage?.canonical ?? fromMessage?.matchedLabel ?? null,
      triageSpecialties,
      deduplicatedCount: specialtyInputs.length,
    })
  );

  if (!specialtyInputs.length) {
    console.log("[chatbot:recommendation] no_specialty_detected — asking user to specify");
    return { status: "missing_specialty", doctors: [], error: null };
  }

  const platformCheck = specialtyInputs
    .map(normalizeSpecialtyInput)
    .filter(Boolean);
  const hasPlatformSpecialty = platformSpecialtyNames(platformCheck).length > 0;
  const requestedButUnavailable =
    platformCheck.length > 0 &&
    platformCheck.every((r) => !r.canonical || !isPlatformSpecialty(r.canonical));

  if (requestedButUnavailable && !hasPlatformSpecialty) {
    console.log("[chatbot:recommendation] specialty_not_on_platform");
    return { status: "unavailable_specialty", doctors: [], error: null };
  }

  const result = await recommendDoctors({
    specialties: specialtyInputs,
    governorate,
    limit,
  });

  console.log(
    "[chatbot:recommendation] recommendation_outcome",
    JSON.stringify({
      status: result.error ? "error" : result.doctors.length ? "found" : "empty",
      doctorCount: result.doctors.length,
      error: result.error ?? null,
    })
  );

  if (result.unavailableSpecialty) {
    return { status: "unavailable_specialty", doctors: [], error: null };
  }
  if (result.error) {
    return { status: "error", doctors: [], error: result.error };
  }
  if (!result.doctors.length) {
    return { status: "empty", doctors: [], error: null };
  }
  return { status: "ok", doctors: result.doctors, error: null };
}

/** @param {string} message */
function extractSpecialtyFromMessage(message) {
  return resolveSpecialtyFromText(message);
}
