import { addDays, addMinutes, startOfMonth, endOfMonth } from "date-fns";
import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
import { resolveSlotCutoffMs } from "@/lib/datetime";

const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export { WEEKDAY_LABELS };

/**
 * Filter work times for mode and optional clinic.
 * @param {Array<{ mode: string; clinicScopeKey?: string; clinicId?: string | null; dayOfWeek?: number }>} workTimes
 * @param {'ONLINE' | 'OFFLINE'} mode
 * @param {string | null | undefined} [clinicId]
 */
export function filterWorkTimesForBooking(workTimes, mode, clinicId) {
  if (mode === "ONLINE") {
    return workTimes.filter(
      (w) => w.mode === "ONLINE" && (w.clinicScopeKey ?? "global") === "global"
    );
  }

  const scope = clinicId?.trim();
  if (!scope) {
    return [];
  }

  const offline = workTimes.filter((w) => w.mode === "OFFLINE");
  const forClinic = offline.filter(
    (w) => (w.clinicScopeKey ?? "global") === scope
  );

  if (forClinic.length > 0) {
    return forClinic;
  }

  // Legacy: shared in-person hours before per-clinic schedules existed
  return offline.filter((w) => (w.clinicScopeKey ?? "global") === "global");
}

/**
 * Pick the work-time row for a weekday when multiple scopes could match.
 * @param {Array<{ dayOfWeek: number; clinicScopeKey?: string }>} workTimes
 * @param {number} dayOfWeek
 * @param {string | null | undefined} [clinicId]
 */
export function resolveWorkTimeForDay(workTimes, dayOfWeek, clinicId) {
  const forDay = workTimes.filter((w) => w.dayOfWeek === dayOfWeek);
  if (forDay.length === 0) return null;
  if (forDay.length === 1) return forDay[0];

  const scope = clinicId?.trim();
  if (scope) {
    const clinicMatch = forDay.find(
      (w) => (w.clinicScopeKey ?? "global") === scope
    );
    if (clinicMatch) return clinicMatch;
  }

  return (
    forDay.find((w) => (w.clinicScopeKey ?? "global") === "global") ?? forDay[0]
  );
}

/**
 * @param {Array<{ clinicId?: string | null; appointmentMode?: string | null }>} exceptions
 * @param {string | null | undefined} clinicId
 * @param {"ONLINE" | "OFFLINE"} [appointmentMode="ONLINE"]
 */
