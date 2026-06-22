"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { ok, fail } from "@/lib/action-result";
import {
  buildMonthSlotDays,
  buildMonthDayStates,
  buildWeekSlotDays,
  filterExceptionsForBooking,
  filterWorkTimesForBooking,
  getMonthBoundsInZone,
  getWeekBoundsInZone,
} from "@/lib/appointment-slots";
import { getDoctorExceptionsInRange } from "@/lib/availability-exceptions";
import { getDoctorSlotDurationMinutes } from "@/lib/scheduling";
import { getPlatformTimeZone } from "@/lib/platform-timezone";
import { resolveSlotCutoffMs } from "@/lib/datetime";
import z from "zod";

const monthQuerySchema = z
  .object({
    doctorId: z.string().uuid(),
    year: z.coerce.number().int().min(2020).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    mode: z.enum(["ONLINE", "OFFLINE"]).default("ONLINE"),
    clinicId: z.string().uuid().optional().nullable(),
    excludeAppointmentId: z.string().uuid().optional().nullable(),
    clientNowIso: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "OFFLINE" && !data.clinicId?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "validation.clinicRequired",
        path: ["clinicId"],
      });
    }
  });

async function loadSlotContext(parsed) {
  const doctor = await db.user.findUnique({
    where: {
      id: parsed.doctorId,
      role: "DOCTOR",
      verificationStatus: "VERIFIED",
    },
  });
  if (!doctor) return { error: fail("NOT_FOUND") };

  const zone = getPlatformTimeZone();
  const slotMinutes = getDoctorSlotDurationMinutes(doctor);
  const cutoffMs = resolveSlotCutoffMs(parsed.clientNowIso);

  const allWorkTimes = await db.workTime.findMany({
    where: {
      doctorId: doctor.id,
      isActive: true,
      mode: parsed.mode,
      ...(parsed.mode === "OFFLINE" && parsed.clinicId?.trim()
        ? {
            OR: [
              { clinicScopeKey: parsed.clinicId.trim() },
              { clinicScopeKey: "global" },
            ],
          }
        : parsed.mode === "ONLINE"
          ? { clinicScopeKey: "global" }
          : {}),
    },
  });
  const workTimes = filterWorkTimesForBooking(
    allWorkTimes,
    parsed.mode,
    parsed.clinicId
  );

  const { monthStartUtc, monthEndUtc } = getMonthBoundsInZone(
    zone,
    parsed.year,
    parsed.month,
    new Date(cutoffMs)
  );

  const existingAppointments = await db.appointment.findMany({
    where: {
      doctorId: doctor.id,
      status: { in: ["SCHEDULED", "CONFIRMED"] },
      startTime: { lt: monthEndUtc },
      endTime: { gt: monthStartUtc },
      ...(parsed.excludeAppointmentId
        ? { id: { not: parsed.excludeAppointmentId } }
        : {}),
    },
  });

  const allExceptions = await getDoctorExceptionsInRange(
    doctor.id,
    monthStartUtc,
    monthEndUtc
  );
  const availabilityExceptions = filterExceptionsForBooking(
    allExceptions,
    parsed.clinicId,
    parsed.mode
  );

  return {
    doctor,
    zone,
    slotMinutes,
    cutoffMs,
    workTimes,
    existingAppointments,
    availabilityExceptions,
    monthStartUtc,
    monthEndUtc,
  };
}

/** Patient booking: month grid + slot days for selected month */
export async function getAvailableSlotsForMonth(input) {
  const parsed = monthQuerySchema.safeParse(input);
  if (!parsed.success) return fail("VALIDATION_ERROR");

  try {
    const ctx = await loadSlotContext(parsed.data);
    if (ctx.error) return ctx.error;

    const days = buildMonthSlotDays({
      zone: ctx.zone,
      year: parsed.data.year,
      month: parsed.data.month,
      workTimes: ctx.workTimes,
      slotMinutes: ctx.slotMinutes,
      existingAppointments: ctx.existingAppointments,
      availabilityExceptions: ctx.availabilityExceptions,
      cutoffMs: ctx.cutoffMs,
      clinicId: parsed.data.clinicId,
    });

    const dayStates = buildMonthDayStates(
      days,
      ctx.existingAppointments,
      ctx.availabilityExceptions
    );

    return ok({
      year: parsed.data.year,
      month: parsed.data.month,
      days,
      dayStates,
      cutoffMs: ctx.cutoffMs,
      slotMinutes: ctx.slotMinutes,
    });
  } catch (error) {
    console.error("getAvailableSlotsForMonth:", error);
    return fail("SLOTS_FAILED");
  }
}

