"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ok, fail } from "@/lib/action-result";
import {
  calculateRefundForAppointment,
  paymentTransactionStatusFromTier,
  refundStatusFromTier,
  REFUND_REASON,
  hasOnlinePaymentToRefund,
} from "@/lib/refunds";
import {
  appointmentMethodToMockMethod,
  mockMethodToAppointmentMethod,
} from "@/lib/pricing";
import { verifyAdmin } from "@/actions/admin";
import {
  notifyPaymentFailed,
  notifyPaymentPaid,
} from "@/lib/notification-triggers";
import z from "zod";

function recordFromFormData(formData) {
  const raw = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string") raw[key] = val;
  }
  return raw;
}

const mockMethodSchema = z.enum([
  "CARD",
  "MOBILE_WALLET",
  "FAWRY_REFERENCE",
]);

const appointmentIdSchema = z.object({
  appointmentId: z.string().uuid(),
});

const createPaymentSchema = appointmentIdSchema.extend({
  method: mockMethodSchema,
});

const completePaymentSchema = appointmentIdSchema.extend({
  transactionId: z.string().uuid().optional(),
  method: mockMethodSchema,
  cardNumber: z.string().optional(),
  cardholderName: z.string().optional(),
  phone: z.string().optional(),
  simulateOutcome: z.enum(["success", "fail", "expire"]).optional(),
});

const refundSchema = appointmentIdSchema.extend({
  reason: z.string().min(1),
  overrideTier: z.enum(["full", "partial90", "none"]).optional(),
  adminNote: z.string().max(2000).optional(),
});

function generateFawryReference() {
  const n = Math.floor(100000000 + Math.random() * 900000000);
  return `FAW-${n}`;
}

function normalizeCardNumber(raw) {
  return String(raw ?? "").replace(/\s+/g, "");
}

function evaluateCardOutcome(cardNumber) {
  const n = normalizeCardNumber(cardNumber);
  if (n === "4000000000000002") return "fail";
  if (n === "4242424242424242" || n.startsWith("4242")) return "success";
  if (n.length >= 13) return "success";
  return "fail";
}

async function getPatientForAuth() {
  const { userId } = await auth();
  if (!userId) return { error: fail("UNAUTHORIZED") };
  const patient = await db.user.findUnique({
    where: { clerkUserId: userId, role: "PATIENT" },
  });
  if (!patient) return { error: fail("NOT_FOUND") };
  return { patient };
}

/**
 * Apply mock refund to appointment + latest paid transaction.
 * @param {import("@prisma/client").Prisma.TransactionClient} tx
 */
export async function applyMockRefundInTransaction(
  tx,
  appointment,
  {
    reason,
    overrideTier,
    refundedBy,
    adminNote,
  }
) {
  const calc = calculateRefundForAppointment(appointment, reason, {
    overrideTier,
  });

  if (!calc.eligible || calc.refundAmountEgp <= 0) {
    await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        refundStatus: "NOT_ELIGIBLE",
        refundReason: adminNote || calc.messageKey || reason,
      },
    });
    return { applied: false, calc };
  }

  const tier =
    calc.refundFeeEgp > 0 && calc.refundAmountEgp < appointment.priceSnapshotEgp
      ? "partial90"
      : "full";

  const txnStatus = paymentTransactionStatusFromTier(tier);
  const now = new Date();

  const paidTxn = await tx.paymentTransaction.findFirst({
    where: {
      appointmentId: appointment.id,
      status: "PAID",
    },
    orderBy: { paidAt: "desc" },
  });

  if (paidTxn && txnStatus) {
    await tx.paymentTransaction.update({
      where: { id: paidTxn.id },
      data: {
        status: txnStatus,
        refundAmountEgp: calc.refundAmountEgp,
        refundFeeEgp: calc.refundFeeEgp,
        refundReason: adminNote || reason,
        refundedBy: refundedBy ?? null,
        refundedAt: now,
      },
    });
  }

  await tx.appointment.update({
    where: { id: appointment.id },
    data: {
      status: appointment.status === "CANCELLED" ? "CANCELLED" : appointment.status,
      paymentStatus: "REFUNDED",
      isPaid: false,
      refundStatus: refundStatusFromTier(tier),
      refundAmountEgp: calc.refundAmountEgp,
      refundFeeEgp: calc.refundFeeEgp,
      refundReason: adminNote || reason,
      refundedAt: now,
      refundedBy: refundedBy ?? null,
    },
  });

  return { applied: true, calc, tier };
}

/**
 * Cancellation refund helper for patient/doctor/admin cancel flows.
 */
