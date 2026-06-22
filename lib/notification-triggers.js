import {
  createNotification,
  createNotificationsForUsers,
  getAdminUserIds,
} from "@/lib/notifications";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { formatPriceEgp } from "@/lib/pricing";
import { encodeNotificationMessage } from "@/lib/notification-i18n";

function apptWhen(appointment) {
  return formatAppointmentDateTime(appointment.startTime);
}

function doctorName(appointment) {
  return appointment.doctor?.name
    ? `Dr. ${appointment.doctor.name}`
    : null;
}

function patientName(appointment) {
  return appointment.patient?.name ?? null;
}

function modeKey(appointment) {
  return appointment.appointmentMode === "OFFLINE" ? "clinic" : "online";
}

function price(appointment) {
  return formatPriceEgp(
    appointment.priceSnapshotEgp,
    appointment.currencySnapshot
  );
}

/** @param {string} bodyKey @param {Record<string, string | number>} vars */
function msg(bodyKey, vars) {
  return encodeNotificationMessage(bodyKey, vars);
}

export async function notifyAppointmentBooked(appointment, { doctor, patient }) {
  const when = apptWhen(appointment);
  const mode = modeKey(appointment);
  const doctorLabel = doctor.name ? `Dr. ${doctor.name}` : "";

  await createNotification({
    userId: patient.id,
    type: "APPOINTMENT_BOOKED",
    title: "",
    message: msg("appointmentBookedPatient", {
      mode,
      doctor: doctorLabel,
      when,
      price: price(appointment),
    }),
    linkUrl:
      appointment.appointmentMode === "ONLINE"
        ? `/checkout/${appointment.id}`
        : "/appointments",
  });

  await createNotification({
    userId: doctor.id,
    type: "APPOINTMENT_BOOKED",
    title: "",
    message: msg("appointmentBookedDoctor", {
      patient: patient.name ?? "",
      mode,
      when,
    }),
    linkUrl: "/doctor",
  });
}

export async function notifyPaymentPaid(appointment) {
  await createNotification({
    userId: appointment.patientId,
    type: "PAYMENT_PAID",
    title: "",
    message: msg("paymentPaid", {
      price: price(appointment),
      when: apptWhen(appointment),
    }),
    linkUrl: "/appointments",
  });
}

export async function notifyPaymentFailed(appointment, reason) {
  await createNotification({
    userId: appointment.patientId,
    type: "PAYMENT_FAILED",
    title: "",
    message: reason
      ? msg("paymentFailed", { reason })
      : msg("paymentFailedDefault", { when: apptWhen(appointment) }),
    linkUrl: `/checkout/${appointment.id}`,
  });

  const adminIds = await getAdminUserIds();
  if (adminIds.length > 0) {
    await createNotificationsForUsers(adminIds, {
      type: "PAYMENT_FAILED",
      title: "",
      message: msg("paymentFailedAdmin", {
        id: appointment.id.slice(0, 8),
        when: apptWhen(appointment),
      }),
      linkUrl: "/admin",
    });
  }
}

