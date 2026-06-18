import { t } from "@/lib/i18n";
import { specialtyLabel } from "@/lib/specialty-i18n";

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelAppointmentStatus(dict, status) {
  return t(dict, `enums.appointmentStatus.${status}`) || status;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelPaymentStatus(dict, status) {
  return t(dict, `enums.paymentStatus.${status}`) || status;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelPaymentMethod(dict, method) {
  return t(dict, `enums.paymentMethod.${method}`) || method;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelRefundStatus(dict, status) {
  return t(dict, `enums.refundStatus.${status}`) || status;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelDisputeStatus(dict, status) {
  return t(dict, `enums.disputeStatus.${status}`) || status;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelPayoutStatus(dict, status) {
  return t(dict, `enums.payoutStatus.${status}`) || status;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelSupportStatus(dict, status) {
  return t(dict, `enums.supportStatus.${status}`) || status;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelSupportCategory(dict, category) {
  return t(dict, `enums.supportCategory.${category}`) || category;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelSupportPriority(dict, priority) {
  return t(dict, `enums.supportPriority.${priority}`) || priority;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelReviewModeration(dict, status) {
  return t(dict, `enums.reviewModeration.${status}`) || status;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelNotificationType(dict, type) {
  return t(dict, `enums.notificationType.${type}`) || type;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelVerificationStatus(dict, status) {
  return t(dict, `enums.verificationStatus.${status}`) || status;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelAppointmentMode(dict, mode) {
  return t(dict, `enums.appointmentMode.${mode}`) || mode;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelTransactionStatus(dict, status) {
  return t(dict, `enums.transactionStatus.${status}`) || status;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelGender(dict, gender) {
  return t(dict, `enums.gender.${gender}`) || gender;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelMedicalAttachmentCategory(dict, category) {
  return t(dict, `enums.medicalAttachmentCategory.${category}`) || category;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelAvailabilityExceptionType(dict, type) {
  return t(dict, `enums.availabilityExceptionType.${type}`) || type;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelRefundOutcome(dict, outcome) {
  return t(dict, `enums.refundOutcome.${outcome}`) || outcome;
}

/** @param {import("@/lib/dictionaries/en").default} dict */
export function labelDoctorAccountStatus(dict, status) {
  return t(dict, `enums.doctorAccountStatus.${status}`) || status;
}

export { specialtyLabel };
