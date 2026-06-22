import { randomUUID } from "crypto";
import { db } from "@/lib/prisma";
import {
  completeWithFallback,
  streamWithFallback,
} from "@/lib/chatbot/providers";
import { prepareMessagesForProvider } from "@/lib/chatbot/providers/history";
import { getChatUserContext, assertConversationAccess } from "@/lib/chatbot/auth";
import { buildSystemPrompt, buildEmergencyOverride } from "@/lib/chatbot/prompts/system";
import { buildRoleContextBlock } from "@/lib/chatbot/context/role-context";
import { analyzeSymptoms } from "@/lib/chatbot/safety/triage";
import { applyGuardrails, sanitizeUserInput } from "@/lib/chatbot/safety/guardrails";
import { recommendDoctorsForMessage } from "@/lib/chatbot/recommendations/doctors";
import {
  isGenericDoctorRequest,
  isDoctorRecommendationRequest,
  buildDoctorRecommendationMarkdown,
  buildAskSpecialtyMessage,
  buildNoDoctorsMessage,
  buildUnavailableSpecialtyMessage,
  buildRecommendationErrorMessage,
  extractSpecialtyHint,
} from "@/lib/chatbot/intent/doctor-request";
import {
  buildDeclinedRecommendationAck,
  isDoctorRecommendationConfirmation,
  isDoctorRecommendationDecline,
} from "@/lib/chatbot/intent/confirmation";
import {
  finalizeSymptomRecommendationOffer,
  clearRecommendationContext,
  logRecommendationDebug,
  looksLikeSymptomOrComplaint,
  getRecommendationContext,
} from "@/lib/chatbot/state/recommendation-context";
import {
  classifyChatIntent,
  shouldFetchDoctorsFromDatabase,
} from "@/lib/chatbot/intent/classifier";
import { buildConversationQuickReply, detectConversationIntent } from "@/lib/chatbot/intent/conversation";
import { upsertIntakeSummary } from "@/lib/chatbot/intake/summary";
import { getConversationFiles } from "@/lib/chatbot/files/storage";
import { buildUserMessageContent } from "@/lib/chatbot/files/attachments";
import { ChatbotProviderError } from "@/lib/chatbot/types";
import {
  logChatbotProviderError,
  mapChatbotErrorForClient,
} from "@/lib/chatbot/client-errors";

const HISTORY_LIMIT = 20;

/**
 * Structured logger for timing and observability (Requirement 5)
 */
function logTiming({ requestId, stage, durationMs, providerUsed }) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "INFO",
      requestId,
      stage,
      durationMs,
      ...(providerUsed ? { providerUsed } : {}),
    })
  );
}

/**
 * @param {string} role
 */
function canReceiveDoctorRecommendations(role) {
  return role === "PATIENT" || role === "UNASSIGNED";
}

/**
 * Query DB and format doctor list — only called when intent score >= threshold.
 * @returns {Promise<{ content: string; doctors: object[]; recommendations: object; assistantMeta?: object }>}
 */
