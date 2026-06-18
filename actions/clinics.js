"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { ok, fail } from "@/lib/action-result";
import { verifyAdmin } from "@/actions/admin";
import { clinicBranchSchema, clinicIdSchema } from "@/lib/schema";
import {
  clinicToSnapshot,
  formatClinicSummary,
  hasUsableClinicRecord,
  resolveClinicScopeKey,
  clinicLegacyFromBilingual,
  resolveDoctorClinicNames,
} from "@/lib/clinics";
import { buildPracticeAddressFromClinic } from "@/lib/clinic-location";
import z from "zod";

function recordFromFormData(formData) {
  const raw = {};
  for (const [k, val] of formData.entries()) {
    if (typeof val === "string") raw[k] = val;
  }
  return raw;
}

async function listDoctorClinics(doctorId) {
  return db.clinic.findMany({
    where: { doctorId },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
}

function clinicWriteData(data) {
  const legacy = clinicLegacyFromBilingual(data);
  return {
    name: legacy.name,
    nameEn: data.nameEn,
    nameAr: data.nameAr,
    governorate: legacy.governorate,
    governorateEn: data.governorateEn,
    governorateAr: data.governorateAr,
    area: legacy.area,
    areaEn: data.areaEn,
    areaAr: data.areaAr,
    address: legacy.address,
    addressEn: data.addressEn,
    addressAr: data.addressAr,
    buildingInfo: legacy.buildingInfo,
    buildingInfoEn: data.buildingInfoEn ?? null,
    buildingInfoAr: data.buildingInfoAr ?? null,
    phone: data.phone,
    googleMapsUrl: data.googleMapsUrl,
    consultationPriceEgp: data.consultationPriceEgp,
    isActive: data.isActive ?? true,
  };
}

function primaryClinicUserPatch(primary) {
  const legacy = clinicLegacyFromBilingual(primary);
  return {
    clinicGovernorate: legacy.governorate,
    clinicGovernorateEn: primary.governorateEn,
    clinicGovernorateAr: primary.governorateAr,
    clinicArea: legacy.area,
    clinicAreaEn: primary.areaEn,
    clinicAreaAr: primary.areaAr,
    clinicAddress: legacy.address,
    clinicAddressEn: primary.addressEn,
    clinicAddressAr: primary.addressAr,
    clinicBuildingInfo: legacy.buildingInfo,
    clinicBuildingInfoEn: primary.buildingInfoEn,
    clinicBuildingInfoAr: primary.buildingInfoAr,
    clinicPhone: primary.phone,
    clinicGoogleMapsUrl: primary.googleMapsUrl,
    clinicConsultationPriceEgp: primary.consultationPriceEgp,
    practiceAddress: buildPracticeAddressFromClinic({
      clinicBuildingInfo: legacy.buildingInfo,
      clinicAddress: legacy.address,
      clinicArea: legacy.area,
      clinicGovernorate: legacy.governorate,
    }),
  };
}

function primaryClinicNeedsUserSync(doctor, primary) {
  const patch = primaryClinicUserPatch(primary);
  return Object.entries(patch).some(([key, value]) => doctor[key] !== value);
}

async function syncPrimaryClinicToUser(doctor) {
  const primary = await db.clinic.findFirst({
    where: { doctorId: doctor.id, isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!primary || !primaryClinicNeedsUserSync(doctor, primary)) {
    return;
  }
  await db.user.update({
    where: { id: doctor.id },
    data: primaryClinicUserPatch(primary),
  });
}

async function getAuthenticatedDoctor() {
  const { userId } = await auth();
  if (!userId) return null;
  return db.user.findUnique({
    where: { clerkUserId: userId, role: "DOCTOR" },
  });
}

export async function getDoctorClinics(doctorIdParam) {
  const doctor = await getAuthenticatedDoctor();
  if (!doctor) return fail("UNAUTHORIZED");

  const targetId = doctorIdParam?.trim() || doctor.id;
  if (targetId !== doctor.id) return fail("FORBIDDEN");

  try {
    const clinics = await listDoctorClinics(doctor.id);
    return ok({ clinics });
  } catch (error) {
    console.error("getDoctorClinics:", error);
    return fail("FETCH_FAILED");
  }
}

/** Public: active clinics for patient booking */
export async function getPublicDoctorClinics(doctorId) {
  const idCheck = z.string().uuid().safeParse(doctorId);
  if (!idCheck.success) return fail("VALIDATION_ERROR");

  try {
    const clinics = await db.clinic.findMany({
      where: { doctorId, isActive: true },
      orderBy: { createdAt: "asc" },
    });
    const usable = clinics.filter(
      (clinic) =>
        hasUsableClinicRecord(clinic, "en") ||
        hasUsableClinicRecord(clinic, "ar")
    );
    return ok({ clinics: usable });
  } catch (error) {
    console.error("getPublicDoctorClinics:", error);
    return fail("FETCH_FAILED");
  }
}

export async function upsertClinic(formData) {
  const doctor = await getAuthenticatedDoctor();
  if (!doctor) return fail("UNAUTHORIZED");

  const raw = recordFromFormData(formData);
  const clinicId = raw.clinicId?.trim() || undefined;
  const parsed = clinicBranchSchema.safeParse(raw);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "validation.invalid");
  }

  const names = resolveDoctorClinicNames(doctor);
  if (names.nameEn.length < 2) {
    return fail("VALIDATION_ERROR", "validation.nameEnRequired");
  }

  const data = { ...parsed.data, ...names };
  const writeData = clinicWriteData(data);
  if (writeData.consultationPriceEgp == null) {
    writeData.consultationPriceEgp = doctor.clinicConsultationPriceEgp ?? null;
  }

  try {
    let clinic;
    if (clinicId) {
      const existing = await db.clinic.findFirst({
        where: { id: clinicId, doctorId: doctor.id },
      });
      if (!existing) return fail("NOT_FOUND");

      clinic = await db.clinic.update({
        where: { id: clinicId },
        data: writeData,
      });
    } else {
      clinic = await db.clinic.create({
        data: {
          doctorId: doctor.id,
          ...writeData,
        },
      });
    }

    await syncPrimaryClinicToUser(doctor);

    const clinics = await listDoctorClinics(doctor.id);
    revalidatePath("/doctors");
    return ok({ clinic, clinics });
  } catch (error) {
    console.error("upsertClinic:", error);
    return fail("SAVE_FAILED");
  }
}

export async function setClinicActive(formData) {
  const doctor = await getAuthenticatedDoctor();
  if (!doctor) return fail("UNAUTHORIZED");

  const parsed = clinicIdSchema
    .extend({
      isActive: z.preprocess(
        (v) => v === true || v === "true" || v === "1",
        z.boolean()
      ),
    })
    .safeParse(recordFromFormData(formData));

  if (!parsed.success) return fail("VALIDATION_ERROR");

  try {
    const result = await db.clinic.updateMany({
      where: { id: parsed.data.clinicId, doctorId: doctor.id },
      data: { isActive: parsed.data.isActive },
    });
    if (result.count === 0) return fail("NOT_FOUND");

    await syncPrimaryClinicToUser(doctor);

    const clinics = await listDoctorClinics(doctor.id);
    revalidatePath("/doctors");
    return ok({ clinics });
  } catch (error) {
    console.error("setClinicActive:", error);
    return fail("UPDATE_FAILED");
  }
}

export async function deleteClinic(formData) {
  const doctor = await getAuthenticatedDoctor();
  if (!doctor) return fail("UNAUTHORIZED");

  const parsed = clinicIdSchema.safeParse(recordFromFormData(formData));
  if (!parsed.success) return fail("VALIDATION_ERROR");

  try {
    const upcoming = await db.appointment.count({
      where: {
        clinicId: parsed.data.clinicId,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        startTime: { gte: new Date() },
      },
    });
    if (upcoming > 0) {
      return fail("CLINIC_HAS_UPCOMING_APPOINTMENTS");
    }

    const result = await db.clinic.deleteMany({
      where: { id: parsed.data.clinicId, doctorId: doctor.id },
    });
    if (result.count === 0) return fail("NOT_FOUND");

    await syncPrimaryClinicToUser(doctor);

    const clinics = await listDoctorClinics(doctor.id);
    revalidatePath("/doctors");
    return ok({ clinics });
  } catch (error) {
    console.error("deleteClinic:", error);
    return fail("DELETE_FAILED");
  }
}

export async function getClinicForBooking(clinicId, doctorId) {
  if (!clinicId) return null;
  const clinic = await db.clinic.findFirst({
    where: { id: clinicId, doctorId, isActive: true },
  });
  if (
    !clinic ||
    (!hasUsableClinicRecord(clinic, "en") && !hasUsableClinicRecord(clinic, "ar"))
  ) {
    return null;
  }
  return clinic;
}

export { clinicToSnapshot, formatClinicSummary, resolveClinicScopeKey };
