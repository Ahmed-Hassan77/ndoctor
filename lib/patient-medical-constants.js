export const PATIENT_GENDER_OPTIONS = ["Male", "Female"];

export const PATIENT_BLOOD_TYPE_OPTIONS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

export const MEDICAL_ATTACHMENT_CATEGORIES = [
  { value: "LAB_TEST", label: "Lab test" },
  { value: "RADIOLOGY", label: "Radiology" },
  { value: "PRESCRIPTION", label: "Prescription" },
  { value: "REPORT", label: "Report" },
  { value: "OTHER", label: "Other" },
];

const CATEGORY_LABELS = Object.fromEntries(
  MEDICAL_ATTACHMENT_CATEGORIES.map((c) => [c.value, c.label])
);

export function getMedicalAttachmentCategoryLabel(category) {
  return CATEGORY_LABELS[category] ?? category;
}