export async function notifyAppointmentCancelled(
  appointment,
  { cancelledBy, refundApplied, refundAmountEgp }
) {
  const when = apptWhen(appointment);
  const cancellerKey =
    cancelledBy === "patient"
      ? "cancellerYou"
      : cancelledBy === "doctor"
        ? "cancellerDoctor"
        : "cancellerPlatform";

  let refundNote = "";
  if (refundApplied && refundAmountEgp > 0) {
    refundNote = encodeNotificationMessage("refundProcessedNote", {
      amount: formatPriceEgp(refundAmountEgp),
    });
  } else if (appointment.paymentStatus === "PAID") {
    refundNote = encodeNotificationMessage("refundPendingNote", {});
  }

  await createNotification({
    userId: appointment.patientId,
    type: refundApplied ? "REFUND_PROCESSED" : "APPOINTMENT_CANCELLED",
    title: "",
    message: msg("appointmentCancelledPatient", {
      canceller: cancellerKey,
      when,
      refundNote,
      name: doctorName(appointment) ?? "",
    }),
    linkUrl: "/appointments",
  });

  const otherPartyId =
    cancelledBy === "patient"
      ? appointment.doctorId
      : appointment.patientId;

  const otherMessage =
    cancelledBy === "patient"
      ? `${patientName(appointment) ?? ""}|${when}`
      : `${cancellerKey}|${when}`;

  await createNotification({
    userId: otherPartyId,
    type: "APPOINTMENT_CANCELLED",
    title: "",
    message:
      cancelledBy === "patient"
        ? msg("appointmentCancelledOtherDoctor", {
            name: patientName(appointment) ?? "",
            when,
          })
        : msg("appointmentCancelledOtherDoctor", {
            canceller: cancellerKey,
            name: doctorName(appointment) ?? "",
            when,
          }),
    linkUrl: cancelledBy === "patient" ? "/doctor" : "/appointments",
  });

  if (refundApplied && refundAmountEgp > 0) {
    const adminIds = await getAdminUserIds();
    await createNotificationsForUsers(adminIds, {
      type: "REFUND_PROCESSED",
      title: "",
      message: msg("refundProcessedNote", {
        amount: formatPriceEgp(refundAmountEgp),
        when,
      }),
      linkUrl: "/admin",
    });
  }
}

export async function notifyRefundRequired(appointment, note) {
  const adminIds = await getAdminUserIds();
  await createNotificationsForUsers(adminIds, {
    type: "REFUND_REQUIRED",
    title: "",
    message: note
      ? msg("refundRequired", { note })
      : msg("refundRequiredDefault", { when: apptWhen(appointment) }),
    linkUrl: "/admin",
  });
}

export async function notifyAppointmentRescheduled(appointment, { actorRole }) {
  const when = apptWhen(appointment);

  await createNotification({
    userId: appointment.patientId,
    type: "APPOINTMENT_RESCHEDULED",
    title: "",
    message: msg("appointmentRescheduledPatient", { when }),
    linkUrl: "/appointments",
  });

  await createNotification({
    userId: appointment.doctorId,
    type: "APPOINTMENT_RESCHEDULED",
    title: "",
    message:
      actorRole === "PATIENT"
        ? msg("appointmentRescheduledDoctorByPatient", {
            patient: patientName(appointment) ?? "",
            when,
          })
        : msg("appointmentRescheduledDoctorSelf", { when }),
    linkUrl: "/doctor",
  });
}

export async function notifyDoctorConfirmedVisit(appointment, fullyCompleted) {
  const when = apptWhen(appointment);
  const doctor = doctorName(appointment) ?? "";

  await createNotification({
    userId: appointment.patientId,
    type: fullyCompleted ? "VISIT_COMPLETED" : "SYSTEM",
    title: "",
    message: fullyCompleted
      ? msg("doctorConfirmedCompletedPatient", { doctor, when })
      : msg("doctorConfirmedPendingPatient", { doctor }),
    linkUrl: "/appointments",
  });

  if (fullyCompleted) {
    await createNotification({
      userId: appointment.doctorId,
      type: "VISIT_COMPLETED",
      title: "",
      message: msg("doctorConfirmedCompletedDoctor", {
        patient: patientName(appointment) ?? "",
        when,
      }),
      linkUrl: "/doctor",
    });
  }
}

export async function notifyPatientConfirmedVisit(appointment, fullyCompleted) {
  const when = apptWhen(appointment);
  const patient = patientName(appointment) ?? "";

  await createNotification({
    userId: appointment.doctorId,
    type: fullyCompleted ? "VISIT_COMPLETED" : "SYSTEM",
    title: "",
    message: fullyCompleted
      ? msg("patientConfirmedCompletedDoctor", { patient, when })
      : msg("patientConfirmedPendingDoctor", { patient }),
    linkUrl: "/doctor",
  });

  if (fullyCompleted) {
    await createNotification({
      userId: appointment.patientId,
      type: "VISIT_COMPLETED",
      title: "",
      message: msg("patientConfirmedCompletedPatient", { when }),
      linkUrl: "/appointments",
    });
  }
}

