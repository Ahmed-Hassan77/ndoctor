"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setUserRole } from "@/actions/onboarding";
import useFetch from "@/hooks/use-fetch";
import { OnboardingRoleChooser } from "./_components/onboarding-role-chooser";
import { OnboardingDoctorForm } from "./_components/onboarding-doctor-form";

export default function OnboardingPage() {
  const [step, setStep] = useState("choose-role");
  const router = useRouter();
  const { loading, data, fn: submitUserRole } = useFetch(setUserRole);

  const handlePatientSelection = async () => {
    if (loading) return;
    const formData = new FormData();
    formData.append("role", "PATIENT");
    await submitUserRole(formData);
  };

  useEffect(() => {
    if (data && data?.success) {
      router.push(data.redirect);
    }
  }, [data, router]);

  if (step === "doctor-form") {
    return (
      <OnboardingDoctorForm
        loading={loading}
        onBack={() => setStep("choose-role")}
        onSubmit={submitUserRole}
      />
    );
  }

  return (
    <OnboardingRoleChooser
      loading={loading}
      onChoosePatient={handlePatientSelection}
      onChooseDoctor={() => !loading && setStep("doctor-form")}
    />
  );
}
