"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { ok, fail } from "@/lib/action-result";
import { verifyAdmin } from "@/actions/admin";
import {
  adminMarkCompletedSchema,
  adminOpenDisputeSchema,
  adminResolveDisputeSchema,
  adminAppointmentIdSchema,
} from "@/lib/schema";
import {
  applyMockRefundInTransaction,
  processCancellationRefund,
} from "@/actions/payments";
import { REFUND_REASON } from "@/lib/refunds";
import {
  notifyAppointmentCancelled,
  notifyDisputeResolved,
  notifyAdminDisputeOpened,
} from "@/lib/notification-triggers";
import {
  buildAdminCompletionUpdate,
  isAppointmentCancelled,
  serializeAppointmentEvidence,
} from "@/lib/appointment-completion";

function recordFromFormData(formData) {
  const record = {};
  for (const [key, value] of formData.entries()) {
    record[key] = value;
  }
  return record;
}

const toIso = (v) =>
  v instanceof Date ? v.toISOString() : v != null ? String(v) : null;

function serializeAdminAppointment(appointment) {
  return {
    id: appointment.id,
    startTime: toIso(appointment.startTime),
    endTime: toIso(appointment.endTime),
    status: appointment.status,
    appointmentMode: appointment.appointmentMode,
    paymentMethod: appointment.paymentMethod,
    paymentStatus: appointment.paymentStatus,
    priceSnapshotEgp: appointment.priceSnapshotEgp,
    currencySnapshot: appointment.currencySnapshot,
    patient: appointment.patient,
    doctor: appointment.doctor,
    ...serializeAppointmentEvidence(appointment),
  };
}

export async function getAdminAppointmentsForReview() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  try {
    const appointments = await db.appointment.findMany({
      take: 200,
      orderBy: { startTime: "desc" },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true, specialty: true } },
      },
    });

    return ok({
      appointments: appointments.map(serializeAdminAppointment),
    });
  } catch (error) {
    console.error("getAdminAppointmentsForReview:", error);
    return fail("FETCH_FAILED");
  }
}

export async function adminMarkAppointmentCompleted(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const parsed = adminMarkCompletedSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  try {
    const appointment = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true, specialty: true } },
      },
    });

    if (!appointment) return fail("NOT_FOUND");

    if (isAppointmentCancelled(appointment)) {
      return fail("INVALID_STATUS");
    }

    const now = new Date();
    const data = buildAdminCompletionUpdate(
      appointment,
      now,
      parsed.data.adminCompletionNote
    );

    const updated = await db.appointment.update({
      where: { id: appointment.id },
      data,
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true, specialty: true } },
      },
    });

    revalidatePath("/admin");
    revalidatePath("/doctor");
    revalidatePath("/appointments");

    return ok({ appointment: serializeAdminAppointment(updated) });
  } catch (error) {
    console.error("adminMarkAppointmentCompleted:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function adminOpenAppointmentDispute(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const parsed = adminOpenDisputeSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  try {
    const appointment = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true, specialty: true } },
      },
    });

    if (!appointment) return fail("NOT_FOUND");

    const now = new Date();
    const updated = await db.appointment.update({
      where: { id: appointment.id },
      data: {
        disputeStatus: "OPEN",
        disputeOpenedAt: appointment.disputeOpenedAt ?? now,
        disputeReason:
          parsed.data.disputeReason ??
          appointment.disputeReason ??
          "Dispute opened by admin",
      },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true, specialty: true } },
      },
    });

    revalidatePath("/admin");
    revalidatePath("/notifications");
    if (appointment.disputeStatus === "NONE") {
      try {
        await notifyAdminDisputeOpened(
          updated,
          parsed.data.disputeReason ?? "Dispute opened by admin"
        );
      } catch (e) {
        console.error("notifyAdminDisputeOpened:", e);
      }
    }
    return ok({ appointment: serializeAdminAppointment(updated) });
  } catch (error) {
    console.error("adminOpenAppointmentDispute:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function adminResolveAppointmentDispute(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const parsed = adminResolveDisputeSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  try {
    const { userId } = await auth();
    const adminUser = await db.user.findUnique({
      where: { clerkUserId: userId ?? "" },
      select: { id: true },
    });

    const appointment = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true, specialty: true } },
      },
    });

    if (!appointment) return fail("NOT_FOUND");

    const now = new Date();
    const refundOutcome = parsed.data.refundOutcome ?? "none";

    const updated = await db.$transaction(async (tx) => {
      const row = await tx.appointment.update({
        where: { id: appointment.id },
        data: {
          disputeStatus: parsed.data.disputeStatus,
          disputeResolvedAt: now,
          disputeResolvedBy: adminUser?.id ?? null,
          disputeResolutionNote:
            parsed.data.disputeResolutionNote ??
            appointment.disputeResolutionNote,
        },
      });

      if (
        parsed.data.disputeStatus === "RESOLVED" &&
        refundOutcome !== "none"
      ) {
        const reason =
          refundOutcome === "partial90"
            ? REFUND_REASON.PATIENT_NO_SHOW
            : REFUND_REASON.DOCTOR_NO_SHOW;
        await applyMockRefundInTransaction(tx, row, {
          reason,
          overrideTier: refundOutcome,
          refundedBy: adminUser?.id ?? "admin",
          adminNote: parsed.data.disputeResolutionNote ?? undefined,
        });
      }

      return tx.appointment.findUnique({
        where: { id: appointment.id },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true, email: true, specialty: true } },
        },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/appointments");
    revalidatePath("/notifications");

    if (parsed.data.disputeStatus === "RESOLVED") {
      try {
        await notifyDisputeResolved(updated, {
          refundOutcome,
        });
      } catch (e) {
        console.error("notifyDisputeResolved:", e);
      }
    }

    return ok({ appointment: serializeAdminAppointment(updated) });
  } catch (error) {
    console.error("adminResolveAppointmentDispute:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function adminCancelAppointment(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const parsed = adminAppointmentIdSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  try {
    const appointment = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true, email: true, specialty: true } },
      },
    });

    if (!appointment) return fail("NOT_FOUND");

    if (appointment.status === "CANCELLED") {
      return ok({ appointment: serializeAdminAppointment(appointment) });
    }

    const { userId } = await auth();
    const adminUser = userId
      ? await db.user.findUnique({ where: { clerkUserId: userId } })
      : null;

    await db.appointment.update({
      where: { id: appointment.id },
      data: { status: "CANCELLED" },
    });

    const refundResult = await processCancellationRefund(
      { ...appointment, status: "CANCELLED" },
      "admin",
      adminUser?.id ?? "admin"
    );

    const updated = await db.appointment.findUnique({
        where: { id: appointment.id },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true, email: true, specialty: true } },
        },
      });

    try {
      await notifyAppointmentCancelled(updated ?? appointment, {
        cancelledBy: "admin",
        refundApplied: Boolean(refundResult?.applied),
        refundAmountEgp: refundResult?.calc?.refundAmountEgp ?? 0,
      });
    } catch (e) {
      console.error("notifyAppointmentCancelled:", e);
    }

    revalidatePath("/admin");
    revalidatePath("/doctor");
    revalidatePath("/appointments");
    revalidatePath("/notifications");

    return ok({ appointment: serializeAdminAppointment(updated) });
  } catch (error) {
    console.error("adminCancelAppointment:", error);
    return fail("UPDATE_FAILED");
  }
}
