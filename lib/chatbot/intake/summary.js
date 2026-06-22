import { db } from "@/lib/prisma";

/**
 * @param {string} conversationId
 * @param {string} userMessage
 * @param {string} urgency
 * @param {string | null} patientId
 */
export async function upsertIntakeSummary(conversationId, userMessage, urgency, patientId) {
  const existing = await db.chatIntakeSummary.findUnique({
    where: { conversationId },
  });

  const chiefComplaint = existing?.chiefComplaint || userMessage.slice(0, 500);

  const structuredJson = {
    chiefComplaint,
    historyOfPresentIllness: existing?.historyPresent || null,
    currentMedications: existing?.medications || null,
    allergies: existing?.allergies || null,
    relevantNotes: existing?.notes || null,
    urgencyLevel: urgency,
  };

  if (existing) {
    return db.chatIntakeSummary.update({
      where: { conversationId },
      data: {
        urgencyLevel: urgency,
        structuredJson,
        updatedAt: new Date(),
      },
    });
  }

  return db.chatIntakeSummary.create({
    data: {
      conversationId,
      patientId: patientId ?? null,
      chiefComplaint,
      urgencyLevel: urgency,
      structuredJson,
    },
  });
}
