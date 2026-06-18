"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, HeartPulse } from "lucide-react";
import { getAppointmentPatientMedicalProfile } from "@/actions/patient-medical-profile";
import { PatientMedicalProfileDisplay } from "@/components/patient-medical-profile-display";
import { MedicalAttachmentsList } from "@/components/medical-attachments-list";
import { useLocale } from "@/components/locale-provider";
import { translateActionError } from "@/lib/i18n-errors";

export function AppointmentPatientMedicalProfile({
  appointmentId,
  open,
  userRole,
}) {
  const { t, dict } = useLocale();
  const [data, setData] = useState(undefined);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open || userRole !== "DOCTOR" || !appointmentId) {
      return;
    }

    const requestId = ++requestIdRef.current;
    let active = true;

    getAppointmentPatientMedicalProfile(appointmentId).then((res) => {
      if (active && requestId === requestIdRef.current) {
        setData(res);
      }
    });

    return () => {
      active = false;
    };
  }, [open, userRole, appointmentId]);

  const loading = open && userRole === "DOCTOR" && data === undefined;

  if (userRole !== "DOCTOR") return null;

  return (
    <div className="min-w-0 space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <HeartPulse className="h-4 w-4 text-primary shrink-0" />
        {t("patient.patientMedicalProfile")}
      </h4>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("patient.loadingMedicalProfile")}
        </div>
      ) : data?.success === false ? (
        <p className="text-sm text-red-400">
          {translateActionError(dict, data.error) ?? t("patient.couldNotLoad")}
        </p>
      ) : (
        <div className="min-w-0 space-y-4">
          <div className="min-w-0 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/20 p-3">
            <PatientMedicalProfileDisplay
              profile={data?.profile}
              variant="doctor"
            />
          </div>
          <div className="min-w-0 space-y-2">
            <h5 className="text-xs font-medium text-muted-foreground">
              {t("patient.attachments")}
            </h5>
            <MedicalAttachmentsList
              attachments={data?.attachments}
              readOnly
            />
          </div>
        </div>
      )}
    </div>
  );
}
