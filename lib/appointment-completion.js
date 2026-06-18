/** @param {Date | string} endTime */
export function isAppointmentEnded(endTime, now = new Date()) {
  return new Date(endTime).getTime() <= now.getTime();
}

/** @param {{ status: string }} appointment */
export function isAppointmentCancelled(appointment) {
  return appointment.status === "CANCELLED";
}

export function bothPartiesConfirmed(appointment) {
  return Boolean(
    appointment?.doctorMarkedCompletedAt && appointment?.patientConfirmedCompletedAt
  );
}

/**
 * @param {{ doctorMarkedCompletedAt?: Date | null, patientConfirmedCompletedAt?: Date | null }} params
 * @param {{ forceAdmin?: boolean }} [opts]
 */
export function computeCompletionSource(
  { doctorMarkedCompletedAt, patientConfirmedCompletedAt },
  opts = {}
) {
  if (opts.forceAdmin) return "ADMIN";
  const doctor = Boolean(doctorMarkedCompletedAt);
  const patient = Boolean(patientConfirmedCompletedAt);
  if (doctor && patient) return "BOTH";
  if (doctor) return "DOCTOR";
  if (patient) return "PATIENT";
  return null;
}

/**
 * Doctor confirms visit. COMPLETED only if patient already confirmed.
 * @param {object} existing
 * @param {Date} now
 */
export function buildDoctorConfirmationUpdate(existing, now) {
  if (existing.doctorMarkedCompletedAt) {
    return null;
  }

  const doctorMarkedCompletedAt = now;
  const patientConfirmed = existing.patientConfirmedCompletedAt;

  if (patientConfirmed) {
    return {
      doctorMarkedCompletedAt,
      status: "COMPLETED",
      completedAt: existing.completedAt ?? now,
      completionSource: "BOTH",
    };
  }

  return {
    doctorMarkedCompletedAt,
    completionSource: "DOCTOR",
  };
}

/**
 * Patient confirms visit. COMPLETED only if doctor already confirmed.
 * @param {object} existing
 * @param {Date} now
 */
export function buildPatientConfirmationUpdate(existing, now) {
  if (existing.patientConfirmedCompletedAt) {
    return null;
  }

  const patientConfirmedCompletedAt = now;
  const doctorMarked = existing.doctorMarkedCompletedAt;

  if (doctorMarked) {
    return {
      patientConfirmedCompletedAt,
      status: "COMPLETED",
      completedAt: existing.completedAt ?? now,
      completionSource: "BOTH",
    };
  }

  return {
    patientConfirmedCompletedAt,
    completionSource: "PATIENT",
  };
}

/**
 * Admin forces completion. BOTH if both parties already confirmed.
 * @param {object} existing
 * @param {Date} now
 * @param {string | null} adminNote
 */
export function buildAdminCompletionUpdate(existing, now, adminNote = null) {
  const both = bothPartiesConfirmed(existing);
  return {
    status: "COMPLETED",
    completedAt: existing.completedAt ?? now,
    completionSource: both ? "BOTH" : "ADMIN",
    adminCompletionNote: adminNote ?? existing.adminCompletionNote ?? null,
  };
}

/** @deprecated use buildDoctorConfirmationUpdate */
export function buildDoctorCompletionUpdate(existing, now) {
  return buildDoctorConfirmationUpdate(existing, now);
}

const toIso = (v) =>
  v instanceof Date ? v.toISOString() : v != null ? String(v) : null;

/** Serialize completion/evidence fields for client. */
export function serializeAppointmentEvidence(appointment) {
  if (!appointment) return null;
  return {
    doctorMarkedCompletedAt: toIso(appointment.doctorMarkedCompletedAt),
    patientConfirmedCompletedAt: toIso(appointment.patientConfirmedCompletedAt),
    completedAt: toIso(appointment.completedAt),
    completionSource: appointment.completionSource ?? null,
    adminCompletionNote: appointment.adminCompletionNote ?? null,
    patientNoShowReportedAt: toIso(appointment.patientNoShowReportedAt),
    doctorNoShowReportedAt: toIso(appointment.doctorNoShowReportedAt),
    noShowReason: appointment.noShowReason ?? null,
    disputeStatus: appointment.disputeStatus ?? "NONE",
    disputeReason: appointment.disputeReason ?? null,
    disputeOpenedAt: toIso(appointment.disputeOpenedAt),
    disputeResolvedAt: toIso(appointment.disputeResolvedAt),
    disputeResolvedBy: appointment.disputeResolvedBy ?? null,
    disputeResolutionNote: appointment.disputeResolutionNote ?? null,
    clinicPaymentReceivedAt: toIso(appointment.clinicPaymentReceivedAt),
    clinicPaymentReceivedBy: appointment.clinicPaymentReceivedBy ?? null,
    clinicAttendanceConfirmedAt: toIso(appointment.clinicAttendanceConfirmedAt),
    patientJoinedVideoAt: toIso(appointment.patientJoinedVideoAt),
    doctorJoinedVideoAt: toIso(appointment.doctorJoinedVideoAt),
    patientLastSeenVideoAt: toIso(appointment.patientLastSeenVideoAt),
    doctorLastSeenVideoAt: toIso(appointment.doctorLastSeenVideoAt),
  };
}

/**
 * @param {object | null} summary
 * @param {'DOCTOR' | 'PATIENT' | 'ADMIN'} role
 */
export function stripPrivateDoctorNotes(summary, role) {
  if (!summary) return null;
  const base = {
    id: summary.id,
    appointmentId: summary.appointmentId,
    doctorId: summary.doctorId,
    patientId: summary.patientId,
    diagnosis: summary.diagnosis ?? null,
    prescription: summary.prescription ?? null,
    recommendations: summary.recommendations ?? null,
    followUpInstructions: summary.followUpInstructions ?? null,
    followUpDate:
      summary.followUpDate instanceof Date
        ? summary.followUpDate.toISOString()
        : summary.followUpDate ?? null,
    patientFriendlySummary: summary.patientFriendlySummary ?? null,
    redFlags: summary.redFlags ?? null,
    createdAt:
      summary.createdAt instanceof Date
        ? summary.createdAt.toISOString()
        : summary.createdAt,
    updatedAt:
      summary.updatedAt instanceof Date
        ? summary.updatedAt.toISOString()
        : summary.updatedAt,
  };
  if (role === "DOCTOR" || role === "ADMIN") {
    return { ...base, privateDoctorNotes: summary.privateDoctorNotes ?? null };
  }
  return base;
}

export function serializeVisitSummary(summary, role) {
  if (!summary) return null;
  return stripPrivateDoctorNotes(summary, role);
}
