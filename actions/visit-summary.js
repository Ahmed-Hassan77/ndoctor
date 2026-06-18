"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { ok, fail } from "@/lib/action-result";
import { visitSummarySchema } from "@/lib/schema";
import { serializeVisitSummary } from "@/lib/appointment-completion";
import { serializePatientAppointment } from "@/lib/patient-appointments";
import { notifyVisitSummaryAdded } from "@/lib/notification-triggers";

function recordFromFormData(formData) {
  const record = {};
  for (const [key, value] of formData.entries()) {
    record[key] = value;
  }
  return record;
}

export async function getVisitSummary(appointmentId) {
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHORIZED");

  if (!appointmentId || typeof appointmentId !== "string") {
    return fail("VALIDATION_ERROR");
  }

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });
    if (!user) return fail("NOT_FOUND");

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { visitSummary: true },
    });

    if (!appointment) return fail("NOT_FOUND");

    const isDoctor =
      user.role === "DOCTOR" && appointment.doctorId === user.id;
    const isPatient =
      user.role === "PATIENT" && appointment.patientId === user.id;

    if (!isDoctor && !isPatient) {
      return fail("FORBIDDEN");
    }

    if (appointment.status !== "COMPLETED") {
      return fail("NOT_COMPLETED");
    }

    if (!appointment.visitSummary) {
      return ok({ visitSummary: null });
    }

    const role = isDoctor ? "DOCTOR" : "PATIENT";
    return ok({
      visitSummary: serializeVisitSummary(appointment.visitSummary, role),
    });
  } catch (error) {
    console.error("getVisitSummary:", error);
    return fail("FETCH_FAILED");
  }
}

export async function upsertVisitSummary(formData) {
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHORIZED");

  const parsed = visitSummarySchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const {
    appointmentId,
    diagnosis,
    prescription,
    recommendations,
    followUpInstructions,
    followUpDate,
    patientFriendlySummary,
    redFlags,
    privateDoctorNotes,
  } = parsed.data;

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });
    if (!doctor) return fail("NOT_FOUND");

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId, doctorId: doctor.id },
    });

    if (!appointment) {
      return fail("NOT_FOUND");
    }

    if (appointment.status !== "COMPLETED") {
      return fail("NOT_COMPLETED");
    }

    const summaryData = {
      diagnosis,
      prescription,
      recommendations,
      followUpInstructions,
      followUpDate,
      patientFriendlySummary,
      redFlags,
      privateDoctorNotes,
    };

    const existingBefore = await db.visitSummary.findUnique({
      where: { appointmentId },
    });

    const visitSummary = await db.visitSummary.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        doctorId: doctor.id,
        patientId: appointment.patientId,
        ...summaryData,
      },
      update: summaryData,
    });

    const updatedAppointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        visitSummary: true,
        patient: { select: { id: true, name: true, email: true, imageUrl: true } },
      },
    });

    revalidatePath("/doctor");
    revalidatePath("/appointments");
    revalidatePath("/notifications");

    const isNew = !existingBefore;
    try {
      await notifyVisitSummaryAdded(
        {
          ...appointment,
          doctor: { name: doctor.name },
        },
        { isUpdate: !isNew }
      );
    } catch (e) {
      console.error("notifyVisitSummaryAdded:", e);
    }

    return ok({
      visitSummary: serializeVisitSummary(visitSummary, "DOCTOR"),
      appointment: serializePatientAppointment(updatedAppointment, "DOCTOR"),
      isNew,
    });
  } catch (error) {
    console.error("upsertVisitSummary:", error);
    return fail("SAVE_FAILED");
  }
}
