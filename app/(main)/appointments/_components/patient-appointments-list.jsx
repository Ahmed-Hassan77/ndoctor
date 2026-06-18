"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { AppointmentCard } from "@/components/appointment-card";
import { fetchPatientAppointments } from "@/actions/patient";
import { mergePatientAppointment } from "@/lib/patient-appointments";

export function PatientAppointmentsList({ initialAppointments, dir = "ltr" }) {
  const router = useRouter();
  const [appointments, setAppointments] = useState(initialAppointments);

  const refetchAppointments = useCallback(async () => {
    const res = await fetchPatientAppointments();
    if (res?.success === true && Array.isArray(res.appointments)) {
      setAppointments(res.appointments);
      return res.appointments;
    }
    return null;
  }, []);

  const handleAppointmentUpdated = useCallback((updated) => {
    if (!updated?.id) return;
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === updated.id ? mergePatientAppointment(a, updated) : a
      )
    );
  }, []);

  const handleRescheduled = useCallback(
    async (updated) => {
      if (updated?.id) {
        setAppointments((prev) =>
          prev.map((a) =>
            a.id === updated.id ? mergePatientAppointment(a, updated) : a
          )
        );
      }
      await refetchAppointments();
      router.refresh();
    },
    [refetchAppointments, router]
  );

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => (
        <AppointmentCard
          key={`${appointment.id}-${appointment.updatedAt ?? appointment.startTime}`}
          appointment={appointment}
          userRole="PATIENT"
          dir={dir}
          refetchAppointments={refetchAppointments}
          onAppointmentUpdated={handleAppointmentUpdated}
          onRescheduled={handleRescheduled}
        />
      ))}
    </div>
  );
}
