"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { ok, fail } from "@/lib/action-result";
import { serializeNotification } from "@/lib/notifications";
import z from "zod";

const notificationIdSchema = z.object({
  notificationId: z.string().uuid(),
});

function recordFromFormData(formData) {
  const raw = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string") raw[key] = val;
  }
  return raw;
}

async function getCurrentDbUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return db.user.findUnique({ where: { clerkUserId: userId } });
}

export async function getMyNotifications(limit = 50) {
  const user = await getCurrentDbUser();
  if (!user) return fail("UNAUTHORIZED");

  try {
    const rows = await db.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(limit, 1), 100),
    });

    const unreadCount = await db.notification.count({
      where: { userId: user.id, readAt: null },
    });

    return ok({
      notifications: rows.map(serializeNotification),
      unreadCount,
    });
  } catch (error) {
    console.error("getMyNotifications:", error);
    return fail("FETCH_FAILED");
  }
}

export async function getUnreadNotificationCount() {
  const user = await getCurrentDbUser();
  if (!user) return ok({ unreadCount: 0 });

  const unreadCount = await db.notification.count({
    where: { userId: user.id, readAt: null },
  });

  return ok({ unreadCount });
}

export async function markNotificationRead(formData) {
  const user = await getCurrentDbUser();
  if (!user) return fail("UNAUTHORIZED");

  const parsed = notificationIdSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const existing = await db.notification.findUnique({
    where: { id: parsed.data.notificationId },
  });

  if (!existing || existing.userId !== user.id) {
    return fail("FORBIDDEN");
  }

  if (existing.readAt) {
    return ok({ notification: serializeNotification(existing) });
  }

  const updated = await db.notification.update({
    where: { id: existing.id },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
  return ok({ notification: serializeNotification(updated) });
}

export async function markAllNotificationsRead() {
  const user = await getCurrentDbUser();
  if (!user) return fail("UNAUTHORIZED");

  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/notifications");
  return ok({ success: true });
}
