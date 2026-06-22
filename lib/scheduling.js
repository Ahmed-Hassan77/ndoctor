import { resolveConsultationDurationMinutes } from "@/lib/pricing";

const DEFAULT_SLOT_MINUTES = 30;
const MIN_SLOT_MINUTES = 5;
const MAX_SLOT_MINUTES = 240;

/**
 * Resolve slot length from a doctor record (doctor-owned duration).
 * @param {Pick<import("@prisma/client").User, "consultationDurationMinutes"> | null | undefined} doctor
 */
export function getDoctorSlotDurationMinutes(doctor) {
  const minutes = resolveConsultationDurationMinutes(doctor);
  if (minutes < MIN_SLOT_MINUTES || minutes > MAX_SLOT_MINUTES) {
    return DEFAULT_SLOT_MINUTES;
  }
  return minutes;
}

/** @deprecated Use getDoctorSlotDurationMinutes(doctor) instead. */
export async function getSlotDurationMinutes() {
  return DEFAULT_SLOT_MINUTES;
}
