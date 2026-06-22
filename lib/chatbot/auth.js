import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

/**
 * @returns {Promise<{ user: object | null; clerkUserId: string | null }>}
 */
export async function getChatUserContext() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { user: null, clerkUserId: null };
  }

  const user = await db.user.findUnique({
    where: { clerkUserId },
    select: {
      id: true,
      clerkUserId: true,
      role: true,
      name: true,
      email: true,
      specialty: true,
      verificationStatus: true,
      clinicGovernorate: true,
      clinicArea: true,
      allergies: true,
      chronicConditions: true,
      currentMedications: true,
      previousSurgeries: true,
      accountStatus: true,
    },
  });

  return { user, clerkUserId };
}

/**
 * @param {string | null | undefined} userId
 * @param {string | null | undefined} guestSessionId
 * @param {string} conversationId
 */
export async function assertConversationAccess(userId, guestSessionId, conversationId) {
  const conversation = await db.chatConversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) return null;

  if (conversation.userId) {
    if (!userId || conversation.userId !== userId) return null;
  } else if (conversation.guestSessionId !== guestSessionId) {
    return null;
  }

  return conversation;
}
