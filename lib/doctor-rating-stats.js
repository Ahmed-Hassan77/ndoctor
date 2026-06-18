import { db } from "@/lib/prisma";

const VISIBLE_WHERE = { moderationStatus: "VISIBLE" };

/**
 * Recomputes doctor averageRating and totalReviews from visible reviews only.
 * @param {string} doctorId
 * @param {import("@prisma/client").Prisma.TransactionClient} [tx]
 */
export async function recalculateDoctorRatingStats(doctorId, tx) {
  const client = tx ?? db;
  const agg = await client.rating.aggregate({
    where: { doctorId, ...VISIBLE_WHERE },
    _avg: { value: true },
    _count: { _all: true },
  });

  const averageRating = agg._avg.value != null ? Number(agg._avg.value) : 0;
  const totalReviews = agg._count._all;

  await client.user.update({
    where: { id: doctorId },
    data: { averageRating, totalReviews },
  });

  return { averageRating, totalReviews };
}
