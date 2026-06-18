/** @typedef {import("@prisma/client").Appointment} Appointment */

export const REFUND_REASON = {
  DOCTOR_NO_SHOW: "DOCTOR_NO_SHOW",
  PLATFORM_CANCELLED: "PLATFORM_CANCELLED",
  PATIENT_CANCELLED_EARLY: "PATIENT_CANCELLED_EARLY",
  PATIENT_CANCELLED_LATE: "PATIENT_CANCELLED_LATE",
  PATIENT_NO_SHOW: "PATIENT_NO_SHOW",
  ADMIN_APPROVED_REFUND: "ADMIN_APPROVED_REFUND",
  TECHNICAL_FAILURE: "TECHNICAL_FAILURE",
  OTHER: "OTHER",
};

export const PLATFORM_COMMISSION_PERCENT = 15;

const ONLINE_PAID_METHODS = new Set([
  "ONLINE_CARD",
  "MOBILE_WALLET",
  "FAWRY_REFERENCE",
]);

/**
 * @param {number} priceEgp
 */
export function calculateLateCancellationFee(priceEgp) {
  const price = Math.max(0, Math.floor(Number(priceEgp) || 0));
  return Math.round(price * 0.1);
}

/**
 * @param {number} priceEgp
 * @param {'full' | 'partial90' | 'none'} tier
 */
export function calculateRefundAmounts(priceEgp, tier) {
  const price = Math.max(0, Math.floor(Number(priceEgp) || 0));
  if (tier === "none") {
    return { refundAmountEgp: 0, refundFeeEgp: 0, refundPercent: 0 };
  }
  if (tier === "full") {
    return { refundAmountEgp: price, refundFeeEgp: 0, refundPercent: 100 };
  }
  const fee = calculateLateCancellationFee(price);
  return {
    refundAmountEgp: Math.max(0, price - fee),
    refundFeeEgp: fee,
    refundPercent: 90,
  };
}

/**
 * @param {Pick<Appointment, "startTime">} appointment
 * @param {Date} [now]
 */
export function isCancellationAtLeastOneHourBefore(appointment, now = new Date()) {
  const start = new Date(appointment.startTime).getTime();
  const msUntil = start - now.getTime();
  return msUntil >= 60 * 60 * 1000;
}

/**
 * Whether this appointment had an online payment captured on the platform.
 * @param {Pick<Appointment, "paymentStatus" | "paymentMethod" | "appointmentMode">} appointment
 */
export function hasOnlinePaymentToRefund(appointment) {
  if (appointment.appointmentMode === "OFFLINE") return false;
  if (appointment.paymentStatus !== "PAID") return false;
  return ONLINE_PAID_METHODS.has(appointment.paymentMethod);
}

/**
 * Resolve refund tier from reason and timing.
 * @param {Appointment} appointment
 * @param {string} reason
 * @param {{ overrideTier?: 'full' | 'partial90' | 'none', cancelledBy?: 'patient' | 'doctor' | 'admin' | 'platform', now?: Date }} [options]
 */
export function calculateRefundForAppointment(appointment, reason, options = {}) {
  const { overrideTier, cancelledBy, now = new Date() } = options;

  if (overrideTier) {
    return {
      ...calculateRefundAmounts(appointment.priceSnapshotEgp, overrideTier),
      reason,
      eligible: overrideTier !== "none",
    };
  }

  if (appointment.status === "COMPLETED") {
    return {
      ...calculateRefundAmounts(appointment.priceSnapshotEgp, "none"),
      reason,
      eligible: false,
      messageKey: "REFUND_NOT_COMPLETED",
    };
  }

  if (
    appointment.refundStatus === "REFUNDED" ||
    appointment.refundStatus === "PARTIALLY_REFUNDED"
  ) {
    return {
      ...calculateRefundAmounts(appointment.priceSnapshotEgp, "none"),
      reason,
      eligible: false,
      messageKey: "REFUND_ALREADY_PROCESSED",
    };
  }

  if (!hasOnlinePaymentToRefund(appointment)) {
    return {
      ...calculateRefundAmounts(appointment.priceSnapshotEgp, "none"),
      reason,
      eligible: false,
      messageKey: "REFUND_NO_ONLINE_PAYMENT",
    };
  }

  const fullReasons = new Set([
    REFUND_REASON.DOCTOR_NO_SHOW,
    REFUND_REASON.PLATFORM_CANCELLED,
    REFUND_REASON.TECHNICAL_FAILURE,
    REFUND_REASON.ADMIN_APPROVED_REFUND,
    REFUND_REASON.PATIENT_CANCELLED_EARLY,
  ]);

  const partialReasons = new Set([
    REFUND_REASON.PATIENT_CANCELLED_LATE,
    REFUND_REASON.PATIENT_NO_SHOW,
  ]);

  if (fullReasons.has(reason)) {
    return {
      ...calculateRefundAmounts(appointment.priceSnapshotEgp, "full"),
      reason,
      eligible: true,
    };
  }

  if (partialReasons.has(reason)) {
    return {
      ...calculateRefundAmounts(appointment.priceSnapshotEgp, "partial90"),
      reason,
      eligible: true,
    };
  }

  if (reason === REFUND_REASON.OTHER) {
    return {
      ...calculateRefundAmounts(appointment.priceSnapshotEgp, "none"),
      reason,
      eligible: false,
    };
  }

  if (cancelledBy === "patient") {
    const early = isCancellationAtLeastOneHourBefore(appointment, now);
    return {
      ...calculateRefundAmounts(
        appointment.priceSnapshotEgp,
        early ? "full" : "partial90"
      ),
      reason: early
        ? REFUND_REASON.PATIENT_CANCELLED_EARLY
        : REFUND_REASON.PATIENT_CANCELLED_LATE,
      eligible: true,
    };
  }

  if (cancelledBy === "doctor" || cancelledBy === "admin" || cancelledBy === "platform") {
    return {
      ...calculateRefundAmounts(appointment.priceSnapshotEgp, "full"),
      reason: REFUND_REASON.PLATFORM_CANCELLED,
      eligible: true,
    };
  }

  return {
    ...calculateRefundAmounts(appointment.priceSnapshotEgp, "none"),
    reason,
    eligible: false,
  };
}

/**
 * Map refund tier to appointment refund status.
 * @param {'full' | 'partial90' | 'none'} tier
 */
export function refundStatusFromTier(tier) {
  if (tier === "full") return "REFUNDED";
  if (tier === "partial90") return "PARTIALLY_REFUNDED";
  return "NOT_ELIGIBLE";
}

/**
 * @param {'full' | 'partial90' | 'none'} tier
 */
export function paymentTransactionStatusFromTier(tier) {
  if (tier === "full") return "REFUNDED";
  if (tier === "partial90") return "PARTIALLY_REFUNDED";
  return null;
}
