"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { addMinutes } from "date-fns";
import { Vonage } from "@vonage/server-sdk";
import { Auth } from "@vonage/auth";
import { Prisma } from "@prisma/client";
import { ok, fail } from "@/lib/action-result";
import {
  bookAppointmentSchema,
  generateVideoTokenSchema,
  rescheduleAppointmentSchema,
} from "@/lib/schema";
import { canPatientRescheduleAppointment } from "@/lib/appointment-reschedule";
import {
  buildWeekSlotDays,
  filterExceptionsForBooking,
  filterWorkTimesForBooking,
  getWeekBoundsInZone,
  isBookableSlot,
} from "@/lib/appointment-slots";
import { resolveSlotCutoffMs } from "@/lib/datetime";
import { getDoctorSlotDurationMinutes } from "@/lib/scheduling";
import { databaseErrorCode, logDatabaseIssue } from "@/lib/db-safe";
import { getPlatformTimeZone } from "@/lib/platform-timezone";
import {
  DEFAULT_CURRENCY,
  getAppointmentPriceEgp,
  getDefaultPaymentMethod,
  getDefaultPaymentStatus,
} from "@/lib/pricing";
import { hasUsableClinicLocation } from "@/lib/clinic-location";
import { getClinicForBooking, clinicToSnapshot } from "@/actions/clinics";
import { assertPatientCanBook } from "@/actions/admin-patients";
import { getAvailableSlotsForMonth } from "@/actions/calendar";
import {
  appointmentTimesMatch,
  serializePatientAppointment,
} from "@/lib/patient-appointments";
import {
  notifyAppointmentBooked,
  notifyAppointmentRescheduled,
} from "@/lib/notification-triggers";
import { getDoctorExceptionsInRange } from "@/lib/availability-exceptions";
import z from "zod";

const RESCHEDULE_SENTINEL_START = new Date("2099-01-01T00:00:00.000Z");

const appointmentWithRelationsInclude = {
  doctor: {
    select: {
      id: true,
      name: true,
      specialty: true,
      imageUrl: true,
    },
  },
  rating: {
    select: {
      id: true,
      value: true,
      review: true,
      createdAt: true,
    },
  },
};

const credentials = new Auth({
  applicationId: process.env.NEXT_PUBLIC_VONAGE_APPLICATION_ID,
  privateKey: process.env.VONAGE_PRIVATE_KEY,
});
const options = {};
const vonage = new Vonage(credentials, options);

function recordFromFormData(formData) {
  const raw = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string") raw[key] = val;
  }
  return raw;
}

async function createVideoSession() {
  const session = await vonage.video.createSession({ mediaMode: "routed" });
  return session.sessionId;
}

