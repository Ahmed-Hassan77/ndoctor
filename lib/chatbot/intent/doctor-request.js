const patterns = {
  en: [
    /\brecommend\s+(?:a\s+)?doctor/i,
    /\bsuggest\s+(?:a\s+)?doctor/i,
    /\bfind\s+(?:a\s+)?doctor/i,
    /\b(?:need|want|looking\s+for)\s+a\s+doctor/i,
    /\brecommend\s+doctors/i,
    /\bsuggest\s+doctors/i,
    /\bfind\s+doctors/i,
    /\b(?:cardiologist|dermatologist|pediatrician|neurologist|psychiatrist|gynecologist|orthopedist|ophthalmologist|ent\s+specialist|pulmonologist|nephrologist|endocrinologist|gastroenterologist)\b/i,
  ],
  ar: [
    /رشّح\s+(?:لي\s+)?(?:دكتور|طبيب|دكاترة|أطباء)/,
    /اقترح\s+(?:علي\s+)?(?:دكتور|طبيب|دكاترة|أطباء)/,
    /دور\s+(?:على\s+)?(?:دكتور|طبيب|دكاترة|أطباء)/,
    /(?:عايز|عاوز|بدور\s+على|أريد)\s+(?:دكتور|طبيب|دكاترة|أطباء)/,
    /(?:أخصائي|طبيب)\s+(?:قلب|جلدية|أطفال|عظام|عيون|أنف|أذن|حنجرة|نساء|توليد|نفس|أعصاب|باطنة|مسالك|كلى|صدر)/,
  ],
};

const SPECIALTY_ALIASES = [
  {
    patterns: [/\bcardiolog/i, /heart\s+doctor/i, /قلب/i, /أخصائي\s+قلب/i, /طبيب\s+قلب/i],
    specialty: "Cardiology",
  },
  {
    patterns: [/\bdermatolog/i, /skin\s+doctor/i, /جلد/i, /جلدية/i, /طبيب\s+جلدية/i],
    specialty: "Dermatology",
  },
  {
    patterns: [/\bpediatric/i, /child\s+doctor/i, /أطفال/i, /طبيب\s+أطفال/i, /طب\s+الأطفال/i],
    specialty: "Pediatrics",
  },
  {
    patterns: [/\bneurolog/i, /أعصاب/i, /طبيب\s+أعصاب/i],
    specialty: "Neurology",
  },
  {
    patterns: [/\bpsychiatr/i, /mental\s+health/i, /نفس/i, /طبيب\s+نفس/i],
    specialty: "Psychiatry",
  },
  {
    patterns: [/\bgynecolog/i, /obstetric/i, /نساء/i, /توليد/i, /نساء\s+وتوليد/i],
    specialty: "Obstetrics and Gynecology",
  },
  {
    patterns: [/\borthoped/i, /bone\s+doctor/i, /عظام/i, /طبيب\s+عظام/i],
    specialty: "Orthopedics",
  },
  {
    patterns: [/\bophthalmolog/i, /eye\s+doctor/i, /عيون/i, /طبيب\s+عيون/i],
    specialty: "Ophthalmology",
  },
  {
    patterns: [/\bent\b/i, /ear\s+nose\s+throat/i, /أنف/i, /أذن/i, /حنجرة/i],
    specialty: "ENT",
  },
  {
    patterns: [/\bpulmonolog/i, /lung\s+doctor/i, /صدر/i, /طبيب\s+صدر/i],
    specialty: "Pulmonology",
  },
  {
    patterns: [/\bnephrolog/i, /kidney\s+doctor/i, /كلى/i, /طبيب\s+كلى/i],
    specialty: "Nephrology",
  },
  {
    patterns: [/\bendocrinolog/i, /diabetes\s+doctor/i, /غدة/i, /سكر/i, /باطنة/i],
    specialty: "Endocrinology",
  },
  {
    patterns: [/\bgastroenterolog/i, /stomach\s+doctor/i, /هضم/i, /معدة/i],
    specialty: "Gastroenterology",
  },
  {
    patterns: [/\ballerg/i, /حساسية/i],
    specialty: "Allergy and Immunology",
  },
];

/**
 * @param {string} text
 * @returns {boolean}
 */
export function isDoctorRecommendationRequest(text) {
  const combined = text || "";
  for (const lang of ["en", "ar"]) {
    for (const pattern of patterns[lang]) {
      if (pattern.test(combined)) return true;
    }
  }
  return false;
}

/**
 * @param {string} text
 * @returns {string|null}
 */
export function extractSpecialtyHint(text) {
  const combined = text || "";
  for (const alias of SPECIALTY_ALIASES) {
    if (alias.patterns.some((pattern) => pattern.test(combined))) {
      return alias.specialty;
    }
  }
  return null;
}

/**
 * @param {Array<object>} doctors
 * @param {string} locale
 * @returns {string}
 */
export function buildDoctorRecommendationMarkdown(doctors, locale) {
  const isAr = locale === "ar";
  const intro = isAr
    ? "إليك بعض الأطباء الموثقين على المنصة الذين قد تناسبك:"
    : "Here are some verified doctors you may consider:";
  const note = isAr
    ? "_هذه التوصيات مبنية على بيانات المنصة (التقييمات والتخصص)._"
    : "_These suggestions are based on platform data (ratings and specialty)._";

  const lines = doctors.map((doctor, index) => {
    const rating =
      doctor.averageRating != null ? `${Number(doctor.averageRating).toFixed(1)}⭐` : "";
    const reviews =
      doctor.totalReviews != null
        ? `${doctor.totalReviews} ${isAr ? "تقييم" : "reviews"}`
        : "";
    const meta = [rating, reviews].filter(Boolean).join(", ");
    const specialty = doctor.specialty || (isAr ? "عام" : "General");
    const linkLabel = isAr ? "عرض الملف والحجز" : "View profile & book";
    const metaSuffix = meta ? ` (${meta})` : "";

    return `${index + 1}. **${doctor.name}** – ${specialty}${metaSuffix}  \n   [${linkLabel}](${doctor.bookingPath})`;
  });

  return [intro, "", ...lines, "", note].join("\n");
}
