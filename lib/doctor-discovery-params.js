/** @typedef {'all' | 'online' | 'clinic'} DiscoveryMode */
/** @typedef {'rating' | 'online_price' | 'clinic_price' | 'experience' | 'name'} DiscoverySort */

export const DISCOVERY_SORT_OPTIONS = [
  { value: "rating", label: "Highest rated" },
  { value: "online_price", label: "Lowest online price" },
  { value: "clinic_price", label: "Lowest clinic price" },
  { value: "experience", label: "Most experienced" },
  { value: "name", label: "Name (A–Z)" },
];

export const DISCOVERY_MODE_OPTIONS = [
  { value: "all", label: "All modes" },
  { value: "online", label: "Online video" },
  { value: "clinic", label: "Clinic / in-person" },
];

/**
 * @param {Record<string, string | string[] | undefined> | undefined} searchParams
 */
export function parseDoctorSearchParams(searchParams) {
  const get = (key) => {
    const v = searchParams?.[key];
    if (Array.isArray(v)) return (v[0] ?? "").trim();
    return (v ?? "").trim();
  };

  const modeRaw = get("mode").toLowerCase();
  /** @type {DiscoveryMode} */
  const mode =
    modeRaw === "online" || modeRaw === "clinic" ? modeRaw : "all";

  const sortRaw = get("sort").toLowerCase();
  /** @type {DiscoverySort} */
  const sort = DISCOVERY_SORT_OPTIONS.some((o) => o.value === sortRaw)
    ? sortRaw
    : "rating";

  const minRating = parseFloat(get("minRating"));
  const minExperience = parseInt(get("minExperience"), 10);
  const minPrice = parseInt(get("minPrice"), 10);
  const maxPrice = parseInt(get("maxPrice"), 10);

  return {
    q: get("q"),
    specialty: get("specialty"),
    governorate: get("governorate"),
    area: get("area"),
    mode,
    minRating: Number.isFinite(minRating) && minRating > 0 ? minRating : null,
    minExperience:
      Number.isFinite(minExperience) && minExperience > 0
        ? minExperience
        : null,
    minPrice: Number.isFinite(minPrice) && minPrice > 0 ? minPrice : null,
    maxPrice: Number.isFinite(maxPrice) && maxPrice > 0 ? maxPrice : null,
    availableToday:
      get("availableToday") === "true" || get("availableToday") === "1",
    sort,
  };
}

/**
 * @param {ReturnType<typeof parseDoctorSearchParams>} filters
 */
export function buildDoctorSearchQueryString(filters) {
  const p = new URLSearchParams();
  if (filters.q) p.set("q", filters.q);
  if (filters.specialty) p.set("specialty", filters.specialty);
  if (filters.governorate) p.set("governorate", filters.governorate);
  if (filters.area) p.set("area", filters.area);
  if (filters.mode && filters.mode !== "all") p.set("mode", filters.mode);
  if (filters.minRating != null) p.set("minRating", String(filters.minRating));
  if (filters.minExperience != null)
    p.set("minExperience", String(filters.minExperience));
  if (filters.minPrice != null) p.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null) p.set("maxPrice", String(filters.maxPrice));
  if (filters.availableToday) p.set("availableToday", "true");
  if (filters.sort && filters.sort !== "rating") p.set("sort", filters.sort);
  return p.toString();
}

/**
 * @param {ReturnType<typeof parseDoctorSearchParams>} filters
 */
export function hasActiveDiscoveryFilters(filters) {
  return Boolean(
    filters.q ||
      filters.specialty ||
      filters.governorate ||
      filters.area ||
      filters.mode !== "all" ||
      filters.minRating != null ||
      filters.minExperience != null ||
      filters.minPrice != null ||
      filters.maxPrice != null ||
      filters.availableToday
  );
}