export async function bookAppointment(formData) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  const parsed = bookAppointmentSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const {
    doctorId,
    startTime,
    endTime,
    description: patientDescription,
    appointmentMode,
    clinicId,
  } = parsed.data;

  const clientNowRaw = formData.get("clientNow");
  const cutoffMs = resolveSlotCutoffMs(
    typeof clientNowRaw === "string" ? clientNowRaw : null
  );
  const startMs = startTime.getTime();
  const endMs = endTime.getTime();

  if (startMs <= cutoffMs || endMs <= cutoffMs) {
    return fail("SLOT_TAKEN");
  }

  try {
    const canBook = await assertPatientCanBook(userId);
    if (!canBook.success) return canBook;

    const patient = await db.user.findUnique({
      where: {
        clerkUserId: userId,
        role: "PATIENT",
      },
    });

    if (!patient) {
      return fail("NOT_FOUND");
    }

    if (patient.accountStatus === "DEACTIVATED") {
      return fail("ACCOUNT_DEACTIVATED");
    }

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

    const zone = getPlatformTimeZone();
    const slotMinutes = getDoctorSlotDurationMinutes(doctor);
    const allWorkTimes = await db.workTime.findMany({
      where: {
        doctorId,
        isActive: true,
        mode: appointmentMode,
      },
    });
    const workTimes = filterWorkTimesForBooking(
      allWorkTimes,
      appointmentMode,
      clinicId
    );
    const existingAppointments = await db.appointment.findMany({
      where: {
        doctorId,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
    });

    const allExceptions = await getDoctorExceptionsInRange(
      doctorId,
      startTime,
      endTime
    );
    const availabilityExceptions = filterExceptionsForBooking(
      allExceptions,
      clinicId,
      appointmentMode
    );

    if (
      !isBookableSlot({
        zone,
        workTimes,
        slotMinutes,
        existingAppointments,
        availabilityExceptions,
        startTime,
        endTime,
        cutoffMs,
        clinicId,
      })
    ) {
      return fail("SLOT_UNAVAILABLE");
    }

    let clinicRecord = null;
    let clinicSnapshot = {};
    if (appointmentMode === "OFFLINE") {
      if (clinicId) {
        clinicRecord = await getClinicForBooking(clinicId, doctor.id);
        if (!clinicRecord) {
          return fail("CLINIC_LOCATION_REQUIRED");
        }
        clinicSnapshot = clinicToSnapshot(clinicRecord);
      } else if (!hasUsableClinicLocation(doctor)) {
        return fail("CLINIC_LOCATION_REQUIRED");
      }
    }

    const priceSnapshotEgp = clinicRecord?.consultationPriceEgp
      ? clinicRecord.consultationPriceEgp
      : getAppointmentPriceEgp(doctor, appointmentMode);
    const currencySnapshot = doctor.currency?.trim() || DEFAULT_CURRENCY;
    const paymentMethod = getDefaultPaymentMethod(appointmentMode);
    const paymentStatus = getDefaultPaymentStatus(
      appointmentMode,
      paymentMethod
    );
    let sessionId = null;
    if (appointmentMode === "ONLINE") {
      try {
        sessionId = await createVideoSession();
      } catch (e) {
        console.error("Vonage session error:", e);
        return fail("VIDEO_SESSION_FAILED");
      }
    }

    try {
      const appointment = await db.$transaction(async (tx) => {
        const overlappingAppointment = await tx.appointment.findFirst({
          where: {
            doctorId,
            status: { in: ["SCHEDULED", "CONFIRMED"] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (overlappingAppointment) {
          throw Object.assign(new Error("SLOT_TAKEN"), { code: "SLOT_TAKEN" });
        }

        return tx.appointment.create({
          data: {
            patientId: patient.id,
            doctorId: doctor.id,
            startTime: new Date(startMs),
            endTime: new Date(endMs),
            patientDescription,
            status: "SCHEDULED",
            videoSessionId: sessionId,
            appointmentMode,
            isPaid: paymentStatus === "PAID",
            priceSnapshotEgp,
            currencySnapshot,
            paymentMethod,
            paymentStatus,
            refundStatus: "NONE",
            ...clinicSnapshot,
          },
        });
      });

      revalidatePath("/appointments");
      revalidatePath("/doctors");
      revalidatePath("/doctor");

      const checkoutUrl =
        appointmentMode === "ONLINE"
          ? `/checkout/${appointment.id}`
          : null;

      try {
        await notifyAppointmentBooked(appointment, {
          doctor: { id: doctor.id, name: doctor.name },
          patient: { id: patient.id, name: patient.name },
        });
      } catch (e) {
        console.error("notifyAppointmentBooked:", e);
      }

      revalidatePath("/notifications");

      return ok({ appointment, checkoutUrl });
    } catch (err) {
      if (err?.code === "SLOT_TAKEN") {
        return fail("SLOT_TAKEN");
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return fail("SLOT_TAKEN");
      }
      throw err;
    }
  } catch (error) {
    console.error("Failed to book appointment:", error);
    return fail("BOOKING_FAILED");
  }
}

export async function generateVideoToken(formData) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  const parsed = generateVideoTokenSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const { appointmentId } = parsed.data;

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return fail("NOT_FOUND");
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return fail("NOT_FOUND");
    }

    if (appointment.doctorId !== user.id && appointment.patientId !== user.id) {
      return fail("FORBIDDEN");
    }

    if (appointment.status !== "SCHEDULED" && appointment.status !== "CONFIRMED") {
      return fail("INVALID_STATUS");
    }

    if (appointment.appointmentMode === "OFFLINE") {
      return fail("NOT_VIDEO_APPOINTMENT");
    }

    if (!appointment.videoSessionId) {
      return fail("NO_SESSION");
    }

    if (
      appointment.appointmentMode === "ONLINE" &&
      appointment.paymentStatus !== "PAID"
    ) {
      return fail("PAYMENT_REQUIRED");
    }

    const now = new Date();
    const appointmentTime = new Date(appointment.startTime);
    const timeDifference = (appointmentTime - now) / (1000 * 60);

    if (timeDifference > 30) {
      return fail("TOO_EARLY");
    }

    const appointmentEndTime = new Date(appointment.endTime);
    const expirationTime =
      Math.floor(appointmentEndTime.getTime() / 1000) + 60 * 60;

    const connectionData = JSON.stringify({
      name: user.name,
      role: user.role,
      userId: user.id,
    });

    const token = vonage.video.generateClientToken(appointment.videoSessionId, {
      role: "publisher",
      expireTime: expirationTime,
      data: connectionData,
    });

    const videoEvidence =
      user.role === "PATIENT"
        ? {
            patientJoinedVideoAt:
              appointment.patientJoinedVideoAt ?? now,
            patientLastSeenVideoAt: now,
          }
        : user.role === "DOCTOR"
          ? {
              doctorJoinedVideoAt: appointment.doctorJoinedVideoAt ?? now,
              doctorLastSeenVideoAt: now,
            }
          : {};

    await db.appointment.update({
      where: { id: appointmentId },
      data: { videoSessionToken: token, ...videoEvidence },
    });

    return ok({
      videoSessionId: appointment.videoSessionId,
      token,
    });
  } catch (error) {
    console.error("Failed to generate video token:", error);
    return fail("TOKEN_FAILED");
  }
}

export async function recordVideoPresence(appointmentId) {
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHORIZED");

  const idCheck = z.string().uuid().safeParse(appointmentId);
  if (!idCheck.success) {
    return fail("VALIDATION_ERROR");
  }

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) return fail("NOT_FOUND");

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) return fail("NOT_FOUND");

    if (appointment.doctorId !== user.id && appointment.patientId !== user.id) {
      return fail("FORBIDDEN");
    }

    const now = new Date();
    const data =
      user.role === "PATIENT"
        ? { patientLastSeenVideoAt: now }
        : user.role === "DOCTOR"
          ? { doctorLastSeenVideoAt: now }
          : null;

    if (!data) return fail("FORBIDDEN");

    await db.appointment.update({
      where: { id: appointmentId },
      data,
    });

    return ok();
  } catch (error) {
    console.error("recordVideoPresence:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function getDoctorById(doctorId) {
  const idCheck = z.string().uuid().safeParse(doctorId);
  if (!idCheck.success) {
    return { doctor: null, error: "INVALID_ID" };
  }

  try {
    const doctor = await db.user.findUnique({
      where: { id: doctorId },
      include: {
        workTimes: {
          where: { isActive: true },
          select: {
            mode: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isActive: true,
          },
        },
        clinics: {
          where: { isActive: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!doctor || doctor.role !== "DOCTOR") {
      return { doctor: null, error: "NOT_FOUND" };
    }

    if (doctor.verificationStatus !== "VERIFIED") {
      return { doctor: null, error: "NOT_VERIFIED" };
    }

    return { doctor };
  } catch (error) {
    logDatabaseIssue("getDoctorById", error);
    return {
      doctor: null,
      error: databaseErrorCode(error) ?? "FETCH_FAILED",
    };
  }
}

export async function getAvailableTimeSlots(
  doctorId,
  mode = "ONLINE",
  excludeAppointmentId = null,
  clientNowIso = null,
  clinicId = null
) {
  const idCheck = z.string().uuid().safeParse(doctorId);
  if (!idCheck.success) {
    return fail("VALIDATION_ERROR");
  }

  const modeParsed = z.enum(["ONLINE", "OFFLINE"]).safeParse(mode);
  const appointmentMode = modeParsed.success ? modeParsed.data : "ONLINE";

  const excludeId =
    excludeAppointmentId &&
    z.string().uuid().safeParse(excludeAppointmentId).success
      ? excludeAppointmentId
      : null;

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

    const zone = getPlatformTimeZone();
    const slotMinutes = getDoctorSlotDurationMinutes(doctor);
    const cutoffMs = resolveSlotCutoffMs(clientNowIso);

    const allWorkTimes = await db.workTime.findMany({
      where: {
        doctorId: doctor.id,
        isActive: true,
        mode: appointmentMode,
      },
    });
    const workTimes = filterWorkTimesForBooking(
      allWorkTimes,
      appointmentMode,
      clinicId
    );

    const { weekStartUtc, weekEndUtc } = getWeekBoundsInZone(
      zone,
      new Date(cutoffMs)
    );

    const existingAppointments = await db.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        startTime: { lt: weekEndUtc },
        endTime: { gt: weekStartUtc },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    const allExceptions = await getDoctorExceptionsInRange(
      doctor.id,
      weekStartUtc,
      weekEndUtc
    );
    const availabilityExceptions = filterExceptionsForBooking(
      allExceptions,
      clinicId,
      appointmentMode
    );

    const days = buildWeekSlotDays({
      zone,
      workTimes,
      slotMinutes,
      existingAppointments,
      availabilityExceptions,
      cutoffMs,
      clinicId,
    });

    return ok({ days, cutoffMs, slotMinutes });
  } catch (error) {
    console.error("Failed to fetch available slots:", error);
    return fail("SLOTS_FAILED");
  }
}

export { getAvailableSlotsForMonth };

export async function getRescheduleTimeSlots(
  appointmentId,
  clientNowIso = null
) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  if (!appointmentId || typeof appointmentId !== "string") {
    return fail("VALIDATION_ERROR");
  }

  try {
    const patient = await db.user.findUnique({
      where: { clerkUserId: userId, role: "PATIENT" },
      select: { id: true },
    });

    if (!patient) {
      return fail("NOT_FOUND");
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        appointmentMode: true,
        status: true,
        startTime: true,
      },
    });

    if (!appointment) {
      return fail("NOT_FOUND");
    }

    if (appointment.patientId !== patient.id) {
      return fail("FORBIDDEN");
    }

    if (!canPatientRescheduleAppointment(appointment)) {
      return fail("NOT_ELIGIBLE");
    }

    return getAvailableTimeSlots(
      appointment.doctorId,
      appointment.appointmentMode,
      appointment.id,
      clientNowIso
    );
  } catch (error) {
    console.error("getRescheduleTimeSlots:", error);
    return fail("SLOTS_FAILED");
  }
}

export async function rescheduleAppointment(formData) {
  noStore();
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  const parsed = rescheduleAppointmentSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const { appointmentId, startTime, endTime } = parsed.data;
  const requestedStartMs = startTime.getTime();
  const requestedEndMs = endTime.getTime();
  const clientNowRaw = formData.get("clientNow");
  const cutoffMs = resolveSlotCutoffMs(
    typeof clientNowRaw === "string" ? clientNowRaw : null
  );

  if (requestedStartMs <= cutoffMs || requestedEndMs <= cutoffMs) {
    return fail("SLOT_UNAVAILABLE");
  }

  try {
    const patient = await db.user.findUnique({
      where: { clerkUserId: userId, role: "PATIENT" },
      select: { id: true },
    });

    if (!patient) {
      return fail("NOT_FOUND");
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return fail("NOT_FOUND");
    }

    if (appointment.patientId !== patient.id) {
      return fail("FORBIDDEN");
    }

    if (!canPatientRescheduleAppointment(appointment)) {
      return fail("NOT_ELIGIBLE");
    }

    const zone = getPlatformTimeZone();
    const doctor = await db.user.findUnique({
      where: { id: appointment.doctorId },
    });
    const slotMinutes = getDoctorSlotDurationMinutes(doctor);
    const allWorkTimes = await db.workTime.findMany({
      where: {
        doctorId: appointment.doctorId,
        isActive: true,
        mode: appointment.appointmentMode,
      },
    });
    const workTimes = filterWorkTimesForBooking(
      allWorkTimes,
      appointment.appointmentMode,
      appointment.clinicId
    );

    const existingAppointments = await db.appointment.findMany({
      where: {
        doctorId: appointment.doctorId,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        id: { not: appointment.id },
      },
    });

    const allExceptions = await getDoctorExceptionsInRange(
      appointment.doctorId,
      startTime,
      endTime
    );
    const availabilityExceptions = filterExceptionsForBooking(
      allExceptions,
      appointment.clinicId,
      appointment.appointmentMode ?? "ONLINE"
    );

    if (
      !isBookableSlot({
        zone,
        workTimes,
        slotMinutes,
        existingAppointments,
        availabilityExceptions,
        startTime,
        endTime,
        cutoffMs,
        clinicId: appointment.clinicId,
      })
    ) {
      return fail("SLOT_UNAVAILABLE");
    }

    const sentinelEnd = addMinutes(RESCHEDULE_SENTINEL_START, slotMinutes);

    try {
      await db.$transaction(async (tx) => {
        const overlapping = await tx.appointment.findFirst({
          where: {
            doctorId: appointment.doctorId,
            id: { not: appointment.id },
            status: { in: ["SCHEDULED", "CONFIRMED"] },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
        });

        if (overlapping) {
          throw Object.assign(new Error("SLOT_TAKEN"), { code: "SLOT_TAKEN" });
        }

        // Two-step update avoids @@unique([doctorId, startTime]) conflicts during in-place reschedule.
        const step1 = await tx.appointment.updateMany({
          where: {
            id: appointment.id,
            patientId: patient.id,
            status: { in: ["SCHEDULED", "CONFIRMED"] },
          },
          data: {
            startTime: RESCHEDULE_SENTINEL_START,
            endTime: sentinelEnd,
          },
        });

        if (step1.count !== 1) {
          throw Object.assign(new Error("UPDATE_FAILED"), {
            code: "UPDATE_FAILED",
          });
        }

        const step2 = await tx.appointment.updateMany({
          where: {
            id: appointment.id,
            patientId: patient.id,
          },
          data: {
            startTime: new Date(requestedStartMs),
            endTime: new Date(requestedEndMs),
          },
        });

        if (step2.count !== 1) {
          throw Object.assign(new Error("UPDATE_FAILED"), {
            code: "UPDATE_FAILED",
          });
        }
      });
    } catch (err) {
      if (err?.code === "SLOT_TAKEN") {
        return fail("SLOT_UNAVAILABLE");
      }
      if (err?.code === "UPDATE_FAILED") {
        return fail("UPDATE_FAILED");
      }
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        return fail("SLOT_UNAVAILABLE");
      }
      throw err;
    }

    const verified = await db.appointment.findUnique({
      where: { id: appointment.id },
      include: appointmentWithRelationsInclude,
    });

    if (
      !verified ||
      verified.id !== appointmentId ||
      !appointmentTimesMatch(verified, startTime, endTime)
    ) {
      console.error("rescheduleAppointment: RESCHEDULE_NOT_PERSISTED", {
        appointmentId,
        requestedStartMs,
        requestedEndMs,
        verifiedId: verified?.id,
        verifiedStartMs: verified
          ? new Date(verified.startTime).getTime()
          : null,
        verifiedEndMs: verified ? new Date(verified.endTime).getTime() : null,
      });
      return fail("RESCHEDULE_NOT_PERSISTED");
    }

    revalidatePath("/appointments", "page");
    revalidatePath("/doctor", "page");
    revalidatePath("/doctors", "layout");

    try {
      await notifyAppointmentRescheduled(verified, {
        actorRole: user.role,
      });
    } catch (e) {
      console.error("notifyAppointmentRescheduled:", e);
    }
    revalidatePath("/notifications");

    const serialized = serializePatientAppointment(verified);

    return ok({
      appointmentId: verified.id,
      appointment: serialized,
      persisted: {
        startTime: serialized.startTime,
        endTime: serialized.endTime,
        updatedAt: serialized.updatedAt,
      },
    });
  } catch (error) {
    console.error("rescheduleAppointment:", error);
    return fail("RESCHEDULE_FAILED");
  }
}