export function filterExceptionsForBooking(
  exceptions,
  clinicId,
  appointmentMode = "ONLINE"
) {
  const mode = appointmentMode === "OFFLINE" ? "OFFLINE" : "ONLINE";
  const scope = clinicId?.trim() || null;

  return exceptions.filter((ex) => {
    if (ex.appointmentMode && ex.appointmentMode !== mode) {
      return false;
    }
    if (mode === "ONLINE") {
      return !ex.clinicId;
    }
    return !ex.clinicId || ex.clinicId === scope;
  });
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/**
 * Wall-clock components in `zone` → UTC instant (never uses server local TZ).
 */
export function zonedSlotInstant(y, m, d, hour, minute, zone) {
  const dateTimeStr = `${y}-${pad2(m)}-${pad2(d)}T${pad2(hour)}:${pad2(minute)}:00`;
  return fromZonedTime(dateTimeStr, zone);
}

function zonedWeekdaySun0(instant, zone) {
  const i = Number(formatInTimeZone(instant, zone, "i"));
  return Number.isFinite(i) && i === 7 ? 0 : i;
}

/** Sunday 00:00 .. Saturday 23:59:59.999 in `zone`, plus sunday noon anchor for iterating calendar days. */
export function getWeekBoundsInZone(zone, now = new Date()) {
  const ymd = formatInTimeZone(now, zone, "yyyy-MM-dd");
  const [Y, M, D] = ymd.split("-").map(Number);
  const noonToday = zonedSlotInstant(Y, M, D, 12, 0, zone);
  const wd = zonedWeekdaySun0(noonToday, zone);
  const sundayNoon = addDays(noonToday, -wd);

  const sunYmd = formatInTimeZone(sundayNoon, zone, "yyyy-MM-dd");
  const [uy, um, ud] = sunYmd.split("-").map(Number);
  const weekStartUtc = zonedSlotInstant(uy, um, ud, 0, 0, zone);

  const saturdayInstant = addDays(sundayNoon, 6);
  const satYmd = formatInTimeZone(saturdayInstant, zone, "yyyy-MM-dd");
  const [sy, smon, sd] = satYmd.split("-").map(Number);
  const weekEndUtc = fromZonedTime(
    `${sy}-${pad2(smon)}-${pad2(sd)}T23:59:59.999`,
    zone
  );

  return { sundayNoon, weekStartUtc, weekEndUtc };
}

/** First/last calendar day of `year`-`month` (1-based) in `zone`, as UTC bounds. */
export function getMonthBoundsInZone(zone, year, month, now = new Date()) {
  const monthStr = `${year}-${pad2(month)}-15T12:00:00`;
  const anchor = fromZonedTime(monthStr, zone);
  const monthStartLocal = startOfMonth(anchor);
  const monthEndLocal = endOfMonth(anchor);

  const startYmd = formatInTimeZone(monthStartLocal, zone, "yyyy-MM-dd");
  const [sy, sm, sd] = startYmd.split("-").map(Number);
  const monthStartUtc = zonedSlotInstant(sy, sm, sd, 0, 0, zone);

  const endYmd = formatInTimeZone(monthEndLocal, zone, "yyyy-MM-dd");
  const [ey, em, ed] = endYmd.split("-").map(Number);
  const monthEndUtc = fromZonedTime(
    `${ey}-${pad2(em)}-${pad2(ed)}T23:59:59.999`,
    zone
  );

  return { monthStartUtc, monthEndUtc, monthStartLocal, monthEndLocal };
}

/**
 * Build slot days for every day in a calendar month.
 * @param {object} params
 * @param {string} params.zone
 * @param {number} params.year
 * @param {number} params.month - 1-12
 * @param {Array<{ dayOfWeek: number; startTime: string; endTime: string }>} params.workTimes
 * @param {number} params.slotMinutes
 * @param {Array<{ startTime: Date | string; endTime: Date | string }>} params.existingAppointments
 * @param {Array<{ startTime: Date | string; endTime: Date | string; clinicId?: string | null }>} [params.availabilityExceptions]
 * @param {number} [params.cutoffMs]
 * @param {string | null | undefined} [params.clinicId]
 */
export function buildMonthSlotDays({
  zone,
  year,
  month,
  workTimes,
  slotMinutes,
  existingAppointments,
  availabilityExceptions = [],
  cutoffMs = Date.now(),
  clinicId = null,
}) {
  const { monthStartLocal, monthEndLocal } = getMonthBoundsInZone(
    zone,
    year,
    month,
    new Date(cutoffMs)
  );
  const days = [];
  let cursor = monthStartLocal;

  while (cursor <= monthEndLocal) {
    const dateStr = formatInTimeZone(cursor, zone, "yyyy-MM-dd");
    const [y, m, d] = dateStr.split("-").map(Number);
    const dayInstant = zonedSlotInstant(y, m, d, 12, 0, zone);
    const k = zonedWeekdaySun0(dayInstant, zone);
    const displayDate = formatInTimeZone(dayInstant, zone, "EEEE, MMMM d");

    const slots = [];
    const wt = resolveWorkTimeForDay(workTimes, k, clinicId);

    if (wt) {
      const [sh, sm] = wt.startTime.split(":").map(Number);
      const [eh, em] = wt.endTime.split(":").map(Number);
      const availabilityStart = zonedSlotInstant(y, m, d, sh, sm, zone);
      const availabilityEnd = zonedSlotInstant(y, m, d, eh, em, zone);

      let current = new Date(availabilityStart);
      const endSlot = new Date(availabilityEnd);

      while (current < endSlot) {
        const next = addMinutes(current, slotMinutes);
        if (next > endSlot) break;

        const slotStart = current;
        const slotEnd = next;
        const slotStartMs = slotStart.getTime();
        const slotEndMs = slotEnd.getTime();

        const isFuture = slotStartMs > cutoffMs && slotEndMs > cutoffMs;
        const overlaps = existingAppointments.some((appointment) =>
          appointmentsOverlap(slotStart, slotEnd, appointment)
        );
        const blocked = slotOverlapsExceptions(
          slotStart,
          slotEnd,
          availabilityExceptions
        );

        if (isFuture && !overlaps && !blocked) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            startTimeMs: slotStartMs,
            endTimeMs: slotEndMs,
            formatted: `${formatInTimeZone(slotStart, zone, "h:mm a")} – ${formatInTimeZone(slotEnd, zone, "h:mm a")}`,
            day: formatInTimeZone(slotStart, zone, "EEEE, MMMM d"),
          });
        }

        current = next;
      }
    }

    days.push({
      date: dateStr,
      dayOfWeek: k,
      weekdayLabel: WEEKDAY_LABELS[k],
      displayDate,
      slots,
      slotCount: slots.length,
    });

    cursor = addDays(cursor, 1);
  }

  return days;
}

