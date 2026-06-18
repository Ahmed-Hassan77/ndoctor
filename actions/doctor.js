"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ok, fail } from "@/lib/action-result";
import {
  setWorkTimeSchema,
  workTimeIdSchema,
  systemConfigKeySchema,
  updateSystemConfigSchema,
  workTimeZoneSchema,
  practiceAddressSchema,
  doctorProfileSettingsSchema,
} from "@/lib/schema";
import { verifyAdmin } from "@/actions/admin";
import { buildPracticeAddressFromClinic } from "@/lib/clinic-location";
import { processCancellationRefund } from "@/actions/payments";
import { notifyAppointmentCancelled } from "@/lib/notification-triggers";
import z from "zod";

function recordFromFormData(formData) {
  const raw = {};
  for (const [k, val] of formData.entries()) {
    if (typeof val === "string") raw[k] = val;
  }
  return raw;
}

export async function setWorkTime(formData) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  const parsed = setWorkTimeSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const { dayOfWeek, startTime, endTime, mode, clinicId } = parsed.data;
  const clinicScopeKey =
    mode === "OFFLINE" && clinicId ? clinicId : "global";

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });

    if (!doctor) {
      return fail("NOT_FOUND");
    }

    if (mode === "OFFLINE") {
      if (!clinicId) {
        return fail("VALIDATION_ERROR", "validation.clinicRequired");
      }
      const clinic = await db.clinic.findFirst({
        where: { id: clinicId, doctorId: doctor.id, isActive: true },
      });
      if (!clinic) {
        return fail("VALIDATION_ERROR", "validation.invalidClinicId");
      }
    }

    const workTime = await db.workTime.upsert({
      where: {
        doctorId_dayOfWeek_mode_clinicScopeKey: {
          doctorId: doctor.id,
          dayOfWeek,
          mode,
          clinicScopeKey,
        },
      },
      create: {
        doctorId: doctor.id,
        dayOfWeek,
        startTime,
        endTime,
        isActive: true,
        mode,
        clinicScopeKey,
        clinicId: mode === "OFFLINE" ? clinicId : null,
      },
      update: {
        startTime,
        endTime,
        isActive: true,
        mode,
        clinicId: mode === "OFFLINE" ? clinicId : null,
      },
    });

    revalidatePath("/doctors");
    return ok({ workTime });
  } catch (error) {
    console.error("setWorkTime:", error);
    return fail("SAVE_FAILED");
  }
}

export async function getWorkTimes(doctorIdParam, modeParam) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });

    if (!doctor) {
      return fail("NOT_FOUND");
    }

    const targetId =
      doctorIdParam && String(doctorIdParam).trim()
        ? String(doctorIdParam).trim()
        : doctor.id;

    const idCheck = z.string().uuid().safeParse(targetId);
    if (!idCheck.success) {
      return fail("VALIDATION_ERROR");
    }

    if (targetId !== doctor.id) {
      return fail("FORBIDDEN");
    }

    const modeCheck = z.enum(["ONLINE", "OFFLINE"]).optional().safeParse(modeParam);
    const modeFilter = modeCheck.success ? modeCheck.data : undefined;

    const workTimes = await db.workTime.findMany({
      where: {
        doctorId: doctor.id,
        isActive: true,
        ...(modeFilter ? { mode: modeFilter } : {}),
      },
      orderBy: [{ dayOfWeek: "asc" }, { mode: "asc" }],
    });

    return ok({ workTimes });
  } catch (error) {
    console.error("getWorkTimes:", error);
    return fail("FETCH_FAILED");
  }
}

export async function removeWorkTime(formData) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  const parsed = workTimeIdSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const { workTimeId } = parsed.data;

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });

    if (!doctor) {
      return fail("NOT_FOUND");
    }

    const result = await db.workTime.updateMany({
      where: { id: workTimeId, doctorId: doctor.id },
      data: { isActive: false },
    });

    if (result.count === 0) {
      return fail("NOT_FOUND");
    }

    revalidatePath("/doctors");
    return ok({});
  } catch (error) {
    console.error("removeWorkTime:", error);
    return fail("REMOVE_FAILED");
  }
}

