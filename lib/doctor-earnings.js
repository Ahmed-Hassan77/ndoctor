import {
  PLATFORM_COMMISSION_PERCENT,
  calculateRefundAmounts,
} from "@/lib/refunds";

/**
 * @param {import("@prisma/client").Appointment} appt
 */
export function isEligibleOnlineEarningAppointment(appt) {
  if (appt.status !== "COMPLETED") return false;
  if (appt.appointmentMode !== "ONLINE") return false;
  if (appt.paymentStatus !== "PAID") return false;
  if (
    appt.refundStatus === "REFUNDED" ||
    appt.refundStatus === "PARTIALLY_REFUNDED"
  ) {
    return false;
  }
  return true;
}

/**
 * @param {import("@prisma/client").Appointment} appt
 */
export function isEligibleOfflineCollectedAppointment(appt) {
  if (appt.status !== "COMPLETED") return false;
  if (appt.appointmentMode !== "OFFLINE") return false;
  if (appt.paymentStatus !== "PAID") return false;
  if (!appt.clinicPaymentReceivedAt) return false;
  return true;
}

/**
 * @param {number} grossEgp
 */
export function calculatePlatformFeeEgp(grossEgp) {
  const gross = Math.max(0, Math.floor(Number(grossEgp) || 0));
  return Math.round((gross * PLATFORM_COMMISSION_PERCENT) / 100);
}

/**
 * @param {number} grossEgp
 */
export function calculateDoctorNetEgp(grossEgp) {
  const gross = Math.max(0, Math.floor(Number(grossEgp) || 0));
  return gross - calculatePlatformFeeEgp(gross);
}

/**
 * @param {import("@prisma/client").Appointment[]} appointments
 */
export function summarizeDoctorEarnings(appointments) {
  let onlinePaidGrossEgp = 0;
  let onlineNetAvailableEgp = 0;
  let offlineClinicCollectedEgp = 0;
  let offlineCommissionDueEgp = 0;

  for (const appt of appointments) {
    const price = appt.priceSnapshotEgp ?? 0;
    if (isEligibleOnlineEarningAppointment(appt)) {
      onlinePaidGrossEgp += price;
      onlineNetAvailableEgp += calculateDoctorNetEgp(price);
    }
    if (isEligibleOfflineCollectedAppointment(appt)) {
      offlineClinicCollectedEgp += price;
      offlineCommissionDueEgp += calculatePlatformFeeEgp(price);
    }
  }

  return {
    onlinePaidGrossEgp,
    onlineNetAvailableEgp,
    offlineClinicCollectedEgp,
    offlineCommissionDueEgp,
    totalPlatformFeesEgp:
      calculatePlatformFeeEgp(onlinePaidGrossEgp) + offlineCommissionDueEgp,
    platformCommissionPercent: PLATFORM_COMMISSION_PERCENT,
  };
}

/**
 * @param {number} onlineNetAvailableEgp
 * @param {{ netAmountEgp?: number | null; status: string }[]} payouts
 */
export function calculateAvailablePayoutEgp(onlineNetAvailableEgp, payouts) {
  const reserved = payouts
    .filter((p) => p.status === "PROCESSING" || p.status === "PROCESSED")
    .reduce(
      (sum, p) =>
        sum + (p.netAmountEgp ?? Math.round(Number(p.netAmount) || 0)),
      0
    );
  return Math.max(0, onlineNetAvailableEgp - reserved);
}
