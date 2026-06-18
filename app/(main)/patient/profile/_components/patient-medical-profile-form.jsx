"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, HeartPulse, Phone, UserCircle } from "lucide-react";
import { updatePatientMedicalProfile } from "@/actions/patient-medical-profile";
import {
  PATIENT_BLOOD_TYPE_OPTIONS,
  PATIENT_GENDER_OPTIONS,
} from "@/lib/patient-medical-constants";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";

const SELECT_NONE = "__none__";

function profileToFormState(profile) {
  return {
    dateOfBirth: profile?.dateOfBirthDisplay ?? "",
    gender: profile?.gender ?? "",
    bloodType: profile?.bloodType ?? "",
    allergies: profile?.allergies ?? "",
    chronicConditions: profile?.chronicConditions ?? "",
    currentMedications: profile?.currentMedications ?? "",
    previousSurgeries: profile?.previousSurgeries ?? "",
    familyHistory: profile?.familyHistory ?? "",
    medicalNotes: profile?.medicalNotes ?? "",
    emergencyContactName: profile?.emergencyContactName ?? "",
    emergencyContactPhone: profile?.emergencyContactPhone ?? "",
  };
}

export function PatientMedicalProfileForm({ profile, dir = "ltr" }) {
  const { t, labels } = useLocale();
  const router = useRouter();
  const [form, setForm] = useState(() => profileToFormState(profile));
  const { loading, fn: saveProfile, setData: clearSave } = useFetch(
    updatePatientMedicalProfile
  );

  const set = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      fd.append(k, v === "" || v == null ? "" : String(v));
    });
    const res = await saveProfile(fd);
    if (res?.success) {
      toast.success(t("patient.profileSaved"));
      clearSave(undefined);
      router.refresh();
    }
  };

  const healthFields = [
    ["allergies", "patient.allergies"],
    ["chronicConditions", "patient.chronicConditions"],
    ["currentMedications", "patient.currentMedications"],
    ["previousSurgeries", "patient.previousSurgeries"],
    ["familyHistory", "patient.familyHistory"],
    ["medicalNotes", "patient.medicalNotes"],
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6" dir={dir}>
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary shrink-0" />
            {t("patient.basicInfo")}
          </CardTitle>
          <CardDescription>{t("patient.basicInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">{t("patient.dateOfBirth")}</Label>
            <Input
              id="dateOfBirth"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gender">{t("patient.gender")}</Label>
            <Select
              value={form.gender || SELECT_NONE}
              onValueChange={(v) =>
                set("gender", v === SELECT_NONE ? "" : v)
              }
              disabled={loading}
            >
              <SelectTrigger id="gender">
                <SelectValue placeholder={t("patient.selectGenderOptional")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>{t("patient.notSpecified")}</SelectItem>
                {PATIENT_GENDER_OPTIONS.map((g) => (
                  <SelectItem key={g} value={g}>
                    {labels.gender(g)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2 sm:max-w-xs">
            <Label htmlFor="bloodType">{t("patient.bloodType")}</Label>
            <Select
              value={form.bloodType || SELECT_NONE}
              onValueChange={(v) =>
                set("bloodType", v === SELECT_NONE ? "" : v)
              }
              disabled={loading}
            >
              <SelectTrigger id="bloodType">
                <SelectValue placeholder={t("patient.selectBloodTypeOptional")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE}>{t("patient.notSpecified")}</SelectItem>
                {PATIENT_BLOOD_TYPE_OPTIONS.map((bt) => (
                  <SelectItem key={bt} value={bt}>
                    {bt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-primary shrink-0" />
            {t("patient.healthInfo")}
          </CardTitle>
          <CardDescription>{t("patient.healthInfoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthFields.map(([key, labelKey]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={key}>{t(labelKey)}</Label>
              <Textarea
                id={key}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                disabled={loading}
                rows={3}
                className="min-h-[80px] resize-y"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary shrink-0" />
            {t("patient.emergencyContact")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="emergencyContactName">{t("patient.contactName")}</Label>
            <Input
              id="emergencyContactName"
              value={form.emergencyContactName}
              onChange={(e) => set("emergencyContactName", e.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="emergencyContactPhone">{t("patient.contactPhone")}</Label>
            <Input
              id="emergencyContactPhone"
              type="tel"
              value={form.emergencyContactPhone}
              onChange={(e) => set("emergencyContactPhone", e.target.value)}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full sm:w-auto "
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("doctorDash.saving")}
          </>
        ) : (
          t("patient.saveMedicalProfile")
        )}
      </Button>
    </form>
  );
}
