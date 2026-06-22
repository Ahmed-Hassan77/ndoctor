import { formatInTimeZone } from "date-fns-tz";
import { hasUsableClinicLocation } from "@/lib/clinic-location";
import { getPlatformTimeZone } from "@/lib/platform-timezone";

const MARKETPLACE_TZ = getPlatformTimeZone();

/**
 * @param {Date} instant
 * @param {string} zone
 */
function dayOfWeekSun0(instant, zone) {
  const i = Number(formatInTimeZone(instant, zone, "i"));
  return Number.isFinite(i) && i === 7 ? 0 : i;
}

/**
 * @param {Date} instant
 * @param {string} zone
 */
function minutesOfDay(instant, zone) {
  const hhmm = formatInTimeZone(instant, zone, "HH:mm");
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * @param {string} endTime HH:mm
 * @param {string} zone
 * @param {Date} ref
 */
function workWindowEndsAfterNow(endTime, zone, ref) {
  const [eh, em] = endTime.split(":").map(Number);
  if (!Number.isFinite(eh) || !Number.isFinite(em)) return false;
  return eh * 60 + em > minutesOfDay(ref, zone);
}

/**
 * @param {Pick<import("@prisma/client").User, "workTimeZone"> | null | undefined} doctor
 * @param {Array<{ dayOfWeek: number; startTime: string; endTime: string; mode: string; isActive?: boolean }>} workTimes
 * @param {'ONLINE' | 'OFFLINE'} mode
 */
export function doctorSupportsMode(doctor, workTimes, mode) {
  const active = (workTimes ?? []).filter((w) => w.isActive !== false);
  if (mode === "ONLINE") {
    return active.some((w) => w.mode === "ONLINE");
  }
  return (
    hasUsableClinicLocation(doctor) && active.some((w) => w.mode === "OFFLINE")
  );
}

/**
 * Has an active work window today (in doctor TZ or marketplace TZ) that has not fully ended.
 * @param {Pick<import("@prisma/client").User, "workTimeZone"> | null | undefined} doctor
 * @param {Array<{ dayOfWeek: number; startTime: string; endTime: string; mode: string; isActive?: boolean }>} workTimes
 * @param {'ONLINE' | 'OFFLINE' | 'any'} [modeFilter]
 */
export function isAvailableToday(doctor, workTimes, modeFilter = "any") {
  const zone = MARKETPLACE_TZ;
  const now = new Date();
  const today = dayOfWeekSun0(now, zone);
  const active = (workTimes ?? []).filter((w) => w.isActive !== false);

  return active.some((w) => {
    if (w.dayOfWeek !== today) return false;
    if (modeFilter === "ONLINE" && w.mode !== "ONLINE") return false;
    if (modeFilter === "OFFLINE" && w.mode !== "OFFLINE") return false;
    return workWindowEndsAfterNow(w.endTime, zone, now);
  });
}

export { MARKETPLACE_TZ };