export async function processCancellationRefund(
  appointment,
  cancelledBy,
  refundedByUserId
) {
  if (!hasOnlinePaymentToRefund(appointment)) {
    return { applied: false };
  }

  return db.$transaction(async (tx) => {
    const fresh = await tx.appointment.findUnique({
      where: { id: appointment.id },
    });
    if (!fresh) return { applied: false };

    const calc = calculateRefundForAppointment(fresh, REFUND_REASON.OTHER, {
      cancelledBy,
    });

    return applyMockRefundInTransaction(tx, fresh, {
      reason: calc.reason,
      refundedBy: refundedByUserId,
    });
  });
}

export async function calculateRefundForAppointmentAction(formData) {
  const isAdmin = await verifyAdmin();
  const parsed = refundSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const appointment = await db.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
  });
  if (!appointment) return fail("NOT_FOUND");

  if (!isAdmin) {
    const { userId } = await auth();
    const user = userId
      ? await db.user.findUnique({ where: { clerkUserId: userId } })
      : null;
    if (
      !user ||
      (user.id !== appointment.patientId && user.role !== "ADMIN")
    ) {
      return fail("FORBIDDEN");
    }
  }

  const calc = calculateRefundForAppointment(appointment, parsed.data.reason, {
    overrideTier: parsed.data.overrideTier,
  });
  return ok({ calc, appointmentId: appointment.id });
}

export async function createMockPaymentTransaction(formData) {
  const authResult = await getPatientForAuth();
  if (authResult.error) return authResult.error;
  const { patient } = authResult;

  const parsed = createPaymentSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const appointment = await db.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
  });

  if (!appointment) return fail("NOT_FOUND");
  if (appointment.patientId !== patient.id) {
    return fail("FORBIDDEN");
  }
  if (appointment.appointmentMode !== "ONLINE") {
    return fail("INVALID");
  }
  if (appointment.status === "CANCELLED") {
    return fail("INVALID");
  }
  if (appointment.paymentStatus === "PAID") {
    return fail("ALREADY_PAID");
  }

  const apptMethod = mockMethodToAppointmentMethod(parsed.data.method);
  const providerReference =
    parsed.data.method === "FAWRY_REFERENCE" ? generateFawryReference() : null;

  const existingPending = await db.paymentTransaction.findFirst({
    where: {
      appointmentId: appointment.id,
      status: "PENDING",
      method: parsed.data.method,
    },
    orderBy: { createdAt: "desc" },
  });

  let transaction = existingPending;
  if (!transaction) {
    transaction = await db.paymentTransaction.create({
      data: {
        appointmentId: appointment.id,
        patientId: patient.id,
        amountEgp: appointment.priceSnapshotEgp,
        method: parsed.data.method,
        status: "PENDING",
        providerReference,
      },
    });
  } else if (providerReference && !transaction.providerReference) {
    transaction = await db.paymentTransaction.update({
      where: { id: transaction.id },
      data: { providerReference },
    });
  }

  await db.appointment.update({
    where: { id: appointment.id },
    data: {
      paymentMethod: apptMethod,
      paymentStatus: "PENDING",
      isPaid: false,
    },
  });

  revalidatePath(`/checkout/${appointment.id}`);
  revalidatePath("/appointments");

  return ok({ transaction, appointmentId: appointment.id });
}

export async function completeMockPayment(formData) {
  const authResult = await getPatientForAuth();
  if (authResult.error) return authResult.error;
  const { patient } = authResult;

  const parsed = completePaymentSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const appointment = await db.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
  });
  if (!appointment) return fail("NOT_FOUND");
  if (appointment.patientId !== patient.id) {
    return fail("FORBIDDEN");
  }

  let outcome = parsed.data.simulateOutcome ?? "success";
  if (parsed.data.method === "CARD") {
    outcome = evaluateCardOutcome(parsed.data.cardNumber);
  }
  if (parsed.data.method === "MOBILE_WALLET") {
    const phone = String(parsed.data.phone ?? "").replace(/\D/g, "");
    if (phone.length < 10) outcome = "fail";
  }

  if (outcome === "fail" || outcome === "expire") {
    return failMockPayment(formData);
  }

  const apptMethod = mockMethodToAppointmentMethod(parsed.data.method);
  const now = new Date();

  const transaction = await db.$transaction(async (tx) => {
    let txn = parsed.data.transactionId
      ? await tx.paymentTransaction.findUnique({
          where: { id: parsed.data.transactionId },
        })
      : null;

    if (!txn) {
      txn = await tx.paymentTransaction.findFirst({
        where: {
          appointmentId: appointment.id,
          patientId: patient.id,
          method: parsed.data.method,
          status: { in: ["PENDING", "FAILED"] },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    if (!txn) {
      txn = await tx.paymentTransaction.create({
        data: {
          appointmentId: appointment.id,
          patientId: patient.id,
          amountEgp: appointment.priceSnapshotEgp,
          method: parsed.data.method,
          status: "PAID",
          paidAt: now,
          providerReference:
            parsed.data.method === "FAWRY_REFERENCE"
              ? generateFawryReference()
              : `MOCK-${Date.now()}`,
        },
      });
    } else {
      txn = await tx.paymentTransaction.update({
        where: { id: txn.id },
        data: {
          status: "PAID",
          paidAt: now,
          failedAt: null,
          failureReason: null,
        },
      });
    }

    await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        paymentMethod: apptMethod,
        paymentStatus: "PAID",
        isPaid: true,
        refundStatus: "NONE",
      },
    });

    return txn;
  });

  revalidatePath(`/checkout/${appointment.id}`);
  revalidatePath("/appointments");
  revalidatePath("/doctor");
  revalidatePath("/notifications");

  const paidAppt = await db.appointment.findUnique({
    where: { id: appointment.id },
    include: { doctor: { select: { name: true } } },
  });
  if (paidAppt && appointment.paymentStatus !== "PAID") {
    try {
      await notifyPaymentPaid(paidAppt);
    } catch (e) {
      console.error("notifyPaymentPaid:", e);
    }
  }

  return ok({ transaction, success: true });
}

