import { analyzeSymptoms } from "@/lib/chatbot/safety/triage";
import { resolveSpecialtyFromText } from "@/lib/chatbot/intent/specialty-map";
import {
  isDoctorRecommendationRequest,
  isGenericDoctorRequest,
  wantsDoctorAfterAnalysis,
} from "@/lib/chatbot/intent/doctor-request";
import {
  isDoctorRecommendationConfirmation,
  isDoctorRecommendationDecline,
} from "@/lib/chatbot/intent/confirmation";
import { getRecommendationContext, looksLikeSymptomOrComplaint } from "@/lib/chatbot/state/recommendation-context";

/** Minimum score required to query the database for doctors. */
export const RECOMMENDATION_INTENT_THRESHOLD = 0.8;

/**
 * @typedef {'greeting' | 'symptom_analysis' | 'medical_report_analysis' | 'doctor_search' | 'booking_question' | 'general_medical_question' | 'general_conversation' | 'doctor_recommendation_confirmation' | 'doctor_recommendation_decline'} ChatIntent
 */

const GREETING_PATTERNS = {
  en: [/^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|greetings)\b/i, /^how\s+are\s+you/i],
  ar: [/^(?:مرحبا|مرحباً|أهلا|أهلاً|السلام\s+عليكم|صباح\s+الخير|مساء\s+الخير)/, /^ازيك|^إزيك/],
};

const BOOKING_PATTERNS = {
  en: [
    /\bhow\s+(?:do\s+i|to)\s+book/i,
    /\bbook(?:ing)?\s+(?:an?\s+)?appointment/i,
    /\bschedule\s+(?:an?\s+)?(?:visit|appointment)/i,
    /\breschedule\b/i,
    /\bcancel\s+(?:my\s+)?appointment/i,
    /\bpayment\s+(?:method|options)/i,
    /\brefund\b/i,
  ],
  ar: [
    /(?:كيف|ازاي|إزاي)\s+(?:أحجز|احجز|أعمل\s+حجز)/,
    /حجز\s+موعد/,
    /(?:إلغاء|الغاء)\s+(?:ال)?موعد/,
    /(?:طرق|وسائل)\s+الدفع/,
  ],
};

const WEBSITE_PATTERNS = {
  en: [
    /\bhow\s+does\s+(?:this\s+)?(?:site|platform|app|website)\s+work/i,
    /\bwhat\s+is\s+(?:shifaa|ndoctor)/i,
    /\babout\s+(?:the\s+)?platform/i,
  ],
  ar: [/(?:إيه|ما)\s+(?:هي|هو)\s+(?:المنصة|موقع|شفاء|Shifaa|NDoctor|ndoctor)/i, /(?:كيف\s+تعمل|عن)\s+(?:ال)?منصة/],
};

const GENERAL_MEDICAL_PATTERNS = {
  en: [
    /\bwhat\s+is\s+(?:diabetes|hypertension|covid|asthma|cancer|malaria)/i,
    /\bwhat\s+are\s+(?:the\s+)?(?:symptoms|side\s+effects)\s+of/i,
    /\bhow\s+(?:do|does)\s+\w+\s+(?:work|spread|treat)/i,
    /\b(?:tell\s+me\s+about|explain)\s+(?:the\s+)?(?:disease|condition|medication|drug|medicine|treatment)/i,
    /\b(?:dosage|dose|mg|ml)\s+of/i,
    /\bcan\s+i\s+take\s+\w+\s+(?:with|for)/i,
  ],
  ar: [
    /(?:إيه|ما)\s+(?:هو|هي)\s+(?:مرض|دواء|علاج|لقاح)/,
    /(?:أعراض|آثار\s+جانبية)\s+(?:مرض|دواء)/,
    /(?:جرعة|جرعات)\s+/,
    /(?:هل\s+ينفع|ممكن\s+آخذ)\s+.*(?:دواء|علاج)/,
    /(?:اشرح|وضّ?ح)\s+(?:مرض|دواء|حالة)/,
  ],
};

