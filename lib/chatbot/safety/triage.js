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
  { keywords: [/skin|rash|acne|حساسية جلد|طفح|جلد/i], specialty: "Dermatology" },
  { keywords: [/diabetes|thyroid|hormone|سكر|غدة|هرمون/i], specialty: "Endocrinology" },
  { keywords: [/child|baby|pediatric|طفل|رضيع|أطفال/i], specialty: "Pediatrics" },
  { keywords: [/pregnant|obstetric|gynec|حامل|ولادة|نساء/i], specialty: "Obstetrics and Gynecology" },
  { keywords: [/bone|joint|fracture|knee|back pain|عظم|مفصل|ركبة|ظهر/i], specialty: "Orthopedics" },
  { keywords: [/eye|vision|عين|نظر/i], specialty: "Ophthalmology" },
  { keywords: [/ear|nose|throat|sinus|أذن|أنف|حنجرة|جيوب/i], specialty: "ENT" },
  { keywords: [/stomach|abdomen|digest|reflux| nausea| vomiting|معدة|بطن|هضم|غثيان|قيء/i], specialty: "Gastroenterology" },
  { keywords: [/headache|migraine|seizure|neuro|صداع|شقيقة|تشنج|أعصاب/i], specialty: "Neurology" },
  { keywords: [/anxiety|depression|mental|psych|قلق|اكتئاب|نفس/i], specialty: "Psychiatry" },
  { keywords: [/cough|lung|asthma|breath|سعال|رئة|ربو/i], specialty: "Pulmonology" },
  { keywords: [/kidney|urine|urinary|كلى|بول/i], specialty: "Nephrology" },
  { keywords: [/allergy|allergic|حساسية/i], specialty: "Allergy and Immunology" },
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

  if (level === "informational" && combined.trim().length > 20) {
    level = "routine";
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
