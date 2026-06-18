import { db } from "@/lib/prisma";

/**
 * @param {string} role
 * @param {object | null} user
 */
export async function buildRoleContextBlock(role, user) {
  if (!user) {
    return "Authenticated user: none (guest).";
  }

  if (role === "PATIENT") {
    const upcoming = await db.appointment.count({
      where: {
        patientId: user.id,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        startTime: { gte: new Date() },
      },
    });
    return [
      `Authenticated patient: ${user.name ?? "Patient"}.`,
      user.allergies ? `Known allergies (profile): ${user.allergies}` : null,
      user.chronicConditions
        ? `Chronic conditions (profile): ${user.chronicConditions}`
        : null,
      user.currentMedications
        ? `Current medications (profile): ${user.currentMedications}`
        : null,
      `Upcoming appointments: ${upcoming}.`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (role === "DOCTOR") {
    const upcoming = await db.appointment.count({
      where: {
        doctorId: user.id,
        status: { in: ["SCHEDULED", "CONFIRMED"] },
        startTime: { gte: new Date() },
      },
    });
    return [
      `Authenticated doctor: ${user.name ?? "Doctor"}.`,
      user.specialty ? `Specialty: ${user.specialty}.` : null,
      `Verification: ${user.verificationStatus ?? "UNKNOWN"}.`,
      `Upcoming appointments: ${upcoming}.`,
      "Only summarize patients explicitly referenced in this conversation or authorized appointment context.",
    ]
      .filter(Boolean)
      .join("\n");
  }

  if (role === "ADMIN") {
    const [patients, doctors, appointments, cancelled] = await Promise.all([
      db.user.count({ where: { role: "PATIENT", accountStatus: "ACTIVE" } }),
      db.user.count({
        where: { role: "DOCTOR", verificationStatus: "VERIFIED" },
      }),
      db.appointment.count(),
      db.appointment.count({ where: { status: "CANCELLED" } }),
    ]);

    const specialtyGroups = await db.user.groupBy({
      by: ["specialty"],
      where: { role: "DOCTOR", verificationStatus: "VERIFIED" },
      _count: { specialty: true },
      orderBy: { _count: { specialty: "desc" } },
      take: 8,
    });

    const govGroups = await db.user.groupBy({
      by: ["clinicGovernorate"],
      where: {
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
        clinicGovernorate: { not: null },
      },
      _count: { clinicGovernorate: true },
      orderBy: { _count: { clinicGovernorate: "desc" } },
      take: 8,
    });

    const cancelRate =
      appointments > 0 ? ((cancelled / appointments) * 100).toFixed(1) : "0";

    return [
      "Admin analytics snapshot (aggregated only):",
      `Active patients: ${patients}`,
      `Verified doctors: ${doctors}`,
      `Total appointments: ${appointments}`,
      `Cancellation rate: ${cancelRate}%`,
      `Top specialties: ${specialtyGroups.map((g) => `${g.specialty ?? "Unknown"} (${g._count.specialty})`).join(", ")}`,
      `Top governorates: ${govGroups.map((g) => `${g.clinicGovernorate} (${g._count.clinicGovernorate})`).join(", ")}`,
    ].join("\n");
  }

  return `Authenticated user role: ${role}.`;
}
