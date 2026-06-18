"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Loader2, MapPin, Banknote, UserCircle } from "lucide-react";
import { updateDoctorProfile } from "@/actions/doctor";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { translateValidationMessage } from "@/lib/validation-i18n";
import { doctorProfileSettingsSchema } from "@/lib/schema";
import { BilingualFieldRow } from "@/components/doctors/bilingual-field-row";
import {
  DEFAULT_CLINIC_PRICE_EGP,
  DEFAULT_CONSULTATION_DURATION_MINUTES,
  DEFAULT_ONLINE_PRICE_EGP,
} from "@/lib/pricing";

function userToFormDefaults(user) {
  return {
    nameEn: user?.nameEn ?? user?.name ?? "",
    nameAr: user?.nameAr ?? "",
    descriptionEn: user?.descriptionEn ?? user?.description ?? "",
    descriptionAr: user?.descriptionAr ?? "",
    onlineConsultationPriceEgp:
      user?.onlineConsultationPriceEgp ?? DEFAULT_ONLINE_PRICE_EGP,
    clinicConsultationPriceEgp:
      user?.clinicConsultationPriceEgp ?? DEFAULT_CLINIC_PRICE_EGP,
    followUpPriceEgp: user?.followUpPriceEgp ?? undefined,
    consultationDurationMinutes:
      user?.consultationDurationMinutes ??
      DEFAULT_CONSULTATION_DURATION_MINUTES,
    clinicGovernorateEn:
      user?.clinicGovernorateEn ?? user?.clinicGovernorate ?? "",
    clinicGovernorateAr: user?.clinicGovernorateAr ?? "",
    clinicAreaEn: user?.clinicAreaEn ?? user?.clinicArea ?? "",
    clinicAreaAr: user?.clinicAreaAr ?? "",
    clinicAddressEn: user?.clinicAddressEn ?? user?.clinicAddress ?? "",
    clinicAddressAr: user?.clinicAddressAr ?? "",
    clinicGoogleMapsUrl: user?.clinicGoogleMapsUrl ?? "",
    clinicPhone: user?.clinicPhone ?? "",
    clinicBuildingInfoEn:
      user?.clinicBuildingInfoEn ?? user?.clinicBuildingInfo ?? "",
    clinicBuildingInfoAr: user?.clinicBuildingInfoAr ?? "",
    servicesOfferedEn: user?.servicesOfferedEn ?? user?.servicesOffered ?? "",
    servicesOfferedAr: user?.servicesOfferedAr ?? "",
    educationEn: user?.educationEn ?? user?.education ?? "",
    educationAr: user?.educationAr ?? "",
    languagesEn: user?.languagesEn ?? user?.languages ?? "",
    languagesAr: user?.languagesAr ?? "",
    cancellationPolicyEn:
      user?.cancellationPolicyEn ?? user?.cancellationPolicy ?? "",
    cancellationPolicyAr: user?.cancellationPolicyAr ?? "",
  };
}

