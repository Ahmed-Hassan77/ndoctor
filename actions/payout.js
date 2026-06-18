"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import {
  summarizeDoctorEarnings,
  calculateAvailablePayoutEgp,
  calculateDoctorNetEgp,
  calculatePlatformFeeEgp,
} from "@/lib/doctor-earnings";
import { DEFAULT_CURRENCY } from "@/lib/pricing";
import { notifyPayoutRequested } from "@/lib/notification-triggers";

/**
 * Request payout for available online net earnings (EGP).
 */
export async function requestPayout(formData) {
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

    const payoutMethod = String(formData.get("payoutMethod") ?? "bank_transfer");
    const payoutAccount = String(formData.get("payoutAccount") ?? "").trim();
    const paypalEmail = String(formData.get("paypalEmail") ?? payoutAccount).trim();

    if (!payoutAccount && !paypalEmail) {
      throw new Error("Payout account details are required");
    }

    const existingPendingPayout = await db.payout.findFirst({
      where: {
        doctorId: doctor.id,
        status: "PROCESSING",
      },
    });

    if (existingPendingPayout) {
      throw new Error(
        "You already have a pending payout request. Please wait for it to be processed."
      );
    }

    const completedAppointments = await db.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: "COMPLETED",
      },
    });

    const summary = summarizeDoctorEarnings(completedAppointments);
    const payouts = await db.payout.findMany({
      where: { doctorId: doctor.id },
    });

    const availableEgp = calculateAvailablePayoutEgp(
      summary.onlineNetAvailableEgp,
      payouts
    );

    if (availableEgp <= 0) {
      throw new Error(
        "No online earnings available for payout. Complete paid online visits first."
      );
    }

    const grossAmountEgp = summary.onlinePaidGrossEgp;
    const platformFeeEgp = calculatePlatformFeeEgp(grossAmountEgp);
    const netAmountEgp = availableEgp;

    const payout = await db.payout.create({
      data: {
        doctorId: doctor.id,
        amount: netAmountEgp,
        credits: 0,
        platformFee: platformFeeEgp,
        netAmount: netAmountEgp,
        grossAmountEgp,
        platformFeeEgp,
        netAmountEgp,
        currency: DEFAULT_CURRENCY,
        payoutMethod,
        payoutAccount: payoutAccount || paypalEmail,
        paypalEmail: paypalEmail || payoutAccount,
        status: "PROCESSING",
      },
    });

    revalidatePath("/doctor");
    revalidatePath("/notifications");
    try {
      await notifyPayoutRequested(payout, doctor);
    } catch (e) {
      console.error("notifyPayoutRequested:", e);
    }
    return { success: true, payout };
  } catch (error) {
    console.error("Failed to request payout:", error);
    throw new Error("Failed to request payout: " + error.message);
  }
}

export async function getDoctorPayouts() {
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

    const payouts = await db.payout.findMany({
      where: {
        doctorId: doctor.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return { payouts };
  } catch (error) {
    throw new Error("Failed to fetch payouts: " + error.message);
  }
}

export async function getDoctorEarnings() {
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

    const completedAppointments = await db.appointment.findMany({
      where: {
        doctorId: doctor.id,
        status: "COMPLETED",
      },
    });

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const thisMonthAppointments = completedAppointments.filter(
      (appointment) => new Date(appointment.createdAt) >= currentMonth
    );

    const summary = summarizeDoctorEarnings(completedAppointments);
    const thisMonthSummary = summarizeDoctorEarnings(thisMonthAppointments);

    const payouts = await db.payout.findMany({
      where: { doctorId: doctor.id },
    });

    const availablePayoutEgp = calculateAvailablePayoutEgp(
      summary.onlineNetAvailableEgp,
      payouts
    );

    const pendingPayout = payouts.find((p) => p.status === "PROCESSING") ?? null;

    return {
      earnings: {
        ...summary,
        thisMonthOnlineGrossEgp: thisMonthSummary.onlinePaidGrossEgp,
        thisMonthOnlineNetEgp: thisMonthSummary.onlineNetAvailableEgp,
        completedAppointments: completedAppointments.length,
        availablePayoutEgp,
        pendingPayout,
        currency: DEFAULT_CURRENCY,
      },
    };
  } catch (error) {
    throw new Error("Failed to fetch doctor earnings: " + error.message);
  }
}
