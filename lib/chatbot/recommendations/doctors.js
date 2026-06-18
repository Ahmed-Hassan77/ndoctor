import { db } from "@/lib/prisma";
import { doctorSupportsMode } from "@/lib/doctor-availability";
import { resolveClinicPriceEgp, resolveOnlinePriceEgp } from "@/lib/pricing";

const DOCTOR_SELECT = {
  id: true,
  name: true,
  specialty: true,
  imageUrl: true,
  averageRating: true,
  totalReviews: true,
  clinicGovernorate: true,
  clinicArea: true,
  onlineConsultationPriceEgp: true,
  clinicConsultationPriceEgp: true,
  verificationStatus: true,
  workTimes: {
    where: { isActive: true },
    select: { mode: true, dayOfWeek: true, startTime: true, endTime: true },
  },
  clinics: {
    where: { isActive: true },
    select: { id: true, name: true, governorate: true, area: true },
  },
};

/**
 * @param {{ specialties?: string[]; governorate?: string; limit?: number }} params
 */
export async function recommendDoctors(params = {}) {
  const { specialties = [], governorate, limit = 5 } = params;
  const safeLimit = Math.max(0, Math.min(limit, 20));

  if (safeLimit === 0) {
    return [];
  }

  /** @type {import('@prisma/client').Prisma.UserWhereInput} */
  const where = {
    role: "DOCTOR",
    verificationStatus: "VERIFIED",
  };

  if (specialties.length > 0) {
    where.specialty = { in: specialties };
  }
  if (governorate) {
    where.clinicGovernorate = { contains: governorate, mode: "insensitive" };
  }

  const doctors = await db.user.findMany({
    where,
    select: DOCTOR_SELECT,
    take: Math.min(safeLimit * 3, 30),
    orderBy: [{ averageRating: "desc" }, { totalReviews: "desc" }],
  });

  if (!doctors.length) {
    return [];
  }

  return doctors
    .map((doctor) => {
      const supportsOnline = doctorSupportsMode(doctor, doctor.workTimes, "ONLINE");
      const supportsClinic = doctorSupportsMode(doctor, doctor.workTimes, "OFFLINE");
      const specialtyMatch = specialties.length
        ? specialties.some(
            (s) => s.toLowerCase() === (doctor.specialty ?? "").toLowerCase()
          )
          ? 2
          : 0
        : 1;

      const score =
        specialtyMatch * 10 +
        (doctor.averageRating ?? 0) * 2 +
        Math.min(doctor.totalReviews ?? 0, 50) * 0.05 +
        (supportsOnline ? 1 : 0) +
        (supportsClinic ? 1 : 0) +
        (doctor.clinics?.length ? 0.5 : 0);

      const slug = encodeURIComponent(doctor.specialty || "General");
      return {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        imageUrl: doctor.imageUrl,
        averageRating: doctor.averageRating,
        totalReviews: doctor.totalReviews,
        governorate: doctor.clinicGovernorate,
        area: doctor.clinicArea,
        supportsOnline,
        supportsClinic,
        onlinePriceEgp: resolveOnlinePriceEgp(doctor),
        clinicPriceEgp: resolveClinicPriceEgp(doctor),
        bookingPath: `/doctors/${slug}/${doctor.id}`,
        score,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, safeLimit);
}

/**
 * @param {string} urgency
 * @param {string[]} specialties
 * @param {string} [governorate]
 */
export async function getRecommendationsForTriage(urgency, specialties, governorate) {
  if (urgency === "emergency") {
    return { emergency: true, doctors: [] };
  }
  const doctors = await recommendDoctors({ specialties, governorate, limit: 5 });
  return { emergency: false, doctors };
}
