/** @typedef {"DATABASE_UNAVAILABLE"} DbErrorCode */

export const DB_UNAVAILABLE = "DATABASE_UNAVAILABLE";

/**
 * True when Prisma/Neon cannot reach the database (transient or config).
 * @param {unknown} error
 */
export function isDatabaseUnavailableError(error) {
  if (!error || typeof error !== "object") return false;

  const code = /** @type {{ code?: string }} */ (error).code;
  if (typeof code === "string") {
    if (code === "P1001" || code === "P1002" || code === "P1017") return true;
    if (code.startsWith("P10")) return true;
  }

  const message = String(
    /** @type {{ message?: string }} */ (error).message ?? ""
  ).toLowerCase();

  return (
    message.includes("can't reach database") ||
    message.includes("connection timed out") ||
    message.includes("connection refused") ||
    message.includes("econnrefused") ||
    message.includes("fetch failed") ||
    message.includes("server has closed the connection") ||
    message.includes("too many connections")
  );
}

/** @type {Map<string, number>} */
const recentLogs = new Map();

const LOG_DEDUPE_MS = 30_000;

/**
 * Dev-only diagnostic logging (no secrets). Dedupes repeated context messages.
 * @param {string} context
 * @param {unknown} [error]
 */
export function logDatabaseIssue(context, error) {
  if (process.env.NODE_ENV !== "development") return;

  const now = Date.now();
  const last = recentLogs.get(context) ?? 0;
  if (now - last < LOG_DEDUPE_MS) return;
  recentLogs.set(context, now);

  const code =
    error && typeof error === "object" && "code" in error
      ? /** @type {{ code?: string }} */ (error).code
      : undefined;
  console.warn(
    `[${context}] Database temporarily unavailable${code ? ` (${code})` : ""}`
  );
}

/**
 * @param {unknown} error
 * @returns {DbErrorCode | null}
 */
export function databaseErrorCode(error) {
  return isDatabaseUnavailableError(error) ? DB_UNAVAILABLE : null;
}
