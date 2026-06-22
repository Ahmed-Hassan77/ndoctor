"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/prisma";
import { ok, fail } from "@/lib/action-result";
import { patientMedicalProfileSchema } from "@/lib/schema";
import {
  MEDICAL_ATTACHMENT_SELECT,
  MEDICAL_PROFILE_SELECT,
  serializeMedicalAttachments,
  serializeMedicalProfile,
} from "@/lib/patient-medical-profile";
import {
  patientMedicalAttachmentIdSchema,
  patientMedicalAttachmentSchema,
} from "@/lib/schema";

function recordFromFormData(formData) {
  return Object.fromEntries(formData.entries());
}

export async function getPatientMedicalProfile() {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  try {
    const patient = await db.user.findUnique({
      where: { clerkUserId: userId, role: "PATIENT" },
      select: MEDICAL_PROFILE_SELECT,
    });

    if (!patient) {
      return fail("NOT_FOUND");
    }

    return ok({ profile: serializeMedicalProfile(patient) });
  } catch (error) {
    console.error("getPatientMedicalProfile:", error);
    return fail("FETCH_FAILED");
  }
}

export async function updatePatientMedicalProfile(formData) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  const parsed = patientMedicalProfileSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const data = parsed.data;

  try {
    const patient = await db.user.findUnique({
      where: { clerkUserId: userId, role: "PATIENT" },
      select: { id: true },
    });

    if (!patient) {
      return fail("NOT_FOUND");
    }

    await db.user.update({
      where: { id: patient.id },
      data: {
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        bloodType: data.bloodType,
        allergies: data.allergies,
        chronicConditions: data.chronicConditions,
        currentMedications: data.currentMedications,
        previousSurgeries: data.previousSurgeries,
        familyHistory: data.familyHistory,
        medicalNotes: data.medicalNotes,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
      },
    });

    revalidatePath("/patient/profile");
    revalidatePath("/appointments");
    return ok({});
  } catch (error) {
    console.error("updatePatientMedicalProfile:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function getAppointmentPatientMedicalProfile(appointmentId) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  if (!appointmentId || typeof appointmentId !== "string") {
    return fail("VALIDATION_ERROR");
  }

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
      select: { id: true },
    });

    if (!doctor) {
      return fail("FORBIDDEN");
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
      select: { doctorId: true, patientId: true },
    });

    if (!appointment) {
      return fail("NOT_FOUND");
    }

    if (appointment.doctorId !== doctor.id) {
      return fail("FORBIDDEN");
    }

    const patient = await db.user.findUnique({
      where: { id: appointment.patientId },
      select: MEDICAL_PROFILE_SELECT,
    });

    if (!patient) {
      return fail("NOT_FOUND");
    }

    const attachments = await db.patientMedicalAttachment.findMany({
      where: { patientId: appointment.patientId },
      select: MEDICAL_ATTACHMENT_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return ok({
      profile: serializeMedicalProfile(patient),
      attachments: serializeMedicalAttachments(attachments),
    });
  } catch (error) {
    console.error("getAppointmentPatientMedicalProfile:", error);
    return fail("FETCH_FAILED");
  }
}

async function getAuthenticatedPatient() {
  const { userId } = await auth();
  if (!userId) return { error: fail("UNAUTHORIZED") };

  const patient = await db.user.findUnique({
    where: { clerkUserId: userId, role: "PATIENT" },
    select: { id: true },
  });

  if (!patient) {
    return { error: fail("NOT_FOUND") };
  }

  return { patient };
}

export async function getPatientMedicalAttachments() {
  const authResult = await getAuthenticatedPatient();
  if (authResult.error) return authResult.error;

  try {
    const attachments = await db.patientMedicalAttachment.findMany({
      where: { patientId: authResult.patient.id },
      select: MEDICAL_ATTACHMENT_SELECT,
      orderBy: { createdAt: "desc" },
    });

    return ok({ attachments: serializeMedicalAttachments(attachments) });
  } catch (error) {
    console.error("getPatientMedicalAttachments:", error);
    return fail("FETCH_FAILED");
  }
}

export async function addPatientMedicalAttachment(formData) {
  const authResult = await getAuthenticatedPatient();
  if (authResult.error) return authResult.error;

  const parsed = patientMedicalAttachmentSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const data = parsed.data;

  try {
    const attachment = await db.patientMedicalAttachment.create({
      data: {
        patientId: authResult.patient.id,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        category: data.category,
        description: data.description,
      },
      select: MEDICAL_ATTACHMENT_SELECT,
    });

    revalidatePath("/patient/profile");
    return ok({ attachment: serializeMedicalAttachments([attachment])[0] });
  } catch (error) {
    console.error("addPatientMedicalAttachment:", error);
    return fail("ADD_FAILED");
  }
}

export async function deletePatientMedicalAttachment(formData) {
  const authResult = await getAuthenticatedPatient();
  if (authResult.error) return authResult.error;

  const parsed = patientMedicalAttachmentIdSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const { attachmentId } = parsed.data;

  try {
    const existing = await db.patientMedicalAttachment.findUnique({
      where: { id: attachmentId },
      select: { patientId: true },
    });

    if (!existing) {
      return fail("NOT_FOUND");
    }

    if (existing.patientId !== authResult.patient.id) {
      return fail("FORBIDDEN");
    }

    await db.patientMedicalAttachment.delete({
      where: { id: attachmentId },
    });

    revalidatePath("/patient/profile");
    return ok({});
  } catch (error) {
    console.error("deletePatientMedicalAttachment:", error);
    return fail("DELETE_FAILED");
  }
}