export async function failMockPayment(formData) {
  const authResult = await getPatientForAuth();
  if (authResult.error) return authResult.error;
  const { patient } = authResult;

  const parsed = completePaymentSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const appointment = await db.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
  });
  if (!appointment || appointment.patientId !== patient.id) {
    return fail("FORBIDDEN");
  }

  const now = new Date();
  const isExpire = parsed.data.simulateOutcome === "expire";

  const transaction = await db.$transaction(async (tx) => {
    const txn = await tx.paymentTransaction.findFirst({
      where: {
        appointmentId: appointment.id,
        patientId: patient.id,
        method: parsed.data.method,
      },
      orderBy: { createdAt: "desc" },
    });

    const updated = txn
      ? await tx.paymentTransaction.update({
          where: { id: txn.id },
          data: {
            status: isExpire ? "EXPIRED" : "FAILED",
            failedAt: now,
            failureReason: isExpire
              ? "Payment reference expired (demo)."
              : "Payment declined (demo).",
          },
        })
      : null;

    await tx.appointment.update({
      where: { id: appointment.id },
      data: {
        paymentStatus: isExpire ? "PENDING" : "FAILED",
        isPaid: false,
      },
    });

    return updated;
  });

  revalidatePath(`/checkout/${appointment.id}`);
  revalidatePath("/appointments");
  revalidatePath("/notifications");

  if (!isExpire) {
    try {
      await notifyPaymentFailed(
        appointment,
        transaction?.failureReason ?? undefined
      );
    } catch (e) {
      console.error("notifyPaymentFailed:", e);
    }
  }

  return ok({ transaction, success: false });
}

export async function refundMockPayment(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const parsed = refundSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const { userId } = await auth();
  const admin = userId
    ? await db.user.findUnique({ where: { clerkUserId: userId } })
    : null;

  const appointment = await db.appointment.findUnique({
    where: { id: parsed.data.appointmentId },
  });
  if (!appointment) return fail("NOT_FOUND");

  const result = await db.$transaction(async (tx) =>
    applyMockRefundInTransaction(tx, appointment, {
      reason: parsed.data.reason,
      overrideTier: parsed.data.overrideTier,
      refundedBy: admin?.id ?? "admin",
      adminNote: parsed.data.adminNote,
    })
  );

  revalidatePath("/admin");
  revalidatePath("/appointments");
  revalidatePath("/doctor");
  revalidatePath("/notifications");

  if (result?.applied) {
    const appt = await db.appointment.findUnique({
      where: { id: parsed.data.appointmentId },
      include: { doctor: true, patient: true },
    });
    if (appt) {
      const { notifyAppointmentCancelled } = await import(
        "@/lib/notification-triggers"
      );
      try {
        await notifyAppointmentCancelled(appt, {
          cancelledBy: "admin",
          refundApplied: true,
          refundAmountEgp: result.calc?.refundAmountEgp ?? 0,
        });
      } catch (e) {
        console.error("notify refund:", e);
      }
    }
  }

  return ok(result);
}

export async function getCheckoutAppointment(appointmentId) {
  const authResult = await getPatientForAuth();
  if (authResult.error) return authResult.error;
  const { patient } = authResult;

  const appointment = await db.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      doctor: {
        select: {
          id: true,
          name: true,
          specialty: true,
          imageUrl: true,
        },
      },
      paymentTransactions: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!appointment) return fail("NOT_FOUND");
  if (appointment.patientId !== patient.id) {
    return fail("FORBIDDEN");
  }
  if (appointment.appointmentMode !== "ONLINE") {
    return fail("INVALID");
  }

  return ok({ appointment });
}

export async function getAdminPaymentTransactions() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const transactions = await db.paymentTransaction.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      appointment: {
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true, specialty: true } },
        },
      },
    },
  });

  return ok({ transactions });
}

export { calculateRefundForAppointment };
