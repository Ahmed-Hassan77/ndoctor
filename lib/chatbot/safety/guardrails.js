import { MEDICAL_DISCLAIMER, EMERGENCY_NOTICE } from "@/lib/chatbot/types";

const FORBIDDEN_PATTERNS = [
  /\b(?:take|use)\s+\d+\s*(?:mg|mcg|ml|tablet|pill)/gi,
  /\bprescribe(?:d|s)?\b/gi,
  /\bdefinitely (?:have|has|is)\b/gi,
  /\bconfirmed diagnosis\b/gi,
  /\byou have (?:cancer|diabetes|covid|pneumonia)\b/gi,
];

/**
 * Patterns that indicate the AI is generating fake doctor names/recommendations.
 * These should be stripped from LLM responses.
 */
const AI_DOCTOR_LIST_PATTERNS = [
  // Numbered lists starting with "Dr." or "Doctor" — e.g. "1. Dr. Ahmed", "2. Doctor Sara"
  /^\s*\d+\.\s*(?:Dr\.?|Doctor|دكتور|د\.)\s+[A-Za-z\u0600-\u06FF].+$/gm,
  // "Here are some doctors" / "recommended doctors" headers
  /(?:here\s+are\s+(?:some|the|a\s+few)?\s*(?:recommended\s+)?doctors|recommended\s+doctors\s*:)/gi,
  // Arabic equivalents
  /(?:إليك\s+(?:بعض\s+)?(?:ال)?أطباء|أطباء\s+(?:مقترح|موصى))/gi,
  // "I recommend Dr. X" patterns
  /\b(?:i\s+recommend|i\s+suggest|you\s+(?:can|should|could)\s+(?:see|visit|consult))\s+(?:Dr\.?|Doctor)\s+[A-Za-z]/gi,
  // Arabic "أنصحك بالدكتور" patterns
  /(?:أنصحك|أرشحلك|أقترح\s+عليك)\s+(?:ال)?(?:دكتور|طبيب|د\.)\s+[\u0600-\u06FF]/gi,
  // Bullet-point doctor lists: "- Dr. Name" or "• Dr. Name"
  /^\s*[\-•\*]\s*(?:Dr\.?|Doctor|دكتور|د\.)\s+[A-Za-z\u0600-\u06FF].+$/gm,
  // "**Dr. Name**" bold doctor names (markdown)
  /\*\*(?:Dr\.?|Doctor|دكتور|د\.)\s+[A-Za-z\u0600-\u06FF][^*]+\*\*/gi,
];

/**
 * Detects and strips AI-generated (hallucinated) doctor lists from LLM response.
 * @param {string} content
 * @param {'en' | 'ar'} locale
 * @returns {{ cleaned: string; hadFakeDoctors: boolean }}
 */
export function stripAIGeneratedDoctorLists(content, locale) {
  let text = content || "";
  let hadFakeDoctors = false;

  for (const pattern of AI_DOCTOR_LIST_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      hadFakeDoctors = true;
      pattern.lastIndex = 0;
      text = text.replace(pattern, "");
    }
  }

  if (hadFakeDoctors) {
    // Clean up leftover blank lines
    text = text.replace(/\n{3,}/g, "\n\n").trim();

    // Add redirection message
    const redirectMsg = locale === "ar"
      ? "\n\nيمكنك طلب توصية بأطباء من المنصة عن طريق ذكر التخصص المطلوب (مثل: «عايز دكتور قلب»)."
      : "\n\nYou can request doctor recommendations from the platform by mentioning the specialty you need (e.g. \"I need a cardiologist\").";

    text = text + redirectMsg;

    console.log(
      "[chatbot:guardrails] STRIPPED AI-generated doctor names from response. AI must not invent doctors."
    );
  }

  return { cleaned: text, hadFakeDoctors };
}

/**
 * @param {string} content
 * @param {'en' | 'ar'} locale
 * @param {{ urgency?: string }} [context]
 */
export function applyGuardrails(content, locale, context = {}) {
  let safe = content || "";

  // Strip any AI-hallucinated doctor names/lists
  const { cleaned, hadFakeDoctors } = stripAIGeneratedDoctorLists(safe, locale);
  safe = cleaned;
  if (hadFakeDoctors) {
    console.warn(
      "[chatbot:guardrails] WARNING: AI attempted to generate fake doctor names. They have been removed."
    );
  }

  for (const pattern of FORBIDDEN_PATTERNS) {
    safe = safe.replace(pattern, (match) => `[${match}]`);
  }

  const disclaimer = MEDICAL_DISCLAIMER[locale] || MEDICAL_DISCLAIMER.en;
  if (!safe.includes(disclaimer)) {
    safe = `${safe.trim()}\n\n— ${disclaimer}`;
  }

  if (context.urgency === "emergency") {
    const notice = EMERGENCY_NOTICE[locale] || EMERGENCY_NOTICE.en;
    if (!safe.includes(notice)) {
      safe = `${notice}\n\n${safe}`;
    }
  }

  return safe.trim();
}

/**
 * @param {string} text
 */
export function sanitizeUserInput(text) {
  return (text || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim()
    .slice(0, 8000);
}