export async function getSystemConfig(key) {
  const parsed = systemConfigKeySchema.safeParse({ key });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  try {
    const row = await db.systemConfig.findUnique({
      where: { key: parsed.data.key },
    });
    if (!row) {
      return fail("NOT_FOUND");
    }
    return ok({
      key: row.key,
      value: row.value,
      description: row.description,
    });
  } catch (error) {
    console.error("getSystemConfig:", error);
    return fail("FETCH_FAILED");
  }
}

export async function updateSystemConfig(formData) {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) {
    return fail("FORBIDDEN");
  }

  const parsed = updateSystemConfigSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const { key, value } = parsed.data;

  try {
    await db.systemConfig.upsert({
      where: { key },
      create: {
        key,
        value,
        description:
          key === "slot_duration"
            ? "Appointment slot length in minutes"
            : null,
      },
      update: { value },
    });

    revalidatePath("/admin");
    revalidatePath("/doctors");
    return ok({});
  } catch (error) {
    console.error("updateSystemConfig:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function updateDoctorWorkTimeZone(formData) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  const parsed = workTimeZoneSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const { workTimeZone } = parsed.data;

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });

    if (!doctor) {
      return fail("NOT_FOUND");
    }

    await db.user.update({
      where: { id: doctor.id },
      data: { workTimeZone },
    });

    revalidatePath("/doctors");
    return ok({});
  } catch (error) {
    console.error("updateDoctorWorkTimeZone:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function updateDoctorProfile(formData) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  const parsed = doctorProfileSettingsSchema.safeParse(
    recordFromFormData(formData)
  );
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const data = parsed.data;
  const legacyClinic = {
    clinicGovernorate: data.clinicGovernorateEn,
    clinicArea: data.clinicAreaEn,
    clinicAddress: data.clinicAddressEn,
    clinicBuildingInfo: data.clinicBuildingInfoEn ?? null,
  };
  const practiceAddress = buildPracticeAddressFromClinic({
    clinicBuildingInfo: legacyClinic.clinicBuildingInfo,
    clinicAddress: data.clinicAddressEn,
    clinicArea: data.clinicAreaEn,
    clinicGovernorate: data.clinicGovernorateEn,
  });

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });

    if (!doctor) {
      return fail("NOT_FOUND");
    }

    await db.user.update({
      where: { id: doctor.id },
      data: {
        name: data.nameEn,
        nameEn: data.nameEn,
        nameAr: data.nameAr,
        description: data.descriptionEn,
        descriptionEn: data.descriptionEn,
        descriptionAr: data.descriptionAr,
        onlineConsultationPriceEgp: data.onlineConsultationPriceEgp,
        clinicConsultationPriceEgp: data.clinicConsultationPriceEgp,
        followUpPriceEgp: data.followUpPriceEgp ?? null,
        consultationDurationMinutes: data.consultationDurationMinutes,
        currency: "EGP",
        clinicGovernorate: legacyClinic.clinicGovernorate,
        clinicGovernorateEn: data.clinicGovernorateEn,
        clinicGovernorateAr: data.clinicGovernorateAr,
        clinicArea: legacyClinic.clinicArea,
        clinicAreaEn: data.clinicAreaEn,
        clinicAreaAr: data.clinicAreaAr,
        clinicAddress: legacyClinic.clinicAddress,
        clinicAddressEn: data.clinicAddressEn,
        clinicAddressAr: data.clinicAddressAr,
        clinicGoogleMapsUrl: data.clinicGoogleMapsUrl,
        clinicPhone: data.clinicPhone,
        clinicBuildingInfo: legacyClinic.clinicBuildingInfo,
        clinicBuildingInfoEn: data.clinicBuildingInfoEn,
        clinicBuildingInfoAr: data.clinicBuildingInfoAr,
        servicesOffered: data.servicesOfferedEn,
        servicesOfferedEn: data.servicesOfferedEn,
        servicesOfferedAr: data.servicesOfferedAr,
        education: data.educationEn,
        educationEn: data.educationEn,
        educationAr: data.educationAr,
        languages: data.languagesEn,
        languagesEn: data.languagesEn,
        languagesAr: data.languagesAr,
        cancellationPolicy: data.cancellationPolicyEn,
        cancellationPolicyEn: data.cancellationPolicyEn,
        cancellationPolicyAr: data.cancellationPolicyAr,
        practiceAddress,
      },
    });

    await db.clinic.updateMany({
      where: { doctorId: doctor.id },
      data: {
        name: data.nameEn,
        nameEn: data.nameEn,
        nameAr: data.nameAr || null,
      },
    });

    const primaryClinic = await db.clinic.findFirst({
      where: { doctorId: doctor.id, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (primaryClinic) {
      await db.clinic.update({
        where: { id: primaryClinic.id },
        data: {
          governorate: data.clinicGovernorateEn,
          governorateEn: data.clinicGovernorateEn,
          governorateAr: data.clinicGovernorateAr,
          area: data.clinicAreaEn,
          areaEn: data.clinicAreaEn,
          areaAr: data.clinicAreaAr,
          address: data.clinicAddressEn,
          addressEn: data.clinicAddressEn,
          addressAr: data.clinicAddressAr,
          buildingInfo: data.clinicBuildingInfoEn,
          buildingInfoEn: data.clinicBuildingInfoEn,
          buildingInfoAr: data.clinicBuildingInfoAr,
          phone: data.clinicPhone,
          googleMapsUrl: data.clinicGoogleMapsUrl,
          consultationPriceEgp: data.clinicConsultationPriceEgp,
        },
      });
    }

    revalidatePath("/doctors");
    if (doctor.specialty && doctor.id) {
      revalidatePath(
        `/doctors/${encodeURIComponent(doctor.specialty)}/${doctor.id}`
      );
    }
    return ok({});
  } catch (error) {
    console.error("updateDoctorProfile:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function updateDoctorPracticeAddress(formData) {
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  const parsed = practiceAddressSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "validation.invalid";
    return fail("VALIDATION_ERROR", msg);
  }

  const { practiceAddress } = parsed.data;

  try {
    const doctor = await db.user.findUnique({
      where: { clerkUserId: userId, role: "DOCTOR" },
    });

    if (!doctor) {
      return fail("NOT_FOUND");
    }

    await db.user.update({
      where: { id: doctor.id },
      data: { practiceAddress },
    });

    revalidatePath("/doctors");
    return ok({ practiceAddress });
  } catch (error) {
    console.error("updateDoctorPracticeAddress:", error);
    return fail("UPDATE_FAILED");
  }
}

const doctorAppointmentInclude = {
  patient: {
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true,
    },
  },
  visitSummary: true,
};

/**
 * Active (SCHEDULED/CONFIRMED) and history (COMPLETED/CANCELLED) for doctor dashboard.
 */
export async function getDoctorAppointments() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const doctor = await db.user.findUnique({
      where: {
        clerkUserId: userId,
        role: "DOCTOR",
      },
    });

    if (!doctor) {
      throw new Error("Doctor not found");
    }

    const { serializePatientAppointment } = await import(
      "@/lib/patient-appointments"
    );

    const [activeRows, historyRows] = await Promise.all([
      db.appointment.findMany({
        where: {
          doctorId: doctor.id,
          status: { in: ["SCHEDULED", "CONFIRMED"] },
        },
        include: doctorAppointmentInclude,
        orderBy: { startTime: "asc" },
      }),
      db.appointment.findMany({
        where: {
          doctorId: doctor.id,
          status: { in: ["COMPLETED", "CANCELLED"] },
        },
        include: doctorAppointmentInclude,
        orderBy: { startTime: "desc" },
      }),
    ]);

    const activeAppointments = activeRows.map((a) =>
      serializePatientAppointment(a, "DOCTOR")
    );
    const historyAppointments = historyRows.map((a) =>
      serializePatientAppointment(a, "DOCTOR")
    );

    return { activeAppointments, historyAppointments };
  } catch (error) {
    throw new Error("Failed to fetch appointments " + error.message);
  }
}

