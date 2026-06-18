/** @typedef {import("@prisma/client").AppointmentMode} AppointmentMode */
/** @typedef {import("@prisma/client").AppointmentPaymentMethod} AppointmentPaymentMethod */
/** @typedef {import("@prisma/client").AppointmentPaymentStatus} AppointmentPaymentStatus */

export const DEFAULT_ONLINE_PRICE_EGP = 250;
export const DEFAULT_CLINIC_PRICE_EGP = 300;
export const DEFAULT_CONSULTATION_DURATION_MINUTES = 30;
export const DEFAULT_CURRENCY = "EGP";

/** Legacy platform credit cost for online bookings (internal only). */
export const LEGACY_APPOINTMENT_CREDIT_COST = 2;

/**
 * @param {Pick<import("@prisma/client").User, "onlineConsultationPriceEgp"> | null | undefined} doctor
 */
export function resolveOnlinePriceEgp(doctor) {
  const v = doctor?.onlineConsultationPriceEgp;
  return typeof v === "number" && v > 0 ? v : DEFAULT_ONLINE_PRICE_EGP;
}

/**
 * @param {Pick<import("@prisma/client").User, "clinicConsultationPriceEgp"> | null | undefined} doctor
 */
export function resolveClinicPriceEgp(doctor) {
  const v = doctor?.clinicConsultationPriceEgp;
  return typeof v === "number" && v > 0 ? v : DEFAULT_CLINIC_PRICE_EGP;
}

/**
 * @param {Pick<import("@prisma/client").User, "onlineConsultationPriceEgp" | "clinicConsultationPriceEgp"> | null | undefined} doctor
 * @param {AppointmentMode | string} appointmentMode
 */
export function getAppointmentPriceEgp(doctor, appointmentMode) {
  return appointmentMode === "OFFLINE"
    ? resolveClinicPriceEgp(doctor)
    : resolveOnlinePriceEgp(doctor);
}

/**
 * @param {number} amount
 * @param {string} [currency]
 */
/**
 * @param {number} amount
 * @param {string} [currency]
 * @param {string} [locale] - "en" | "ar"
 */
export function formatPriceEgp(amount, currency = DEFAULT_CURRENCY, locale = "en") {
  const n = Number(amount);
  const isAr = locale === "ar" || String(locale).startsWith("ar");
  if (!Number.isFinite(n)) return isAr ? "—" : `— ${currency}`;
  if (currency === "EGP" || !currency) {
    if (isAr) {
      return `${n.toLocaleString("ar-EG")} جنيه`;
    }
    return `${n.toLocaleString("en-EG")} EGP`;
  }
  return `${n.toLocaleString(isAr ? "ar-EG" : "en-EG")} ${currency}`;
}

/**
 * @param {AppointmentMode | string} appointmentMode
 * @returns {AppointmentPaymentMethod}
 */
export function getDefaultPaymentMethod(appointmentMode) {
  return appointmentMode === "OFFLINE" ? "PAY_AT_CLINIC" : "ONLINE_CARD";
}

/**
 * @param {AppointmentMode | string} appointmentMode
 * @param {AppointmentPaymentMethod} [paymentMethod]
 * @returns {AppointmentPaymentStatus}
 */
export function getDefaultPaymentStatus(appointmentMode, paymentMethod) {
  const method =
    paymentMethod ?? getDefaultPaymentMethod(appointmentMode);
  if (method === "PAY_AT_CLINIC") return "UNPAID";
  if (method === "LEGACY_CREDITS") return "PAID";
  return appointmentMode === "OFFLINE" ? "UNPAID" : "PENDING";
}

/**
 * @param {AppointmentPaymentMethod | string} method
 * @returns {import("@prisma/client").MockPaymentMethod | null}
 */
export function appointmentMethodToMockMethod(method) {
  if (method === "ONLINE_CARD") return "CARD";
  if (method === "MOBILE_WALLET") return "MOBILE_WALLET";
  if (method === "FAWRY_REFERENCE") return "FAWRY_REFERENCE";
  if (method === "PAY_AT_CLINIC") return "PAY_AT_CLINIC";
  return null;
}

/**
 * @param {import("@prisma/client").MockPaymentMethod | string} mockMethod
 * @returns {AppointmentPaymentMethod}
 */
export function mockMethodToAppointmentMethod(mockMethod) {
  if (mockMethod === "CARD") return "ONLINE_CARD";
  if (mockMethod === "MOBILE_WALLET") return "MOBILE_WALLET";
  if (mockMethod === "FAWRY_REFERENCE") return "FAWRY_REFERENCE";
  return "PAY_AT_CLINIC";
}

export function formatPaymentMethodLabel(method) {
  const labels = {
    PAY_AT_CLINIC: "Pay at clinic",
    ONLINE_CARD: "Card",
    MOBILE_WALLET: "Mobile wallet",
    FAWRY_REFERENCE: "Fawry reference",
    LEGACY_CREDITS: "Legacy credits",
  };
  return labels[method] ?? String(method ?? "—");
}

export function formatPaymentStatusLabel(status) {
  const labels = {
    UNPAID: "Unpaid",
    PENDING: "Payment pending",
    PAID: "Paid",
    FAILED: "Payment failed",
    REFUNDED: "Refunded",
  };
  return labels[status] ?? String(status ?? "—");
}

/**
 * @param {Pick<import("@prisma/client").User, "followUpPriceEgp"> | null | undefined} doctor
 */
export function resolveFollowUpPriceEgp(doctor) {
  const v = doctor?.followUpPriceEgp;
  return typeof v === "number" && v > 0 ? v : null;
}

/**
 * @param {Pick<import("@prisma/client").User, "consultationDurationMinutes"> | null | undefined} doctor
 */
export function resolveConsultationDurationMinutes(doctor) {
  const v = doctor?.consultationDurationMinutes;
  return typeof v === "number" && v > 0 ? v : DEFAULT_CONSULTATION_DURATION_MINUTES;
}
