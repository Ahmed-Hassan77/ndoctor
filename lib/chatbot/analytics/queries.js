import { db } from "@/lib/prisma";
import { withAnalyticsCache, resolveRangeWindow } from "@/lib/chatbot/analytics/cache";

/**
 * Safe read-only analytics — no raw SQL, no PHI beyond aggregated counts.
 * @param {{ range?: string; doctorName?: string }} options
 */
export async function collectAnalyticsSnapshot(options = {}) {
  const range = options.range ?? "month";
  const cacheKey = `snapshot:${range}:${options.doctorName ?? ""}`;

  return withAnalyticsCache(cacheKey, async () => {
    const { from, to, label } = resolveRangeWindow(range);

    const [
      totalPatients,
      totalDoctors,
      verifiedDoctors,
      appointmentsInRange,
      cancelledInRange,
      completedInRange,
      newPatientsInRange,
      newDoctorsInRange,
    ] = await Promise.all([
      db.user.count({ where: { role: "PATIENT", accountStatus: "ACTIVE" } }),
      db.user.count({ where: { role: "DOCTOR" } }),
      db.user.count({
        where: { role: "DOCTOR", verificationStatus: "VERIFIED" },
      }),
      db.appointment.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
      db.appointment.count({
        where: {
          status: "CANCELLED",
          updatedAt: { gte: from, lte: to },
        },
      }),
      db.appointment.count({
        where: {
          status: "COMPLETED",
          startTime: { gte: from, lte: to },
        },
      }),
      db.user.count({
        where: {
          role: "PATIENT",
          createdAt: { gte: from, lte: to },
        },
      }),
      db.user.count({
        where: {
          role: "DOCTOR",
          createdAt: { gte: from, lte: to },
        },
      }),
    ]);

    const specialtyGroups = await db.user.groupBy({
      by: ["specialty"],
      where: {
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
        specialty: { not: null },
      },
      _count: { specialty: true },
      orderBy: { _count: { specialty: "desc" } },
      take: 10,
    });

    const governorateGroups = await db.user.groupBy({
      by: ["clinicGovernorate"],
      where: {
        role: "DOCTOR",
        verificationStatus: "VERIFIED",
        clinicGovernorate: { not: null },
      },
      _count: { clinicGovernorate: true },
      orderBy: { _count: { clinicGovernorate: "desc" } },
      take: 10,
    });

    const appointmentsForHours = await db.appointment.findMany({
      where: { startTime: { gte: from, lte: to } },
      select: { startTime: true },
    });

    const hourBuckets = Array.from({ length: 24 }, () => 0);
    for (const row of appointmentsForHours) {
      const h = new Date(row.startTime).getHours();
      hourBuckets[h] += 1;
    }
    const peakHour = hourBuckets.indexOf(Math.max(...hourBuckets));

    let doctorPerformance = [];
    if (options.doctorName?.trim()) {
      const q = options.doctorName.trim();
      const doctors = await db.user.findMany({
        where: {
          role: "DOCTOR",
          verificationStatus: "VERIFIED",
          name: { contains: q, mode: "insensitive" },
        },
        select: {
          id: true,
          name: true,
          specialty: true,
          averageRating: true,
          totalReviews: true,
          clinicGovernorate: true,
        },
        take: 5,
      });

      const bookingCounts = await db.appointment.groupBy({
        by: ["doctorId"],
        where: {
          doctorId: { in: doctors.map((d) => d.id) },
          startTime: { gte: from, lte: to },
        },
        _count: { id: true },
      });
      const countMap = Object.fromEntries(
        bookingCounts.map((b) => [b.doctorId, b._count.id])
      );

      doctorPerformance = doctors.map((d) => ({
        name: d.name,
        specialty: d.specialty,
        governorate: d.clinicGovernorate,
        averageRating: d.averageRating,
        totalReviews: d.totalReviews,
        bookingsInRange: countMap[d.id] ?? 0,
      }));
    } else {
      const topDoctors = await db.user.findMany({
        where: { role: "DOCTOR", verificationStatus: "VERIFIED" },
        select: {
          id: true,
          name: true,
          specialty: true,
          averageRating: true,
          totalReviews: true,
        },
        orderBy: { averageRating: "desc" },
        take: 8,
      });

      const bookingCounts = await db.appointment.groupBy({
        by: ["doctorId"],
        where: {
          doctorId: { in: topDoctors.map((d) => d.id) },
          startTime: { gte: from, lte: to },
        },
        _count: { id: true },
      });
      const countMap = Object.fromEntries(
        bookingCounts.map((b) => [b.doctorId, b._count.id])
      );

      doctorPerformance = topDoctors.map((d) => ({
        name: d.name,
        specialty: d.specialty,
        averageRating: d.averageRating,
        totalReviews: d.totalReviews,
        bookingsInRange: countMap[d.id] ?? 0,
      }));
    }

    const cancelRate =
      appointmentsInRange > 0
        ? Number(((cancelledInRange / appointmentsInRange) * 100).toFixed(1))
        : 0;

    return {
      rangeLabel: label,
      period: { from: from.toISOString(), to: to.toISOString() },
      metrics: {
        totalPatients,
        totalDoctors,
        verifiedDoctors,
        appointmentsInRange,
        cancelledInRange,
        completedInRange,
        cancellationRatePercent: cancelRate,
        newPatientsInRange,
        newDoctorsInRange,
        peakBookingHour: peakHour >= 0 ? peakHour : null,
      },
      topSpecialties: specialtyGroups.map((g) => ({
        specialty: g.specialty,
        count: g._count.specialty,
      })),
      topGovernorates: governorateGroups.map((g) => ({
        governorate: g.clinicGovernorate,
        count: g._count.clinicGovernorate,
      })),
      doctorPerformance,
      hourlyDistribution: hourBuckets,
    };
  });
}

/**
 * @param {string} question
 */
export function inferAnalyticsIntent(question) {
  const q = question.toLowerCase();
  let range = "month";
  if (/this week|last 7|week/i.test(q) || /هذا الأسبوع|الأسبوع/.test(question)) {
    range = "week";
  } else if (/today|اليوم/.test(q)) {
    range = "today";
  }

  let doctorName = null;
  const drMatch =
    question.match(/dr\.?\s+([a-z\u0600-\u06FF]+)/i) ||
    question.match(/doctor\s+([a-z\u0600-\u06FF]+)/i) ||
    question.match(/(?:الدكتور|د\.)\s*([^\s،,.]+)/);
  if (drMatch) {
    doctorName = drMatch[1];
  }

  return { range, doctorName };
}
