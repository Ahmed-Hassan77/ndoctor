"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Ban, Loader2, Trash2, Video, MapPin } from "lucide-react";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import {
  createAvailabilityException,
  deleteAvailabilityException,
  getDoctorAvailabilityExceptions,
} from "@/actions/availability-exceptions";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { useLocale } from "@/components/locale-provider";
import { getClinicOptionLabel } from "@/lib/clinic-localized";

const EXCEPTION_TYPES = [
  "BLOCKED",
  "VACATION",
  "EMERGENCY",
  "CLINIC_CLOSED",
  "OTHER",
];
const EMPTY_LIST = [];

function toLocalInputValue(isoOrDate) {
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function AvailabilityExceptionsPanel({
  initialExceptions = EMPTY_LIST,
  clinics = EMPTY_LIST,
}) {
  const { t, labels, locale } = useLocale();
  const activeClinics = useMemo(
    () => clinics.filter((c) => c.isActive),
    [clinics]
  );
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [startLocal, setStartLocal] = useState("");
  const [endLocal, setEndLocal] = useState("");
  const [type, setType] = useState("BLOCKED");
  const [reason, setReason] = useState("");
  const [appointmentMode, setAppointmentMode] = useState("ONLINE");
  const [clinicId, setClinicId] = useState("");

  const { loading: createLoading, fn: createFn } = useFetch(
    createAvailabilityException
  );
  const { fn: deleteFn } = useFetch(deleteAvailabilityException);
  const { fn: loadFn } = useFetch(getDoctorAvailabilityExceptions);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (appointmentMode === "ONLINE") {
      setClinicId((current) => (current === "" ? current : ""));
      return;
    }
    if (activeClinics.length === 1) {
      const onlyId = activeClinics[0].id;
      setClinicId((current) => (current === onlyId ? current : onlyId));
    }
  }, [appointmentMode, activeClinics]);

  const refresh = async () => {
    const res = await loadFn();
    if (res?.success) setExceptions(res.exceptions ?? []);
  };

  useEffect(() => {
    if (initialExceptions.length || fetchedRef.current) return;
    fetchedRef.current = true;
    let cancelled = false;
    getDoctorAvailabilityExceptions().then((res) => {
      if (!cancelled && res?.success) setExceptions(res.exceptions ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [initialExceptions.length]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const startIso = localInputToIso(startLocal);
    const endIso = localInputToIso(endLocal);
    if (!startIso || !endIso) {
      toast.error(t("doctorDash.enterBlockedRange"));
      return;
    }
    if (
      appointmentMode === "OFFLINE" &&
      activeClinics.length > 1 &&
      !clinicId
    ) {
      toast.error(t("doctorDash.selectClinicForBlock"));
      return;
    }

    const fd = new FormData();
    fd.append("startTime", startIso);
    fd.append("endTime", endIso);
    fd.append("type", type);
    fd.append("appointmentMode", appointmentMode);
    if (appointmentMode === "OFFLINE" && clinicId) {
      fd.append("clinicId", clinicId);
    }
    if (reason.trim()) fd.append("reason", reason.trim());
    const res = await createFn(fd);
    if (res?.success) {
      toast.success(t("doctorDash.blockedAdded"));
      setStartLocal("");
      setEndLocal("");
      setReason("");
      await refresh();
    }
  };

  const handleDelete = async (id) => {
    const fd = new FormData();
    fd.append("exceptionId", id);
    const res = await deleteFn(fd);
    if (res?.success) {
      toast.success(t("doctorDash.blockedRemoved"));
      setExceptions((list) => list.filter((x) => x.id !== id));
    }
  };

  const modeLabel = (mode) =>
    mode === "OFFLINE" ? t("doctorDash.offlineTab") : t("doctorDash.onlineTab");

  return (
    <Card className="border-amber-900/25">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Ban className="h-5 w-5 text-primary" />
          {t("doctorDash.blockedTimes")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("doctorDash.blockedTimesModeNote")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-lg border border-border/50 p-4 bg-muted/10"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ex-start">{t("common.start")}</Label>
              <Input
                id="ex-start"
                type="datetime-local"
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ex-end">{t("common.end")}</Label>
              <Input
                id="ex-end"
                type="datetime-local"
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("doctorDash.blockVisitType")}</Label>
            <Select value={appointmentMode} onValueChange={setAppointmentMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ONLINE">
                  <span className="inline-flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    {t("doctorDash.onlineTab")}
                  </span>
                </SelectItem>
                <SelectItem value="OFFLINE">
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {t("doctorDash.offlineTab")}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {appointmentMode === "OFFLINE" && activeClinics.length > 0 ? (
            <div className="space-y-2">
              <Label>{t("clinics.selectClinic")}</Label>
              <Select
                value={clinicId || "all"}
                onValueChange={(v) => setClinicId(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("clinics.selectClinic")} />
                </SelectTrigger>
                <SelectContent>
                  {activeClinics.length > 1 ? (
                    <SelectItem value="all">
                      {t("clinics.allClinics")}
                    </SelectItem>
                  ) : null}
                  {activeClinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {getClinicOptionLabel(clinic, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {activeClinics.length > 1 ? (
                <p className="text-xs text-muted-foreground">
                  {t("doctorDash.blockClinicHint")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>{t("doctorDash.typeLabel")}</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXCEPTION_TYPES.map((typeValue) => (
                  <SelectItem key={typeValue} value={typeValue}>
                    {labels.availabilityExceptionType(typeValue)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ex-reason">{t("doctorDash.reasonOptional")}</Label>
            <Textarea
              id="ex-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder={t("doctorDash.reasonPlaceholder")}
            />
          </div>
          <Button
            type="submit"
            disabled={createLoading}
            className="bg-amber-700 hover:bg-amber-800"
          >
            {createLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              t("doctorDash.addBlockedPeriod")
            )}
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t("doctorDash.upcomingBlocks")}
          </p>
          {exceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("doctorDash.noBlockedPeriods")}
            </p>
          ) : (
            <ul className="space-y-2">
              {exceptions.map((ex) => (
                <li
                  key={ex.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border/50 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2 items-center mb-1">
                      <Badge variant="outline" className="text-xs">
                        {labels.availabilityExceptionType(ex.type)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {ex.appointmentMode
                          ? modeLabel(ex.appointmentMode)
                          : t("doctorDash.blockLegacyScope")}
                      </Badge>
                      {ex.clinicId ? (
                        <Badge variant="outline" className="text-xs">
                          {ex.clinicName ??
                            activeClinics.find((c) => c.id === ex.clinicId)
                              ? getClinicOptionLabel(
                                  activeClinics.find((c) => c.id === ex.clinicId),
                                  locale
                                )
                              : t("clinics.branchLocation")}
                        </Badge>
                      ) : ex.appointmentMode === "OFFLINE" ? (
                        <Badge variant="outline" className="text-xs">
                          {t("clinics.allClinics")}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-foreground">
                      {formatAppointmentDateTime(ex.startTime)} —{" "}
                      {formatAppointmentDateTime(ex.endTime)}
                    </p>
                    {ex.reason ? (
                      <p className="text-muted-foreground text-xs mt-1 break-words">
                        {ex.reason}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-red-900/40 text-red-300"
                    onClick={() => handleDelete(ex.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t("doctorDash.remove")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
