import { db } from "@/lib/prisma";

/**
 * Exceptions overlapping a time window (for slot generation).
 * @param {string} doctorId
 * @param {Date} rangeStart
 * @param {Date} rangeEnd
 */
export async function getDoctorExceptionsInRange(
  doctorId,
  rangeStart,
  rangeEnd
) {
  return db.availabilityException.findMany({
    where: {
      doctorId,
      startTime: { lt: rangeEnd },
      endTime: { gt: rangeStart },
    },
    orderBy: { startTime: "asc" },
  });
}

export function serializeAvailabilityException(row) {
  if (!row) return null;
  const toIso = (v) =>
    v instanceof Date ? v.toISOString() : v != null ? String(v) : v;
  return {
    id: row.id,
    doctorId: row.doctorId,
    clinicId: row.clinicId ?? null,
    appointmentMode: row.appointmentMode ?? null,
    clinicName:
      row.clinic?.nameEn ?? row.clinic?.name ?? null,
    startTime: toIso(row.startTime),
    endTime: toIso(row.endTime),
    reason: row.reason ?? null,
    type: row.type,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}