async function fetchDoctorRecommendations(
  message,
  role,
  locale,
  governorate,
  triageSpecialties,
  { fromConfirmation = false } = {}
) {
  if (!canReceiveDoctorRecommendations(role)) {
    return {
      content:
        locale === "ar"
          ? "البحث عن الأطباء متاح للمرضى والزوار. سجّل الدخول كمريض للحصول على توصيات مخصصة."
          : "Doctor search is available to patients and visitors. Sign in as a patient for personalized recommendations.",
      doctors: [],
      recommendations: { emergency: false, doctors: [] },
    };
  }

  const specialtyHint = extractSpecialtyHint(message);
  const resolvedSpecialties = [
    ...(specialtyHint?.canonical ? [specialtyHint.canonical] : []),
    ...(triageSpecialties ?? []),
  ].filter(Boolean);
  const uniqueSpecialties = [...new Set(resolvedSpecialties)];

  // Generic request without a specialty — ask before querying
  if (
    !fromConfirmation &&
    uniqueSpecialties.length === 0 &&
    isGenericDoctorRequest(message)
  ) {
    return {
      content: buildAskSpecialtyMessage(locale),
      doctors: [],
      recommendations: { emergency: false, doctors: [] },
    };
  }

  const outcome = await recommendDoctorsForMessage({
    message,
    governorate,
    triageSpecialties: uniqueSpecialties,
    limit: 5,
  });

  logRecommendationDebug("database_query", {
    fromConfirmation,
    specialties: uniqueSpecialties,
    status: outcome.status,
    doctorCount: outcome.doctors?.length ?? 0,
  });

  if (outcome.status === "missing_specialty") {
    return {
      content: buildAskSpecialtyMessage(locale),
      doctors: [],
      recommendations: { emergency: false, doctors: [] },
    };
  }

  if (outcome.status === "error") {
    return {
      content: buildRecommendationErrorMessage(locale, outcome.error),
      doctors: [],
      recommendations: { emergency: false, doctors: [], error: outcome.error },
    };
  }

  if (outcome.status === "unavailable_specialty" || outcome.status === "empty") {
    return {
      content: buildUnavailableSpecialtyMessage(locale),
      doctors: [],
      recommendations: { emergency: false, doctors: [] },
    };
  }

  return {
    content: buildDoctorRecommendationMarkdown(outcome.doctors, locale),
    doctors: outcome.doctors,
    recommendations: { emergency: false, doctors: outcome.doctors },
    assistantMeta: clearRecommendationContext(),
  };
}

/**
 * Handle confirmed / direct doctor fetch turn.
 */
async function handleDoctorFetchTurn(classification, message, role, locale, governorate) {
  const storedSpecialty =
    classification.pendingOffer?.specialty ?? classification.pendingOffer?.specialties?.[0] ?? null;

  logRecommendationDebug("turn_start", {
    intent: classification.intent,
    recommendationIntent: classification.recommendationIntent,
    storedSpecialty,
    storedSpecialties: classification.pendingOffer?.specialties ?? classification.suggestedSpecialties,
    confirmationDetected:
      classification.intent === "doctor_recommendation_confirmation",
  });

  if (classification.needsSpecialtyPrompt) {
    return {
      content: buildAskSpecialtyMessage(locale),
      doctors: [],
      recommendations: { emergency: false, doctors: [] },
      assistantMeta: {},
    };
  }

  const specialties =
    classification.intent === "doctor_recommendation_confirmation"
      ? classification.pendingOffer?.specialties ?? classification.suggestedSpecialties
      : classification.suggestedSpecialties;

  return fetchDoctorRecommendations(message, role, locale, governorate, specialties, {
    fromConfirmation: classification.intent === "doctor_recommendation_confirmation",
  });
}

/**
 * @param {{ locale?: string; guestSessionId?: string; conversationId?: string }} params
 */
export async function getOrCreateConversation({
  locale = "en",
  guestSessionId,
  conversationId,
}) {
  const { user } = await getChatUserContext();
  const role = user?.role ?? "UNASSIGNED";

  if (conversationId) {
    const existing = await assertConversationAccess(
      user?.id,
      guestSessionId,
      conversationId
    );
    if (existing) return existing;
  }

  return db.chatConversation.create({
    data: {
      id: conversationId || undefined,
      userId: user?.id ?? null,
      guestSessionId: user ? null : guestSessionId || randomUUID(),
      locale: locale === "ar" ? "ar" : "en",
      roleSnapshot: role,
    },
  });
}

/**
 * @param {string} conversationId
 */
export async function loadConversationMessages(conversationId) {
  const rows = await db.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  return rows.reverse();
}

/**
 * Core turn logic shared by sync + stream paths.
 * @param {object} params
 */
