"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { ok, fail } from "@/lib/action-result";
import z from "zod";

const doctorIdSchema = z.object({
  doctorId: z.string().uuid("Invalid doctor id"),
});

function recordFromFormData(formData) {
  const raw = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string") raw[key] = val;
  }
  return raw;
}

async function requirePatient() {
  const { userId } = await auth();
  if (!userId) return { error: fail("UNAUTHORIZED") };
  const patient = await db.user.findUnique({
    where: { clerkUserId: userId, role: "PATIENT" },
  });
  if (!patient) return { error: fail("FORBIDDEN") };
  return { patient };
}

async function assertFavoritableDoctor(doctorId) {
  const doctor = await db.user.findUnique({
    where: {
      id: doctorId,
      role: "DOCTOR",
      verificationStatus: "VERIFIED",
    },
  });
  if (!doctor) return { error: fail("NOT_FOUND") };
  return { doctor };
}

export async function getMyFavoriteDoctors() {
  const authResult = await requirePatient();
  if (authResult.error) return authResult.error;
  const { patient } = authResult;

  const rows = await db.favoriteDoctor.findMany({
    where: { patientId: patient.id },
    orderBy: { createdAt: "desc" },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          specialty: true,
          imageUrl: true,
          averageRating: true,
          totalReviews: true,
          onlineConsultationPriceEgp: true,
          clinicConsultationPriceEgp: true,
          clinicGovernorate: true,
          clinicArea: true,
          description: true,
        },
      },
    },
  });

  const doctorIds = rows.map((r) => r.doctorId);
  const workModes = await db.workTime.findMany({
    where: { doctorId: { in: doctorIds }, isActive: true },
    select: { doctorId: true, mode: true },
  });

  const doctors = rows.map((r) => {
    const modes = workModes.filter((w) => w.doctorId === r.doctorId);
    return {
      favoriteId: r.id,
      favoritedAt: r.createdAt.toISOString(),
      doctor: {
        ...r.doctor,
        supportsOnline: modes.some((m) => m.mode === "ONLINE"),
        supportsClinic: modes.some((m) => m.mode === "OFFLINE"),
      },
    };
  });

  return ok({ favorites: doctors });
}

export async function isDoctorFavorited(doctorId) {
  const authResult = await requirePatient();
  if (authResult.error) return ok({ favorited: false });
  const { patient } = authResult;

  const row = await db.favoriteDoctor.findUnique({
    where: {
      patientId_doctorId: {
        patientId: patient.id,
        doctorId,
      },
    },
  });
  return ok({ favorited: Boolean(row) });
}

/** Batch lookup for marketplace cards — one query instead of N server actions. */
export async function getFavoriteDoctorIds() {
  const authResult = await requirePatient();
  if (authResult.error) return ok({ doctorIds: [] });
  const { patient } = authResult;

  const rows = await db.favoriteDoctor.findMany({
    where: { patientId: patient.id },
    select: { doctorId: true },
  });

  return ok({ doctorIds: rows.map((row) => row.doctorId) });
}

export async function addFavoriteDoctor(formData) {
  const authResult = await requirePatient();
  if (authResult.error) return authResult.error;
  const { patient } = authResult;

  const parsed = doctorIdSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const doctorCheck = await assertFavoritableDoctor(parsed.data.doctorId);
  if (doctorCheck.error) return doctorCheck.error;

  const existing = await db.favoriteDoctor.findUnique({
    where: {
      patientId_doctorId: {
        patientId: patient.id,
        doctorId: parsed.data.doctorId,
      },
    },
  });
  if (existing) return ok({ favorited: true, alreadySaved: true });

  await db.favoriteDoctor.create({
    data: {
      patientId: patient.id,
      doctorId: parsed.data.doctorId,
    },
  });

  revalidatePath("/favorites");
  revalidatePath("/doctors");
  return ok({ favorited: true });
}

export async function removeFavoriteDoctor(formData) {
  const authResult = await requirePatient();
  if (authResult.error) return authResult.error;
  const { patient } = authResult;

  const parsed = doctorIdSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  await db.favoriteDoctor.deleteMany({
    where: {
      patientId: patient.id,
      doctorId: parsed.data.doctorId,
    },
  });

  revalidatePath("/favorites");
  revalidatePath("/doctors");
  return ok({ favorited: false });
}

export async function toggleFavoriteDoctor(formData) {
  const authResult = await requirePatient();
  if (authResult.error) return authResult.error;
  const { patient } = authResult;

  const parsed = doctorIdSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const existing = await db.favoriteDoctor.findUnique({
    where: {
      patientId_doctorId: {
        patientId: patient.id,
        doctorId: parsed.data.doctorId,
      },
    },
  });

  if (existing) {
    await db.favoriteDoctor.delete({ where: { id: existing.id } });
    revalidatePath("/favorites");
    revalidatePath("/doctors");
    return ok({ favorited: false });
  }

  const doctorCheck = await assertFavoritableDoctor(parsed.data.doctorId);
  if (doctorCheck.error) return doctorCheck.error;

  await db.favoriteDoctor.create({
    data: {
      patientId: patient.id,
      doctorId: parsed.data.doctorId,
    },
  });

  revalidatePath("/favorites");
  revalidatePath("/doctors");
  return ok({ favorited: true });
}