/**
 * Summarize calendar month days for grid highlighting.
 * @param {ReturnType<typeof buildMonthSlotDays>} days
 * @param {Array<{ startTime: Date | string; endTime: Date | string; status?: string }>} appointments
 * @param {Array<{ startTime: Date | string; endTime: Date | string; type?: string }>} exceptions
 */
export function buildMonthDayStates(days, appointments = [], exceptions = []) {
  return days.map((day) => {
    const dayStart = fromZonedTime(`${day.date}T00:00:00`, "UTC");
    const dayEnd = fromZonedTime(`${day.date}T23:59:59.999`, "UTC");

    const dayAppointments = appointments.filter((apt) => {
      const s = new Date(apt.startTime).getTime();
      return s >= dayStart.getTime() && s <= dayEnd.getTime();
    });

    const dayBlocks = exceptions.filter((ex) => {
      const s = new Date(ex.startTime).getTime();
      return s >= dayStart.getTime() && s <= dayEnd.getTime();
    });

    let state = "unavailable";
    if (dayBlocks.some((b) => b.type === "VACATION" || b.type === "HOLIDAY")) {
      state = "blocked";
    } else if (day.slotCount > 0) {
      state = "available";
    } else if (dayAppointments.length > 0) {
      state = "booked";
    } else if (dayBlocks.length > 0) {
      state = "blocked";
    }

    return {
      ...day,
      state,
      appointmentCount: dayAppointments.length,
      blockCount: dayBlocks.length,
    };
  });
}

export function appointmentsOverlap(slotStart, slotEnd, appointment) {
  const aStart = new Date(appointment.startTime);
  const aEnd = new Date(appointment.endTime);
  return slotStart < aEnd && slotEnd > aStart;
}

/** True if [slotStart, slotEnd) overlaps any blocked exception range. */
export function slotOverlapsExceptions(slotStart, slotEnd, exceptions = []) {
  return exceptions.some((ex) =>
    appointmentsOverlap(slotStart, slotEnd, ex)
  );
}

/**
 * @param {object} params
 * @param {string} params.zone
 * @param {Array<{ dayOfWeek: number; startTime: string; endTime: string }>} params.workTimes
 * @param {number} params.slotMinutes
 * @param {Array<{ startTime: Date | string; endTime: Date | string }>} params.existingAppointments
 * @param {Array<{ startTime: Date | string; endTime: Date | string }>} [params.availabilityExceptions]
 * @param {number} params.cutoffMs - slots at or before this instant are excluded
 * @param {string | null | undefined} [params.clinicId]
 */
export function buildWeekSlotDays({
  zone,
  workTimes,
  slotMinutes,
  existingAppointments,
  availabilityExceptions = [],
  cutoffMs = Date.now(),
  clinicId = null,
}) {
  const { sundayNoon } = getWeekBoundsInZone(zone, new Date(cutoffMs));
  const days = [];

  for (let k = 0; k < 7; k++) {
    const dayInstant = addDays(sundayNoon, k);
    const dateStr = formatInTimeZone(dayInstant, zone, "yyyy-MM-dd");
    const [y, m, d] = dateStr.split("-").map(Number);
    const displayDate = formatInTimeZone(
      zonedSlotInstant(y, m, d, 12, 0, zone),
      zone,
      "EEEE, MMMM d"
    );

    const slots = [];
    const wt = resolveWorkTimeForDay(workTimes, k, clinicId);

    if (wt) {
      const [sh, sm] = wt.startTime.split(":").map(Number);
      const [eh, em] = wt.endTime.split(":").map(Number);
      const availabilityStart = zonedSlotInstant(y, m, d, sh, sm, zone);
      const availabilityEnd = zonedSlotInstant(y, m, d, eh, em, zone);

      let current = new Date(availabilityStart);
      const endSlot = new Date(availabilityEnd);

      while (current < endSlot) {
        const next = addMinutes(current, slotMinutes);
        if (next > endSlot) break;

        const slotStart = current;
        const slotEnd = next;
        const slotStartMs = slotStart.getTime();
        const slotEndMs = slotEnd.getTime();

        const isFuture = slotStartMs > cutoffMs && slotEndMs > cutoffMs;
        const overlaps = existingAppointments.some((appointment) =>
          appointmentsOverlap(slotStart, slotEnd, appointment)
        );
        const blocked = slotOverlapsExceptions(
          slotStart,
          slotEnd,
          availabilityExceptions
        );

        if (isFuture && !overlaps && !blocked) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            startTimeMs: slotStartMs,
            endTimeMs: slotEndMs,
            formatted: `${formatInTimeZone(slotStart, zone, "h:mm a")} – ${formatInTimeZone(slotEnd, zone, "h:mm a")}`,
            day: formatInTimeZone(slotStart, zone, "EEEE, MMMM d"),
          });
        }

        current = next;
      }
    }

    days.push({
      date: dateStr,
      dayOfWeek: k,
      weekdayLabel: WEEKDAY_LABELS[k],
      displayDate,
      slots,
    });
  }

  return days;
}