async function resolveAssistantTurn(params) {
  const {
    message,
    locale,
    role,
    governorate,
    triage,
    hasAttachments,
    historyRows,
    providerMessages,
    requestId,
  } = params;

  const intentStart = Date.now();
  const classification = classifyChatIntent({
    message,
    hasAttachments,
    historyRows,
    triage,
  });
  logTiming({ requestId, stage: "intent_detection", durationMs: Date.now() - intentStart });

  logRecommendationDebug("intent_classified", {
    intent: classification.intent,
    recommendationIntent: classification.recommendationIntent,
    suggestedSpecialties: classification.suggestedSpecialties,
    storedSpecialty: classification.pendingOffer?.specialty ?? null,
    confirmationDetected: classification.intent === "doctor_recommendation_confirmation",
    message: message?.slice(0, 80),
  });

  let assistantContent = "";
  let recommendations = { emergency: false, doctors: [] };
  /** @type {Record<string, unknown>} */
  let assistantMeta = {
    chatIntent: classification.intent,
    recommendationIntent: classification.recommendationIntent,
  };

  if (classification.intent === "greeting") {
    assistantContent = buildConversationQuickReply("greeting", locale) || "";
  } else if (classification.intent === "booking_question") {
    assistantContent = buildConversationQuickReply("booking", locale) || "";
  } else if (classification.intent === "doctor_recommendation_decline") {
    assistantContent = buildDeclinedRecommendationAck(locale);
    assistantMeta = { ...assistantMeta, ...clearRecommendationContext() };
  } else if (
    shouldFetchDoctorsFromDatabase(
      classification.intent,
      classification.recommendationIntent
    )
  ) {
    const fetchStart = Date.now();
    const fetched = await handleDoctorFetchTurn(
      classification,
      message,
      role,
      locale,
      governorate
    );
    logTiming({ requestId, stage: "db_doctor_fetch", durationMs: Date.now() - fetchStart });
    assistantContent = fetched.content;
    recommendations = fetched.recommendations;
    assistantMeta = { ...assistantMeta, ...fetched.assistantMeta };
  } else if (classification.needsSpecialtyPrompt) {
    assistantContent = buildAskSpecialtyMessage(locale);
  } else {
    const { result, providerId } = await completeWithFallback(
      providerMessages,
      locale,
      requestId
    );
    assistantContent = applyGuardrails(result.content, locale, {
      urgency: triage.level,
    });

    const offered = finalizeSymptomRecommendationOffer({
      content: assistantContent,
      intent: classification.intent,
      specialties: classification.suggestedSpecialties,
      locale,
      message,
      triage,
    });
    assistantContent = offered.content;
    assistantMeta = { ...assistantMeta, ...offered.assistantMeta };

    if (offered.assistantMeta?.pendingRecommendation) {
      logRecommendationDebug("context_stored", {
        specialty: offered.assistantMeta.specialty,
        specialties: offered.assistantMeta.pendingDoctorRecommendation?.specialties,
      });
    }
  }

  return { assistantContent, recommendations, assistantMeta, classification };
}

/**
 * Lightweight routing layer to select the appropriate flow.
 * @param {object} params
 * @returns {'analysis_flow'|'doctor_flow'|'gemini_chat_flow'}
 */
function determineRoute({ message, hasAttachments, historyRows }) {
  const text = (message || "").trim();

  if (hasAttachments) {
    return "analysis_flow";
  }

  const convIntent = detectConversationIntent(text);
  if (convIntent === "greeting" || convIntent === "booking") {
    return "doctor_flow";
  }

  const hasStoredContext = !!getRecommendationContext(historyRows || []);
  const isConfirm = isDoctorRecommendationConfirmation(text) && hasStoredContext;
  const isDecline = isDoctorRecommendationDecline(text) && hasStoredContext;
  const isExplicitDoc =
    isDoctorRecommendationRequest(text) || isGenericDoctorRequest(text);

  if (isConfirm || isDecline || isExplicitDoc) {
    return "doctor_flow";
  }

  const triage = analyzeSymptoms(text);
  if (looksLikeSymptomOrComplaint(text) && triage.specialties.length > 0) {
    return "doctor_flow";
  }

  return "gemini_chat_flow";
}

