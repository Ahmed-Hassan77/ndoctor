import { SPECIALTIES } from "@/lib/specialities";

/**
 * Canonical English specialty names stored in User.specialty (see lib/specialities.js).
 * Used to align chatbot aliases with real database values.
 */
export const PLATFORM_SPECIALTY_NAMES = SPECIALTIES.map((s) => s.name);

/**
 * Each entry maps user phrases (EN/AR) to DB search criteria.
 * - canonical: exact User.specialty value when the platform lists it
 * - searchTerms: extra terms matched against specialty + specialtyAr (contains, case-insensitive)
 */
export const SPECIALTY_ALIAS_ENTRIES = [
  {
    canonical: "Cardiology",
    searchTerms: ["cardiology", "cardiologist", "heart", "قلب", "أخصائي قلب", "طبيب قلب", "القلب", "أمراض القلب", "قلبية"],
    patterns: [
      /\bcardiolog/i,
      /\bheart\s+(?:doctor|specialist|problem)/i,
      /(?:طبيب|دكتور|أخصائي)\s+قلب/,
      /قلب(?:ية)?/,
      /أمراض\s+القلب/,
    ],
  },
  {
    canonical: "Dermatology",
    searchTerms: ["dermatology", "dermatologist", "skin", "جلدية", "جلد", "أمراض جلدية", "الجلدية"],
    patterns: [
      /\bdermatolog/i,
      /\bskin\s+(?:doctor|specialist|problem|condition)/i,
      /(?:طبيب|دكتور|أخصائي)\s+جلد(?:ية)?/,
      /جلدية/,
      /أمراض\s+جلدية/,
    ],
  },
  {
    canonical: "Pediatrics",
    searchTerms: ["pediatrics", "pediatrician", "children", "child", "أطفال", "طب الأطفال", "طبيب أطفال", "الأطفال"],
    patterns: [
      /\bpediatric/i,
      /\bpaediatric/i,
      /\bchild(?:ren)?(?:'?s?)?\s+doctor/i,
      /(?:طبيب|دكتور|أخصائي)\s+أطفال/,
      /طب\s+(?:ال)?أطفال/,
      /أطفال/,
    ],
  },
  {
    // Internal medicine / general practice — platform uses "General Medicine"
    canonical: "General Medicine",
    searchTerms: [
      "general medicine",
      "internal medicine",
      "internist",
      "gp",
      "general practitioner",
      "باطنة",
      "طب باطني",
      "طبيب باطنة",
      "الباطنة",
      "باطنية",
      "أمراض باطنية",
    ],
    patterns: [
      /\binternal\s+medicine/i,
      /\binternist/i,
      /\bgeneral\s+(?:medicine|practitioner)/i,
      /\bgp\b/i,
      /(?:طبيب|دكتور|أخصائي)\s+باطن(?:ة|ية)/,
      /باطن(?:ة|ية)/,
      /طب\s+باطني/,
      /الباطنة/,
      /أمراض\s+باطنية/,
    ],
  },
  {
    canonical: "Orthopedics",
    searchTerms: ["orthopedics", "orthopaedic", "orthopedist", "bone", "joint", "عظام", "مفاصل", "العظام", "روماتيزم", "روماتويد"],
    patterns: [
      /\borthoped/i,
      /\borthopaed/i,
      /\bbone\s+(?:doctor|specialist)/i,
      /\bjoint\s+(?:doctor|specialist|pain)/i,
      /\brheumat/i,
      /(?:طبيب|دكتور|أخصائي)\s+عظام/,
      /عظام/,
      /روماتيزم/,
      /روماتويد/,
      /التهاب\s+(?:ال)?مفاصل/,
    ],
  },
  {
    canonical: "Obstetrics & Gynecology",
    searchTerms: [
      "obstetrics",
      "gynecology",
      "gynecologist",
      "ob-gyn",
      "obgyn",
      "نساء",
      "توليد",
      "نساء وتوليد",
      "أمراض نساء",
      "النساء والتوليد",
    ],
    patterns: [
      /\bgynecolog/i,
      /\bobstetric/i,
      /\bob[\s-]?gyn/i,
      /\bwomen'?s?\s+health/i,
      /(?:طبيب|دكتور|أخصائي)\s+(?:نساء|توليد)/,
      /نساء\s*(?:و|&)+\s*توليد/,
      /(?:نساء|توليد)/,
    ],
  },
  {
    canonical: "Neurology",
    searchTerms: ["neurology", "neurologist", "brain", "nerve", "أعصاب", "مخ", "مخ وأعصاب", "المخ والأعصاب", "الأعصاب"],
    patterns: [
      /\bneurolog/i,
      /\bbrain\s+(?:doctor|specialist)/i,
      /\bnerve\s+(?:doctor|specialist)/i,
      /(?:طبيب|دكتور|أخصائي)\s+(?:مخ|أعصاب)/,
      /مخ\s*(?:و|&)+\s*أعصاب/,
      /المخ\s*(?:و|&)+\s*(?:ال)?أعصاب/,
      /(?:مخ|أعصاب)/,
    ],
  },
  {
    canonical: "Ophthalmology",
    searchTerms: ["ophthalmology", "ophthalmologist", "eye", "vision", "عيون", "طبيب عيون", "العيون"],
    patterns: [
      /\bophthalmolog/i,
      /\beye\s+(?:doctor|specialist|problem|pain)/i,
      /\beye(?:s)?\b/i,
      /\bvision\s+(?:specialist|problem)/i,
      /(?:طبيب|دكتور|أخصائي)\s+عيون/,
      /عيون/,
      /عين(?:ي|ى|ه|ها)?/,
    ],
  },
  {
    // ENT is not a platform dropdown value; doctors may store it in specialty/specialtyAr
    canonical: null,
    searchTerms: [
      "ent",
      "otolaryngology",
      "ear nose throat",
      "أنف",
      "أذن",
      "حنجرة",
      "أنف وأذن",
      "أنف وأذن وحنجرة",
      "الأنف والأذن والحنجرة",
    ],
    patterns: [
      /\bent\b/i,
      /\botolaryngolog/i,
      /\bear[\s-]?nose[\s-]?throat/i,
      /\bear\s+(?:doctor|specialist)/i,
      /\bthroat\s+(?:doctor|specialist)/i,
      /(?:طبيب|دكتور|أخصائي)\s+(?:أنف|أذن|حنجرة)/,
      /أنف\s*(?:و|&)+\s*أذن(?:\s*(?:و|&)+\s*حنجرة)?/,
      /(?:أنف|أذن|حنجرة)/,
    ],
  },
  {
    canonical: "Pulmonology",
    searchTerms: ["pulmonology", "pulmonologist", "lung", "chest", "respiratory", "صدر", "رئة", "الصدر", "أمراض صدرية", "الرئة"],
    patterns: [
      /\bpulmonolog/i,
      /\blung\s+(?:doctor|specialist)/i,
      /\brespiratory\s+(?:doctor|specialist)/i,
      /\bchest\s+(?:doctor|specialist)/i,
      /(?:طبيب|دكتور|أخصائي)\s+صدر/,
      /(?:صدر|صدرية|رئة|الرئة)/,
      /أمراض\s+صدرية/,
    ],
  },
  {
    // Nephrology not in platform dropdown; search by terms
    canonical: null,
    searchTerms: ["nephrology", "nephrologist", "kidney", "renal", "كلى", "طبيب كلى", "الكلى", "أمراض الكلى"],
    patterns: [
      /\bnephrolog/i,
      /\bkidney\s+(?:doctor|specialist|disease|problem)/i,
      /\brenal\s+(?:doctor|specialist)/i,
      /(?:طبيب|دكتور|أخصائي)\s+كلى/,
      /كلى/,
      /(?:ال)?كلى/,
      /أمراض\s+(?:ال)?كلى/,
    ],
  },
  {
    canonical: "Urology",
    searchTerms: ["urology", "urologist", "urinary", "bladder", "prostate", "مسالك", "مسالك بولية", "المسالك البولية"],
    patterns: [
      /\burolog/i,
      /\burinary\s+(?:doctor|specialist|tract)/i,
      /\bbladder\s+(?:doctor|specialist)/i,
      /\bprostate/i,
      /(?:طبيب|دكتور|أخصائي)\s+مسالك(?:\s+بولية)?/,
      /مسالك(?:\s+بولية)?/,
      /المسالك\s+البولية/,
    ],
  },
  {
    canonical: "Psychiatry",
    searchTerms: ["psychiatry", "psychiatrist", "mental health", "psychology", "نفسية", "نفس", "طبيب نفسي", "الطب النفسي", "نفساني"],
    patterns: [
      /\bpsychiatr/i,
      /\bmental\s+health/i,
      /\bpsycholog/i,
      /(?:طبيب|دكتور|أخصائي)\s+نفس(?:ي|ية)?/,
      /(?:طب\s+)?(?:نفس(?:ي|ية)?|النفس)/,
      /نفساني/,
      /الطب\s+النفسي/,
    ],
  },
  {
    canonical: null,
    searchTerms: ["dentistry", "dentist", "dental", "أسنان", "طبيب أسنان", "طب الأسنان", "الأسنان"],
    patterns: [
      /\bdentist/i,
      /\bdental\s+(?:doctor|specialist|care)/i,
      /\bdentistry/i,
      /(?:طبيب|دكتور)\s+أسنان/,
      /(?:طب\s+)?(?:ال)?أسنان/,
    ],
  },
  {
    canonical: null,
    searchTerms: ["nutrition", "nutritionist", "dietitian", "diet", "تغذية", "أخصائي تغذية"],
    patterns: [
      /\bnutrition/i,
      /\bnutritionist/i,
      /\bdietitian/i,
      /\bdiet\s+specialist/i,
      /(?:أخصائي|طبيب)\s+تغذية/,
      /تغذية/,
    ],
  },
  {
    canonical: null,
    searchTerms: [
      "physical therapy",
      "physiotherapy",
      "physiotherapist",
      "rehabilitation",
      "علاج طبيعي",
      "أخصائي علاج طبيعي",
    ],
    patterns: [
      /\bphysiotherap/i,
      /\bphysical\s+therapy/i,
      /\brehabilitation\s+specialist/i,
      /(?:أخصائي|طبيب)\s+علاج\s+طبيعي/,
      /علاج\s+طبيعي/,
    ],
  },
  {
    canonical: "Endocrinology",
    searchTerms: [
      "endocrinology", "endocrinologist", "diabetes", "thyroid", "hormone",
      "غدد", "سكر", "غدد صماء", "الغدد الصماء", "الغدد", "سكري", "سكر وغدد",
      "هرمونات", "الهرمونات", "طبيب غدد", "طبيب سكر",
    ],
    patterns: [
      /\bendocrinolog/i,
      /\bdiabetes\s+(?:doctor|specialist)/i,
      /\bdiabetes\b/i,
      /\bthyroid\s+(?:doctor|specialist)/i,
      /\bthyroid\b/i,
      /\bhormone\s+(?:doctor|specialist)/i,
      /(?:طبيب|دكتور|أخصائي)\s+(?:غدد|سكر)/,
      /غدد\s*(?:ال)?صماء/,
      /الغدد\s+الصماء/,
      /سكر\s*(?:و|&)+\s*غدد/,
      /(?:غد[ةد]|سكر(?:ي)?|هرمون(?:ات)?)/,
    ],
  },
  {
    canonical: "Gastroenterology",
    searchTerms: [
      "gastroenterology", "gastroenterologist", "digestive", "stomach", "liver", "hepatology",
      "هضم", "معدة", "جهاز هضمي", "الجهاز الهضمي", "كبد", "الكبد", "قولون", "القولون",
      "أمراض الجهاز الهضمي", "هضمي",
    ],
    patterns: [
      /\bgastroenterolog/i,
      /\bdigestive\s+(?:specialist|doctor|system|disease)/i,
      /\bstomach\s+(?:doctor|specialist|problem)/i,
      /\bliver\s+(?:doctor|specialist|disease)/i,
      /\bhepatolog/i,
      /\bcolon\s+(?:doctor|specialist)/i,
      /(?:طبيب|دكتور|أخصائي)\s+(?:هضم|معدة|كبد|قولون)/,
      /(?:هضم|هضمي|الهضمي)/,
      /جهاز\s*هضمي/,
      /الجهاز\s+الهضمي/,
      /(?:معدة|المعدة)/,
      /(?:كبد|الكبد)/,
      /(?:قولون|القولون)/,
      /أمراض\s+(?:الجهاز\s+)?الهضمي/,
    ],
  },
  {
    canonical: "Oncology",
    searchTerms: ["oncology", "oncologist", "cancer", "tumor", "tumour", "أورام", "سرطان", "الأورام", "ورم"],
    patterns: [
      /\boncolog/i,
      /\bcancer\s+(?:specialist|doctor|treatment)/i,
      /\bcancer\b/i,
      /\btumou?r\s+(?:specialist|doctor)/i,
      /(?:طبيب|دكتور|أخصائي)\s+أورام/,
      /(?:أورام|ورم|سرطان)/,
      /الأورام/,
    ],
  },
  {
    canonical: "Radiology",
    searchTerms: ["radiology", "radiologist", "imaging", "أشعة", "تشخيص بالأشعة", "الأشعة"],
    patterns: [/\bradiolog/i, /\bimaging\s+specialist/i, /(?:طبيب|أخصائي)\s+أشعة/, /أشعة/, /الأشعة/],
  },
  {
    canonical: null,
    searchTerms: ["allergy", "immunology", "allergist", "حساسية", "مناعة", "حساسية ومناعة", "الحساسية والمناعة"],
    patterns: [
      /\ballerg/i,
      /\bimmunolog/i,
      /(?:طبيب|دكتور|أخصائي)\s+(?:حساسية|مناعة)/,
      /حساسية\s*(?:و|&)+\s*مناعة/,
      /(?:حساسية|مناعة)/,
    ],
  },
  {
    // Rheumatology — maps to Orthopedics on the platform but searched by terms
    canonical: null,
    searchTerms: ["rheumatology", "rheumatologist", "روماتيزم", "روماتويد", "التهاب مفاصل", "أمراض روماتيزمية"],
    patterns: [
      /\brheumatol/i,
      /\brheumatoid/i,
      /(?:طبيب|دكتور|أخصائي)\s+روماتيزم/,
      /روماتيزم/,
      /روماتويد/,
      /أمراض\s+روماتيزمية/,
    ],
  },
  {
    // Hepatology — subspecialty, maps to Gastroenterology
    canonical: "Gastroenterology",
    searchTerms: ["hepatology", "hepatologist", "liver disease", "كبد", "أمراض الكبد", "الكبد"],
    patterns: [
      /\bhepatolog/i,
      /\bliver\b/i,
      /(?:طبيب|دكتور|أخصائي)\s+كبد/,
      /(?:كبد|الكبد)/,
      /أمراض\s+(?:ال)?كبد/,
    ],
  },
];

/**
 * @param {string} text
 * @returns {{ canonical: string | null; searchTerms: string[]; matchedLabel: string } | null}
 */
export function resolveSpecialtyFromText(text) {
  const combined = text || "";
  for (const entry of SPECIALTY_ALIAS_ENTRIES) {
    if (entry.patterns.some((pattern) => pattern.test(combined))) {
      const terms = new Set(entry.searchTerms);
      if (entry.canonical) terms.add(entry.canonical);
      return {
        canonical: entry.canonical,
        searchTerms: [...terms],
        matchedLabel: entry.canonical || entry.searchTerms[0] || "Specialty",
      };
    }
  }
  return null;
}

/**
 * Build Prisma filters — exact match on User.specialty only (platform DB column).
 * @param {{ canonical: string | null; searchTerms: string[] }} resolved
 * @returns {import('@prisma/client').Prisma.UserWhereInput[]}
 */
export function buildSpecialtyWhereClauses(resolved) {
  if (!resolved?.canonical) return [];

  return [{ specialty: { equals: resolved.canonical, mode: "insensitive" } }];
}

/**
 * @param {string | null | undefined} canonical
 */
export function isPlatformSpecialty(canonical) {
  if (!canonical) return false;
  return PLATFORM_SPECIALTY_NAMES.some(
    (name) => name.toLowerCase() === canonical.toLowerCase()
  );
}
