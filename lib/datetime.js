/**
 * Parse an ISO-8601 instant (UTC Z or offset) without local timezone reinterpretation.
 * @param {string | Date} value
 * @returns {Date | null}
 */
export function parseUtcIsoInstant(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const ms = Date.parse(trimmed);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

/** Current instant for past-slot filtering (slots use platform timezone wall clock). */
export function resolveSlotCutoffMs(_clientNowIso = null) {
  return Date.now();
}
