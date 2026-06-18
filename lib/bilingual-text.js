/** Arabic script ranges (includes Arabic letters and common presentation forms). */
const ARABIC_SCRIPT_RE =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDCF\uFDF0-\uFDFF\uFE70-\uFEFF]/;

const LATIN_LETTER_RE = /[A-Za-z]/;

export function hasArabicScript(value) {
  return ARABIC_SCRIPT_RE.test(String(value ?? ""));
}

export function hasLatinLetters(value) {
  return LATIN_LETTER_RE.test(String(value ?? ""));
}

/**
 * English profile fields must use Latin letters and must not contain Arabic script.
 */
export function isValidEnglishPublicText(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  if (hasArabicScript(text)) return false;
  return hasLatinLetters(text);
}

/**
 * Arabic profile fields must contain Arabic script.
 */
export function isValidArabicPublicText(value) {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return hasArabicScript(text);
}

export const DOCTOR_BILINGUAL_SCRIPT_FIELDS = [
  ["nameEn", "validation.englishTextRequired", "en"],
  ["nameAr", "validation.arabicTextRequired", "ar"],
  ["descriptionEn", "validation.englishTextRequired", "en"],
  ["descriptionAr", "validation.arabicTextRequired", "ar"],
  ["clinicGovernorateEn", "validation.englishTextRequired", "en"],
  ["clinicGovernorateAr", "validation.arabicTextRequired", "ar"],
  ["clinicAreaEn", "validation.englishTextRequired", "en"],
  ["clinicAreaAr", "validation.arabicTextRequired", "ar"],
  ["clinicAddressEn", "validation.englishTextRequired", "en"],
  ["clinicAddressAr", "validation.arabicTextRequired", "ar"],
  ["clinicBuildingInfoEn", "validation.englishTextRequired", "en"],
  ["clinicBuildingInfoAr", "validation.arabicTextRequired", "ar"],
  ["servicesOfferedEn", "validation.englishTextRequired", "en"],
  ["servicesOfferedAr", "validation.arabicTextRequired", "ar"],
  ["educationEn", "validation.englishTextRequired", "en"],
  ["educationAr", "validation.arabicTextRequired", "ar"],
  ["languagesEn", "validation.englishTextRequired", "en"],
  ["languagesAr", "validation.arabicTextRequired", "ar"],
  ["cancellationPolicyEn", "validation.englishTextRequired", "en"],
  ["cancellationPolicyAr", "validation.arabicTextRequired", "ar"],
  ["specialtyOtherEn", "validation.englishTextRequired", "en"],
  ["specialtyOtherAr", "validation.arabicTextRequired", "ar"],
];

export const CLINIC_BILINGUAL_SCRIPT_FIELDS = [
  ["governorateEn", "validation.englishTextRequired", "en"],
  ["governorateAr", "validation.arabicTextRequired", "ar"],
  ["areaEn", "validation.englishTextRequired", "en"],
  ["areaAr", "validation.arabicTextRequired", "ar"],
  ["addressEn", "validation.englishTextRequired", "en"],
  ["addressAr", "validation.arabicTextRequired", "ar"],
  ["buildingInfoEn", "validation.englishTextRequired", "en"],
  ["buildingInfoAr", "validation.arabicTextRequired", "ar"],
];

/**
 * @param {Record<string, unknown>} data
 * @param {import("zod").RefinementCtx} ctx
 */
export function refineClinicBilingualScripts(data, ctx) {
  for (const [field, message, lang] of CLINIC_BILINGUAL_SCRIPT_FIELDS) {
    const value = data[field];
    if (value == null || String(value).trim() === "") continue;

    const valid =
      lang === "en"
        ? isValidEnglishPublicText(value)
        : isValidArabicPublicText(value);

    if (!valid) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message,
      });
    }
  }
}
/**
 * @param {Record<string, unknown>} data
 * @param {import("zod").RefinementCtx} ctx
 * @param {{ includeSpecialtyOther?: boolean; includeProfessional?: boolean }} [options]
 */
export function refineDoctorBilingualScripts(data, ctx, options = {}) {
  const includeProfessional = options.includeProfessional !== false;
  let fields = DOCTOR_BILINGUAL_SCRIPT_FIELDS;
  if (!options.includeSpecialtyOther) {
    fields = fields.filter(([key]) => !String(key).startsWith("specialtyOther"));
  }
  if (!includeProfessional) {
    fields = fields.filter(
      ([key]) =>
        ![
          "servicesOfferedEn",
          "servicesOfferedAr",
          "educationEn",
          "educationAr",
          "languagesEn",
          "languagesAr",
          "cancellationPolicyEn",
          "cancellationPolicyAr",
        ].includes(String(key))
    );
  }

  for (const [field, message, lang] of fields) {
    const value = data[field];
    if (value == null || String(value).trim() === "") continue;

    const valid =
      lang === "en"
        ? isValidEnglishPublicText(value)
        : isValidArabicPublicText(value);

    if (!valid) {
      ctx.addIssue({
        code: "custom",
        path: [field],
        message,
      });
    }
  }
}
