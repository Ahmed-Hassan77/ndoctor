import { randomUUID } from "crypto";
import { db } from "@/lib/prisma";
import { getChatProvider } from "@/lib/chatbot/providers";
import { prepareMessagesForProvider } from "@/lib/chatbot/providers/history";
import { getChatUserContext, assertConversationAccess } from "@/lib/chatbot/auth";
import { buildSystemPrompt, buildEmergencyOverride } from "@/lib/chatbot/prompts/system";
import { buildRoleContextBlock } from "@/lib/chatbot/context/role-context";
import { analyzeSymptoms } from "@/lib/chatbot/safety/triage";
import { applyGuardrails, sanitizeUserInput } from "@/lib/chatbot/safety/guardrails";
import {
  getRecommendationsForTriage,
  recommendDoctors,
} from "@/lib/chatbot/recommendations/doctors";
import {
  isDoctorRecommendationRequest,
  extractSpecialtyHint,
  buildDoctorRecommendationMarkdown,
} from "@/lib/chatbot/intent/doctor-request";
import { upsertIntakeSummary } from "@/lib/chatbot/intake/summary";
import { getConversationFiles } from "@/lib/chatbot/files/storage";
import { buildUserMessageContent } from "@/lib/chatbot/files/attachments";
import { ChatbotProviderError } from "@/lib/chatbot/types";

const HISTORY_LIMIT = 20;

/**
 * @param {string} message
 * @param {string} role
 * @param {string} [governorate]
 * @returns {Promise<{ doctors: object[] } | null>}
 */
async function resolveDoctorRecommendationIntent(message, role, governorate) {
  if (role !== "PATIENT" && role !== "UNASSIGNED") {
    return null;
  }
  if (!isDoctorRecommendationRequest(message)) {
    return null;
  }

  const specialtyHint = extractSpecialtyHint(message);
  const specialties = specialtyHint ? [specialtyHint] : [];
  const doctors = await recommendDoctors({ specialties, governorate, limit: 5 });

  if (!doctors.length) {
    return null;
  }

  return { doctors };
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
 * @param {object} input
 */
export async function runChatTurn(input) {
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

  const attachments = await getConversationFiles(
    input.attachmentIds ?? [],
    conversation.id
  );

  const userContent = await buildUserMessageContent(message, attachments, locale);

  const roleContext = await buildRoleContextBlock(role, user);
  const systemPrompt = buildSystemPrompt({
    role,
    locale,
    contextBlock: roleContext,
  });

  const history = await loadConversationMessages(conversation.id);
  /** @type {import("@/lib/chatbot/types").ChatMessage[]} */
  const providerMessages = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: /** @type {'user'|'assistant'|'system'} */ (m.role),
      content: m.content,
    })),
  ];

  if (userContent) {
    providerMessages.push({ role: "user", content: userContent });
  } else if (!message && attachments.length) {
    throw new ChatbotProviderError("VALIDATION_ERROR", "Message is required.");
  }

  let assistantContent;
  let recommendations = { emergency: false, doctors: [] };

  if (triage.level === "emergency") {
    assistantContent = buildEmergencyOverride(locale);
    recommendations = { emergency: true, doctors: [] };
  } else {
    const doctorIntent = await resolveDoctorRecommendationIntent(
      message,
      role,
      governorate
    );

    if (doctorIntent) {
      assistantContent = buildDoctorRecommendationMarkdown(
        doctorIntent.doctors,
        locale
      );
      recommendations = { emergency: false, doctors: doctorIntent.doctors };
    } else {
      const provider = getChatProvider();
      const result = await provider.complete({
        messages: prepareMessagesForProvider(providerMessages),
        locale,
      });
      assistantContent = applyGuardrails(result.content, locale, {
        urgency: triage.level,
      });

      if (role === "PATIENT" || role === "UNASSIGNED") {
        recommendations = await getRecommendationsForTriage(
          triage.level,
          triage.specialties,
          governorate
        );
      }
    }
  }

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
      metadata: {
        urgency: triage.level,
        specialties: triage.specialties,
        recommendations,
      },
    },
  });

  await db.chatConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

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
  const doctorIntent = await resolveDoctorRecommendationIntent(
    message,
    role,
    governorate
  );

  let full = "";
  let recommendations = { emergency: false, doctors: [] };

  if (doctorIntent) {
    full = buildDoctorRecommendationMarkdown(doctorIntent.doctors, locale);
    recommendations = { emergency: false, doctors: doctorIntent.doctors };
    yield full;
  } else {
    const userContent = await buildUserMessageContent(message, attachments, locale);

    const roleContext = await buildRoleContextBlock(role, user);
    const systemPrompt = buildSystemPrompt({
      role,
      locale,
      contextBlock: roleContext,
    });

    const history = await loadConversationMessages(conversation.id);
    /** @type {import("@/lib/chatbot/types").ChatMessage[]} */
    const providerMessages = [
      { role: "system", content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: userContent || message },
    ];

    const provider = getChatProvider();
    const preparedMessages = prepareMessagesForProvider(providerMessages);

    if (provider.stream) {
      for await (const chunk of provider.stream({
        messages: preparedMessages,
        locale,
      })) {
        full += chunk;
        yield chunk;
      }
    } else {
      const result = await provider.complete({
        messages: preparedMessages,
        locale,
      });
      full = result.content;
      yield full;
    }

    full = applyGuardrails(full, locale, { urgency: triage.level });

    if (role === "PATIENT" || role === "UNASSIGNED") {
      recommendations = await getRecommendationsForTriage(
        triage.level,
        triage.specialties,
        governorate
      );
    }
  }

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
      metadata: { urgency: triage.level, recommendations },
    },
  });

  yield {
    type: "done",
    conversationId: conversation.id,
    guestSessionId: conversation.guestSessionId,
    urgency: triage.level,
    recommendations,
  };
}

export function mapChatbotError(error) {
  if (error instanceof ChatbotProviderError) {
    return { code: error.code, message: error.message };
  }
  const message = error?.message || "Chat failed.";
  if (/ChatConversation|ChatMessage|does not exist|relation/i.test(message)) {
    return {
      code: "CHATBOT_DB_NOT_READY",
      message:
        "Chat storage is not initialized. Run: npx prisma migrate deploy",
    };
  }
  return { code: "CHATBOT_FAILED", message };
}
