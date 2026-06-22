import { getMedicalAttachmentCategoryLabel } from "@/lib/patient-medical-constants";

/** Fields returned for patient self-service or authorized doctor appointment view. */
export const MEDICAL_PROFILE_SELECT = {
  dateOfBirth: true,
  gender: true,
  bloodType: true,
  allergies: true,
  chronicConditions: true,
  currentMedications: true,
  previousSurgeries: true,
  familyHistory: true,
  medicalNotes: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
};

/** Safe patient fields for appointment lists/cards (no medical data). */
export const PATIENT_PARTY_SELECT = {
  id: true,
  name: true,
  email: true,
  imageUrl: true,
};

export function formatDateOfBirthInput(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function computeAgeFromDateOfBirth(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

export function patientHasMedicalProfile(user) {
  if (!user) return false;
  return Boolean(
    user.dateOfBirth ||
      (user.gender && user.gender.trim()) ||
      (user.bloodType && user.bloodType.trim()) ||
      (user.allergies && user.allergies.trim()) ||
      (user.chronicConditions && user.chronicConditions.trim()) ||
      (user.currentMedications && user.currentMedications.trim()) ||
      (user.previousSurgeries && user.previousSurgeries.trim()) ||
      (user.familyHistory && user.familyHistory.trim()) ||
      (user.medicalNotes && user.medicalNotes.trim()) ||
      (user.emergencyContactName && user.emergencyContactName.trim()) ||
      (user.emergencyContactPhone && user.emergencyContactPhone.trim())
  );
}

export const MEDICAL_ATTACHMENT_SELECT = {
  id: true,
  fileUrl: true,
  fileName: true,
  category: true,
  description: true,
  createdAt: true,
};

export function serializeMedicalAttachment(attachment) {
  if (!attachment) return null;
  return {
    id: attachment.id,
    fileUrl: attachment.fileUrl,
    fileName: attachment.fileName,
    category: attachment.category,
    categoryLabel: getMedicalAttachmentCategoryLabel(attachment.category),
    description: attachment.description ?? null,
    createdAt:
      attachment.createdAt instanceof Date
        ? attachment.createdAt.toISOString()
        : String(attachment.createdAt),
  };
}

export function serializeMedicalAttachments(attachments) {
  return (attachments ?? []).map(serializeMedicalAttachment);
}

export function serializeMedicalProfile(user) {
  if (!user) return null;
  const dateOfBirth = user.dateOfBirth
    ? user.dateOfBirth instanceof Date
      ? user.dateOfBirth.toISOString()
      : String(user.dateOfBirth)
    : null;
  const age = computeAgeFromDateOfBirth(user.dateOfBirth);
  return {
    dateOfBirth,
    dateOfBirthDisplay: user.dateOfBirth
      ? formatDateOfBirthInput(user.dateOfBirth)
      : null,
    age,
    gender: user.gender ?? null,
    bloodType: user.bloodType ?? null,
    allergies: user.allergies ?? null,
    chronicConditions: user.chronicConditions ?? null,
    currentMedications: user.currentMedications ?? null,
    previousSurgeries: user.previousSurgeries ?? null,
    familyHistory: user.familyHistory ?? null,
    medicalNotes: user.medicalNotes ?? null,
    emergencyContactName: user.emergencyContactName ?? null,
    emergencyContactPhone: user.emergencyContactPhone ?? null,
    isComplete: patientHasMedicalProfile(user),
  };
}
