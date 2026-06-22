"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { ok, fail } from "@/lib/action-result";
import {
  serializeAvailabilityException,
  getDoctorExceptionsInRange,
} from "@/lib/availability-exceptions";
import z from "zod";
import { parseUtcIsoInstant } from "@/lib/datetime";

const exceptionTypeEnum = z.enum([
  "BLOCKED",
  "VACATION",
  "EMERGENCY",
  "CLINIC_CLOSED",
  "OTHER",
]);

const appointmentModeEnum = z.enum(["ONLINE", "OFFLINE"]);

const createExceptionSchema = z
  .object({
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    reason: z.string().max(500).optional().nullable(),
    type: exceptionTypeEnum.default("BLOCKED"),
    appointmentMode: z.preprocess(
      (v) =>
        v != null && String(v).toUpperCase() === "OFFLINE" ? "OFFLINE" : "ONLINE",
      appointmentModeEnum
    ),
    clinicId: z
      .string()
      .uuid()
      .optional()
      .nullable()
      .transform((v) => (v == null || v === "" ? null : v)),
  })
  .refine(
    (d) => {
      const s = parseUtcIsoInstant(d.startTime);
      const e = parseUtcIsoInstant(d.endTime);
      return s && e && e.getTime() > s.getTime();
    },
    { message: "validation.endAfterStart", path: ["endTime"] }
  )
  .refine((d) => d.appointmentMode !== "ONLINE" || !d.clinicId, {
    message: "validation.clinicNotForOnlineBlock",
    path: ["clinicId"],
  });

const exceptionIdSchema = z.object({
  exceptionId: z.string().uuid(),
});

function recordFromFormData(formData) {
  const raw = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string") raw[key] = val;
  }
  return raw;
}

async function requireDoctor() {
  const { userId } = await auth();
  if (!userId) return { error: fail("UNAUTHORIZED") };
  const doctor = await db.user.findUnique({
    where: { clerkUserId: userId, role: "DOCTOR" },
  });
  if (!doctor) return { error: fail("FORBIDDEN") };
  return { doctor };
}

export async function getDoctorAvailabilityExceptions() {
  const authResult = await requireDoctor();
  if (authResult.error) return authResult.error;
  const { doctor } = authResult;

  const now = new Date();
  const rows = await db.availabilityException.findMany({
    where: {
      doctorId: doctor.id,
      endTime: { gte: now },
    },
    include: {
      clinic: {
        select: { id: true, name: true, nameEn: true, nameAr: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return ok({
    exceptions: rows.map(serializeAvailabilityException),
  });
}

export async function createAvailabilityException(formData) {
  const authResult = await requireDoctor();
  if (authResult.error) return authResult.error;
  const { doctor } = authResult;

  const parsed = createExceptionSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const start = parseUtcIsoInstant(parsed.data.startTime);
  const end = parseUtcIsoInstant(parsed.data.endTime);
  if (!start || !end) {
    return fail("VALIDATION_ERROR");
  }

  if (parsed.data.appointmentMode === "OFFLINE" && parsed.data.clinicId) {
    const clinic = await db.clinic.findFirst({
      where: {
        id: parsed.data.clinicId,
        doctorId: doctor.id,
        isActive: true,
      },
    });
    if (!clinic) {
      return fail("VALIDATION_ERROR", "validation.invalidClinicId");
    }
  }

  const row = await db.availabilityException.create({
    data: {
      doctorId: doctor.id,
      startTime: start,
      endTime: end,
      reason: parsed.data.reason?.trim() || null,
      type: parsed.data.type,
      appointmentMode: parsed.data.appointmentMode,
      clinicId:
        parsed.data.appointmentMode === "OFFLINE" ? parsed.data.clinicId : null,
    },
    include: {
      clinic: {
        select: { id: true, name: true, nameEn: true, nameAr: true },
      },
    },
  });

  revalidatePath("/doctors");
  revalidatePath("/doctor");
  return ok({ exception: serializeAvailabilityException(row) });
}

export async function deleteAvailabilityException(formData) {
  const authResult = await requireDoctor();
  if (authResult.error) return authResult.error;
  const { doctor } = authResult;

  const parsed = exceptionIdSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const existing = await db.availabilityException.findUnique({
    where: { id: parsed.data.exceptionId },
  });

  if (!existing || existing.doctorId !== doctor.id) {
    return fail("NOT_FOUND");
  }

  await db.availabilityException.delete({
    where: { id: existing.id },
  });

  revalidatePath("/doctors");
  revalidatePath("/doctor");
  return ok({ success: true });
}

export { getDoctorExceptionsInRange };