export function DoctorProfileSettings({ user, dir = "ltr" }) {
  const { t, dict } = useLocale();
  const v = (message) => translateValidationMessage(dict, message);
  const { loading, fn: saveProfile, setData: clearSave } =
    useFetch(updateDoctorProfile);

  const bilingualHints = {
    hintEn: t("onboarding.englishFieldHint"),
    hintAr: t("onboarding.arabicFieldHint"),
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(doctorProfileSettingsSchema),
    defaultValues: userToFormDefaults(user),
  });

  const onSubmit = async (formValues) => {
    const fd = new FormData();
    Object.entries(formValues).forEach(([k, val]) => {
      if (val === undefined || val === null) {
        fd.append(k, "");
      } else {
        fd.append(k, String(val));
      }
    });
    const res = await saveProfile(fd);
    if (res?.success) {
      toast.success(t("doctorDash.profileSaved"));
      clearSave(undefined);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir={dir}>
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <UserCircle className="h-5 w-5 text-primary shrink-0" />
            {t("doctorDash.publicProfileTitle")}
          </CardTitle>
          <CardDescription>{t("doctorDash.publicProfileDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BilingualFieldRow
            id="dash-name"
            {...bilingualHints}
            labelEn={t("onboarding.nameEnglish")}
            labelAr={t("onboarding.nameArabic")}
            enValue={watch("nameEn")}
            arValue={watch("nameAr")}
            onEnChange={(val) => setValue("nameEn", val, { shouldValidate: true })}
            onArChange={(val) => setValue("nameAr", val, { shouldValidate: true })}
            enPlaceholder={t("onboarding.nameEnPlaceholder")}
            arPlaceholder={t("onboarding.nameArPlaceholder")}
            enError={errors.nameEn ? v(errors.nameEn.message) : undefined}
            arError={errors.nameAr ? v(errors.nameAr.message) : undefined}
          />
          <BilingualFieldRow
            id="dash-description"
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
              errors.descriptionEn ? v(errors.descriptionEn.message) : undefined
            }
            arError={
              errors.descriptionAr ? v(errors.descriptionAr.message) : undefined
            }
          />
        </CardContent>
      </Card>

      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary shrink-0" />
            {t("doctorDash.consultationPricing")}
          </CardTitle>
          <CardDescription>{t("doctorDash.pricingCardDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="onlineConsultationPriceEgp">
              {t("doctorDash.onlineConsultationEgp")}
            </Label>
            <Input
              id="onlineConsultationPriceEgp"
              type="number"
              min={1}
              disabled={loading}
              {...register("onlineConsultationPriceEgp", { valueAsNumber: true })}
            />
            {errors.onlineConsultationPriceEgp ? (
              <p className="text-sm text-red-500">
                {v(errors.onlineConsultationPriceEgp.message)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="clinicConsultationPriceEgp">
              {t("doctorDash.clinicConsultationEgp")}
            </Label>
            <Input
              id="clinicConsultationPriceEgp"
              type="number"
              min={1}
              disabled={loading}
              {...register("clinicConsultationPriceEgp", { valueAsNumber: true })}
            />
            {errors.clinicConsultationPriceEgp ? (
              <p className="text-sm text-red-500">
                {v(errors.clinicConsultationPriceEgp.message)}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="followUpPriceEgp">{t("doctorDash.followUpOptional")}</Label>
            <Input
              id="followUpPriceEgp"
              type="number"
              min={1}
              placeholder={t("doctorDash.leaveEmptyIfNotOffered")}
              disabled={loading}
              {...register("followUpPriceEgp", { valueAsNumber: true })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="consultationDurationMinutes">
              {t("doctorDash.consultationDurationMinutes")}
            </Label>
            <Input
              id="consultationDurationMinutes"
              type="number"
              min={1}
              disabled={loading}
              {...register("consultationDurationMinutes", { valueAsNumber: true })}
            />
            {errors.consultationDurationMinutes ? (
              <p className="text-sm text-red-500">
                {v(errors.consultationDurationMinutes.message)}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary shrink-0" />
            {t("doctorDash.clinicLocation")}
          </CardTitle>
          <CardDescription>{t("doctorDash.clinicLocationSetupDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BilingualFieldRow
            id="dash-governorate"
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
            enPlaceholder={t("doctorDash.governoratePlaceholder")}
            arPlaceholder={t("doctorDash.governoratePlaceholder")}
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
            id="dash-area"
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
            enPlaceholder={t("doctorDash.areaPlaceholder")}
            arPlaceholder={t("doctorDash.areaPlaceholder")}
            enError={
              errors.clinicAreaEn ? v(errors.clinicAreaEn.message) : undefined
            }
            arError={
              errors.clinicAreaAr ? v(errors.clinicAreaAr.message) : undefined
            }
          />
          <BilingualFieldRow
            id="dash-address"
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
            rows={3}
            enPlaceholder={t("doctorDash.streetPlaceholder")}
            arPlaceholder={t("doctorDash.streetPlaceholder")}
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
            id="dash-building"
            {...bilingualHints}
            labelEn={t("doctorDash.buildingDirections")}
            labelAr={t("doctorDash.buildingDirections")}
            enValue={watch("clinicBuildingInfoEn")}
            arValue={watch("clinicBuildingInfoAr")}
            onEnChange={(val) => setValue("clinicBuildingInfoEn", val)}
            onArChange={(val) => setValue("clinicBuildingInfoAr", val)}
            multiline
            rows={2}
            required={false}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinicPhone">{t("doctorDash.clinicPhone")}</Label>
              <Input
                id="clinicPhone"
                disabled={loading}
                {...register("clinicPhone")}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="clinicGoogleMapsUrl">
                {t("doctorDash.googleMapsUrl")}
              </Label>
              <Input
                id="clinicGoogleMapsUrl"
                type="url"
                placeholder={t("doctorDash.mapsUrlPlaceholder")}
                disabled={loading}
                {...register("clinicGoogleMapsUrl")}
              />
              {errors.clinicGoogleMapsUrl ? (
                <p className="text-sm text-red-500">
                  {v(errors.clinicGoogleMapsUrl.message)}
                </p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            {t("doctorDash.professionalProfile")}
          </CardTitle>
          <CardDescription>{t("doctorDash.professionalProfileDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <BilingualFieldRow
            id="dash-services"
            {...bilingualHints}
            labelEn={t("doctorDash.servicesOffered")}
            labelAr={t("doctorDash.servicesOffered")}
            enValue={watch("servicesOfferedEn")}
            arValue={watch("servicesOfferedAr")}
            onEnChange={(val) => setValue("servicesOfferedEn", val)}
            onArChange={(val) => setValue("servicesOfferedAr", val)}
            multiline
            rows={3}
            required={false}
          />
          <BilingualFieldRow
            id="dash-education"
            {...bilingualHints}
            labelEn={t("doctorDash.educationQualifications")}
            labelAr={t("doctorDash.educationQualifications")}
            enValue={watch("educationEn")}
            arValue={watch("educationAr")}
            onEnChange={(val) => setValue("educationEn", val)}
            onArChange={(val) => setValue("educationAr", val)}
            multiline
            rows={3}
            required={false}
          />
          <BilingualFieldRow
            id="dash-languages"
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
            id="dash-cancellation"
            {...bilingualHints}
            labelEn={t("doctorDash.cancellationPolicy")}
            labelAr={t("doctorDash.cancellationPolicy")}
            enValue={watch("cancellationPolicyEn")}
            arValue={watch("cancellationPolicyAr")}
            onEnChange={(val) => setValue("cancellationPolicyEn", val)}
            onArChange={(val) => setValue("cancellationPolicyAr", val)}
            multiline
            rows={3}
            required={false}
          />
        </CardContent>
      </Card>

      <Button type="submit" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin me-2" />
            {t("doctorDash.saving")}
          </>
        ) : (
          t("doctorDash.saveProfile")
        )}
      </Button>
    </form>
  );
}
