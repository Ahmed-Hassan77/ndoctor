/**
 * Conversation-scoped state for symptom/report → confirm → fetch doctor flow.
 * Stored on assistant message metadata in the database.
 */

import {
  buildSymptomSpecialtyConfirmationPrompt,
  buildReportSpecialtyConfirmationPrompt,
} from "@/lib/chatbot/intent/confirmation";

/** Phrases indicating the assistant offered to show platform doctors. */
const DOCTOR_OFFER_PATTERNS = [
  /هل ترغب في عرض أطباء/i,
  /Would you like to see available doctors/i,
  /هل ترغب في عرض أطباء متاحين على المنصة/i,
  /Would you like to see available .+ doctors on the platform/i,
  /هل تريد .+ أطباء/i,
];

/**
 * @param {string} content
 */
export function contentOffersDoctorConfirmation(content) {
  const text = content || "";
  return DOCTOR_OFFER_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Build metadata persisted after offering doctor recommendations (awaiting user confirm).
 * @param {string[]} specialties
 */
export function buildRecommendationContext(specialties) {
  const deduped = [...new Set(specialties)].filter(Boolean);
  const primary = deduped[0] ?? null;
  return {
    pendingRecommendation: true,
    specialty: primary,
    pendingDoctorRecommendation: {
      specialties: deduped,
      specialty: primary,
      offeredAt: new Date().toISOString(),
    },
  };
}

/**
 * Read stored recommendation context from prior assistant turns.
 * Robustly handles various metadata shapes from Prisma Json field.
 * @param {Array<{ role: string; content?: string; metadata?: object | null }>} historyRows
 * @returns {{ specialties: string[]; specialty: string | null; source: string } | null}
 */
export function getRecommendationContext(historyRows) {
  const rows = historyRows ?? [];

  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row.role !== "assistant") continue;

    // Handle both parsed object and string metadata (Prisma Json field edge cases)
    let meta = row.metadata;
    if (typeof meta === "string") {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    meta = meta ?? {};

    // Check 1: pendingRecommendation flag with specialty at top level
    const isPending = meta.pendingRecommendation === true || meta.pendingRecommendation === "true";
    const topSpecialty = meta.specialty;
    if (isPending && topSpecialty) {
      const result = {
        specialties: [String(topSpecialty)],
        specialty: String(topSpecialty),
        source: "pendingRecommendation",
      };
      console.log("[chatbot:state] getRecommendationContext FOUND via pendingRecommendation", JSON.stringify(result));
      return result;
    }

    // Check 2: nested pendingDoctorRecommendation object
    const pending = meta.pendingDoctorRecommendation;
    if (pending && typeof pending === "object") {
      const specList = Array.isArray(pending.specialties) ? pending.specialties : [];
      const specSingle = pending.specialty;
      if (specList.length > 0 || specSingle) {
        const result = {
          specialties: specList.length > 0 ? specList : (specSingle ? [String(specSingle)] : []),
          specialty: specSingle ? String(specSingle) : (specList[0] ?? null),
          source: "pendingDoctorRecommendation",
        };
        console.log("[chatbot:state] getRecommendationContext FOUND via pendingDoctorRecommendation", JSON.stringify(result));
        return result;
      }
    }

    // Check 3: Legacy fallback — specialties array + confirmation content
    const legacySpecialties = Array.isArray(meta.specialties) ? meta.specialties : [];
    if (legacySpecialties.length > 0 && contentOffersDoctorConfirmation(row.content ?? "")) {
      const result = {
        specialties: legacySpecialties,
        specialty: legacySpecialties[0] ?? null,
        source: "assistant_content_fallback",
      };
      console.log("[chatbot:state] getRecommendationContext FOUND via content fallback", JSON.stringify(result));
      return result;
    }

    // Check 4: If this assistant message had pendingRecommendation=false, it was explicitly cleared
    if (meta.pendingRecommendation === false) {
      console.log("[chatbot:state] getRecommendationContext: context was explicitly cleared");
      return null;
    }
  }

  console.log("[chatbot:state] getRecommendationContext: no stored context found in", rows.length, "messages");
  return null;
}

/**
 * Clear pending recommendation flags after doctors are shown or offer is declined.
 */
