import {
  serializeAppointmentEvidence,
  serializeVisitSummary,
} from "@/lib/appointment-completion";

/** Serialize appointment for client components (ISO date strings). */
export function serializePatientAppointment(appointment, role = "PATIENT") {
  if (!appointment) return null;

  const toIso = (v) =>
    v instanceof Date ? v.toISOString() : v != null ? String(v) : v;

  const evidence = serializeAppointmentEvidence(appointment);

  return {
    id: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    startTime: toIso(appointment.startTime),
    endTime: toIso(appointment.endTime),
    status: appointment.status,
    notes: appointment.notes ?? null,
    patientDescription: appointment.patientDescription ?? null,
    appointmentMode: appointment.appointmentMode,
    videoSessionId: appointment.videoSessionId ?? null,
    videoSessionToken: appointment.videoSessionToken ?? null,
    isPaid: appointment.isPaid,
    priceSnapshotEgp: appointment.priceSnapshotEgp,
    currencySnapshot: appointment.currencySnapshot,
    paymentMethod: appointment.paymentMethod,
    paymentStatus: appointment.paymentStatus,
    refundStatus: appointment.refundStatus ?? "NONE",
    refundAmountEgp: appointment.refundAmountEgp ?? null,
    refundFeeEgp: appointment.refundFeeEgp ?? null,
    refundReason: appointment.refundReason ?? null,
    refundedAt: toIso(appointment.refundedAt),
    legacyCreditCost: appointment.legacyCreditCost ?? null,
    createdAt: toIso(appointment.createdAt),
    updatedAt: toIso(appointment.updatedAt),
    ...evidence,
    doctor: appointment.doctor ?? null,
    patient: appointment.patient ?? null,
    rating: appointment.rating
      ? {
          ...appointment.rating,
          createdAt: toIso(appointment.rating.createdAt),
        }
      : null,
    visitSummary: appointment.visitSummary
      ? serializeVisitSummary(appointment.visitSummary, role)
      : null,
  };
}

export function appointmentTimesMatch(a, startTime, endTime) {
  const startMs = new Date(startTime).getTime();
  const endMs = new Date(endTime).getTime();
  const rowStart = new Date(a.startTime).getTime();
  const rowEnd = new Date(a.endTime).getTime();
  return (
    !Number.isNaN(startMs) &&
    !Number.isNaN(endMs) &&
    rowStart === startMs &&
    rowEnd === endMs
  );
}

const EVIDENCE_KEYS = [
  "doctorMarkedCompletedAt",
  "patientConfirmedCompletedAt",
  "completedAt",
  "completionSource",
  "adminCompletionNote",
  "patientNoShowReportedAt",
  "doctorNoShowReportedAt",
  "noShowReason",
  "disputeStatus",
  "disputeReason",
  "disputeOpenedAt",
  "disputeResolvedAt",
  "disputeResolvedBy",
  "disputeResolutionNote",
  "clinicPaymentReceivedAt",
  "clinicPaymentReceivedBy",
  "clinicAttendanceConfirmedAt",
  "patientJoinedVideoAt",
  "doctorJoinedVideoAt",
  "patientLastSeenVideoAt",
  "doctorLastSeenVideoAt",
];

/** Merge server-returned row into list item without dropping doctor/rating. */
export function mergePatientAppointment(existing, updated) {
  if (!existing || !updated?.id) return existing ?? updated;
  const evidencePatch = {};
  for (const key of EVIDENCE_KEYS) {
    if (key in updated) evidencePatch[key] = updated[key];
  }
  return {
    ...existing,
    ...updated,
    ...evidencePatch,
    id: updated.id,
    startTime: updated.startTime ?? existing.startTime,
    endTime: updated.endTime ?? existing.endTime,
    updatedAt: updated.updatedAt ?? existing.updatedAt,
    status: updated.status ?? existing.status,
    appointmentMode: updated.appointmentMode ?? existing.appointmentMode,
    paymentStatus: updated.paymentStatus ?? existing.paymentStatus,
    doctor: updated.doctor ?? existing.doctor,
    patient: updated.patient ?? existing.patient,
    rating: updated.rating ?? existing.rating,
    visitSummary: updated.visitSummary ?? existing.visitSummary,
  };
}
