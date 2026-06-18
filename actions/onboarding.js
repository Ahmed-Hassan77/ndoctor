"use server";

import { db } from "@/lib/prisma";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  clerkProfileFromUser,
  clerkProfilePatch,
  hasClerkProfilePatch,
} from "@/lib/clerk-profile-sync";
import { doctorOnboardingSchema } from "@/lib/schema";
import { buildPracticeAddressFromClinic } from "@/lib/clinic-location";
import { OTHER_SPECIALTY } from "@/lib/specialities";
import {
  DEFAULT_CLINIC_PRICE_EGP,
  DEFAULT_CONSULTATION_DURATION_MINUTES,
  DEFAULT_ONLINE_PRICE_EGP,
} from "@/lib/pricing";

function recordFromFormData(formData) {
  const raw = {};
  for (const [key, val] of formData.entries()) {
    if (typeof val === "string") raw[key] = val;
  }
  return raw;
}

function clinicLegacyFromUserBilingual(data) {
  return {
    clinicGovernorate: data.clinicGovernorateEn,
    clinicArea: data.clinicAreaEn,
    clinicAddress: data.clinicAddressEn,
    clinicBuildingInfo: data.clinicBuildingInfoEn ?? null,
  };
}

/**
 * Sets the user's role and related information
 */
export async function setUserRole(formData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User not found in database");

  const role = formData.get("role");

  if (!role || !["PATIENT", "DOCTOR"].includes(role)) {
    throw new Error("Invalid role selection");
  }

  try {
    if (role === "PATIENT") {
      await db.user.update({
        where: { clerkUserId: userId },
        data: { role: "PATIENT" },
      });

      revalidatePath("/");
      return { success: true, redirect: "/doctors" };
    }

    if (role === "DOCTOR") {
      const raw = recordFromFormData(formData);
      const parsed = doctorOnboardingSchema.safeParse({
        specialty: raw.specialty,
        specialtyOtherEn: raw.specialtyOtherEn,
        specialtyOtherAr: raw.specialtyOtherAr,
        nameEn: raw.nameEn,
        nameAr: raw.nameAr,
        descriptionEn: raw.descriptionEn,
        descriptionAr: raw.descriptionAr,
        experience: raw.experience != null ? Number(raw.experience) : undefined,
        credentialUrl: raw.credentialUrl,
        onlineConsultationPriceEgp: raw.onlineConsultationPriceEgp,
        clinicConsultationPriceEgp: raw.clinicConsultationPriceEgp,
        followUpPriceEgp: raw.followUpPriceEgp,
        consultationDurationMinutes: raw.consultationDurationMinutes,
        clinicGovernorateEn: raw.clinicGovernorateEn,
        clinicGovernorateAr: raw.clinicGovernorateAr,
        clinicAreaEn: raw.clinicAreaEn,
        clinicAreaAr: raw.clinicAreaAr,
        clinicAddressEn: raw.clinicAddressEn,
        clinicAddressAr: raw.clinicAddressAr,
        clinicGoogleMapsUrl: raw.clinicGoogleMapsUrl,
        clinicPhone: raw.clinicPhone,
        clinicBuildingInfoEn: raw.clinicBuildingInfoEn,
        clinicBuildingInfoAr: raw.clinicBuildingInfoAr,
        servicesOfferedEn: raw.servicesOfferedEn,
        servicesOfferedAr: raw.servicesOfferedAr,
        educationEn: raw.educationEn,
        educationAr: raw.educationAr,
        languagesEn: raw.languagesEn,
        languagesAr: raw.languagesAr,
        cancellationPolicyEn: raw.cancellationPolicyEn,
        cancellationPolicyAr: raw.cancellationPolicyAr,
      });

      if (!parsed.success) {
        const msg =
          parsed.error.issues[0]?.message ?? "validation.invalid";
        throw new Error(msg);
      }

      const data = parsed.data;
      const isOther = data.specialty === OTHER_SPECIALTY;
      const specialty = isOther
        ? data.specialtyOtherEn.trim()
        : data.specialty;
      const specialtyAr = isOther ? data.specialtyOtherAr.trim() : null;
      const legacyClinic = clinicLegacyFromUserBilingual(data);
      const practiceAddress = buildPracticeAddressFromClinic({
        clinicBuildingInfo: legacyClinic.clinicBuildingInfo,
        clinicAddress: data.clinicAddressEn,
        clinicArea: data.clinicAreaEn,
        clinicGovernorate: data.clinicGovernorateEn,
      });

      const updatedDoctor = await db.user.update({
        where: { clerkUserId: userId },
        data: {
          role: "DOCTOR",
          name: data.nameEn,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
          specialty,
          specialtyAr,
          experience: data.experience,
          credentialUrl: data.credentialUrl,
          description: data.descriptionEn,
          descriptionEn: data.descriptionEn,
          descriptionAr: data.descriptionAr,
          verificationStatus: "PENDING",
          onlineConsultationPriceEgp:
            data.onlineConsultationPriceEgp ?? DEFAULT_ONLINE_PRICE_EGP,
          clinicConsultationPriceEgp:
            data.clinicConsultationPriceEgp ?? DEFAULT_CLINIC_PRICE_EGP,
          followUpPriceEgp: data.followUpPriceEgp ?? null,
          consultationDurationMinutes:
            data.consultationDurationMinutes ??
            DEFAULT_CONSULTATION_DURATION_MINUTES,
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

      await db.clinic.create({
        data: {
          doctorId: updatedDoctor.id,
          name: data.nameEn,
          nameEn: data.nameEn,
          nameAr: data.nameAr,
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
          consultationPriceEgp:
            data.clinicConsultationPriceEgp ?? DEFAULT_CLINIC_PRICE_EGP,
          isActive: true,
        },
      });

      revalidatePath("/");
      return { success: true, redirect: "/doctor/verification" };
    }
  } catch (error) {
    console.error("Failed to set user role:", error);
    throw error;
  }
}

/**
 * Gets the current user's complete profile information (synced from Clerk).
 */
export async function getCurrentUser() {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return null;
    }

    let clerkUser;
    try {
      clerkUser = await currentUser();
    } catch (error) {
      console.warn(
        "getCurrentUser: Clerk API unavailable:",
        error?.errors?.[0]?.message ?? error?.message
      );
      return user;
    }

    if (!clerkUser) {
      return user;
    }

    const clerkProfile = clerkProfileFromUser(clerkUser);
    const patch = clerkProfilePatch(user, clerkProfile);

    if (!hasClerkProfilePatch(patch)) {
      return user;
    }

    return db.user.update({
      where: { id: user.id },
      data: patch,
    });
  } catch (error) {
    console.error("Failed to get user information:", error);
    return null;
  }
}
