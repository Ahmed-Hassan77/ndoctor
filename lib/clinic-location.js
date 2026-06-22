import { pickLocalized } from "@/lib/doctor-localized";

/**
 * @param {Pick<
 *   import("@prisma/client").User,
 *   | "clinicGovernorate"
 *   | "clinicGovernorateEn"
 *   | "clinicGovernorateAr"
 *   | "clinicArea"
 *   | "clinicAreaEn"
 *   | "clinicAreaAr"
 *   | "clinicAddress"
 *   | "clinicAddressEn"
 *   | "clinicAddressAr"
 *   | "clinicGoogleMapsUrl"
 *   | "practiceAddress"
 * > | null | undefined} doctor
 * @param {string} [locale]
 */
export function hasUsableClinicLocation(doctor, locale = "en") {
  if (!doctor) return false;
  const maps = (doctor.clinicGoogleMapsUrl ?? "").trim();
  if (maps) return true;

  const governorate = pickLocalized(
    doctor.clinicGovernorateEn,
    doctor.clinicGovernorateAr,
    doctor.clinicGovernorate,
    locale
  );
  const area = pickLocalized(
    doctor.clinicAreaEn,
    doctor.clinicAreaAr,
    doctor.clinicArea,
    locale
  );
  const address =
    pickLocalized(
      doctor.clinicAddressEn,
      doctor.clinicAddressAr,
      doctor.clinicAddress,
      locale
    ) || (doctor.practiceAddress ?? "").trim();

  return Boolean(governorate && area && address);
}

/**
 * @param {Pick<
 *   import("@prisma/client").User,
 *   | "clinicGovernorate"
 *   | "clinicGovernorateEn"
 *   | "clinicGovernorateAr"
 *   | "clinicArea"
 *   | "clinicAreaEn"
 *   | "clinicAreaAr"
 *   | "clinicAddress"
 *   | "clinicAddressEn"
 *   | "clinicAddressAr"
 *   | "clinicBuildingInfo"
 *   | "clinicPhone"
 *   | "clinicGoogleMapsUrl"
 *   | "practiceAddress"
 * > | null | undefined} doctor
 * @param {string} [locale]
 */
export function formatClinicLocationSummary(doctor, locale = "en") {
  if (!doctor) return null;

  const building = pickLocalized(
    doctor.clinicBuildingInfoEn,
    doctor.clinicBuildingInfoAr,
    doctor.clinicBuildingInfo,
    locale
  );
  const address = pickLocalized(
    doctor.clinicAddressEn,
    doctor.clinicAddressAr,
    doctor.clinicAddress,
    locale
  );
  const area = pickLocalized(
    doctor.clinicAreaEn,
    doctor.clinicAreaAr,
    doctor.clinicArea,
    locale
  );
  const governorate = pickLocalized(
    doctor.clinicGovernorateEn,
    doctor.clinicGovernorateAr,
    doctor.clinicGovernorate,
    locale
  );

  const parts = [building, address, area, governorate].filter(Boolean);

  if (parts.length > 0) {
    return parts.join(", ");
  }

  const legacy = doctor.practiceAddress?.trim();
  return legacy || null;
}

/**
 * Build legacy practiceAddress from structured fields for backward compatibility.
 * @param {Record<string, string | null | undefined>} data
 */
export function buildPracticeAddressFromClinic(data) {
  const address =
    data.clinicAddress ?? data.clinicAddressEn ?? "";
  const area = data.clinicArea ?? data.clinicAreaEn ?? "";
  const governorate = data.clinicGovernorate ?? data.clinicGovernorateEn ?? "";

  const parts = [data.clinicBuildingInfo, address, area, governorate]
    .map((s) => (s ?? "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(", ") : null;
}
