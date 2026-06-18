/**
 * Canonical public URL for a verified doctor profile.
 * @param {{ id: string; specialty?: string | null }} doctor
 */
export function doctorProfilePath(doctor) {
  const specialty = doctor.specialty?.trim() || "General";
  return `/doctors/${encodeURIComponent(specialty)}/${doctor.id}`;
}

/**
 * @param {string | undefined | null} specialty
 */
export function decodeRouteSpecialty(specialty) {
  if (!specialty) return "";
  try {
    return decodeURIComponent(specialty);
  } catch {
    return specialty;
  }
}

/**
 * @param {string | null | undefined} doctorSpecialty
 * @param {string | undefined | null} routeSpecialty
 */
export function specialtySlugMatches(doctorSpecialty, routeSpecialty) {
  const expected = (doctorSpecialty ?? "").trim().toLowerCase();
  const actual = decodeRouteSpecialty(routeSpecialty).trim().toLowerCase();
  if (!expected || !actual) return true;
  return expected === actual;
}
