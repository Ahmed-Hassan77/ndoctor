import { formatInTimeZone } from "date-fns-tz";
import { getPlatformTimeZone } from "@/lib/platform-timezone";

function toDate(value) {
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Format an appointment instant in platform timezone (never browser local).
 */
export function formatAppointmentDateTime(
  value,
  pattern = "MMMM d, yyyy 'at' h:mm a",
  timeZone = getPlatformTimeZone()
) {
  const d = toDate(value);
  if (!d) return "Invalid date";
  return formatInTimeZone(d, timeZone, pattern);
}

export function formatAppointmentTime(
  value,
  timeZone = getPlatformTimeZone()
) {
  return formatAppointmentDateTime(value, "h:mm a", timeZone);
}

export function formatAppointmentDate(
  value,
  timeZone = getPlatformTimeZone()
) {
  return formatAppointmentDateTime(value, "EEEE, MMMM d, yyyy", timeZone);
}

export function formatAppointmentRange(startTime, endTime, timeZone = getPlatformTimeZone()) {
  const start = toDate(startTime);
  const end = toDate(endTime);
  if (!start || !end) {
    return { dateLine: "Invalid date", timeLine: "", startTime: "", endTime: "" };
  }
  const startTimeLabel = formatInTimeZone(start, timeZone, "h:mm a");
  const endTimeLabel = formatInTimeZone(end, timeZone, "h:mm a");
  return {
    dateLine: formatInTimeZone(start, timeZone, "EEEE, MMMM d, yyyy"),
    timeLine: `${startTimeLabel} – ${endTimeLabel}`,
    startTime: startTimeLabel,
    endTime: endTimeLabel,
  };
}

/** Compact start/end labels for slot buttons and booking summaries. */
export function formatSlotTimeRange(
  startTime,
  endTime,
  timeZone = getPlatformTimeZone()
) {
  const { startTime: start, endTime: end, timeLine: range } = formatAppointmentRange(
    startTime,
    endTime,
    timeZone
  );
  return { start, end, range };
}