export async function notifyPatientNoShowReported(appointment) {
  await createNotification({
    userId: appointment.patientId,
    type: "NO_SHOW_REPORTED",
    title: "",
    message: msg("patientNoShow", {
      doctor: doctorName(appointment) ?? "",
      when: apptWhen(appointment),
    }),
    linkUrl: "/appointments",
  });

  const adminIds = await getAdminUserIds();
  await createNotificationsForUsers(adminIds, {
    type: "DISPUTE_OPENED",
    title: "",
    message: msg("disputeOpenedAdmin", {
      message: `patient|${apptWhen(appointment)}`,
    }),
    linkUrl: "/admin",
  });
}

export async function notifyDoctorNoShowReported(appointment) {
  await createNotification({
    userId: appointment.doctorId,
    type: "NO_SHOW_REPORTED",
    title: "",
    message: msg("doctorNoShowPatient", {
      patient: patientName(appointment) ?? "",
      when: apptWhen(appointment),
    }),
    linkUrl: "/doctor",
  });

  const adminIds = await getAdminUserIds();
  await createNotificationsForUsers(adminIds, {
    type: "DISPUTE_OPENED",
    title: "",
    message: msg("disputeOpenedAdmin", {
      message: `doctor|${apptWhen(appointment)}`,
    }),
    linkUrl: "/admin",
  });
}

export async function notifyDisputeResolved(appointment, { refundOutcome }) {
  const when = apptWhen(appointment);
  const refundNote =
    refundOutcome === "full"
      ? encodeNotificationMessage("refundFullNote", {})
      : refundOutcome === "partial90"
        ? encodeNotificationMessage("refundPartialNote", {})
        : "";

  await createNotification({
    userId: appointment.patientId,
    type: "DISPUTE_RESOLVED",
    title: "",
    message: msg("disputeResolved", { when, refundNote }),
    linkUrl: "/appointments",
  });

  await createNotification({
    userId: appointment.doctorId,
    type: "DISPUTE_RESOLVED",
    title: "",
    message: msg("disputeResolvedDoctor", {
      patient: patientName(appointment) ?? "",
      when,
      refundNote,
    }),
    linkUrl: "/doctor",
  });
}

export async function notifyVisitSummaryAdded(appointment, { isUpdate }) {
  await createNotification({
    userId: appointment.patientId,
    type: "VISIT_SUMMARY_ADDED",
    title: "",
    message: msg("visitSummaryAdded", {
      doctor: doctorName(appointment) ?? "",
      action: isUpdate ? "visitSummaryActionUpdated" : "visitSummaryActionAdded",
    }),
    linkUrl: `/appointments/${appointment.id}/summary`,
  });
}

export async function notifyPayoutRequested(payout, doctor) {
  const amount = formatPriceEgp(
    payout.netAmountEgp ?? Math.round(payout.netAmount)
  );

  await createNotification({
    userId: doctor.id,
    type: "PAYOUT_REQUESTED",
    title: "",
    message: msg("payoutRequested", { amount }),
    linkUrl: "/doctor",
  });

  const adminIds = await getAdminUserIds();
  await createNotificationsForUsers(adminIds, {
    type: "PAYOUT_REQUESTED",
    title: "",
    message: msg("payoutRequestedAdmin", {
      doctor: doctor.name ?? "",
      amount,
    }),
    linkUrl: "/admin",
  });
}

export async function notifyPayoutProcessed(payout, doctor) {
  const amount = formatPriceEgp(
    payout.netAmountEgp ?? Math.round(payout.netAmount)
  );

  await createNotification({
    userId: doctor.id,
    type: "PAYOUT_PROCESSED",
    title: "",
    message: msg("payoutProcessed", { amount }),
    linkUrl: "/doctor",
  });
}

export async function notifyAdminDisputeOpened(appointment, reason) {
  const adminIds = await getAdminUserIds();
  await createNotificationsForUsers(adminIds, {
    type: "DISPUTE_OPENED",
    title: "",
    message: reason
      ? msg("adminDisputeOpened", { reason })
      : msg("adminDisputeOpenedDefault", { when: apptWhen(appointment) }),
    linkUrl: "/admin",
  });
}
