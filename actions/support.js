"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { ok, fail } from "@/lib/action-result";
import { verifyAdmin } from "@/actions/admin";
import {
  createNotification,
  createNotificationsForUsers,
  getAdminUserIds,
} from "@/lib/notifications";
import z from "zod";

const ticketCategory = z.enum([
  "BOOKING",
  "PAYMENT",
  "REFUND",
  "DOCTOR_COMPLAINT",
  "TECHNICAL",
  "OTHER",
]);

const ticketStatus = z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"]);

const ticketPriority = z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]);

const createTicketSchema = z.object({
  category: ticketCategory,
  subject: z.string().min(3).max(200),
  message: z.string().min(10).max(5000),
  appointmentId: z.string().uuid().optional().nullable(),
  priority: ticketPriority.optional().default("NORMAL"),
});

function recordFromFormData(formData) {
  const raw = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string") raw[key] = val;
  }
  return raw;
}

function serializeTicket(row) {
  if (!row) return null;
  const toIso = (v) =>
    v instanceof Date ? v.toISOString() : v != null ? String(v) : v;
  return {
    id: row.id,
    userId: row.userId,
    appointmentId: row.appointmentId ?? null,
    category: row.category,
    status: row.status,
    priority: row.priority,
    subject: row.subject,
    message: row.message,
    adminResponse: row.adminResponse ?? null,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    resolvedAt: toIso(row.resolvedAt),
    resolvedBy: row.resolvedBy ?? null,
    user: row.user ?? null,
    appointment: row.appointment
      ? {
          id: row.appointment.id,
          startTime: toIso(row.appointment.startTime),
          status: row.appointment.status,
          appointmentMode: row.appointment.appointmentMode,
        }
      : null,
  };
}

async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) return null;
  return db.user.findUnique({ where: { clerkUserId: userId } });
}

async function notifyAdminsNewTicket(ticket) {
  const adminIds = await getAdminUserIds();
  await createNotificationsForUsers(adminIds, {
    type: "SYSTEM",
    title: "New support ticket",
    message: `${ticket.subject} (${ticket.category})`,
    linkUrl: "/admin",
  });
}

async function notifyUserTicketUpdate(userId, ticket, title, message) {
  await createNotification({
    userId,
    type: "SYSTEM",
    title,
    message,
    linkUrl: "/support",
  });
}

export async function createSupportTicket(formData) {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED");
  if (user.role === "UNASSIGNED") {
    return fail("FORBIDDEN");
  }

  const parsed = createTicketSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  if (parsed.data.appointmentId) {
    const appt = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
    });
    if (!appt) return fail("NOT_FOUND");
    if (user.role === "PATIENT" && appt.patientId !== user.id) {
      return fail("FORBIDDEN");
    }
    if (user.role === "DOCTOR" && appt.doctorId !== user.id) {
      return fail("FORBIDDEN");
    }
  }

  const ticket = await db.supportTicket.create({
    data: {
      userId: user.id,
      appointmentId: parsed.data.appointmentId ?? null,
      category: parsed.data.category,
      priority: parsed.data.priority,
      subject: parsed.data.subject.trim(),
      message: parsed.data.message.trim(),
    },
  });

  try {
    await notifyAdminsNewTicket(ticket);
  } catch (e) {
    console.error("notifyAdminsNewTicket:", e);
  }

  revalidatePath("/support");
  revalidatePath("/admin");
  revalidatePath("/notifications");

  return ok({ ticket: serializeTicket(ticket) });
}

export async function getMySupportTickets() {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED");

  const rows = await db.supportTicket.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      appointment: {
        select: {
          id: true,
          startTime: true,
          status: true,
          appointmentMode: true,
        },
      },
    },
  });

  return ok({ tickets: rows.map(serializeTicket) });
}

export async function getSupportTicketById(ticketId) {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED");

  const row = await db.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      appointment: {
        select: {
          id: true,
          startTime: true,
          status: true,
          appointmentMode: true,
        },
      },
    },
  });

  if (!row) return fail("NOT_FOUND");
  if (row.userId !== user.id && user.role !== "ADMIN") {
    return fail("FORBIDDEN");
  }

  return ok({ ticket: serializeTicket(row) });
}