const SYMPTOM_PATTERNS = {
  en: [
    /\b(?:i\s+have|i'm\s+having|i\s+am\s+having|my\s+(?:child|baby|son|daughter)\s+has)\s+/i,
    /\b(?:i\s+feel|i'm\s+feeling|i\s+am\s+feeling|i\s+suffer|i'm\s+suffering|i\s+am\s+suffering)\s+/i,
    /\b(?:pain|ache|fever|rash|cough|nausea|vomit|headache|dizzy|swelling|bleeding)\b/i,
    /\b(?:redness|itching|irritation|tired|fatigue|exhaustion|inflammation|burning|numbness|tingling|bloating)\b/i,
    /\b(?:hurt|hurts|sore|swollen|itchy|stiff|cramping|throbbing)\b/i,
    /\bmy\s+(?:eye|eyes|head|stomach|chest|back|knee|throat|ear|skin|hand|foot|leg|arm)\s+(?:hurt|ache|is)/i,
  ],
  ar: [
    // First-person complaint verbs (standard + colloquial)
    /(?:عندي|عندى|عند(?:ه|ها|هم))\s*/,
    /(?:أشعر|بحس|حاسس|حاسة)\s*/,
    /(?:اعانى|أعاني|اعاني|بعاني|بأعاني)\s*/,
    /(?:يعاني|تعاني|يشتكي|تشتكي|بشتكي|أشتكي)\s*/,
    /(?:ابني|ابنتي|ولدي|بنتي|طفلي)\s+(?:عند|بي|فيه|فيها)/,
    // Body part + possessive suffix
    /(?:عين(?:ي|ى|ه|ها)|ودن(?:ي|ه)|بطن(?:ي|ه)|راس(?:ي|ه)|ضهر(?:ي|ه)|صدر(?:ي|ه)|ركبت(?:ي|ه))/,
    // Symptom nouns (massively expanded)
    /(?:ألم|الم|آلام|الام|وجع|توجع)/,
    /(?:صداع|حرارة|حمى|سخونة|سخونية)/,
    /(?:حكة|حكه|هرش)/,
    /(?:احمرار|إحمرار)/,
    /(?:إجهاد|اجهاد|إرهاق|ارهاق|تعب)/,
    /(?:التهاب|إلتهاب)/,
    /(?:تورم|انتفاخ)/,
    /(?:حرقان|حرقة)/,
    /(?:تنميل|خدر)/,
    /(?:غثيان|قيء|ترجيع)/,
    /(?:سعال|كحة)/,
    /(?:طفح|بثور)/,
    /(?:دوخة|دوار)/,
    /(?:ضيق|ضيقة)/,
    /(?:إسهال|اسهال|إمساك|امساك)/,
    /(?:زغللة)/,
    /(?:ضعف|هبوط)/,
    /(?:أرق|ارق)/,
    /(?:نزيف|نزف)/,
    // Egyptian dialect: "فى ... فى" structure (there is ... in)
    /(?:فى|في)\s+(?:ألم|الم|وجع|إجهاد|اجهاد|احمرار|حكة|التهاب|تعب|ضعف|تورم|حرقان|تنميل)/,
  ],
};

/**
 * @param {string} text
 * @param {Record<string, RegExp[]>} patternMap
 */
function matchesAny(text, patternMap) {
  const combined = text || "";
  for (const patterns of Object.values(patternMap)) {
    for (const pattern of patterns) {
      if (pattern.test(combined)) return true;
    }
  }
  return false;
}

/**
 * Explicit doctor-seeking language (must NOT match symptoms alone).
 * @param {string} text
 */
export function isExplicitDoctorSearch(text) {
  return isDoctorRecommendationRequest(text);
}

/**
 * @param {string} message
 * @param {{ level: string; specialties: string[] }} triage
 */
function looksLikeSymptomDescription(message, triage) {
  const combined = (message || "").trim();
  if (!combined) return false;
  if (isExplicitDoctorSearch(combined)) return false;
  if (matchesAny(combined, GENERAL_MEDICAL_PATTERNS)) return false;

  // If our expanded patterns match, it's a symptom
  if (matchesAny(combined, SYMPTOM_PATTERNS)) return true;

  // Triage detected specialties = symptom-like
  if (triage.specialties.length > 0) return true;

  // Triage bumped level to routine/urgent = likely symptom
  if (triage.level === "urgent" || triage.level === "routine") {
    return looksLikeSymptomOrComplaint(combined);
  }

  return false;
}

/**
 * Score how strongly the user wants doctor recommendations (0–1).
 * @param {object} ctx
 */
export function scoreRecommendationIntent(ctx) {
  const { message, hasAttachments, historyRows, triage } = ctx;
  const text = (message || "").trim();
  const stored = getRecommendationContext(historyRows || []);

  if (isDoctorRecommendationDecline(text) && stored) return 0;

  if (isDoctorRecommendationConfirmation(text) && stored) return 0.95;

  if (isDoctorRecommendationConfirmation(text) && !stored) return 0.5;

  if (isGenericDoctorRequest(text)) return 0.85;

  if (isExplicitDoctorSearch(text)) {
    const specialty = resolveSpecialtyFromText(text);
    return specialty ? 0.95 : 0.85;
  }

  if (hasAttachments && wantsDoctorAfterAnalysis(text)) return 0;

  if (looksLikeSymptomDescription(text, triage)) return 0;
  if (matchesAny(text, GREETING_PATTERNS)) return 0;
  if (matchesAny(text, GENERAL_MEDICAL_PATTERNS)) return 0;
  if (matchesAny(text, WEBSITE_PATTERNS)) return 0;
  if (matchesAny(text, BOOKING_PATTERNS)) return 0;

  return 0;
}

/**
 * Classify the user turn into a single primary intent.
 * @param {object} ctx
 * @returns {{ intent: ChatIntent; recommendationIntent: number; suggestedSpecialties: string[]; pendingOffer: object | null }}
 */
export function classifyChatIntent(ctx) {
  const { message, hasAttachments, historyRows } = ctx;
  const text = (message || "").trim();
  const triage = ctx.triage ?? analyzeSymptoms(text);
  const storedContext = getRecommendationContext(historyRows || []);
  const recommendationIntent = scoreRecommendationIntent({
    message,
    hasAttachments,
    historyRows,
    triage,
  });

  const resolved = resolveSpecialtyFromText(text);
  const suggestedSpecialties = [
    ...new Set([
      ...(resolved?.canonical ? [resolved.canonical] : []),
      ...triage.specialties,
    ]),
  ].filter(Boolean);

  console.log("[chatbot:classifier] classifying", JSON.stringify({
    message: text?.slice(0, 80),
    triageLevel: triage.level,
    triageSpecialties: triage.specialties,
    resolvedSpecialty: resolved?.canonical ?? null,
    storedContext: storedContext ? { specialty: storedContext.specialty, source: storedContext.source } : null,
    recommendationIntent,
    hasAttachments,
  }));

  // Confirmation / decline must be checked before other intents
  if (isDoctorRecommendationDecline(text) && storedContext) {
    return {
      intent: "doctor_recommendation_decline",
      recommendationIntent: 0,
      suggestedSpecialties: storedContext.specialties,
      pendingOffer: storedContext,
    };
  }

  if (isDoctorRecommendationConfirmation(text)) {
    if (storedContext) {
      console.log("[chatbot:classifier] confirmation_with_stored_context", JSON.stringify({
        specialty: storedContext.specialty,
        specialties: storedContext.specialties,
        source: storedContext.source,
      }));
      return {
        intent: "doctor_recommendation_confirmation",
        recommendationIntent,
        suggestedSpecialties: storedContext.specialties,
        pendingOffer: storedContext,
      };
    }
    return {
      intent: "doctor_search",
      recommendationIntent: 0.5,
      suggestedSpecialties: [],
      pendingOffer: null,
      needsSpecialtyPrompt: true,
    };
  }

  if (matchesAny(text, GREETING_PATTERNS)) {
    return { intent: "greeting", recommendationIntent: 0, suggestedSpecialties, pendingOffer: null };
  }

  if (matchesAny(text, BOOKING_PATTERNS)) {
    return {
      intent: "booking_question",
      recommendationIntent: 0,
      suggestedSpecialties,
      pendingOffer: null,
    };
  }

  if (
    recommendationIntent >= RECOMMENDATION_INTENT_THRESHOLD &&
    isExplicitDoctorSearch(text)
  ) {
    return {
      intent: "doctor_search",
      recommendationIntent,
      suggestedSpecialties,
      pendingOffer: null,
    };
  }

  if (hasAttachments) {
    return {
      intent: "medical_report_analysis",
      recommendationIntent: 0,
      suggestedSpecialties,
      pendingOffer: null,
    };
  }

  if (looksLikeSymptomDescription(text, triage)) {
    return {
      intent: "symptom_analysis",
      recommendationIntent: 0,
      suggestedSpecialties:
        suggestedSpecialties.length > 0 ? suggestedSpecialties : triage.specialties,
      pendingOffer: null,
    };
  }

  if (matchesAny(text, GENERAL_MEDICAL_PATTERNS)) {
    return {
      intent: "general_medical_question",
      recommendationIntent: 0,
      suggestedSpecialties,
      pendingOffer: null,
    };
  }

  if (matchesAny(text, WEBSITE_PATTERNS)) {
    return {
      intent: "general_conversation",
      recommendationIntent: 0,
      suggestedSpecialties,
      pendingOffer: null,
    };
  }

  if (triage.specialties.length > 0 && looksLikeSymptomOrComplaint(text)) {
    return {
      intent: "symptom_analysis",
      recommendationIntent: 0,
      suggestedSpecialties: triage.specialties,
      pendingOffer: null,
    };
  }

  // Last resort: if triage upgraded to routine and there are symptom indicators, treat as symptom
  if (triage.level === "routine" && looksLikeSymptomOrComplaint(text)) {
    return {
      intent: "symptom_analysis",
      recommendationIntent: 0,
      suggestedSpecialties: suggestedSpecialties.length > 0 ? suggestedSpecialties : triage.specialties,
      pendingOffer: null,
    };
  }

  return {
    intent: "general_conversation",
    recommendationIntent,
    suggestedSpecialties,
    pendingOffer: null,
  };
}

/**
 * Only doctor_search and confirmed follow-ups should hit the database.
 * @param {ChatIntent} intent
 * @param {number} recommendationIntent
 */
export function shouldFetchDoctorsFromDatabase(intent, recommendationIntent) {
  if (intent === "doctor_recommendation_confirmation") {
    return recommendationIntent >= RECOMMENDATION_INTENT_THRESHOLD;
  }
  if (recommendationIntent < RECOMMENDATION_INTENT_THRESHOLD) return false;
  return intent === "doctor_search";
}

/**
 * After analysis, offer doctors only when a specialty was inferred — never auto-fetch.
 * @param {ChatIntent} intent
 * @param {string[]} suggestedSpecialties
 */
export function shouldOfferDoctorConfirmationAfterAnalysis(intent, suggestedSpecialties) {
  if (!suggestedSpecialties.length) return false;
  return intent === "symptom_analysis" || intent === "medical_report_analysis";
}