/**
 * Cancel an appointment (can be done by both doctor and patient)
 */
export async function cancelAppointment(formData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const appointmentId = formData.get("appointmentId");

    if (!appointmentId) {
      throw new Error("Appointment ID is required");
    }

    // Find the appointment with both patient and doctor details
    const appointment = await db.appointment.findUnique({
      where: {
        id: appointmentId,
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Verify the user is either the doctor or the patient for this appointment
    if (appointment.doctorId !== user.id && appointment.patientId !== user.id) {
      throw new Error("You are not authorized to cancel this appointment");
    }

    const cancelledBy =
      appointment.doctorId === user.id ? "doctor" : "patient";

    await db.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
    });

    const refundResult = await processCancellationRefund(
      { ...appointment, status: "CANCELLED" },
      cancelledBy,
      user.id
    );

    const updatedAppt = await db.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true, patient: true },
    });

    try {
      await notifyAppointmentCancelled(updatedAppt ?? appointment, {
        cancelledBy,
        refundApplied: Boolean(refundResult?.applied),
        refundAmountEgp: refundResult?.calc?.refundAmountEgp ?? 0,
      });
    } catch (e) {
      console.error("notifyAppointmentCancelled:", e);
    }
    revalidatePath("/notifications");

    // Determine which path to revalidate based on user role
    if (user.role === "DOCTOR") {
      revalidatePath("/doctor");
    } else if (user.role === "PATIENT") {
      revalidatePath("/appointments");
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to cancel appointment:", error);
    throw new Error("Failed to cancel appointment: " + error.message);
  }
}

