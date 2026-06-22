/** @typedef {'emergency' | 'urgent' | 'routine' | 'informational'} UrgencyLevel */

const RED_FLAG_PATTERNS = [
  {
    level: "emergency",
    en: [
      /severe chest pain/i,
      /can't breathe|cannot breathe|difficulty breathing|shortness of breath/i,
      /stroke|facial droop|slurred speech|sudden numbness|sudden weakness/i,
      /unconscious|passed out|loss of consciousness|fainted and (?:not|won't) wake/i,
      /severe bleeding|uncontrolled bleeding/i,
      /suicid|self[- ]?harm|kill myself|want to die/i,
      /heart attack/i,
      /anaphylaxis|throat swelling|can't swallow/i,
    ],
    ar: [
      /ألم شديد في الصدر/,
      /لا أستطيع التنفس|صعوبة في التنفس|ضيق تنفس/,
      /جلطة|سكتة|تدلي الوجه|تلفظ مشوش|خدر مفاجئ|ضعف مفاجئ/,
      /فقدان الوعي|غيبوبة|إغماء شديد/,
      /نزيف شديد|نزيف لا يتوقف/,
      /انتحار|إيذاء النفس|أريد أن أموت/,
      /أزمة قلبية/,
    ],
  },
  {
    level: "urgent",
    en: [
      /high fever|fever above 39|104\s*°?f/i,
      /severe pain/i,
      /vomiting blood|blood in stool|black stool/i,
      /pregnant.+(?:bleeding|pain)/i,
      /head injury|hit my head/i,
    ],
    ar: [
      /حرارة عالية|حمى شديدة/,
      /ألم شديد/,
      /قيء دموي|دم في البراز/,
      /حامل.+(?:نزيف|ألم)/,
      /إصابة في الرأس/,
    ],
  },
];

const SPECIALTY_HINTS = [
  { keywords: [/chest pain|heart|palpitation|ضغط|قلب|صدر/i], specialty: "Cardiology" },
  { keywords: [/skin|rash|acne|حساسية جلد|طفح|جلد(?:ية)?/i], specialty: "Dermatology" },
  { keywords: [/diabetes|thyroid|hormone|سكر|غد[ةد]|هرمون|غدد\s*صماء/i], specialty: "Endocrinology" },
  { keywords: [/child|baby|pediatric|طفل|رضيع|أطفال/i], specialty: "Pediatrics" },
  { keywords: [/pregnant|obstetric|gynec|حامل|ولادة|نساء/i], specialty: "Obstetrics & Gynecology" },
  { keywords: [/bone|joint|fracture|knee|back pain|عظم|عظام|مفصل|ركبة|ظهر|روماتيزم|روماتويد/i], specialty: "Orthopedics" },
  { keywords: [/eye|vision|عين|عيون|نظر|عيني|عينى|زغللة/i], specialty: "Ophthalmology" },
  { keywords: [/ear|nose|throat|sinus|أذن|أنف|حنجرة|جيوب/i], specialty: "ENT" },
  { keywords: [/stomach|abdomen|digest|reflux|nausea|vomiting|liver|hepat|colon|معدة|بطن|هضم|غثيان|قيء|كبد|قولون|جهاز\s*هضمي|حموضة/i], specialty: "Gastroenterology" },
  { keywords: [/headache|migraine|seizure|neuro|صداع|شقيقة|تشنج|أعصاب|مخ/i], specialty: "Neurology" },
  { keywords: [/anxiety|depression|mental|psych|قلق|اكتئاب|نفس(?:ي|ية)?/i], specialty: "Psychiatry" },
  { keywords: [/cough|lung|asthma|breath|سعال|رئة|ربو|كحة/i], specialty: "Pulmonology" },
  { keywords: [/kidney|urine|urinary|كلى|بول|مسالك/i], specialty: "Nephrology" },
  { keywords: [/allergy|allergic|حساسية|مناعة/i], specialty: "Allergy and Immunology" },
  { keywords: [/cancer|tumor|tumour|oncol|أورام|ورم|سرطان/i], specialty: "Oncology" },
];

/**
 * Extended symptom vocabulary — catches Arabic dialect + colloquial forms.
 * Used by analyzeSymptoms to bump "informational" → "routine".
 */
const EXTENDED_SYMPTOM_INDICATORS = [
  // Arabic first-person complaint verbs
  /(?:اعانى|أعاني|اعاني|بعاني|بأعاني)/,
  /(?:عندي|عندى|عند(?:ه|ها|هم))/,
  /(?:أشعر|بحس|حاسس|حاسة|بشتكي|أشتكي)/,
  /(?:يعاني|تعاني|يشتكي|تشتكي)/,
  // Arabic symptom nouns (expanded)
  /(?:ألم|الم|آلام|الام|وجع|توجع)/,
  /(?:صداع|حرارة|حمى|سخونة|سخونية)/,
  /(?:حكة|حكه|هرش)/,
  /(?:احمرار|إحمرار)/,
  /(?:إجهاد|اجهاد|إرهاق|ارهاق|تعب)/,
  /(?:التهاب|إلتهاب)/,
  /(?:تورم|انتفاخ|ورم)/,
  /(?:حرقان|حرقة)/,
  /(?:تنميل|خدر)/,
  /(?:غثيان|قيء|ترجيع)/,
  /(?:سعال|كحة)/,
  /(?:طفح|بثور)/,
  /(?:دوخة|دوار)/,
  /(?:نزيف|نزف)/,
  /(?:ضيق|ضيقة)/,
  /(?:إسهال|اسهال|إمساك|امساك)/,
  /(?:زغللة|عدم\s+وضوح)/,
  /(?:ضعف|هبوط)/,
  /(?:أرق|ارق)/,
  // Egyptian / dialect prefixes
  /(?:فى|في)\s+(?:ألم|الم|وجع|إجهاد|اجهاد|احمرار|حكة|التهاب|تعب|ضعف)/,
  // English expanded
  /\b(?:i\s+have|i\s+feel|i'm\s+having|i\s+am\s+having|i'm\s+feeling|i\s+am\s+feeling|i\s+suffer|i'm\s+suffering|i\s+am\s+suffering)/i,
  /\b(?:pain|ache|fever|rash|cough|nausea|vomit|headache|dizzy|swelling|bleeding|redness|itching|irritation|tired|fatigue|exhaustion|inflammation|burning|numbness|tingling|bloating)\b/i,
  /\b(?:my\s+(?:eye|eyes|head|stomach|chest|back|knee|throat|ear|skin|hand|foot|leg|arm)\s+(?:hurt|ache|pain|is\s+(?:red|swollen|itchy|burning)))/i,
];

/**
 * @param {string} text
 * @returns {{ level: UrgencyLevel; redFlags: string[]; specialties: string[] }}
 */
export function analyzeSymptoms(text) {
  const combined = text || "";
  const redFlags = [];
  let level = "informational";

  for (const group of RED_FLAG_PATTERNS) {
    const patterns = [...group.en, ...group.ar];
    for (const pattern of patterns) {
      if (pattern.test(combined)) {
        redFlags.push(pattern.source);
        if (group.level === "emergency") level = "emergency";
        else if (group.level === "urgent" && level !== "emergency") {
          level = "urgent";
        }
      }
    }
  }

  // Check extended symptom indicators to upgrade "informational" → "routine"
  if (level === "informational") {
    const hasSymptomIndicator = EXTENDED_SYMPTOM_INDICATORS.some((re) => re.test(combined));
    if (hasSymptomIndicator) {
      level = "routine";
    } else if (combined.trim().length > 20) {
      level = "routine";
    }
  }

  const specialties = [];
  for (const hint of SPECIALTY_HINTS) {
    if (hint.keywords.some((re) => re.test(combined))) {
      specialties.push(hint.specialty);
    }
  }

  return {
    level,
    redFlags: [...new Set(redFlags)],
    specialties: [...new Set(specialties)],
  };
}

export function inferSpecialtiesFromText(text) {
  return analyzeSymptoms(text).specialties;
}
