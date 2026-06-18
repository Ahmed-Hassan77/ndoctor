"use client";

import { useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Loader2, Trash2, Pencil, UserCircle } from "lucide-react";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { useInflightGuard } from "@/hooks/use-inflight";
import {
  upsertClinic,
  setClinicActive,
  deleteClinic,
} from "@/actions/clinics";
import { useLocale } from "@/components/locale-provider";
import { formatClinicSummary } from "@/lib/clinics";
import { getClinicOptionLabel } from "@/lib/clinic-localized";
import { BilingualFieldRow } from "@/components/doctors/bilingual-field-row";

const emptyForm = {
  clinicId: "",
  governorateEn: "",
  governorateAr: "",
  areaEn: "",
  areaAr: "",
  addressEn: "",
  addressAr: "",
  buildingInfoEn: "",
  buildingInfoAr: "",
  phone: "",
  googleMapsUrl: "",
  consultationPriceEgp: "",
};

function clinicToForm(clinic) {
  return {
    clinicId: clinic.id,
    governorateEn: clinic.governorateEn ?? clinic.governorate ?? "",
    governorateAr: clinic.governorateAr ?? "",
    areaEn: clinic.areaEn ?? clinic.area ?? "",
    areaAr: clinic.areaAr ?? "",
    addressEn: clinic.addressEn ?? clinic.address ?? "",
    addressAr: clinic.addressAr ?? "",
    buildingInfoEn: clinic.buildingInfoEn ?? clinic.buildingInfo ?? "",
    buildingInfoAr: clinic.buildingInfoAr ?? "",
    phone: clinic.phone ?? "",
    googleMapsUrl: clinic.googleMapsUrl ?? "",
    consultationPriceEgp: clinic.consultationPriceEgp?.toString() ?? "",
  };
}

/**
 * @param {object} props
 * @param {Array} [props.initialClinics]
 * @param {object} [props.doctor]
 * @param {string} [props.dir]
 */