/**
 * Add notes to an appointment
 */
export async function addAppointmentNotes(formData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const doctor = await db.user.findUnique({
      where: {
        clerkUserId: userId,
        role: "DOCTOR",
      },
    });

    if (!doctor) {
      throw new Error("Doctor not found");
    }

    const appointmentId = formData.get("appointmentId");
    const notes = formData.get("notes");

    if (!appointmentId || !notes) {
      throw new Error("Appointment ID and notes are required");
    }

    // Verify the appointment belongs to this doctor
    const appointment = await db.appointment.findUnique({
      where: {
        id: appointmentId,
        doctorId: doctor.id,
      },
    });

    if (!appointment) {
      throw new Error("Appointment not found");
    }

    // Update the appointment notes
    const updatedAppointment = await db.appointment.update({
      where: {
        id: appointmentId,
      },
      data: {
        notes,
      },
    });

    revalidatePath("/doctor");
    return { success: true, appointment: updatedAppointment };
  } catch (error) {
    console.error("Failed to add appointment notes:", error);
    throw new Error("Failed to update notes: " + error.message);
  }
}

/**
 * Mark appointment completed (delegates to appointment-completion module).
 */
export async function markAppointmentCompleted(formData) {
  const { markAppointmentCompleted: markComplete } = await import(
    "@/actions/appointment-completion"
  );
  return markComplete(formData);
}

/**
 * Client-safe refetch for doctor dashboard after completion actions.
 */
export async function fetchDoctorAppointments() {
  const { unstable_noStore: noStore } = await import("next/cache");
  noStore();
  const { ok, fail } = await import("@/lib/action-result");
  const { userId } = await auth();
  if (!userId) return fail("UNAUTHORIZED");

  try {
    const result = await getDoctorAppointments();
    return ok({
      activeAppointments: result.activeAppointments ?? [],
      historyAppointments: result.historyAppointments ?? [],
    });
  } catch (error) {
    return fail("FETCH_FAILED");
  }
}
