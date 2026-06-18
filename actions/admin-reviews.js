"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ok, fail } from "@/lib/action-result";
import { verifyAdmin } from "@/actions/admin";
import { recalculateDoctorRatingStats } from "@/lib/doctor-rating-stats";
import z from "zod";

function recordFromFormData(formData) {
  const raw = {};
  for (const [k, val] of formData.entries()) {
    if (typeof val === "string") raw[k] = val;
  }
  return raw;
}

function serializeReview(row) {
  return {
    id: row.id,
    value: row.value,
    review: row.review,
    createdAt:
      row.createdAt instanceof Date
        ? row.createdAt.toISOString()
        : row.createdAt,
    moderationStatus: row.moderationStatus,
    hiddenAt:
      row.hiddenAt instanceof Date
        ? row.hiddenAt.toISOString()
        : row.hiddenAt ?? null,
    hiddenBy: row.hiddenBy ?? null,
    hiddenReason: row.hiddenReason ?? null,
    patient: row.patient
      ? {
          id: row.patient.id,
          name: row.patient.name,
          email: row.patient.email,
        }
      : null,
    doctor: row.doctor
      ? {
          id: row.doctor.id,
          name: row.doctor.name,
          email: row.doctor.email,
          specialty: row.doctor.specialty,
        }
      : null,
    appointment: row.appointment
      ? {
          id: row.appointment.id,
          startTime:
            row.appointment.startTime instanceof Date
              ? row.appointment.startTime.toISOString()
              : row.appointment.startTime,
          status: row.appointment.status,
        }
      : null,
  };
}

async function revalidateDoctorRatingPaths(doctorId, specialty) {
  revalidatePath("/doctors");
  revalidatePath("/admin");
  if (specialty) {
    const seg = encodeURIComponent(specialty);
    revalidatePath(`/doctors/${seg}/${doctorId}`);
    revalidatePath(`/doctors/${seg}/${doctorId}/ratings`);
  }
}

/**
 * @param {{ moderationStatus?: string; doctorId?: string; ratingValue?: number }} [filters]
 */
export async function getAllReviewsForAdmin(filters = {}) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const statusFilter = filters.moderationStatus;
  const doctorId = filters.doctorId;
  const ratingValue =
    filters.ratingValue != null ? Number(filters.ratingValue) : undefined;

  const where = {
    ...(statusFilter && statusFilter !== "all"
      ? { moderationStatus: statusFilter }
      : {}),
    ...(doctorId ? { doctorId } : {}),
    ...(ratingValue >= 1 && ratingValue <= 5
      ? { value: ratingValue }
      : {}),
  };

  try {
    const rows = await db.rating.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: {
          select: { id: true, name: true, email: true, specialty: true },
        },
        appointment: {
          select: { id: true, startTime: true, status: true },
        },
      },
    });

    const doctors = await db.user.findMany({
      where: { role: "DOCTOR" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
      take: 500,
    });

    return ok({
      reviews: rows.map(serializeReview),
      doctors,
    });
  } catch (err) {
    console.error("getAllReviewsForAdmin:", err);
    return fail("FETCH_FAILED");
  }
}

export async function hideReview(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const parsed = z
    .object({
      ratingId: z.string().min(1),
      hiddenReason: z.string().max(2000).optional(),
    })
    .safeParse(recordFromFormData(formData));

  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "validation.invalid"
    );
  }

  const { userId } = await auth();
  const admin = userId
    ? await db.user.findUnique({ where: { clerkUserId: userId } })
    : null;

  try {
    const existing = await db.rating.findUnique({
      where: { id: parsed.data.ratingId },
      include: { doctor: { select: { specialty: true } } },
    });
    if (!existing) return fail("NOT_FOUND");

    const updated = await db.$transaction(async (tx) => {
      const row = await tx.rating.update({
        where: { id: existing.id },
        data: {
          moderationStatus: "HIDDEN",
          hiddenAt: new Date(),
          hiddenBy: admin?.id ?? "admin",
          hiddenReason: parsed.data.hiddenReason?.trim() || null,
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: {
            select: { id: true, name: true, email: true, specialty: true },
          },
          appointment: {
            select: { id: true, startTime: true, status: true },
          },
        },
      });

      await recalculateDoctorRatingStats(existing.doctorId, tx);
      return row;
    });

    await revalidateDoctorRatingPaths(
      existing.doctorId,
      existing.doctor?.specialty
    );

    return ok({ review: serializeReview(updated) });
  } catch (err) {
    console.error("hideReview:", err);
    return fail("UPDATE_FAILED");
  }
}

export async function unhideReview(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const parsed = z
    .object({ ratingId: z.string().min(1) })
    .safeParse(recordFromFormData(formData));

  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "validation.invalid"
    );
  }

  try {
    const existing = await db.rating.findUnique({
      where: { id: parsed.data.ratingId },
      include: { doctor: { select: { specialty: true } } },
    });
    if (!existing) return fail("NOT_FOUND");

    const updated = await db.$transaction(async (tx) => {
      const row = await tx.rating.update({
        where: { id: existing.id },
        data: {
          moderationStatus: "VISIBLE",
          hiddenAt: null,
          hiddenBy: null,
          hiddenReason: null,
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: {
            select: { id: true, name: true, email: true, specialty: true },
          },
          appointment: {
            select: { id: true, startTime: true, status: true },
          },
        },
      });

      await recalculateDoctorRatingStats(existing.doctorId, tx);
      return row;
    });

    await revalidateDoctorRatingPaths(
      existing.doctorId,
      existing.doctor?.specialty
    );

    return ok({ review: serializeReview(updated) });
  } catch (err) {
    console.error("unhideReview:", err);
    return fail("UPDATE_FAILED");
  }
}

export async function flagReview(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const parsed = z
    .object({
      ratingId: z.string().min(1),
      hiddenReason: z.string().max(2000).optional(),
    })
    .safeParse(recordFromFormData(formData));

  if (!parsed.success) {
    return fail(
      "VALIDATION_ERROR",
      parsed.error.issues[0]?.message ?? "validation.invalid"
    );
  }

  try {
    const existing = await db.rating.findUnique({
      where: { id: parsed.data.ratingId },
      include: { doctor: { select: { specialty: true } } },
    });
    if (!existing) return fail("NOT_FOUND");

    const updated = await db.$transaction(async (tx) => {
      const row = await tx.rating.update({
        where: { id: existing.id },
        data: {
          moderationStatus: "FLAGGED",
          ...(parsed.data.hiddenReason?.trim()
            ? { hiddenReason: parsed.data.hiddenReason.trim() }
            : {}),
        },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: {
            select: { id: true, name: true, email: true, specialty: true },
          },
          appointment: {
            select: { id: true, startTime: true, status: true },
          },
        },
      });

      await recalculateDoctorRatingStats(existing.doctorId, tx);
      return row;
    });

    await revalidateDoctorRatingPaths(
      existing.doctorId,
      existing.doctor?.specialty
    );

    return ok({ review: serializeReview(updated) });
  } catch (err) {
    console.error("flagReview:", err);
    return fail("UPDATE_FAILED");
  }
}
