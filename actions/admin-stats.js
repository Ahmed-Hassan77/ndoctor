"use server";

import { db } from "@/lib/prisma";
import { ok, fail } from "@/lib/action-result";
import { verifyAdmin } from "@/actions/admin";
import {
  summarizeDoctorEarnings,
  isEligibleOfflineCollectedAppointment,
} from "@/lib/doctor-earnings";

export async function getAdminDashboardStats() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) return fail("UNAUTHORIZED");

  const [
    totalPatients,
    totalDoctors,
    verifiedDoctors,
    pendingDoctors,
    appointmentGroups,
    openDisputes,
    openSupportTickets,
    paidOnlineAgg,
    refundedAgg,
    pendingPayouts,
    completedClinic,
  ] = await Promise.all([
    db.user.count({ where: { role: "PATIENT" } }),
    db.user.count({ where: { role: "DOCTOR" } }),
    db.user.count({
      where: { role: "DOCTOR", verificationStatus: "VERIFIED" },
    }),
    db.user.count({
      where: { role: "DOCTOR", verificationStatus: "PENDING" },
    }),
    db.appointment.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    db.appointment.count({
      where: { disputeStatus: "OPEN" },
    }),
    db.supportTicket.count({
      where: { status: { in: ["OPEN", "IN_REVIEW"] } },
    }),
    db.appointment.aggregate({
      where: {
        appointmentMode: "ONLINE",
        paymentStatus: "PAID",
        status: { not: "CANCELLED" },
      },
      _sum: { priceSnapshotEgp: true },
    }),
    db.appointment.aggregate({
      where: {
        refundStatus: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] },
      },
      _sum: { refundAmountEgp: true },
    }),
    db.payout.aggregate({
      where: { status: "PROCESSING" },
      _sum: { netAmountEgp: true, netAmount: true },
    }),
    db.appointment.findMany({
      where: { status: "COMPLETED", appointmentMode: "OFFLINE" },
      select: {
        status: true,
        appointmentMode: true,
        paymentStatus: true,
        priceSnapshotEgp: true,
        clinicPaymentReceivedAt: true,
        refundStatus: true,
      },
    }),
  ]);

  const statusMap = Object.fromEntries(
    appointmentGroups.map((g) => [g.status, g._count._all])
  );

  let offlineCommissionDueEgp = 0;
  for (const appt of completedClinic) {
    if (isEligibleOfflineCollectedAppointment(appt)) {
      const summary = summarizeDoctorEarnings([appt]);
      offlineCommissionDueEgp += summary.offlineCommissionDueEgp;
    }
  }

  const pendingPayoutEgp =
    pendingPayouts._sum.netAmountEgp ??
    Math.round(Number(pendingPayouts._sum.netAmount) || 0);

  return ok({
    stats: {
      totalPatients,
      totalDoctors,
      verifiedDoctors,
      pendingDoctors,
      totalAppointments: appointmentGroups.reduce(
        (s, g) => s + g._count._all,
        0
      ),
      scheduledAppointments:
        (statusMap.SCHEDULED ?? 0) + (statusMap.CONFIRMED ?? 0),
      completedAppointments: statusMap.COMPLETED ?? 0,
      cancelledAppointments: statusMap.CANCELLED ?? 0,
      openDisputes,
      openSupportTickets,
      totalOnlinePaidRevenueEgp: paidOnlineAgg._sum.priceSnapshotEgp ?? 0,
      totalRefundedEgp: refundedAgg._sum.refundAmountEgp ?? 0,
      pendingPayoutsEgp: pendingPayoutEgp,
      offlineCommissionDueEgp,
    },
  });
}
