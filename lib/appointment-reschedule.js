/**
 * Whether a patient may reschedule this appointment (client + server).
 * @param {{ status?: string; startTime: string | Date }} appointment
 */
export function canPatientRescheduleAppointment(appointment) {
  if (!appointment) return false;
  const status = appointment.status;
  if (status !== "SCHEDULED" && status !== "CONFIRMED") return false;
  const start = new Date(appointment.startTime);
  return !Number.isNaN(start.getTime()) && start > new Date();
}
