import { getLocalizedClinic } from "@/lib/clinic-localized";

/**
 * @param {Record<string, unknown> | null | undefined} clinic
 * @param {string} [locale]
 */
export function hasUsableClinicRecord(clinic, locale = "en") {
  if (!clinic) return false;
  const maps = (clinic.googleMapsUrl ?? "").trim();
  if (maps) return true;
  const localized = getLocalizedClinic(clinic, locale);
  return Boolean(
    localized.displayGovernorate &&
      localized.displayArea &&
      localized.displayAddress
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} clinic
 * @param {string} [locale]
 */
export function formatClinicSummary(clinic, locale = "en") {
  if (!clinic) return null;
  const localized = getLocalizedClinic(clinic, locale);
  if (localized.displaySummary) return localized.displaySummary;
  return localized.displayName || null;
}

/**
 * @param {Record<string, unknown>} clinic
 * @param {string} [locale]
 */
export function clinicToSnapshot(clinic, locale = "en") {
  const localized = getLocalizedClinic(clinic, locale);
  return {
    clinicId: clinic.id,
    clinicNameSnapshot: localized.displayName || clinic.name,
    clinicAddressSnapshot: localized.displaySummary || formatClinicSummary(clinic, locale),
    clinicPhoneSnapshot: clinic.phone?.trim() || null,
  };
}

/**
 * Resolve clinic scope key for work times.
 * @param {string | null | undefined} clinicId
 */
export function resolveClinicScopeKey(clinicId) {
  return clinicId?.trim() ? clinicId.trim() : "global";
}

export function resolveDoctorClinicNames(doctor) {
  const nameEn = (doctor?.nameEn ?? doctor?.name ?? "").trim();
  const nameAr = (doctor?.nameAr ?? "").trim();
  return {
    nameEn,
    nameAr: nameAr || null,
    name: nameEn,
  };
}

/**
 * @param {Record<string, string | null | undefined>} data
 */
export function clinicLegacyFromBilingual(data) {
  return {
    name: data.nameEn ?? data.name ?? "",
    governorate: data.governorateEn ?? data.governorate ?? null,
    area: data.areaEn ?? data.area ?? null,
    address: data.addressEn ?? data.address ?? null,
    buildingInfo: data.buildingInfoEn ?? data.buildingInfo ?? null,
  };
}
