/**
 * Detects affirmative/negative replies to a pending doctor-recommendation offer.
 */

const CONFIRMATION_PATTERNS = {
  en: [
    /^(?:yes|yeah|yep|yup|sure|ok(?:ay)?|please|of\s+course|go\s+ahead)\.?$/i,
    /^show\s+(?:me\s+)?(?:the\s+)?doctors?\.?$/i,
    /^(?:recommend|suggest|find)\s+(?:me\s+)?(?:doctors?|them)\.?$/i,
    /^recommend\s+doctors?\.?$/i,
    /^i\s+(?:would\s+like|want)\s+(?:to\s+see\s+)?doctors?\.?$/i,
    /^find\s+me\s+(?:a\s+)?(?:doctor|specialist)\.?$/i,
  ],
  ar: [
    // Simple affirmatives
    /^(?:نعم|نَعم|موافق|تمام|طيب|ماشي|اوك(?:ي)?|حاضر|أكيد|بالتأكيد)\.?$/,
    // اه / آه / أيوه / ايوة / ايوا (various spellings)
    /^(?:اه|آه|أه)\.?$/,
    /^(?:أيوه|ايوه|أيوة|ايوة|ايوا|أيوا)\.?$/,
    // "رشحلي" / "اعرض" / "عرض" / "وريني" + optional دكاترة/أطباء
    /^(?:رش[ّ]?ح(?:لي)?|اعرض(?:لي)?|عرض(?:لي)?|ورّ?(?:يني|ني)?)\s*(?:ال)?(?:دكاترة|أطباء|الأطباء)?\.?$/,
    // Compound: "اه رشحلي" / "ايوه اعرض الدكاترة"
    /^(?:اه|آه|أيوه|ايوه|أيوة|ايوة|نعم|تمام)\s+(?:رش[ّ]?ح(?:لي)?|اعرض(?:لي)?|عرض(?:لي)?|ورّ?(?:يني|ني)?)\s*(?:ال)?(?:دكاترة|أطباء|الأطباء)?\.?$/,
    // "ودي اشوف" / "عايز اشوف الدكاترة"
    /^(?:ودّ?(?:ي)?|عايز|عاوز|محتاج)\s*(?:أشوف|اشوف|أعرف|اعرف|عرض|ورّ?(?:يني|ني)?)\s*(?:ال)?(?:دكاترة|أطباء|الأطباء)?\.?$/,
    /^وريني\s*(?:ال)?(?:دكاترة|أطباء|الأطباء)\.?$/,
    // "اعرض الدكاترة" standalone
    /^اعرض\s+(?:ال)?(?:دكاترة|أطباء|الأطباء)\.?$/,
  ],
};

const DECLINE_PATTERNS = {
  en: [/^(?:no|nope|not\s+now|maybe\s+later|no\s+thanks)\.?$/i],
  ar: [/^(?:لا|لأ|مش\s+دلوقتي|ليس\s+الآن|لا\s+شكراً)\.?$/],
};

/**
 * @param {string} text
 * @param {Record<string, RegExp[]>} patternMap
 */
function matchesPatternMap(text, patternMap) {
  const combined = (text || "").trim();
  if (!combined) return false;
  for (const patterns of Object.values(patternMap)) {
    for (const pattern of patterns) {
      if (pattern.test(combined)) return true;
    }
  }
  return false;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isDoctorRecommendationConfirmation(text) {
  return matchesPatternMap(text, CONFIRMATION_PATTERNS);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isDoctorRecommendationDecline(text) {
  return matchesPatternMap(text, DECLINE_PATTERNS);
}

/** Arabic display labels for platform specialties in confirmation prompts. */
const SPECIALTY_AR = {
  "General Medicine": "الباطنة",
  Cardiology: "القلب",
  Dermatology: "الجلدية",
  Pediatrics: "الأطفال",
  Orthopedics: "العظام",
  "Obstetrics & Gynecology": "النساء والتوليد",
  Neurology: "المخ والأعصاب",
  Ophthalmology: "العيون",
  Pulmonology: "الصدر",
  Urology: "المسالك البولية",
  Psychiatry: "الطب النفسي",
  Endocrinology: "الغدد الصماء",
  Gastroenterology: "الجهاز الهضمي",
  Oncology: "الأورام",
  Radiology: "الأشعة",
  ENT: "الأنف والأذن والحنجرة",
};

/**
 * @param {string} specialty
 * @param {'en'|'ar'} locale
 */
export function formatSpecialtyLabel(specialty, locale) {
  if (locale === "ar") {
    return SPECIALTY_AR[specialty] || specialty;
  }
  return specialty;
}

/**
 * Offer doctors after symptom triage — user must confirm before DB query.
 * @param {string[]} specialties
 * @param {'en'|'ar'} locale
 */
export function buildSymptomSpecialtyConfirmationPrompt(specialties, locale) {
  const specialty = specialties[0];
  if (!specialty) return "";

  const label = formatSpecialtyLabel(specialty, locale);
  if (locale === "ar") {
    return `\n\n---\n\nقد تكون هذه الأعراض مرتبطة بتخصص **${label}**. هل ترغب في عرض أطباء متاحين على المنصة؟`;
  }
  return `\n\n---\n\nThese symptoms may be related to **${specialty}**. Would you like to see available doctors on the platform?`;
}

/**
 * Offer doctors after medical report/image analysis — user must confirm first.
 * @param {string[]} specialties
 * @param {'en'|'ar'} locale
 */
export function buildReportSpecialtyConfirmationPrompt(specialties, locale) {
  const specialty = specialties[0];
  if (!specialty) return "";

  const label = formatSpecialtyLabel(specialty, locale);
  if (locale === "ar") {
    return `\n\n---\n\nقد تحتاج إلى مراجعة طبيب **${label}**. هل ترغب في عرض أطباء ${label} متاحين على المنصة؟`;
  }
  return `\n\n---\n\nYou may need to consult an **${specialty}** specialist. Would you like to see available ${specialty} doctors on the platform?`;
}

/**
 * @param {'en'|'ar'} locale
 */
export function buildDeclinedRecommendationAck(locale) {
  return locale === "ar"
    ? "حسناً. إذا احتجت لاحقاً إلى أطباء على المنصة، أخبرني بالتخصص أو اطلب «رشّحلي دكتور»."
    : "Understood. If you'd like platform doctors later, tell me the specialty or ask me to recommend a doctor.";
}
