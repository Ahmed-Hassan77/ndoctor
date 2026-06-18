import { db } from "@/lib/prisma";

/**
 * @param {import("@prisma/client").Prisma.TransactionClient} [tx]
 */
export async function createNotification(
  { userId, type, title, message, linkUrl },
  tx
) {
  const client = tx ?? db;
  return client.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      linkUrl: linkUrl ?? null,
    },
  });
}

/**
 * @param {string[]} userIds
 * @param {Omit<Parameters<typeof createNotification>[0], 'userId'>} payload
 * @param {import("@prisma/client").Prisma.TransactionClient} [tx]
 */
export async function createNotificationsForUsers(userIds, payload, tx) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return [];
  const client = tx ?? db;
  await client.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      linkUrl: payload.linkUrl ?? null,
    })),
  });
  return unique;
}

export async function getAdminUserIds(tx) {
  const client = tx ?? db;
  const admins = await client.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  return admins.map((a) => a.id);
}

/** Serialize notification for client (ISO dates). */
export function serializeNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    message: row.message,
    linkUrl: row.linkUrl ?? null,
    readAt:
      row.readAt instanceof Date
        ? row.readAt.toISOString()
        : row.readAt ?? null,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
  };
}
