/**
 * Lightweight conversational intent detection for the Shifaa chatbot.
 * Keeps common interactions fast without always invoking the LLM.
 */

const GREETING_PATTERNS = {
  en: [
    /^(?:hi|hello|hey|good\s+(?:morning|afternoon|evening)|greetings)\b/i,
    /^how\s+are\s+you/i,
    /^what'?s\s+up/i,
  ],
  ar: [
    /^(?:مرحبا|مرحباً|أهلا|أهلاً|السلام\s+عليكم|صباح\s+الخير|مساء\s+الخير)/,
    /^كيف\s+حالك/,
    /^ازيك/,
    /^إزيك/,
  ],
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
    /(?:تأجيل|اعادة\s+جدولة)\s+موعد/,
    /(?:طرق|وسائل)\s+الدفع/,
    /(?:استرداد|refund)/i,
  ],
};

const DOCTOR_PROFILE_PATTERNS = {
  en: [
    /\bdoctor\s+profile/i,
    /\bview\s+(?:a\s+)?doctor/i,
    /\bdoctor\s+(?:rating|reviews|experience)/i,
    /\bwho\s+is\s+dr\.?\s/i,
    /\btell\s+me\s+about\s+(?:dr\.?|doctor)/i,
  ],
  ar: [
    /(?:ملف|صفحة)\s+(?:ال)?(?:دكتور|طبيب)/,
    /(?:تقييم|مراجعات)\s+(?:ال)?(?:دكتور|طبيب)/,
    /(?:مين|من)\s+(?:د(?:كتور)?|الد(?:كتور)?)/,
    /(?:عرفني|قول(?:ي)?)\s+(?:عن\s+)?(?:د(?:كتور)?|الد(?:كتور)?)/,
  ],
};

const SPECIALTY_INFO_PATTERNS = {
  en: [
    /\bwhat\s+is\s+(?:a\s+)?(?:cardiolog|dermatolog|pediatric|neurolog|orthoped|gynecolog|urolog|psychiatr|pulmonolog|ophthalmolog|nephrolog|ent\b)/i,
    /\bwhat\s+does\s+(?:a\s+)?\w+\s+doctor\s+do/i,
    /\bdifference\s+between\s+\w+\s+and\s+\w+/i,
  ],
  ar: [
    /(?:إيه|ما\s+هو|ما\s+هي)\s+(?:تخصص|طب)\s+/,
    /(?:إيه|ما)\s+(?:فرق|الفرق)\s+between/i,
    /(?:إيه|ما)\s+(?:دكتور|طبيب)\s+(?:قلب|جلد|أطفال|عظام|نساء|أعصاب|عيون|صدر|كلى|مسالك|نفس|أسنان)/,
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
 * @param {string} text
 * @returns {'greeting'|'booking'|'doctor_profile'|'specialty_info'|'general'}
 */
export function detectConversationIntent(text) {
  const trimmed = (text || "").trim();
  if (!trimmed) return "general";

  if (matchesAny(trimmed, GREETING_PATTERNS)) return "greeting";
  if (matchesAny(trimmed, BOOKING_PATTERNS)) return "booking";
  if (matchesAny(trimmed, DOCTOR_PROFILE_PATTERNS)) return "doctor_profile";
  if (matchesAny(trimmed, SPECIALTY_INFO_PATTERNS)) return "specialty_info";

  return "general";
}

/**
 * @param {'greeting'|'booking'|'doctor_profile'} intent
 * @param {'en'|'ar'} locale
 * @returns {string|null}
 */
export function buildConversationQuickReply(intent, locale) {
  const isAr = locale === "ar";

  switch (intent) {
    case "greeting":
      return isAr
        ? "مرحباً! أنا **شفاء** — المساعد الرسمي لمنصة شفاء الطبية. يمكنني مساعدتك في:\n- شرح التقارير والأشعة المرفوعة\n- التوصية بأطباء موثقين من المنصة (حسب التخصص)\n- الإرشاد لخطوات الحجز والدفع\n\nكيف يمكنني مساعدتك اليوم؟"
        : "Hello! I'm **Shifaa** — the official assistant for the Shifaa medical platform. I can help you with:\n- Explaining uploaded reports and medical imaging\n- Recommending verified doctors from the platform (by specialty)\n- Booking and payment guidance\n\nHow can I help you today?";

    case "booking":
      return isAr
        ? "لحجز موعد على **شفاء**:\n1. ابحث عن الطبيب أو اطلب مني التوصية بتخصص معيّن (مثل: «عايز دكتور قلب»).\n2. افتح **ملف الطبيب** واختر موعداً متاحاً (أونلاين أو في العيادة).\n3. أكمل الحجز واختر طريقة الدفع المناسبة.\n\nهل تريد أن أرشّح لك أطباء في تخصص معيّن؟"
        : "To book on **Shifaa**:\n1. Search for a doctor or ask me for recommendations (e.g. \"I need a cardiologist\").\n2. Open the **doctor profile** and pick an available slot (online or in-clinic).\n3. Complete booking and choose your payment method.\n\nWould you like me to recommend doctors in a specific specialty?";

    case "doctor_profile":
      return isAr
        ? "يمكنك عرض **ملف أي طبيب موثّق** على منصة شفاء لمعرفة:\n- التخصص والخبرة\n- التقييمات وعدد المراجعات\n- موقع العيادة أو الاستشارة الأونلاين\n- الأسعار ومواعيد الحجز المتاحة\n\nاذكر التخصص (مثل: جلدية، أطفال) وسأعرض لك أطباء حقيقيين من قاعدة البيانات."
        : "On each **verified doctor profile** on Shifaa you can see:\n- Specialty and experience\n- Ratings and review count\n- Clinic location or online consultation options\n- Prices and available booking slots\n\nTell me a specialty (e.g. dermatology, pediatrics) and I'll show real doctors from our database.";

    default:
      return null;
  }
}