/** Client-side safety filter using device clock (full datetime, not date-only). */
export function filterPastSlotsFromDays(days, cutoffMs = Date.now()) {
  return days.map((day) => ({
    ...day,
    slots: (day.slots ?? []).filter((slot) => {
      const startMs =
        slot.startTimeMs ?? new Date(slot.startTime).getTime();
      const endMs = slot.endTimeMs ?? new Date(slot.endTime).getTime();
      return (
        !Number.isNaN(startMs) &&
        !Number.isNaN(endMs) &&
        startMs > cutoffMs &&
        endMs > cutoffMs
      );
    }),
  }));
}

export function slotExistsInDays(days, startTime, endTime) {
  const startMs =
    startTime instanceof Date
      ? startTime.getTime()
      : new Date(startTime).getTime();
  const endMs =
    endTime instanceof Date ? endTime.getTime() : new Date(endTime).getTime();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false;

  for (const day of days ?? []) {
    for (const slot of day.slots ?? []) {
      const slotStartMs =
        slot.startTimeMs ?? new Date(slot.startTime).getTime();
      const slotEndMs = slot.endTimeMs ?? new Date(slot.endTime).getTime();
      if (slotStartMs === startMs && slotEndMs === endMs) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Validate a slot against doctor work hours and conflicts (same rules as grid).
 */
export function isBookableSlot({
  zone,
  workTimes,
  slotMinutes,
  existingAppointments,
  availabilityExceptions = [],
  startTime,
  endTime,
  cutoffMs = Date.now(),
  clinicId = null,
}) {
  const start =
    startTime instanceof Date ? startTime : new Date(startTime);
  const end = endTime instanceof Date ? endTime : new Date(endTime);
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false;
  if (startMs <= cutoffMs || endMs <= cutoffMs) return false;
  if (endMs - startMs !== slotMinutes * 60 * 1000) return false;

  const dayOfWeek = zonedWeekdaySun0(start, zone);
  const wt = resolveWorkTimeForDay(workTimes, dayOfWeek, clinicId);
  if (!wt) return false;

  const ymd = formatInTimeZone(start, zone, "yyyy-MM-dd");
  const [y, m, d] = ymd.split("-").map(Number);
  const [sh, sm] = wt.startTime.split(":").map(Number);
  const [eh, em] = wt.endTime.split(":").map(Number);
  const availabilityStart = zonedSlotInstant(y, m, d, sh, sm, zone);
  const availabilityEnd = zonedSlotInstant(y, m, d, eh, em, zone);

  if (startMs < availabilityStart.getTime() || endMs > availabilityEnd.getTime()) {
    return false;
  }

  const durationMs = slotMinutes * 60 * 1000;
  let cursor = availabilityStart.getTime();
  const endBound = availabilityEnd.getTime();
  let aligned = false;

  while (cursor + durationMs <= endBound) {
    if (cursor === startMs && cursor + durationMs === endMs) {
      aligned = true;
      break;
    }
    cursor += durationMs;
  }

  if (!aligned) return false;

  if (
    existingAppointments.some((apt) => appointmentsOverlap(start, end, apt))
  ) {
    return false;
  }

  return !slotOverlapsExceptions(start, end, availabilityExceptions);
}