/**
 * @param {object} input
 */
export async function runChatTurn(input) {
  const turnStart = Date.now();
  const requestId = randomUUID();
  const locale = input.locale === "ar" ? "ar" : "en";
  const message = sanitizeUserInput(input.message);
  if (!message && !input.attachmentIds?.length) {
    throw new ChatbotProviderError("VALIDATION_ERROR", "Message is required.");
  }

  const { user } = await getChatUserContext();
  const role = user?.role ?? "UNASSIGNED";

  const conversation = await getOrCreateConversation({
    locale,
    guestSessionId: input.guestSessionId,
    conversationId: input.conversationId,
  });

  const historyRows = await loadConversationMessages(conversation.id);
  const attachments = await getConversationFiles(
    input.attachmentIds ?? [],
    conversation.id
  );
  const hasAttachments = attachments.length > 0;

  const routingStart = Date.now();
  const route = determineRoute({ message, hasAttachments, historyRows });
  logTiming({ requestId, stage: "routing", durationMs: Date.now() - routingStart });

  // Triage is part of the standard middleware pipeline (Requirement 3)
  const triage = analyzeSymptoms(message);
  const governorate = user?.clinicGovernorate ?? undefined;

  if (role === "PATIENT" && message) {
    await upsertIntakeSummary(
      conversation.id,
      message,
      triage.level,
      user?.id ?? null
    );
  }

  const userContent = await buildUserMessageContent(message, attachments, locale);
  const roleContext = await buildRoleContextBlock(role, user);
  const systemPrompt = buildSystemPrompt({
    role,
    locale,
    contextBlock: roleContext,
  });

  /** @type {import("@/lib/chatbot/types").ChatMessage[]} */
  const providerMessages = [
    { role: "system", content: systemPrompt },
    ...historyRows.map((m) => ({
      role: /** @type {'user'|'assistant'|'system'} */ (m.role),
      content: m.content,
    })),
  ];

  if (userContent) {
    providerMessages.push({ role: "user", content: userContent });
  } else if (!message && attachments.length) {
    throw new ChatbotProviderError("VALIDATION_ERROR", "Message is required.");
  }

  let assistantContent = "";
  let recommendations = { emergency: false, doctors: [] };
  let assistantMeta = { urgency: triage.level, specialties: triage.specialties };

  if (triage.level === "emergency") {
    assistantContent = buildEmergencyOverride(locale);
    recommendations = { emergency: true, doctors: [] };
    assistantMeta = { ...assistantMeta, chatIntent: "symptom_analysis", recommendationIntent: 0 };
  } else if (route === "gemini_chat_flow") {
    // Normal chat goes directly to AI model completion, bypassing recommendation logic (Requirement 3)
    const { result, providerId } = await completeWithFallback(
      providerMessages,
      locale,
      requestId
    );
    assistantContent = result.content;
    assistantMeta = { ...assistantMeta, chatIntent: "general_conversation" };
  } else {
    // Doctor flow or Analysis flow
    const resolved = await resolveAssistantTurn({
      message,
      locale,
      role,
      governorate,
      triage,
      hasAttachments,
      historyRows,
      providerMessages,
      requestId,
    });
    assistantContent = resolved.assistantContent;
    recommendations = resolved.recommendations;
    assistantMeta = {
      urgency: triage.level,
      specialties: triage.specialties,
      recommendations,
      ...resolved.assistantMeta,
    };
  }

  // Guardrails/Moderation standard pipeline integration
  const moderationStart = Date.now();
  assistantContent = applyGuardrails(assistantContent, locale, { urgency: triage.level });
  logTiming({ requestId, stage: "moderation", durationMs: Date.now() - moderationStart });

  // Database persistence standard pipeline integration
  const dbStart = Date.now();
  if (message || attachments.length) {
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message || (locale === "ar" ? "[مرفق]" : "[attachment]"),
        metadata: { attachmentIds: input.attachmentIds ?? [] },
      },
    });
  }

  const savedAssistant = await db.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: assistantContent,
      metadata: assistantMeta,
    },
  });

  await db.chatConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });
  logTiming({ requestId, stage: "db_save", durationMs: Date.now() - dbStart });

  logTiming({ requestId, stage: "total", durationMs: Date.now() - turnStart });

  return {
    conversationId: conversation.id,
    guestSessionId: conversation.guestSessionId,
    message: {
      id: savedAssistant.id,
      role: "assistant",
      content: assistantContent,
      urgency: triage.level,
      recommendations,
    },
  };
}

