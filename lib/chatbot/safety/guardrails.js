import { MEDICAL_DISCLAIMER, EMERGENCY_NOTICE } from "@/lib/chatbot/types";

const FORBIDDEN_PATTERNS = [
  /\b(?:take|use)\s+\d+\s*(?:mg|mcg|ml|tablet|pill)/gi,
  /\bprescribe(?:d|s)?\b/gi,
  /\bdefinitely (?:have|has|is)\b/gi,
  /\bconfirmed diagnosis\b/gi,
  /\byou have (?:cancer|diabetes|covid|pneumonia)\b/gi,
];

/**
 * @param {string} content
 * @param {'en' | 'ar'} locale
 * @param {{ urgency?: string }} [context]
 */
export function applyGuardrails(content, locale, context = {}) {
  let safe = content || "";

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
