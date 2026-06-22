export function ok(data = {}) {
  return { success: true, ...data };
}

/**
 * @param {string} code
 * @param {string | Record<string, string | number> | undefined} [detail]
 *   - validation.* key string
 *   - legacy English fallback message
 *   - vars object for errors.codes interpolation
 */
export function fail(code, detail) {
  /** @type {{ code: string; validationKey?: string; fallbackMessage?: string; vars?: Record<string, string | number> }} */
  const error = { code };

  if (typeof detail === "string") {
    if (detail.startsWith("validation.")) {
      error.validationKey = detail;
    } else {
      error.fallbackMessage = detail;
    }
  } else if (detail && typeof detail === "object") {
    error.vars = detail;
  }

  return { success: false, error };
}
