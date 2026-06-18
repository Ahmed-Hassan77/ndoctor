"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { unstable_noStore as noStore } from "next/cache";
import { ok, fail } from "@/lib/action-result";
import { serializePatientAppointment } from "@/lib/patient-appointments";

const appointmentInclude = {
  doctor: {
    select: {
      id: true,
      name: true,
      specialty: true,
      imageUrl: true,
    },
  },
  rating: {
    select: {
      id: true,
      value: true,
      review: true,
      createdAt: true,
    },
  },
  visitSummary: true,
};

/**
 * Get all appointments for the authenticated patient (server page).
 */
export async function getPatientAppointments() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
        role: "PATIENT",
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new Error("Patient not found");
    }

    const appointments = await db.appointment.findMany({
      where: {
        patientId: user.id,
      },
      include: appointmentInclude,
      orderBy: {
        startTime: "asc",
      },
    });

    return { appointments };
  } catch (error) {
    console.error("Failed to get patient appointments:", error);
    return { error: fail("FETCH_FAILED").error };
  }
}

/**
 * Client-safe refetch after reschedule (serialized dates).
 */
export async function fetchPatientAppointments() {
  noStore();
  const { userId } = await auth();
  if (!userId) {
    return fail("UNAUTHORIZED");
  }

  try {
    const user = await db.user.findUnique({
      where: { clerkUserId: userId, role: "PATIENT" },
      select: { id: true },
    });

    if (!user) {
      return fail("NOT_FOUND");
    }

    const appointments = await db.appointment.findMany({
      where: { patientId: user.id },
      include: appointmentInclude,
      orderBy: { startTime: "asc" },
    });

    return ok({
      appointments: appointments.map(serializePatientAppointment),
    });
  } catch (error) {
    console.error("fetchPatientAppointments:", error);
    return fail("FETCH_FAILED");
  }
}
