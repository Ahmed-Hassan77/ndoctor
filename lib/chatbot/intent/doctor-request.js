import { resolveSpecialtyFromText } from "@/lib/chatbot/intent/specialty-map";

/** Patterns that indicate the user wants a doctor recommendation. */
const DOCTOR_REQUEST_PATTERNS = {
  en: [
    /\brecommend\s+(?:a\s+)?(?:doctor|specialist|physician)/i,
    /\bsuggest\s+(?:a\s+)?(?:doctor|specialist|physician)/i,
    /\bfind\s+(?:a\s+)?(?:doctor|specialist|physician)/i,
    /\b(?:need|want|looking\s+for)\s+(?:a\s+)?(?:doctor|specialist|physician)/i,
    /\brecommend\s+doctors/i,
    /\bsuggest\s+doctors/i,
    /\bfind\s+doctors/i,
    /\bshow\s+me\s+(?:a\s+)?(?:doctor|specialist)/i,
    /\b(?:cardiologist|dermatologist|pediatrician|neurologist|psychiatrist|gynecologist|orthopedist|orthopedic\s+doctor|ophthalmologist|ent\s+specialist|pulmonologist|nephrologist|urologist|internist|dentist|nutritionist|physiotherapist)\b/i,
    /\b(?:cardiology|dermatology|pediatrics|internal\s+medicine|orthopedics|neurology|ophthalmology|pulmonology|nephrology|urology|psychiatry|dentistry|nutrition|physical\s+therapy)\s+(?:doctor|specialist)/i,
  ],
  ar: [
    /(?:رش[ّ]?ح|اقترح|دور|ابحث)\s+(?:لي\s+|علي\s+|على\s+)?(?:دكتور|طبيب|أطباء|دكاترة|أخصائي)/,
    /(?:عايز|عاوز|محتاج|أريد|بدور\s+على|بدي)\s+(?:دكتور|طبيب|أطباء|دكاترة|أخصائي)/,
    /(?:دكتور|طبيب|أخصائي)\s+(?:قلب|جلد(?:ية)?|أطفال|عظام|عيون|أنف|أذن|حنجرة|نساء|توليد|نفس(?:ي|ية)?|أعصاب|مخ|باطنة|مسالك|كلى|صدر|أسنان|تغذية|علاج\s+طبيعي)/,
    /(?:تخصص|مجال)\s+(?:قلب|جلد(?:ية)?|أطفال|عظام|عيون|نساء|أعصاب|باطنة|مسالك|كلى|صدر|أسنان|تغذية)/,
  ],
};

/** Generic doctor request without a detectable specialty. */
const GENERIC_DOCTOR_PATTERNS = {
  en: [
    /^(?:i\s+)?(?:need|want)\s+(?:a\s+)?(?:doctor|physician)\.?$/i,
    /^(?:recommend|find|suggest)\s+(?:a\s+)?(?:doctor|physician)\.?$/i,
    /^looking\s+for\s+(?:a\s+)?(?:doctor|physician)\.?$/i,
  ],
  ar: [
    /^(?:عايز|عاوز|محتاج|أريد|بدي)\s+(?:دكتور|طبيب)\.?$/,
    /^(?:رش[ّ]?ح|اقترح)(?:\s+لي)?\s+(?:دكتور|طبيب)\.?$/,
    /^بدور\s+على\s+(?:دكتور|طبيب)\.?$/,
  ],
};

/** User wants a doctor recommendation alongside medical file analysis. */
const DOCTOR_AFTER_ANALYSIS_PATTERNS = {
  en: [
    /\b(?:recommend|suggest|find)\s+(?:a\s+)?(?:doctor|specialist)/i,
    /\b(?:which|what)\s+doctor\s+should\s+i\s+see/i,
    /\bsuitable\s+doctor/i,
    /\bappropriate\s+specialist/i,
  ],
  ar: [
    /(?:رش[ّ]?ح|اقترح)(?:\s+لي)?\s+(?:دكتور|طبيب|أخصائي)/,
    /(?:دكتور|طبيب|أخصائي)\s+مناسب/,
    /(?:أي|إيه)\s+(?:دكتور|طبيب|تخصص)/,
    /(?:أروح|أزور)\s+(?:ل)?(?:دكتور|طبيب|أخصائي)/,
  ],
};

/**
 * @param {string} text
 * @param {Record<string, RegExp[]>} patternMap
 */
function matchesPatternMap(text, patternMap) {
  const combined = text || "";
  for (const patterns of Object.values(patternMap)) {
    for (const pattern of patterns) {
      if (pattern.test(combined)) return true;
    }
  }
  return false;
}

/**
 * True only when the user explicitly asks for a doctor — not when symptoms mention a body part/specialty.
 * @param {string} text
 * @returns {boolean}
 */
export function isDoctorRecommendationRequest(text) {
  return matchesPatternMap(text, DOCTOR_REQUEST_PATTERNS);
}

/**
 * Generic request: wants a doctor but no specialty detected.
 * @param {string} text
 * @returns {boolean}
 */
