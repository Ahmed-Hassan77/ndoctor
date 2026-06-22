import { pickLocalized } from "@/lib/doctor-localized";

/**
 * @param {Record<string, unknown> | null | undefined} clinic
 * @param {string} [locale]
 */
export function getLocalizedClinic(clinic, locale = "en") {
  if (!clinic) {
    return {
      displayName: "",
      displayGovernorate: "",
      displayArea: "",
      displayAddress: "",
      displayBuildingInfo: "",
      displayLocation: "",
      displaySummary: "",
    };
  }

  const displayName = pickLocalized(
    clinic.nameEn,
    clinic.nameAr,
    clinic.name,
    locale
  );
  const displayGovernorate = pickLocalized(
    clinic.governorateEn,
    clinic.governorateAr,
    clinic.governorate,
    locale
  );
  const displayArea = pickLocalized(
    clinic.areaEn,
    clinic.areaAr,
    clinic.area,
    locale
  );
  const displayAddress = pickLocalized(
    clinic.addressEn,
    clinic.addressAr,
    clinic.address,
    locale
  );
  const displayBuildingInfo = pickLocalized(
    clinic.buildingInfoEn,
    clinic.buildingInfoAr,
    clinic.buildingInfo,
    locale
  );

  const displayLocation = [displayArea, displayGovernorate]
    .filter(Boolean)
    .join(" · ");

  const displaySummary = [
    displayBuildingInfo,
    displayAddress,
    displayArea,
    displayGovernorate,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    displayName,
    displayGovernorate,
    displayArea,
    displayAddress,
    displayBuildingInfo,
    displayLocation,
    displaySummary,
  };
}

/**
 * Dropdown label: shared name + branch location for disambiguation.
 * @param {Record<string, unknown>} clinic
 * @param {string} locale
 */
export function getClinicOptionLabel(clinic, locale = "en") {
  const localized = getLocalizedClinic(clinic, locale);
  const branch = localized.displayLocation;
  if (branch && localized.displayName) {
    return `${localized.displayName} — ${branch}`;
  }
  return localized.displayName || branch || String(clinic.name ?? "");
}
