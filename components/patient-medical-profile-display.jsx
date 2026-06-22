"use client";

import { format } from "date-fns";
import { useLocale } from "@/components/locale-provider";

function ProfileField({ label, value }) {
  if (!value || !String(value).trim()) return null;
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="break-words whitespace-pre-line text-sm text-foreground [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}

export function PatientMedicalProfileDisplay({ profile, variant = "doctor" }) {
  const { t, labels } = useLocale();

  if (!profile?.isComplete) {
    return (
      <p className="text-sm text-muted-foreground italic">
        {t("patient.patientNotCompleted")}
      </p>
    );
  }

  const dobLine =
    profile.age != null
      ? t("onboarding.yearsCount", { count: profile.age })
      : profile.dateOfBirthDisplay
        ? format(
            new Date(profile.dateOfBirthDisplay || profile.dateOfBirth),
            "MMMM d, yyyy"
          )
        : null;

  const showExtended = variant === "patient";

  return (
    <div className="min-w-0 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {dobLine && (
          <ProfileField label={t("patient.dateOfBirthAge")} value={dobLine} />
        )}
        <ProfileField
          label={t("patient.gender")}
          value={profile.gender ? labels.gender(profile.gender) : null}
        />
        <ProfileField label={t("patient.bloodType")} value={profile.bloodType} />
      </div>
      <ProfileField label={t("patient.allergies")} value={profile.allergies} />
      <ProfileField
        label={t("patient.chronicConditions")}
        value={profile.chronicConditions}
      />
      <ProfileField
        label={t("patient.currentMedications")}
        value={profile.currentMedications}
      />
      {showExtended && (
        <>
          <ProfileField
            label={t("patient.previousSurgeries")}
            value={profile.previousSurgeries}
          />
          <ProfileField
            label={t("patient.familyHistory")}
            value={profile.familyHistory}
          />
        </>
      )}
      <ProfileField label={t("patient.medicalNotes")} value={profile.medicalNotes} />
      {(profile.emergencyContactName || profile.emergencyContactPhone) && (
        <div className="min-w-0 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("patient.emergencyContact")}
          </p>
          {profile.emergencyContactName && (
            <p className="text-sm text-foreground">{profile.emergencyContactName}</p>
          )}
          {profile.emergencyContactPhone && (
            <p className="text-sm text-foreground break-all">
              {profile.emergencyContactPhone}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
