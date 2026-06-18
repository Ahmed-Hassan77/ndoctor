/** Single platform timezone for all scheduling and appointment display. */
export const PLATFORM_TIMEZONE =
  process.env.DEFAULT_WORK_TIMEZONE?.trim() || "Africa/Cairo";

/** Short label for UI copy (e.g. booking panel). */
export const PLATFORM_TIME_LABEL = "Egypt time";

export function getPlatformTimeZone() {
  return PLATFORM_TIMEZONE;
}