export function ClinicsManager({ initialClinics = [], doctor, dir = "ltr" }) {
  const { t, formatPrice, locale } = useLocale();
  const [clinics, setClinics] = useState(initialClinics);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const submittingRef = useRef(false);
  const guardAction = useInflightGuard();

  const { loading, fn: saveClinic } = useFetch(upsertClinic);
  const { fn: toggleActive } = useFetch(setClinicActive);
  const { fn: removeClinic } = useFetch(deleteClinic);

  const bilingualHints = {
    hintEn: t("onboarding.englishFieldHint"),
    hintAr: t("onboarding.arabicFieldHint"),
  };

  const profileNameEn = doctor?.nameEn ?? doctor?.name ?? "";
  const profileNameAr = doctor?.nameAr ?? "";
  const defaultPrice =
    doctor?.clinicConsultationPriceEgp?.toString() ??
    clinics[0]?.consultationPriceEgp?.toString() ??
    "";

  const applyClinics = (nextClinics) => {
    if (Array.isArray(nextClinics)) {
      setClinics(nextClinics);
    }
  };

  const mergeClinic = (clinic) => {
    if (!clinic?.id) return;
    setClinics((prev) => {
      const index = prev.findIndex((item) => item.id === clinic.id);
      if (index === -1) {
        return [...prev, clinic].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      }
      const next = [...prev];
      next[index] = { ...prev[index], ...clinic };
      return next;
    });
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const startCreate = () => {
    setForm({
      ...emptyForm,
      consultationPriceEgp: defaultPrice,
    });
    setEditing(true);
  };

  const startEdit = (clinic) => {
    setForm(clinicToForm(clinic));
    setEditing(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;

    await guardAction(async () => {
      submittingRef.current = true;
      try {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ""));
        const res = await saveClinic(fd);
        if (res?.success) {
          toast.success(t("clinics.saved"));
          setEditing(false);
          setForm(emptyForm);
          if (Array.isArray(res.clinics)) {
            applyClinics(res.clinics);
          } else {
            mergeClinic(res.clinic);
          }
        }
      } finally {
        submittingRef.current = false;
      }
    });
  };

  const handleToggle = async (clinic) => {
    await guardAction(async () => {
      const fd = new FormData();
      fd.append("clinicId", clinic.id);
      fd.append("isActive", clinic.isActive ? "false" : "true");
      const res = await toggleActive(fd);
      if (res?.success) {
        toast.success(
          clinic.isActive ? t("clinics.deactivated") : t("clinics.activated")
        );
        if (Array.isArray(res.clinics)) {
          applyClinics(res.clinics);
        } else {
          mergeClinic({ ...clinic, isActive: !clinic.isActive });
        }
      }
    });
  };

  const handleDelete = async (clinic) => {
    const label = getClinicOptionLabel(clinic, locale);
    if (!window.confirm(t("clinics.confirmDelete", { name: label }))) return;
    await guardAction(async () => {
      const fd = new FormData();
      fd.append("clinicId", clinic.id);
      const res = await removeClinic(fd);
      if (res?.success) {
        toast.success(t("clinics.deleted"));
        if (Array.isArray(res.clinics)) {
          applyClinics(res.clinics);
        } else {
          setClinics((prev) => prev.filter((item) => item.id !== clinic.id));
        }
      }
    });
  };

  return (
    <div className="space-y-4" dir={dir}>
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              {t("clinics.title")}
            </CardTitle>
            <CardDescription>{t("clinics.subtitle")}</CardDescription>
          </div>
          <Button type="button" size="sm" onClick={startCreate} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 me-1" />
            {t("clinics.add")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {clinics.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {t("clinics.empty")}
            </p>
          ) : (
            clinics.map((clinic) => (
              <div
                key={clinic.id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">
                      {getClinicOptionLabel(clinic, locale)}
                    </p>
                    <Badge variant={clinic.isActive ? "outline" : "secondary"}>
                      {clinic.isActive ? t("admin.active") : t("admin.suspended")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground break-words">
                    {formatClinicSummary(clinic, locale)}
                  </p>
                  {clinic.consultationPriceEgp ? (
                    <p className="mt-1 text-xs text-primary">
                      {formatPrice(clinic.consultationPriceEgp)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button type="button" variant="outline" size="sm" onClick={() => startEdit(clinic)}>
                    <Pencil className="h-3.5 w-3.5 me-1" />
                    {t("clinics.editButton")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => handleToggle(clinic)}>
                    {clinic.isActive ? t("clinics.deactivate") : t("clinics.activate")}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(clinic)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {editing ? (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="text-base">
              {form.clinicId ? t("clinics.edit") : t("clinics.add")}
            </CardTitle>
            <CardDescription>{t("clinics.branchFormDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <UserCircle className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      {t("clinics.usesProfileName")}
                    </p>
                    <p className="text-sm text-muted-foreground break-words">
                      {profileNameEn}
                      {profileNameAr ? ` · ${profileNameAr}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("clinics.qualificationsFromProfile")}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm font-medium text-foreground">
                {t("clinics.branchLocation")}
              </p>

              <BilingualFieldRow
                id="clinic-governorate"
                {...bilingualHints}
                labelEn={t("clinics.governorate")}
                labelAr={t("clinics.governorate")}
                enValue={form.governorateEn}
                arValue={form.governorateAr}
                onEnChange={(val) => setField("governorateEn", val)}
                onArChange={(val) => setField("governorateAr", val)}
                required
              />
              <BilingualFieldRow
                id="clinic-area"
                {...bilingualHints}
                labelEn={t("clinics.area")}
                labelAr={t("clinics.area")}
                enValue={form.areaEn}
                arValue={form.areaAr}
                onEnChange={(val) => setField("areaEn", val)}
                onArChange={(val) => setField("areaAr", val)}
                required
              />
              <BilingualFieldRow
                id="clinic-address"
                {...bilingualHints}
                labelEn={t("clinics.address")}
                labelAr={t("clinics.address")}
                enValue={form.addressEn}
                arValue={form.addressAr}
                onEnChange={(val) => setField("addressEn", val)}
                onArChange={(val) => setField("addressAr", val)}
                multiline
                rows={2}
                required
              />
              <BilingualFieldRow
                id="clinic-building"
                {...bilingualHints}
                labelEn={t("clinics.buildingInfo")}
                labelAr={t("clinics.buildingInfo")}
                enValue={form.buildingInfoEn}
                arValue={form.buildingInfoAr}
                onEnChange={(val) => setField("buildingInfoEn", val)}
                onArChange={(val) => setField("buildingInfoAr", val)}
                multiline
                rows={2}
                required={false}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{t("clinics.phone")}</Label>
                  <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{t("clinics.price")}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.consultationPriceEgp}
                    onChange={(e) => setField("consultationPriceEgp", e.target.value)}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>{t("clinics.mapsUrl")}</Label>
                  <Input
                    value={form.googleMapsUrl}
                    onChange={(e) => setField("googleMapsUrl", e.target.value)}
                    placeholder="https://maps.google.com/..."
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.save")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