/** Doctor dashboard: calendar overview with booked/blocked/available states */
export async function getDoctorScheduleCalendar(input) {
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHORIZED");

  const parsed = monthQuerySchema
    .omit({ doctorId: true })
    .extend({
      mode: z.enum(["ONLINE", "OFFLINE"]).optional(),
      clinicId: z.string().uuid().optional().nullable(),
    })
    .safeParse(input);

  if (!parsed.success) return fail("VALIDATION_ERROR");

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });
    if (!doctor) return fail("NOT_FOUND");

    const mode = parsed.data.mode ?? "ONLINE";
    const fullParsed = monthQuerySchema.parse({
      ...parsed.data,
      doctorId: doctor.id,
      mode,
    });

    const ctx = await loadSlotContext(fullParsed);
    if (ctx.error) return ctx.error;

    const days = buildMonthSlotDays({
      zone: ctx.zone,
      year: fullParsed.year,
      month: fullParsed.month,
      workTimes: ctx.workTimes,
      slotMinutes: ctx.slotMinutes,
      existingAppointments: ctx.existingAppointments,
      availabilityExceptions: ctx.availabilityExceptions,
      cutoffMs: ctx.cutoffMs,
      clinicId: fullParsed.clinicId,
    });

    const dayStates = buildMonthDayStates(
      days,
      ctx.existingAppointments,
      ctx.availabilityExceptions
    );

    const appointments = ctx.existingAppointments.map((a) => ({
      id: a.id,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      appointmentMode: a.appointmentMode,
    }));

    return ok({
      year: fullParsed.year,
      month: fullParsed.month,
      mode,
      dayStates,
      appointments,
      exceptions: ctx.availabilityExceptions,
      slotMinutes: ctx.slotMinutes,
    });
  } catch (error) {
    console.error("getDoctorScheduleCalendar:", error);
    return fail("FETCH_FAILED");
  }
}

/** Backward-compatible week fetch using doctor duration */
export async function getAvailableTimeSlotsWeek(
  doctorId,
  mode = "ONLINE",
  excludeAppointmentId = null,
  clientNowIso = null,
  clinicId = null
) {
  const idCheck = z.string().uuid().safeParse(doctorId);
  if (!idCheck.success) return fail("VALIDATION_ERROR");

  const modeParsed = z.enum(["ONLINE", "OFFLINE"]).safeParse(mode);
  const appointmentMode = modeParsed.success ? modeParsed.data : "ONLINE";

  try {
    const now = new Date();
    const parsed = monthQuerySchema.parse({
      doctorId,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      mode: appointmentMode,
      clinicId,
      excludeAppointmentId,
      clientNowIso,
    });

    const ctx = await loadSlotContext(parsed);
    if (ctx.error) return ctx.error;

    const { weekStartUtc, weekEndUtc } = getWeekBoundsInZone(
      ctx.zone,
      new Date(ctx.cutoffMs)
    );

    const weekAppointments = ctx.existingAppointments.filter((a) => {
      const s = new Date(a.startTime).getTime();
      return s >= weekStartUtc.getTime() && s <= weekEndUtc.getTime();
    });

    const weekExceptions = ctx.availabilityExceptions.filter((ex) => {
      const s = new Date(ex.startTime).getTime();
      return s >= weekStartUtc.getTime() && s <= weekEndUtc.getTime();
    });

    const days = buildWeekSlotDays({
      zone: ctx.zone,
      workTimes: ctx.workTimes,
      slotMinutes: ctx.slotMinutes,
      existingAppointments: weekAppointments,
      availabilityExceptions: weekExceptions,
      cutoffMs: ctx.cutoffMs,
      clinicId: parsed.clinicId,
    });

    return ok({ days, cutoffMs: ctx.cutoffMs, slotMinutes: ctx.slotMinutes });
  } catch (error) {
    console.error("getAvailableTimeSlotsWeek:", error);
    return fail("SLOTS_FAILED");
  }
}
