/** Maps DB/API specialty English name to dictionary key slug */
const SPECIALTY_KEYS = {
  "General Medicine": "generalMedicine",
  Cardiology: "cardiology",
  Dermatology: "dermatology",
  Endocrinology: "endocrinology",
  Gastroenterology: "gastroenterology",
  Neurology: "neurology",
  "Obstetrics & Gynecology": "obstetricsGynecology",
  Oncology: "oncology",
  Ophthalmology: "ophthalmology",
  Orthopedics: "orthopedics",
  Pediatrics: "pediatrics",
  Psychiatry: "psychiatry",
  Pulmonology: "pulmonology",
  Radiology: "radiology",
  Urology: "urology",
  Other: "other",
};

/**
 * @param {import("@/lib/dictionaries/en").default} dict
 * @param {string | null | undefined} name
 */
export function specialtyLabel(dict, name) {
  if (!name?.trim()) return "";
  const key = SPECIALTY_KEYS[name.trim()];
  if (key) {
    const label = dict.specialties?.[key];
    if (label) return label;
  }
  return name;
}

export function getSpecialtyKey(name) {
  return SPECIALTY_KEYS[name?.trim() ?? ""] ?? null;
}