export function clearRecommendationContext() {
  return {
    pendingRecommendation: false,
    specialty: null,
    pendingDoctorRecommendation: null,
  };
}

/**
 * Expanded symptom/complaint detection for Arabic (dialect + MSA) and English.
 * @param {string} message
 */
export function looksLikeSymptomOrComplaint(message) {
  const text = (message || "").trim();
  if (!text) return false;
  return (
    // Arabic complaint verbs (standard + Egyptian + colloquial)
    /(?:عندي|عندى|عند(?:ه|ها)|أشعر|بحس|حاسس|حاسة|يعاني|تعاني|اعانى|أعاني|اعاني|بعاني|بشتكي|أشتكي|ابني|ابنتي|ولدي|بنتي)/i.test(text) ||
    // Body part with possessive
    /(?:عين(?:ي|ى|ه|ها)|ودن(?:ي|ه)|بطن(?:ي|ه)|راس(?:ي|ه)|ضهر(?:ي|ه)|صدر(?:ي|ه)|ركبت(?:ي|ه))/i.test(text) ||
    // Symptom nouns (expanded)
    /(?:ألم|الم|آلام|الام|وجع|توجع|حرارة|حمى|سخونة|طفح|سعال|كحة|غثيان|قيء|صداع|دوخة|تورم|نزيف)/i.test(text) ||
    /(?:حكة|حكه|هرش|احمرار|إجهاد|اجهاد|إرهاق|ارهاق|تعب|التهاب|حرقان|حرقة|تنميل|خدر|انتفاخ|ضيق|ضعف|هبوط|زغللة|أرق)/i.test(text) ||
    /(?:إسهال|اسهال|إمساك|امساك|ترجيع)/i.test(text) ||
    // Egyptian dialect: "فى ... فى" (there is ... in)
    /(?:فى|في)\s+(?:ألم|الم|وجع|إجهاد|اجهاد|احمرار|حكة|التهاب|تعب|ضعف|تورم|حرقان)/i.test(text) ||
    // English
    /\b(?:i\s+have|i\s+feel|i'm\s+having|i'm\s+feeling|i\s+suffer|i'm\s+suffering|my\s+(?:eye|child|baby))\b/i.test(text) ||
    /\b(?:pain|ache|hurt|hurts|fever|rash|redness|itching|irritation|tired|fatigue|inflammation|burning|numbness|swelling|bloating|dizzy|headache|cough|nausea)\b/i.test(text)
  );
}

/**
 * Append confirmation prompt if needed and always persist context for symptom/report flows.
 * @param {object} input
 */
export function finalizeSymptomRecommendationOffer(input) {
  const { content, intent, specialties, locale, message, triage } = input;
  const list = [...new Set(specialties ?? [])].filter(Boolean);

  if (!list.length) {
    return { content, assistantMeta: {} };
  }

  const symptomFlow =
    intent === "symptom_analysis" ||
    intent === "medical_report_analysis" ||
    (looksLikeSymptomOrComplaint(message) && (triage?.specialties?.length ?? 0) > 0);

  if (!symptomFlow) {
    return { content, assistantMeta: {} };
  }

  let finalContent = (content || "").trim();
  const alreadyOffers = contentOffersDoctorConfirmation(finalContent);

  if (!alreadyOffers) {
    const prompt =
      intent === "medical_report_analysis"
        ? buildReportSpecialtyConfirmationPrompt(list, locale)
        : buildSymptomSpecialtyConfirmationPrompt(list, locale);
    finalContent = `${finalContent}${prompt}`;
  }

  const recommendationContext = buildRecommendationContext(list);
  console.log("[chatbot:state] finalizeSymptomRecommendationOffer storing context", JSON.stringify({
    specialties: list,
    primary: recommendationContext.specialty,
    intent,
  }));

  return {
    content: finalContent,
    assistantMeta: recommendationContext,
  };
}

/**
 * Debug logging for recommendation flow.
 * Always logs to help diagnose doctor recommendation issues.
 * @param {string} step
 * @param {Record<string, unknown>} data
 */
export function logRecommendationDebug(step, data) {
  console.log(`[chatbot:recommendation] ${step}`, JSON.stringify(data));
}
