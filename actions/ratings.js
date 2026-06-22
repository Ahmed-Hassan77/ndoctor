"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { ok, fail } from "@/lib/action-result";
import { ratingSchema } from "@/lib/schema";
import z from "zod";

function recordFromFormData(formData) {
  const raw = {};
  for (const [k, val] of formData.entries()) {
    if (typeof val === "string") raw[k] = val;
  }
  return raw;
}

function encodeCursor(createdAt, id) {
  return Buffer.from(
    JSON.stringify({ t: createdAt.getTime(), id }),
    "utf8"
  ).toString("base64url");
}

function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== "string") return null;
  try {
    const o = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (typeof o.t !== "number" || typeof o.id !== "string") return null;
    return { createdAt: new Date(o.t), id: o.id };
  } catch {
    return null;
  }
}

function patientDisplayName(name) {
  if (!name || !name.trim()) return "Patient";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1]?.[0] ?? ""}.`.trim();
}

export async function submitRating(formData) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  const parsed = ratingSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const { appointmentId, value, review } = parsed.data;

  try {
    const patient = await db.user.findUnique({
      where: { clerkUserId: userId, role: "PATIENT" },
    });

    if (!patient) {
      return fail("FORBIDDEN");
    }

    const result = await db.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          doctor: { select: { id: true, specialty: true } },
        },
      });

      if (!appointment) {
        throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
      }

      if (appointment.patientId !== patient.id) {
        throw Object.assign(new Error("FORBIDDEN"), { code: "FORBIDDEN" });
      }

      if (appointment.status !== "COMPLETED") {
        throw Object.assign(new Error("NOT_COMPLETED"), {
          code: "NOT_COMPLETED",
        });
      }

      if (!appointment.isPaid) {
        throw Object.assign(new Error("NOT_PAID"), { code: "NOT_PAID" });
      }

      const doctorId = appointment.doctorId;

      const existing = await tx.rating.findUnique({
        where: { appointmentId },
      });

      if (existing) {
        throw Object.assign(new Error("ALREADY_RATED"), {
          code: "ALREADY_RATED",
        });
      }

      await tx.rating.create({
        data: {
          doctorId,
          patientId: patient.id,
          appointmentId,
          value,
          review: review ?? null,
        },
      });

      const agg = await tx.rating.aggregate({
        where: { doctorId },
        _avg: { value: true },
        _count: { _all: true },
      });

      const averageRating = agg._avg.value != null ? Number(agg._avg.value) : 0;
      const totalReviews = agg._count._all;

      await tx.user.update({
        where: { id: doctorId },
        data: {
          averageRating,
          totalReviews,
        },
      });

      return { doctorId, specialty: appointment.doctor.specialty };
    });

    revalidatePath("/appointments");
    revalidatePath("/doctors");
    if (result.specialty) {
      const seg = encodeURIComponent(result.specialty);
      revalidatePath(`/doctors/${seg}/${result.doctorId}`);
      revalidatePath(`/doctors/${seg}/${result.doctorId}/ratings`);
    }

    return ok({});
  } catch (err) {
    if (err?.code === "NOT_FOUND") {
      return fail("NOT_FOUND");
    }
    if (err?.code === "FORBIDDEN") {
      return fail("FORBIDDEN");
    }
    if (err?.code === "NOT_COMPLETED") {
      return fail("NOT_COMPLETED");
    }
    if (err?.code === "NOT_PAID") {
      return fail("NOT_PAID");
    }
    if (err?.code === "ALREADY_RATED") {
      return fail("ALREADY_RATED");
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return fail("ALREADY_RATED");
    }
    console.error("submitRating:", err);
    return fail("SUBMIT_FAILED");
  }
}

export async function getDoctorRatings(doctorId, cursor, limit = 10) {
  const idCheck = z.string().uuid().safeParse(doctorId);
  if (!idCheck.success) {
    return fail("VALIDATION_ERROR");
  }

  const lim = Math.min(Math.max(Number(limit) || 10, 1), 50);
  const c = decodeCursor(cursor);

  try {
    const doctor = await db.user.findUnique({
      where: {
        id: doctorId,
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
      },
    });

    if (!doctor) {
      return fail("NOT_FOUND");
    }

    const where = {
      doctorId,
      ...(c
        ? {
            OR: [
              { createdAt: { lt: c.createdAt } },
              {
                AND: [
                  { createdAt: c.createdAt },
                  { id: { lt: c.id } },
                ],
              },
            ],
          }
        : {}),
    };

    const rows = await db.rating.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: lim + 1,
      include: {
        patient: {
          select: { name: true },
        },
      },
    });

    const hasMore = rows.length > lim;
    const slice = hasMore ? rows.slice(0, lim) : rows;
    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last ? encodeCursor(last.createdAt, last.id) : null;

    const ratings = slice.map((r) => ({
      id: r.id,
      value: r.value,
      review: r.review,
      createdAt: r.createdAt.toISOString(),
      patientName: patientDisplayName(r.patient?.name),
    }));

    return ok({ ratings, nextCursor, hasMore });
  } catch (error) {
    console.error("getDoctorRatings:", error);
    return fail("FETCH_FAILED");
  }
}

export async function hasUserRatedBooking(appointmentId) {
  const idCheck = z.string().uuid().safeParse(appointmentId);
  if (!idCheck.success) {
    return fail("VALIDATION_ERROR");
  }

  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId, role: "PATIENT" },
    });

    if (!user) {
      return ok({ rated: false });
    }

    const appointment = await db.appointment.findFirst({
      where: { id: appointmentId, patientId: user.id },
      select: { id: true },
    });

    if (!appointment) {
      return ok({ rated: false });
    }

    const rating = await db.rating.findUnique({
      where: { appointmentId },
      select: { id: true },
    });

    return ok({ rated: !!rating });
  } catch (error) {
    console.error("hasUserRatedBooking:", error);
    return fail("FETCH_FAILED");
  }
}

export async function getDoctorAverageRating(doctorId) {
  const idCheck = z.string().uuid().safeParse(doctorId);
  if (!idCheck.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    const doctor = await db.user.findUnique({
      where: {
        id: doctorId,
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
      },
      select: {
        averageRating: true,
        totalReviews: true,
      },
    });

    if (!doctor) {
      return fail("NOT_FOUND");
    }

    return ok({
      average: doctor.averageRating,
      total: doctor.totalReviews,
    });
  } catch (error) {
    console.error("getDoctorAverageRating:", error);
    return fail("FETCH_FAILED");
  }
}
