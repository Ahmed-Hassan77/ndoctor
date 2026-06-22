"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ok, fail } from "@/lib/action-result";
import { verifyAdmin } from "@/actions/admin";
import z from "zod";

const PAGE_SIZE = 20;

function recordFromFormData(formData) {
  const raw = {};
  for (const [k, val] of formData.entries()) {
    if (typeof val === "string") raw[k] = val;
  }
  return raw;
}

/**
 * @param {{ search?: string; status?: string; page?: number }} [filters]
 */
export async function getAdminPatients(filters = {}) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("FORBIDDEN");

  const page = Math.max(1, Number(filters.page) || 1);
  const search = (filters.search ?? "").trim();
  const statusFilter =
    filters.status === "DEACTIVATED"
      ? "DEACTIVATED"
      : filters.status === "ACTIVE"
        ? "ACTIVE"
        : null;

  try {
    const where = {
      role: "PATIENT",
      ...(statusFilter ? { accountStatus: statusFilter } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [total, patients] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          updatedAt: true,
          accountStatus: true,
          deactivatedAt: true,
          _count: {
            select: { patientAppointments: true },
          },
          patientAppointments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true, startTime: true },
          },
        },
      }),
    ]);

    const rows = patients.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      createdAt: p.createdAt,
      accountStatus: p.accountStatus,
      deactivatedAt: p.deactivatedAt,
      appointmentCount: p._count.patientAppointments,
      lastActivityAt:
        p.patientAppointments[0]?.startTime ??
        p.patientAppointments[0]?.createdAt ??
        p.updatedAt,
    }));

    return ok({
      patients: rows,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
    });
  } catch (error) {
    console.error("getAdminPatients:", error);
    return fail("FETCH_FAILED");
  }
}

export async function setPatientAccountStatus(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("FORBIDDEN");

  const parsed = z
    .object({
      patientId: z.string().uuid(),
      status: z.enum(["ACTIVE", "DEACTIVATED"]),
    })
    .safeParse(recordFromFormData(formData));

  if (!parsed.success) return fail("VALIDATION_ERROR");

  const { userId } = await auth();

  try {
    const patient = await db.user.findFirst({
      where: { id: parsed.data.patientId, role: "PATIENT" },
    });
    if (!patient) return fail("NOT_FOUND");

    await db.user.update({
      where: { id: patient.id },
      data: {
        accountStatus: parsed.data.status,
        deactivatedAt:
          parsed.data.status === "DEACTIVATED" ? new Date() : null,
        deactivatedBy:
          parsed.data.status === "DEACTIVATED" ? userId ?? null : null,
      },
    });

    revalidatePath("/admin");
    return ok({});
  } catch (error) {
    console.error("setPatientAccountStatus:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function deletePatientAccount(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("FORBIDDEN");

  const parsed = z
    .object({ patientId: z.string().uuid() })
    .safeParse(recordFromFormData(formData));

  if (!parsed.success) return fail("VALIDATION_ERROR");

  try {
    const patient = await db.user.findFirst({
      where: { id: parsed.data.patientId, role: "PATIENT" },
    });
    if (!patient) return fail("NOT_FOUND");

    const upcoming = await db.appointment.count({
      where: {
        patientId: patient.id,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        startTime: { gte: new Date() },
      },
    });
    if (upcoming > 0) {
      return fail("PATIENT_HAS_UPCOMING_APPOINTMENTS");
    }

    await db.user.update({
      where: { id: patient.id },
      data: {
        accountStatus: "DEACTIVATED",
        deactivatedAt: new Date(),
        name: patient.name
          ? `[Deactivated] ${patient.name}`
          : `[Deactivated] ${patient.email}`,
      },
    });

    revalidatePath("/admin");
    return ok({});
  } catch (error) {
    console.error("deletePatientAccount:", error);
    return fail("DELETE_FAILED");
  }
}

/** Block deactivated patients from booking */
export async function assertPatientCanBook(clerkUserId) {
  const patient = await db.user.findUnique({
    where: { clerkUserId, role: "PATIENT" },
    select: { id: true, accountStatus: true },
  });
  if (!patient) return fail("NOT_FOUND");
  if (patient.accountStatus === "DEACTIVATED") return fail("ACCOUNT_DEACTIVATED");
  return ok({ patientId: patient.id });
}
