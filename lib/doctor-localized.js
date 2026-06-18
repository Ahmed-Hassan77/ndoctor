import { getSpecialtyKey } from "@/lib/specialty-i18n";

/**
 * Pick locale-specific copy exactly as stored — no cross-language fallback on Arabic.
 * English may fall back to legacy column for older records only.
 * @param {string | null | undefined} en
 * @param {string | null | undefined} ar
 * @param {string | null | undefined} [legacy]
 */
export function pickLocalized(en, ar, legacy, locale = "en") {
  const isAr = locale?.toLowerCase().startsWith("ar");
  if (isAr) {
    return (ar ?? "").trim();
  }
  return (en ?? legacy ?? "").trim();
}

/**
 * @param {Record<string, unknown> | null | undefined} doctor
 * @param {string} locale
 * @param {(name: string) => string} [specialtyLabelFn]
 */
export function getLocalizedDoctor(doctor, locale = "en", specialtyLabelFn) {
  if (!doctor) {
    return {
      displayName: "",
      displayDescription: "",
      displaySpecialty: "",
      displayGovernorate: "",
      displayArea: "",
      displayAddress: "",
      displayLocation: "",
    };
  }

  const displayName = pickLocalized(
    doctor.nameEn,
    doctor.nameAr,
    doctor.name,
    locale
  );
  const displayDescription = pickLocalized(
    doctor.descriptionEn,
    doctor.descriptionAr,
    doctor.description,
    locale
  );
  const displayGovernorate = pickLocalized(
    doctor.clinicGovernorateEn,
    doctor.clinicGovernorateAr,
    doctor.clinicGovernorate,
    locale
  );
  const displayArea = pickLocalized(
    doctor.clinicAreaEn,
    doctor.clinicAreaAr,
    doctor.clinicArea,
    locale
  );
  const displayAddress = pickLocalized(
    doctor.clinicAddressEn,
    doctor.clinicAddressAr,
    doctor.clinicAddress,
    locale
  );

  const specialtyRaw = String(doctor.specialty ?? "").trim();
  const specialtyKey = getSpecialtyKey(specialtyRaw);
  const specialtyAr = String(doctor.specialtyAr ?? "").trim();
  const isAr = locale?.toLowerCase().startsWith("ar");

  let displaySpecialty = "";
  if (isAr && specialtyAr) {
    displaySpecialty = specialtyAr;
  } else if (!isAr && specialtyRaw) {
    displaySpecialty = specialtyRaw;
  } else if (specialtyKey && specialtyLabelFn) {
    displaySpecialty = specialtyLabelFn(specialtyRaw);
  } else {
    displaySpecialty = pickLocalized(
      doctor.specialty,
      doctor.specialtyAr,
      doctor.specialty,
      locale
    );
  }

  const displayLocation = [displayArea, displayGovernorate]
    .filter(Boolean)
    .join(", ");

  return {
    displayName,
    displayDescription,
    displaySpecialty,
    displayGovernorate,
    displayArea,
    displayAddress,
    displayLocation,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} doctor
 * @param {string} locale
 */
export function getLocalizedProfessionalFields(doctor, locale = "en") {
  if (!doctor) {
    return {
      servicesOffered: "",
      education: "",
      languages: "",
      cancellationPolicy: "",
      buildingInfo: "",
    };
  }

  return {
    servicesOffered: pickLocalized(
      doctor.servicesOfferedEn,
      doctor.servicesOfferedAr,
      doctor.servicesOffered,
      locale
    ),
    education: pickLocalized(
      doctor.educationEn,
      doctor.educationAr,
      doctor.education,
      locale
    ),
    languages: pickLocalized(
      doctor.languagesEn,
      doctor.languagesAr,
      doctor.languages,
      locale
    ),
    cancellationPolicy: pickLocalized(
      doctor.cancellationPolicyEn,
      doctor.cancellationPolicyAr,
      doctor.cancellationPolicy,
      locale
    ),
    buildingInfo: pickLocalized(
      doctor.clinicBuildingInfoEn,
      doctor.clinicBuildingInfoAr,
      doctor.clinicBuildingInfo,
      locale
    ),
  };
}

/**
 * @param {{ en?: string; ar?: string }} row
 * @param {string} locale
 */
export function localizedLocationOptionLabel(row, locale) {
  const isAr = locale?.toLowerCase().startsWith("ar");
  if (isAr && row.ar) return String(row.ar);
  return String(row.en ?? row.ar ?? "");
}