export function isGenericDoctorRequest(text) {
  const combined = (text || "").trim();
  if (!combined) return false;
  if (resolveSpecialtyFromText(combined)) return false;
  if (matchesPatternMap(combined, GENERIC_DOCTOR_PATTERNS)) return true;
  if (
    isDoctorRecommendationRequest(combined) &&
    !resolveSpecialtyFromText(combined)
  ) {
    return (
      /\b(?:need|want|looking\s+for)\s+(?:a\s+)?doctor\b/i.test(combined) ||
      /(?:عايز|عاوز|محتاج|أريد)\s+(?:دكتور|طبيب)/.test(combined)
    );
  }
  return false;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
export function wantsDoctorAfterAnalysis(text) {
  return matchesPatternMap(text, DOCTOR_AFTER_ANALYSIS_PATTERNS);
}

/**
 * Resolve specialty from user text (delegates to expanded alias map).
 * @param {string} text
 */
export function extractSpecialtyHint(text) {
  return resolveSpecialtyFromText(text);
}

/**
 * @param {'en'|'ar'} locale
 * @returns {string}
 */
export function buildAskSpecialtyMessage(locale) {
  return locale === "ar"
    ? "ما التخصص الذي تبحث عنه؟\n\nمثال: قلب، جلدية، أطفال، عظام، نساء وتوليد، مخ وأعصاب…"
    : "Which specialty are you looking for?\n\nFor example: cardiology, dermatology, pediatrics, orthopedics, neurology…";
}

/**
 * @param {'en'|'ar'} locale
 * @param {string} [specialty]
 * @returns {string}
 */
export function buildNoDoctorsMessage(locale, specialty) {
  if (locale === "ar") {
    return "هذا التخصص غير متوفر حالياً على منصة شفاء.";
  }
  return "This specialty is currently unavailable on Shifaa.";
}

/**
 * Specialty is recognized but not offered on the Shifaa platform.
 * @param {'en'|'ar'} locale
 */
export function buildUnavailableSpecialtyMessage(locale) {
  return buildNoDoctorsMessage(locale);
}

/**
 * @param {'en'|'ar'} locale
 * @param {'DATABASE_UNAVAILABLE'|'RECOMMENDATION_FAILED'} [code]
 * @returns {string}
 */
export function buildRecommendationErrorMessage(locale, code = "RECOMMENDATION_FAILED") {
  if (code === "DATABASE_UNAVAILABLE") {
    return locale === "ar"
      ? "عذراً، تعذّر الاتصال بقاعدة بيانات الأطباء حالياً. يرجى المحاولة بعد قليل أو تصفّح الأطباء من صفحة المنصة."
      : "Sorry, we couldn't reach the doctor database right now. Please try again shortly or browse doctors on the platform.";
  }
  return locale === "ar"
    ? "عذراً، حدث خطأ أثناء البحث عن الأطباء. يرجى المحاولة مرة أخرى."
    : "Sorry, something went wrong while searching for doctors. Please try again.";
}

/**
 * Format live database doctor recommendations for chat markdown.
 * @param {Array<object>} doctors
 * @param {'en'|'ar'} locale
 * @param {string} [introOverride]
 * @returns {string}
 */
export function buildDoctorRecommendationMarkdown(doctors, locale, introOverride) {
  const isAr = locale === "ar";
  const intro =
    introOverride ??
    (isAr
      ? "إليك بعض الأطباء الموثّقين على منصة **شفاء**:"
      : "Here are verified doctors from **Shifaa**:");

  const note = isAr
    ? "_التوصيات مبنية على بيانات حية من المنصة (التحقق، التقييم، المراجعات، والتوفر)._"
    : "_Recommendations use live platform data (verification, ratings, reviews, availability)._";

  const lines = doctors.map((doctor, index) => {
    const rating =
      doctor.averageRating != null ? `${Number(doctor.averageRating).toFixed(1)}⭐` : "";
    const reviews =
      doctor.totalReviews != null
        ? `${doctor.totalReviews} ${isAr ? "مراجعة" : "reviews"}`
        : "";
    const metaParts = [rating, reviews].filter(Boolean);
    const meta = metaParts.length ? ` (${metaParts.join(", ")})` : "";

    const specialty =
      (isAr && doctor.specialtyAr) || doctor.specialty || (isAr ? "غير محدد" : "Unspecified");

    const location =
      (isAr && (doctor.governorateAr || doctor.areaAr)) ||
      doctor.governorate ||
      doctor.area ||
      null;
    const locationLabel = location ? ` — ${location}` : "";

    const availabilityNote =
      doctor.availableToday === true
        ? isAr
          ? " (متاح اليوم)"
          : " (available today)"
        : "";

    const linkLabel = isAr ? "عرض الملف والحجز" : "View profile & book";

    return `${index + 1}. **${doctor.name}** — ${specialty}${meta}${locationLabel}${availabilityNote}  \n   [${linkLabel}](${doctor.bookingPath})`;
  });

  return [intro, "", ...lines, "", note].join("\n");
}

/**
 * Append doctor recommendations after medical analysis content.
 * @param {string} analysisContent
 * @param {Array<object>} doctors
 * @param {'en'|'ar'} locale
 */
export function appendDoctorRecommendations(analysisContent, doctors, locale) {
  const isAr = locale === "ar";
  const heading = isAr ? "## توصيات أطباء من المنصة" : "## Platform doctor recommendations";
  const block = buildDoctorRecommendationMarkdown(doctors, locale);
  return `${analysisContent.trim()}\n\n---\n\n${heading}\n\n${block}`;
}

/**
 * Pure doctor search (no attachment analysis needed).
 * @param {string} message
 * @param {boolean} hasAttachments
 */
export function isPureDoctorSearch(message, hasAttachments) {
  if (hasAttachments) return false;
  return isDoctorRecommendationRequest(message);
}
