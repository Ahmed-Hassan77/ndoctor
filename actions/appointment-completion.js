"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { ok, fail } from "@/lib/action-result";
import { appointmentIdActionSchema } from "@/lib/schema";
import {
  buildDoctorConfirmationUpdate,
  buildPatientConfirmationUpdate,
  isAppointmentCancelled,
  isAppointmentEnded,
} from "@/lib/appointment-completion";
import { serializePatientAppointment } from "@/lib/patient-appointments";
import {
  notifyDoctorConfirmedVisit,
  notifyPatientConfirmedVisit,
  notifyPatientNoShowReported,
  notifyDoctorNoShowReported,
} from "@/lib/notification-triggers";

function recordFromFormData(formData) {
  const record = {};
  for (const [key, value] of formData.entries()) {
    record[key] = value;
  }
  return record;
}

const REVALIDATE_PATHS = ["/doctor", "/appointments", "/admin"];

function revalidateAppointmentPaths() {
  for (const p of REVALIDATE_PATHS) revalidatePath(p);
}

function getReason(parsed) {
  return parsed.data.reason ?? parsed.data.note ?? null;
}

export async function markAppointmentCompleted(formData) {
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHORIZED");

  const parsed = appointmentIdActionSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });
    if (!doctor) return fail("NOT_FOUND");

    const appointment = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId, doctorId: doctor.id },
      include: { visitSummary: true, patient: { select: { id: true, name: true, email: true, imageUrl: true } } },
    });

    if (!appointment) {
      return fail("NOT_FOUND");
    }

    if (isAppointmentCancelled(appointment)) {
      return fail("INVALID_STATUS");
    }

    if (
      appointment.status !== "SCHEDULED" &&
      appointment.status !== "CONFIRMED"
    ) {
      return fail("INVALID_STATUS");
    }

    const now = new Date();
    if (!isAppointmentEnded(appointment.endTime, now)) {
      return fail("TOO_EARLY");
    }

    if (appointment.doctorMarkedCompletedAt) {
      return ok({
        appointment: serializePatientAppointment(appointment, "DOCTOR"),
      });
    }

    const data = buildDoctorConfirmationUpdate(appointment, now);
    if (!data) {
      return ok({
        appointment: serializePatientAppointment(appointment, "DOCTOR"),
      });
    }

    const updated = await db.appointment.update({
      where: { id: appointment.id },
      data,
      include: {
        visitSummary: true,
        patient: { select: { id: true, name: true, email: true, imageUrl: true } },
      },
    });

    revalidateAppointmentPaths();
    revalidatePath("/notifications");
    try {
      await notifyDoctorConfirmedVisit(updated, updated.status === "COMPLETED");
    } catch (e) {
      console.error("notifyDoctorConfirmedVisit:", e);
    }
    return ok({
      appointment: serializePatientAppointment(updated, "DOCTOR"),
      messageKey:
        updated.status === "COMPLETED"
          ? "visitFullyCompleted"
          : "doctorConfirmationRecorded",
    });
  } catch (error) {
    console.error("markAppointmentCompleted:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function confirmPatientVisitCompleted(formData) {
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHORIZED");

  const parsed = appointmentIdActionSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  try {
    const patient = await db.user.findUnique({
      where: { clerkUserId: userId, role: "PATIENT" },
    });
    if (!patient) return fail("NOT_FOUND");

    const appointment = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId, patientId: patient.id },
      include: {
        visitSummary: true,
        doctor: { select: { id: true, name: true, specialty: true, imageUrl: true } },
      },
    });

    if (!appointment) {
      return fail("NOT_FOUND");
    }

    if (isAppointmentCancelled(appointment)) {
      return fail("INVALID_STATUS");
    }

    if (
      appointment.status !== "SCHEDULED" &&
      appointment.status !== "CONFIRMED"
    ) {
      return fail("INVALID_STATUS");
    }

    const now = new Date();
    if (!isAppointmentEnded(appointment.endTime, now)) {
      return fail("TOO_EARLY");
    }

    if (appointment.patientConfirmedCompletedAt) {
      return ok({
        appointment: serializePatientAppointment(appointment, "PATIENT"),
      });
    }

    const data = buildPatientConfirmationUpdate(appointment, now);
    if (!data) {
      return ok({
        appointment: serializePatientAppointment(appointment, "PATIENT"),
      });
    }

    const updated = await db.appointment.update({
      where: { id: appointment.id },
      data,
      include: {
        visitSummary: true,
        doctor: { select: { id: true, name: true, specialty: true, imageUrl: true } },
      },
    });

    revalidateAppointmentPaths();
    revalidatePath("/notifications");
    try {
      await notifyPatientConfirmedVisit(updated, updated.status === "COMPLETED");
    } catch (e) {
      console.error("notifyPatientConfirmedVisit:", e);
    }
    return ok({
      appointment: serializePatientAppointment(updated, "PATIENT"),
      messageKey:
        updated.status === "COMPLETED"
          ? "visitFullyCompletedDoctor"
          : "patientConfirmationRecorded",
    });
  } catch (error) {
    console.error("confirmPatientVisitCompleted:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function reportPatientNoShow(formData) {
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHORIZED");

  const parsed = appointmentIdActionSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });
    if (!doctor) return fail("NOT_FOUND");

    const appointment = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId, doctorId: doctor.id },
      include: {
        visitSummary: true,
        patient: { select: { id: true, name: true, email: true, imageUrl: true } },
      },
    });

    if (!appointment) {
      return fail("NOT_FOUND");
    }

    if (isAppointmentCancelled(appointment)) {
      return fail("INVALID_STATUS");
    }

    const now = new Date();
    if (!isAppointmentEnded(appointment.endTime, now)) {
      return fail("TOO_EARLY");
    }

    const reason = getReason(parsed);
    const isNewReport = !appointment.patientNoShowReportedAt;
    const updated = await db.appointment.update({
      where: { id: appointment.id },
      data: {
        patientNoShowReportedAt:
          appointment.patientNoShowReportedAt ?? now,
        noShowReason: reason ?? appointment.noShowReason,
        disputeStatus: "OPEN",
        disputeOpenedAt: appointment.disputeOpenedAt ?? now,
        disputeReason: reason ?? appointment.disputeReason ?? "Patient no-show reported by doctor",
      },
      include: {
        visitSummary: true,
        patient: { select: { id: true, name: true, email: true, imageUrl: true } },
      },
    });

    revalidateAppointmentPaths();
    revalidatePath("/notifications");
    if (isNewReport) {
      try {
        await notifyPatientNoShowReported(updated);
      } catch (e) {
        console.error("notifyPatientNoShowReported:", e);
      }
    }
    return ok({
      appointment: serializePatientAppointment(updated, "DOCTOR"),
    });
  } catch (error) {
    console.error("reportPatientNoShow:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function reportDoctorNoShow(formData) {
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHORIZED");

  const parsed = appointmentIdActionSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  try {
    const patient = await db.user.findUnique({
      where: { clerkUserId: userId, role: "PATIENT" },
    });
    if (!patient) return fail("NOT_FOUND");

    const appointment = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId, patientId: patient.id },
      include: {
        visitSummary: true,
        doctor: { select: { id: true, name: true, specialty: true, imageUrl: true } },
      },
    });

    if (!appointment) {
      return fail("NOT_FOUND");
    }

    if (isAppointmentCancelled(appointment)) {
      return fail("INVALID_STATUS");
    }

    const now = new Date();
    if (!isAppointmentEnded(appointment.endTime, now)) {
      return fail("TOO_EARLY");
    }

    const reason = getReason(parsed);
    const isNewReport = !appointment.doctorNoShowReportedAt;
    const updated = await db.appointment.update({
      where: { id: appointment.id },
      data: {
        doctorNoShowReportedAt: appointment.doctorNoShowReportedAt ?? now,
        noShowReason: reason ?? appointment.noShowReason,
        disputeStatus: "OPEN",
        disputeOpenedAt: appointment.disputeOpenedAt ?? now,
        disputeReason: reason ?? appointment.disputeReason ?? "Doctor no-show reported by patient",
      },
      include: {
        visitSummary: true,
        doctor: { select: { id: true, name: true, specialty: true, imageUrl: true } },
      },
    });

    revalidateAppointmentPaths();
    revalidatePath("/notifications");
    if (isNewReport) {
      try {
        await notifyDoctorNoShowReported(updated);
      } catch (e) {
        console.error("notifyDoctorNoShowReported:", e);
      }
    }
    return ok({
      appointment: serializePatientAppointment(updated, "PATIENT"),
    });
  } catch (error) {
    console.error("reportDoctorNoShow:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function confirmClinicPaymentReceived(formData) {
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHORIZED");

  const parsed = appointmentIdActionSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });
    if (!doctor) return fail("NOT_FOUND");

    const appointment = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId, doctorId: doctor.id },
      include: {
        visitSummary: true,
        patient: { select: { id: true, name: true, email: true, imageUrl: true } },
      },
    });

    if (!appointment) {
      return fail("NOT_FOUND");
    }

    if (appointment.appointmentMode !== "OFFLINE") {
      return fail("INVALID_MODE");
    }

    if (isAppointmentCancelled(appointment)) {
      return fail("INVALID_STATUS");
    }

    const now = new Date();
    if (!isAppointmentEnded(appointment.endTime, now)) {
      return fail("TOO_EARLY");
    }

    const updated = await db.appointment.update({
      where: { id: appointment.id },
      data: {
        clinicPaymentReceivedAt: appointment.clinicPaymentReceivedAt ?? now,
        clinicPaymentReceivedBy: doctor.id,
        clinicAttendanceConfirmedAt:
          appointment.clinicAttendanceConfirmedAt ?? now,
        paymentStatus: "PAID",
      },
      include: {
        visitSummary: true,
        patient: { select: { id: true, name: true, email: true, imageUrl: true } },
      },
    });

    revalidateAppointmentPaths();
    return ok({
      appointment: serializePatientAppointment(updated, "DOCTOR"),
    });
  } catch (error) {
    console.error("confirmClinicPaymentReceived:", error);
    return fail("UPDATE_FAILED");
  }
}