/**
 * @param {object} input
 */
export async function* streamChatTurn(input) {
  const turnStart = Date.now();
  const requestId = randomUUID();
  const locale = input.locale === "ar" ? "ar" : "en";
  const message = sanitizeUserInput(input.message);

  if (!message && !input.attachmentIds?.length) {
    throw new ChatbotProviderError("VALIDATION_ERROR", "Message is required.");
  }

  const { user } = await getChatUserContext();
  const role = user?.role ?? "UNASSIGNED";

  const conversation = await getOrCreateConversation({
    locale,
    guestSessionId: input.guestSessionId,
    conversationId: input.conversationId,
  });

  // Triage is part of the standard middleware pipeline
  const triage = analyzeSymptoms(message);

  if (triage.level === "emergency") {
    const guarded = applyGuardrails(buildEmergencyOverride(locale), locale, {
      urgency: "emergency",
    });

    if (message) {
      await db.chatMessage.create({
        data: { conversationId: conversation.id, role: "user", content: message },
      });
    }
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: guarded,
        metadata: { urgency: "emergency", recommendations: { emergency: true, doctors: [] } },
      },
    });

    yield guarded;
    yield {
      type: "done",
      conversationId: conversation.id,
      guestSessionId: conversation.guestSessionId,
      urgency: "emergency",
      recommendations: { emergency: true, doctors: [] },
    };
    return;
  }

  const governorate = user?.clinicGovernorate ?? undefined;
  const attachments = await getConversationFiles(
    input.attachmentIds ?? [],
    conversation.id
  );
  const hasAttachments = attachments.length > 0;
  const historyRows = await loadConversationMessages(conversation.id);

  const routingStart = Date.now();
  const route = determineRoute({ message, hasAttachments, historyRows });
  logTiming({ requestId, stage: "routing", durationMs: Date.now() - routingStart });

  let full = "";
  let recommendations = { emergency: false, doctors: [] };
  let assistantMeta = {
    urgency: triage.level,
    specialties: triage.specialties,
  };

  if (route === "gemini_chat_flow") {
    const userContent = await buildUserMessageContent(message, [], locale);
    const roleContext = await buildRoleContextBlock(role, user);
    const systemPrompt = buildSystemPrompt({
      role,
      locale,
      contextBlock: roleContext,
    });

    const providerMessages = [
      { role: "system", content: systemPrompt },
      ...historyRows.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent || message },
    ];

    const aiStart = Date.now();
    let firstTokenTime = 0;
    try {
      for await (const chunk of streamWithFallback(providerMessages, locale, requestId)) {
        if (!firstTokenTime) {
          firstTokenTime = Date.now() - aiStart;
          logTiming({ requestId, stage: "ai_first_token", durationMs: firstTokenTime });
        }
        full += chunk;
        yield chunk;
      }
      logTiming({ requestId, stage: "ai_stream", durationMs: Date.now() - aiStart });
    } catch (err) {
      console.error("[chatbot:error] Streaming failed:", err);
      throw err;
    }

    assistantMeta = { ...assistantMeta, chatIntent: "general_conversation" };
  } else {
    // RUN DOCTOR / ANALYSIS FLOW
    const classification = classifyChatIntent({
      message,
      hasAttachments,
      historyRows,
      triage,
    });

    assistantMeta = {
      ...assistantMeta,
      chatIntent: classification.intent,
      recommendationIntent: classification.recommendationIntent,
    };

    if (
      classification.intent === "greeting" ||
      classification.intent === "booking_question"
    ) {
      full =
        buildConversationQuickReply(
          classification.intent === "greeting" ? "greeting" : "booking",
          locale
        ) || "";
      yield full;
    } else if (classification.intent === "doctor_recommendation_decline") {
      full = buildDeclinedRecommendationAck(locale);
      assistantMeta = { ...assistantMeta, ...clearRecommendationContext() };
      yield full;
    } else if (classification.needsSpecialtyPrompt) {
      full = buildAskSpecialtyMessage(locale);
      yield full;
    } else if (
      shouldFetchDoctorsFromDatabase(
        classification.intent,
        classification.recommendationIntent
      )
    ) {
      const fetchStart = Date.now();
      const fetched = await handleDoctorFetchTurn(
        classification,
        message,
        role,
        locale,
        governorate
      );
      logTiming({ requestId, stage: "db_doctor_fetch", durationMs: Date.now() - fetchStart });
      full = fetched.content;
      recommendations = fetched.recommendations;
      assistantMeta = { ...assistantMeta, recommendations, ...fetched.assistantMeta };
      yield full;
    } else {
      const userContent = await buildUserMessageContent(message, attachments, locale);
      const roleContext = await buildRoleContextBlock(role, user);
      const systemPrompt = buildSystemPrompt({
        role,
        locale,
        contextBlock: roleContext,
      });

      const providerMessages = [
        { role: "system", content: systemPrompt },
        ...historyRows.map((m) => ({ role: m.role, content: m.content })),
        { role: "user", content: userContent || message },
      ];

      const aiStart = Date.now();
      let firstTokenTime = 0;
      try {
        for await (const chunk of streamWithFallback(providerMessages, locale, requestId)) {
          if (!firstTokenTime) {
            firstTokenTime = Date.now() - aiStart;
            logTiming({ requestId, stage: "ai_first_token", durationMs: firstTokenTime });
          }
          full += chunk;
          yield chunk;
        }
        logTiming({ requestId, stage: "ai_stream", durationMs: Date.now() - aiStart });
      } catch (err) {
        console.error("[chatbot:error] Streaming failed in non-gemini flow:", err);
        throw err;
      }

      const offered = finalizeSymptomRecommendationOffer({
        content: full,
        intent: classification.intent,
        specialties: classification.suggestedSpecialties,
        locale,
        message,
        triage,
      });
      if (offered.content.length > full.length) {
        const extra = offered.content.slice(full.length);
        full = offered.content;
        if (extra) yield extra;
      }
      assistantMeta = { ...assistantMeta, ...offered.assistantMeta, recommendations };
    }
  }

  // Guardrails/Moderation standard pipeline integration
  const moderationStart = Date.now();
  full = applyGuardrails(full, locale, { urgency: triage.level });
  logTiming({ requestId, stage: "moderation", durationMs: Date.now() - moderationStart });

  // Database persistence standard pipeline integration
  const dbStart = Date.now();
  if (message || attachments.length) {
    await db.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "user",
        content: message || (locale === "ar" ? "[مرفق]" : "[attachment]"),
        metadata: { attachmentIds: input.attachmentIds ?? [] },
      },
    });
  }

  await db.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: full,
      metadata: { ...assistantMeta, recommendations },
    },
  });
  logTiming({ requestId, stage: "db_save", durationMs: Date.now() - dbStart });

  logTiming({ requestId, stage: "total", durationMs: Date.now() - turnStart });

  yield {
    type: "done",
    conversationId: conversation.id,
    guestSessionId: conversation.guestSessionId,
    urgency: triage.level,
    recommendations,
  };
}

/**
 * @param {unknown} error
 * @param {string} [locale]
 */
export function mapChatbotError(error, locale = "en") {
  logChatbotProviderError(error);
  return mapChatbotErrorForClient(error, locale);
}
