"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { Loader2, FileText, Printer } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { upsertVisitSummary } from "@/actions/visit-summary";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";

function toDateInputValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function VisitSummaryForm({ appointment, onSaved }) {
  const { t } = useLocale();
  const existing = appointment.visitSummary;

  const FIELDS = useMemo(
    () => [
      { key: "diagnosis", label: t("appointments.diagnosis"), rows: 2 },
      { key: "prescription", label: t("appointments.prescription"), rows: 3 },
      {
        key: "recommendations",
        label: t("appointments.recommendations"),
        rows: 2,
      },
      {
        key: "patientFriendlySummary",
        label: t("appointments.patientFriendlySummary"),
        rows: 3,
      },
      {
        key: "followUpInstructions",
        label: t("appointments.followUpInstructions"),
        rows: 2,
      },
      { key: "redFlags", label: t("appointments.redFlags"), rows: 2 },
      {
        key: "privateDoctorNotes",
        label: t("appointments.privateNotes"),
        rows: 2,
      },
    ],
    [t]
  );

  const [form, setForm] = useState({
    diagnosis: existing?.diagnosis ?? "",
    prescription: existing?.prescription ?? "",
    recommendations: existing?.recommendations ?? "",
    patientFriendlySummary: existing?.patientFriendlySummary ?? "",
    followUpInstructions: existing?.followUpInstructions ?? "",
    followUpDate: toDateInputValue(existing?.followUpDate),
    redFlags: existing?.redFlags ?? "",
    privateDoctorNotes: existing?.privateDoctorNotes ?? "",
  });

  const { loading, fn: submitSummary } = useFetch(upsertVisitSummary);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("appointmentId", appointment.id);
    for (const { key } of FIELDS) {
      fd.append(key, form[key] ?? "");
    }
    fd.append("followUpDate", form.followUpDate || "");

    const res = await submitSummary(fd);
    if (res?.success) {
      toast.success(
        res.isNew
          ? t("appointments.visitSummarySaved")
          : t("appointments.visitSummaryUpdated")
      );
      await onSaved?.(res.appointment, res.visitSummary);
    }
  };

  if (appointment.status !== "COMPLETED") {
    return (
      <p className="text-sm text-muted-foreground italic">
        {t("appointments.completeBeforeSummary")}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-medium text-muted-foreground">
          {existing ? t("doctorDash.editSummary") : t("doctorDash.addSummary")}
        </h4>
      </div>
      {FIELDS.map(({ key, label, rows }) => (
        <div key={key} className="space-y-1">
          <Label className="text-xs">{label}</Label>
          <Textarea
            value={form[key]}
            onChange={(e) => handleChange(key, e.target.value)}
            rows={rows}
            className={
              key === "privateDoctorNotes"
                ? "border-amber-900/30 bg-amber-950/10 text-sm"
                : "text-sm"
            }
          />
        </div>
      ))}
      <div className="space-y-1">
        <Label className="text-xs">{t("appointments.followUpDate")}</Label>
        <Input
          type="date"
          value={form.followUpDate}
          onChange={(e) => handleChange("followUpDate", e.target.value)}
          className="w-full max-w-xs"
        />
      </div>
      {existing ? (
        <Button size="sm" variant="outline" className="border-primary/20" asChild>
          <Link href={`/appointments/${appointment.id}/summary`}>
            <Printer className="h-4 w-4 me-1" />
            {t("appointments.printSummary")}
          </Link>
        </Button>
      ) : null}
      <Button type="submit" disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : existing ? (
          t("appointments.updateSummary")
        ) : (
          t("appointments.saveSummary")
        )}
      </Button>
    </form>
  );
}
