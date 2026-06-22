"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { doctorOnboardingSchema } from "@/lib/schema";
import { OTHER_SPECIALTY, SPECIALTIES } from "@/lib/specialities";
import { SpecialtyIcon } from "@/components/specialties/specialty-icon";
import {
  DEFAULT_CLINIC_PRICE_EGP,
  DEFAULT_CONSULTATION_DURATION_MINUTES,
  DEFAULT_ONLINE_PRICE_EGP,
} from "@/lib/pricing";
import { useLocale } from "@/components/locale-provider";
import { translateValidationMessage } from "@/lib/validation-i18n";
import { BilingualFieldRow } from "@/components/doctors/bilingual-field-row";

/**
 * @param {{ loading: boolean; onBack: () => void; onSubmit: (formData: FormData) => Promise<void> }} props
 */
export function OnboardingDoctorForm({ loading, onBack, onSubmit }) {
  const { t, labels, dict } = useLocale();
  const v = (message) => translateValidationMessage(dict, message);
  const bilingualHints = {
    hintEn: t("onboarding.englishFieldHint"),
    hintAr: t("onboarding.arabicFieldHint"),
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(doctorOnboardingSchema),
    defaultValues: {
      specialty: "",
      specialtyOtherEn: "",
      specialtyOtherAr: "",
      nameEn: "",
      nameAr: "",
      experience: undefined,
      credentialUrl: "",
      descriptionEn: "",
      descriptionAr: "",
      onlineConsultationPriceEgp: DEFAULT_ONLINE_PRICE_EGP,
      clinicConsultationPriceEgp: DEFAULT_CLINIC_PRICE_EGP,
      followUpPriceEgp: undefined,
      consultationDurationMinutes: DEFAULT_CONSULTATION_DURATION_MINUTES,
      clinicGovernorateEn: "",
      clinicGovernorateAr: "",
      clinicAreaEn: "",
      clinicAreaAr: "",
      clinicAddressEn: "",
      clinicAddressAr: "",
      clinicGoogleMapsUrl: "",
      clinicPhone: "",
      clinicBuildingInfoEn: "",
      clinicBuildingInfoAr: "",
      servicesOfferedEn: "",
      servicesOfferedAr: "",
      educationEn: "",
      educationAr: "",
      languagesEn: "",
      languagesAr: "",
      cancellationPolicyEn: "",
      cancellationPolicyAr: "",
    },
  });

  const specialtyValue = watch("specialty");
  const isOtherSpecialty = specialtyValue === OTHER_SPECIALTY;

  const onDoctorSubmit = async (formValues) => {
    if (loading) return;

    const formData = new FormData();
    formData.append("role", "DOCTOR");

    Object.entries(formValues).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        formData.append(key, "");
      } else {
        formData.append(key, String(value));
      }
    });

    await onSubmit(formData);
  };

  return (
    <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
      <CardContent className="pt-6">
        <div className="mb-6">
          <CardTitle className="text-2xl font-bold text-foreground mb-2">
            {t("onboarding.completeDoctorProfile")}
          </CardTitle>
          <CardDescription>{t("onboarding.doctorFormHint")}</CardDescription>
        </div>

        <form
          onSubmit={handleSubmit(onDoctorSubmit)}
          className="space-y-8 max-h-[70vh] overflow-y-auto pe-2"
        >
          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {t("onboarding.professionalCredentials")}
            </h3>

            <BilingualFieldRow
              id="name"
              {...bilingualHints}
              labelEn={t("onboarding.nameEnglish")}
              labelAr={t("onboarding.nameArabic")}
              enValue={watch("nameEn")}
              arValue={watch("nameAr")}
              onEnChange={(val) =>
                setValue("nameEn", val, { shouldValidate: true })
              }
              onArChange={(val) =>
                setValue("nameAr", val, { shouldValidate: true })
              }
              enPlaceholder={t("onboarding.nameEnPlaceholder")}
              arPlaceholder={t("onboarding.nameArPlaceholder")}
              enError={errors.nameEn ? v(errors.nameEn.message) : undefined}
              arError={errors.nameAr ? v(errors.nameAr.message) : undefined}
            />

            <div className="space-y-2">
              <Label htmlFor="specialty">{t("onboarding.medicalSpecialty")}</Label>
              <Select
                value={specialtyValue}
                onValueChange={(value) => {
                  setValue("specialty", value, { shouldValidate: true });
                  if (value !== OTHER_SPECIALTY) {
                    setValue("specialtyOtherEn", "", { shouldValidate: true });
                    setValue("specialtyOtherAr", "", { shouldValidate: true });
                  }
                }}
              >
                <SelectTrigger id="specialty" className="w-full">
                  <SelectValue placeholder={t("onboarding.selectSpecialty")} />
                </SelectTrigger>
                <SelectContent>
                  {SPECIALTIES.map((spec) => (
                    <SelectItem key={spec.name} value={spec.name}>
                      <span className="flex items-center gap-2">
                        <SpecialtyIcon name={spec.name} size="sm" />
                        <span>{labels.specialty(spec.name)}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.specialty && (
                <p className="text-sm font-medium text-red-500">
                  {v(errors.specialty.message)}
                </p>
              )}
            </div>

            {isOtherSpecialty ? (
              <BilingualFieldRow
                id="specialty-other"
                {...bilingualHints}
                labelEn={t("onboarding.specialtyOtherEn")}
                labelAr={t("onboarding.specialtyOtherAr")}
                enValue={watch("specialtyOtherEn")}
                arValue={watch("specialtyOtherAr")}
                onEnChange={(val) =>
                  setValue("specialtyOtherEn", val, { shouldValidate: true })
                }
                onArChange={(val) =>
                  setValue("specialtyOtherAr", val, { shouldValidate: true })
                }
                enPlaceholder={t("onboarding.specialtyOtherPlaceholder")}
                arPlaceholder={t("onboarding.specialtyOtherPlaceholder")}
                enError={
                  errors.specialtyOtherEn
                    ? v(errors.specialtyOtherEn.message)
                    : undefined
                }
                arError={
                  errors.specialtyOtherAr
                    ? v(errors.specialtyOtherAr.message)
                    : undefined
                }
              />
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="experience">{t("onboarding.yearsOfExperience")}</Label>
                <Input
                  id="experience"
                  type="number"
                  placeholder={t("onboarding.experiencePlaceholder")}
                  {...register("experience", { valueAsNumber: true })}
                />
                {errors.experience && (
                  <p className="text-sm font-medium text-red-500">
                    {v(errors.experience.message)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultationDurationMinutes">
                  {t("doctorDash.consultationDurationMinutes")}
                </Label>
                <Input
                  id="consultationDurationMinutes"
                  type="number"
                  {...register("consultationDurationMinutes", {
                    valueAsNumber: true,
                  })}
                />
                {errors.consultationDurationMinutes && (
                  <p className="text-sm font-medium text-red-500">
                    {v(errors.consultationDurationMinutes.message)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="credentialUrl">{t("onboarding.credentialUrl")}</Label>
              <Input
                id="credentialUrl"
                type="url"
                placeholder={t("onboarding.credentialPlaceholder")}
                {...register("credentialUrl")}
              />
              {errors.credentialUrl && (
                <p className="text-sm font-medium text-red-500">
                  {v(errors.credentialUrl.message)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("onboarding.shortBio")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("onboarding.shortBioHint")}
              </p>
              <BilingualFieldRow
                id="description"
                {...bilingualHints}
                labelEn={t("onboarding.descriptionEnglish")}
                labelAr={t("onboarding.descriptionArabic")}
                enValue={watch("descriptionEn")}
                arValue={watch("descriptionAr")}
                onEnChange={(val) =>
                  setValue("descriptionEn", val, { shouldValidate: true })
                }
                onArChange={(val) =>
                  setValue("descriptionAr", val, { shouldValidate: true })
                }
                multiline
                rows={4}
                enError={
                  errors.descriptionEn
                    ? v(errors.descriptionEn.message)
                    : undefined
                }
                arError={
                  errors.descriptionAr
                    ? v(errors.descriptionAr.message)
                    : undefined
                }
              />
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {t("onboarding.sectionPricing")}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="onlineConsultationPriceEgp">
                  {t("onboarding.onlineConsultation")}
                </Label>
                <Input
                  id="onlineConsultationPriceEgp"
                  type="number"
                  {...register("onlineConsultationPriceEgp", {
                    valueAsNumber: true,
                  })}
                />
                {errors.onlineConsultationPriceEgp && (
                  <p className="text-sm font-medium text-red-500">
                    {v(errors.onlineConsultationPriceEgp.message)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicConsultationPriceEgp">
                  {t("onboarding.clinicInPerson")}
                </Label>
                <Input
                  id="clinicConsultationPriceEgp"
                  type="number"
                  {...register("clinicConsultationPriceEgp", {
                    valueAsNumber: true,
                  })}
                />
                {errors.clinicConsultationPriceEgp && (
                  <p className="text-sm font-medium text-red-500">
                    {v(errors.clinicConsultationPriceEgp.message)}
                  </p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="followUpPriceEgp">
                  {t("onboarding.followUpPriceOptional")}
                </Label>
                <Input
                  id="followUpPriceEgp"
                  type="number"
                  placeholder={t("doctorDash.leaveEmptyIfNotOffered")}
                  {...register("followUpPriceEgp", { valueAsNumber: true })}
                />
                {errors.followUpPriceEgp && (
                  <p className="text-sm font-medium text-red-500">
                    {v(errors.followUpPriceEgp.message)}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {t("onboarding.sectionClinic")}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("clinics.usesProfileName")}
            </p>
            <BilingualFieldRow
              id="governorate"
              {...bilingualHints}
              labelEn={t("onboarding.governorateEnglish")}
              labelAr={t("onboarding.governorateArabic")}
              enValue={watch("clinicGovernorateEn")}
              arValue={watch("clinicGovernorateAr")}
              onEnChange={(val) =>
                setValue("clinicGovernorateEn", val, { shouldValidate: true })
              }
              onArChange={(val) =>
                setValue("clinicGovernorateAr", val, { shouldValidate: true })
              }
              enError={
                errors.clinicGovernorateEn
                  ? v(errors.clinicGovernorateEn.message)
                  : undefined
              }
              arError={
                errors.clinicGovernorateAr
                  ? v(errors.clinicGovernorateAr.message)
                  : undefined
              }
            />
            <BilingualFieldRow
              id="area"
              {...bilingualHints}
              labelEn={t("onboarding.areaEnglish")}
              labelAr={t("onboarding.areaArabic")}
              enValue={watch("clinicAreaEn")}
              arValue={watch("clinicAreaAr")}
              onEnChange={(val) =>
                setValue("clinicAreaEn", val, { shouldValidate: true })
              }
              onArChange={(val) =>
                setValue("clinicAreaAr", val, { shouldValidate: true })
              }
              enError={
                errors.clinicAreaEn ? v(errors.clinicAreaEn.message) : undefined
              }
              arError={
                errors.clinicAreaAr ? v(errors.clinicAreaAr.message) : undefined
              }
            />
            <BilingualFieldRow
              id="address"
              {...bilingualHints}
              labelEn={t("onboarding.addressEnglish")}
              labelAr={t("onboarding.addressArabic")}
              enValue={watch("clinicAddressEn")}
              arValue={watch("clinicAddressAr")}
              onEnChange={(val) =>
                setValue("clinicAddressEn", val, { shouldValidate: true })
              }
              onArChange={(val) =>
                setValue("clinicAddressAr", val, { shouldValidate: true })
              }
              multiline
              rows={2}
              enError={
                errors.clinicAddressEn
                  ? v(errors.clinicAddressEn.message)
                  : undefined
              }
              arError={
                errors.clinicAddressAr
                  ? v(errors.clinicAddressAr.message)
                  : undefined
              }
            />
            <BilingualFieldRow
              id="building"
              {...bilingualHints}
              labelEn={t("onboarding.buildingFloor")}
              labelAr={t("onboarding.buildingFloor")}
              enValue={watch("clinicBuildingInfoEn")}
              arValue={watch("clinicBuildingInfoAr")}
              onEnChange={(val) =>
                setValue("clinicBuildingInfoEn", val, { shouldValidate: true })
              }
              onArChange={(val) =>
                setValue("clinicBuildingInfoAr", val, { shouldValidate: true })
              }
              multiline
              rows={2}
              required={false}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clinicPhone">{t("doctorDash.clinicPhone")}</Label>
                <Input id="clinicPhone" {...register("clinicPhone")} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="clinicGoogleMapsUrl">
                  {t("doctorDash.googleMapsUrl")}
                </Label>
                <Input
                  id="clinicGoogleMapsUrl"
                  type="url"
                  {...register("clinicGoogleMapsUrl")}
                />
                {errors.clinicGoogleMapsUrl && (
                  <p className="text-sm font-medium text-red-500">
                    {v(errors.clinicGoogleMapsUrl.message)}
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              {t("onboarding.additionalProfile")}
            </h3>
            <BilingualFieldRow
              id="services"
              {...bilingualHints}
              labelEn={t("doctorDash.servicesOffered")}
              labelAr={t("doctorDash.servicesOffered")}
              enValue={watch("servicesOfferedEn")}
              arValue={watch("servicesOfferedAr")}
              onEnChange={(val) => setValue("servicesOfferedEn", val)}
              onArChange={(val) => setValue("servicesOfferedAr", val)}
              multiline
              rows={2}
              required={false}
            />
            <BilingualFieldRow
              id="education"
              {...bilingualHints}
              labelEn={t("onboarding.education")}
              labelAr={t("onboarding.education")}
              enValue={watch("educationEn")}
              arValue={watch("educationAr")}
              onEnChange={(val) => setValue("educationEn", val)}
              onArChange={(val) => setValue("educationAr", val)}
              multiline
              rows={2}
              required={false}
            />
            <BilingualFieldRow
              id="languages"
              {...bilingualHints}
              labelEn={t("doctorDash.languagesLabel")}
              labelAr={t("doctorDash.languagesLabel")}
              enValue={watch("languagesEn")}
              arValue={watch("languagesAr")}
              onEnChange={(val) => setValue("languagesEn", val)}
              onArChange={(val) => setValue("languagesAr", val)}
              required={false}
            />
            <BilingualFieldRow
              id="cancellation"
              {...bilingualHints}
              labelEn={t("doctorDash.cancellationPolicy")}
              labelAr={t("doctorDash.cancellationPolicy")}
              enValue={watch("cancellationPolicyEn")}
              arValue={watch("cancellationPolicyAr")}
              onEnChange={(val) => setValue("cancellationPolicyEn", val)}
              onArChange={(val) => setValue("cancellationPolicyAr", val)}
              multiline
              rows={2}
              required={false}
            />
          </section>

          <div className="pt-2 flex items-center justify-between sticky bottom-0 bg-card pb-2">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="border-primary/20"
              disabled={loading}
            >
              {t("common.back")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("onboarding.submitting")}
                </>
              ) : (
                t("onboarding.submitProfile")
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