export async function getMyAppointmentsForSupport() {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED");

  const where =
    user.role === "PATIENT"
      ? { patientId: user.id }
      : user.role === "DOCTOR"
        ? { doctorId: user.id }
        : null;

  if (!where) return ok({ appointments: [] });

  const appointments = await db.appointment.findMany({
    where,
    orderBy: { startTime: "desc" },
    take: 50,
    select: {
      id: true,
      startTime: true,
      status: true,
      appointmentMode: true,
    },
  });

  return ok({
    appointments: appointments.map((a) => ({
      ...a,
      startTime:
        a.startTime instanceof Date
          ? a.startTime.toISOString()
          : a.startTime,
    })),
  });
}

export async function getAllSupportTickets(filters = {}) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const status = filters.status;
  const category = filters.category;
  const priority = filters.priority;

  const rows = await db.supportTicket.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(priority ? { priority } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      appointment: {
        select: {
          id: true,
          startTime: true,
          status: true,
          appointmentMode: true,
        },
      },
    },
  });

  return ok({ tickets: rows.map(serializeTicket) });
}

export async function updateSupportTicketStatus(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const parsed = z
    .object({
      ticketId: z.string().uuid(),
      status: ticketStatus,
    })
    .safeParse(recordFromFormData(formData));

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const { userId } = await auth();
  const admin = userId
    ? await db.user.findUnique({ where: { clerkUserId: userId } })
    : null;

  const existing = await db.supportTicket.findUnique({
    where: { id: parsed.data.ticketId },
  });
  if (!existing) return fail("NOT_FOUND");

  const resolved =
    parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED";

  const updated = await db.supportTicket.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      resolvedAt: resolved ? new Date() : null,
      resolvedBy: resolved ? admin?.id ?? "admin" : null,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      appointment: true,
    },
  });

  if (existing.status !== parsed.data.status) {
    try {
      await notifyUserTicketUpdate(
        updated.userId,
        updated,
        "Support ticket updated",
        `Your ticket "${updated.subject}" is now ${parsed.data.status.replace("_", " ").toLowerCase()}.`
      );
    } catch (e) {
      console.error("notifyUserTicketUpdate:", e);
    }
  }

  revalidatePath("/admin");
  revalidatePath("/support");
  revalidatePath("/notifications");

  return ok({ ticket: serializeTicket(updated) });
}

export async function respondToSupportTicket(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const parsed = z
    .object({
      ticketId: z.string().uuid(),
      adminResponse: z.string().min(1).max(5000),
      status: ticketStatus.optional(),
    })
    .safeParse(recordFromFormData(formData));

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const { userId } = await auth();
  const admin = userId
    ? await db.user.findUnique({ where: { clerkUserId: userId } })
    : null;

  const status = parsed.data.status ?? "IN_REVIEW";
  const resolved = status === "RESOLVED" || status === "CLOSED";

  const updated = await db.supportTicket.update({
    where: { id: parsed.data.ticketId },
    data: {
      adminResponse: parsed.data.adminResponse.trim(),
      status,
      resolvedAt: resolved ? new Date() : undefined,
      resolvedBy: resolved ? admin?.id ?? "admin" : undefined,
    },
    include: {
      user: { select: { id: true, name: true, email: true, role: true } },
      appointment: true,
    },
  });

  try {
    await notifyUserTicketUpdate(
      updated.userId,
      updated,
      "Support team replied",
      `Response on "${updated.subject}": ${parsed.data.adminResponse.slice(0, 120)}${parsed.data.adminResponse.length > 120 ? "…" : ""}`
    );
  } catch (e) {
    console.error("notifyUserTicketUpdate:", e);
  }

  revalidatePath("/admin");
  revalidatePath("/support");
  revalidatePath("/notifications");

  return ok({ ticket: serializeTicket(updated) });
}
