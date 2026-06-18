"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Loader2, Trash2, Save } from "lucide-react";
import { setWorkTime, removeWorkTime } from "@/actions/doctor";
import useFetch from "@/hooks/use-fetch";
import { useInflightGuard } from "@/hooks/use-inflight";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { getClinicOptionLabel } from "@/lib/clinic-localized";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const EMPTY_LIST = [];

function buildDayState(workTimes, mode, clinicId) {
  const map = {};
  for (let d = 0; d <= 6; d++) {
    const wt = workTimes.find((w) => {
      if (w.dayOfWeek !== d || w.mode !== mode) return false;
      if (mode === "ONLINE") {
        return (w.clinicScopeKey ?? "global") === "global";
      }
      return (w.clinicScopeKey ?? "global") === clinicId;
    });
    map[d] = {
      id: wt?.id ?? null,
      start: wt?.startTime ?? "09:00",
      end: wt?.endTime ?? "17:00",
    };
  }
  return map;
}

export function WorkTimeSettings({
  workTimes = EMPTY_LIST,
  clinics = EMPTY_LIST,
  dir = "ltr",
  mode = "ONLINE",
}) {
  const { t, locale } = useLocale();
  const activeClinics = useMemo(
    () => clinics.filter((c) => c.isActive),
    [clinics]
  );
  const [selectedClinicId, setSelectedClinicId] = useState("");
  const [dayState, setDayState] = useState(() =>
    buildDayState(workTimes, mode, "")
  );
  const [savingDow, setSavingDow] = useState(null);
  const [clearingDow, setClearingDow] = useState(null);
  const guardAction = useInflightGuard();

  const { loading: saveLoading, fn: saveFn, setData: clearSaveFetch } =
    useFetch(setWorkTime);
  const { loading: removeLoading, fn: removeFn, setData: clearRemoveFetch } =
    useFetch(removeWorkTime);

  useEffect(() => {
    if (mode !== "OFFLINE") {
      setSelectedClinicId((current) => (current === "" ? current : ""));
      return;
    }
    if (activeClinics.length === 0) {
      setSelectedClinicId((current) => (current === "" ? current : ""));
      return;
    }
    setSelectedClinicId((current) => {
      if (current && activeClinics.some((c) => c.id === current)) {
        return current;
      }
      return activeClinics[0].id;
    });
  }, [mode, activeClinics]);

  useEffect(() => {
    const clinicScope =
      mode === "OFFLINE" ? selectedClinicId : "";
    if (mode === "OFFLINE" && !clinicScope) return;
    setDayState(buildDayState(workTimes, mode, clinicScope));
  }, [workTimes, mode, selectedClinicId]);

  const handleTimeChange = (dow, field, value) => {
    setDayState((prev) => ({
      ...prev,
      [dow]: { ...prev[dow], [field]: value },
    }));
  };

  const saveDay = async (dow) => {
    if (saveLoading || removeLoading) return;
    if (mode === "OFFLINE" && !selectedClinicId) {
      toast.error(t("doctorDash.selectClinicForHours"));
      return;
    }

    await guardAction(async () => {
      setSavingDow(dow);
      const fd = new FormData();
      fd.append("dayOfWeek", String(dow));
      fd.append("startTime", dayState[dow].start);
      fd.append("endTime", dayState[dow].end);
      fd.append("mode", mode);
      if (mode === "OFFLINE" && selectedClinicId) {
        fd.append("clinicId", selectedClinicId);
      }
      try {
        const res = await saveFn(fd);
        if (res?.success && res.workTime) {
          toast.success(t("common.success"));
          clearSaveFetch(undefined);
          setDayState((prev) => ({
            ...prev,
            [dow]: {
              id: res.workTime.id,
              start: res.workTime.startTime,
              end: res.workTime.endTime,
            },
          }));
        }
      } finally {
        setSavingDow(null);
      }
    });
  };

  const removeDay = async (dow) => {
    const id = dayState[dow].id;
    if (!id || saveLoading || removeLoading) return;
    await guardAction(async () => {
      setClearingDow(dow);
      const fd = new FormData();
      fd.append("workTimeId", id);
      try {
        const res = await removeFn(fd);
        if (res?.success) {
          toast.success(t("common.success"));
          clearRemoveFetch(undefined);
          setDayState((prev) => ({
            ...prev,
            [dow]: {
              id: null,
              start: prev[dow].start,
              end: prev[dow].end,
            },
          }));
        }
      } finally {
        setClearingDow(null);
      }
    });
  };

  const clinicBlocked = mode === "OFFLINE" && activeClinics.length === 0;

  return (
    <div dir={dir} className="space-y-6">
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader className="space-y-3">
          <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary shrink-0" />
            {mode === "ONLINE"
              ? t("doctorDash.onlineWeeklyHours")
              : t("doctorDash.offlineWeeklyHours")}
          </CardTitle>
          <CardDescription>
            {mode === "ONLINE"
              ? t("doctorDash.hoursEgyptNote")
              : t("doctorDash.inPersonHoursClinicNote")}
          </CardDescription>
          {mode === "OFFLINE" && activeClinics.length > 0 ? (
            <div className="space-y-2 pt-1">
              <Label>{t("clinics.selectClinic")}</Label>
              <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                <SelectTrigger className="max-w-md">
                  <SelectValue placeholder={t("clinics.selectClinic")} />
                </SelectTrigger>
                <SelectContent>
                  {activeClinics.map((clinic) => (
                    <SelectItem key={clinic.id} value={clinic.id}>
                      {getClinicOptionLabel(clinic, locale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {clinicBlocked ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed border-border p-4">
              {t("doctorDash.addClinicBeforeHours")}
            </p>
          ) : (
            DAY_KEYS.map((dayKey, dow) => {
              const label = t(`common.days.${dayKey}`);
              const anyBusy = saveLoading || removeLoading;
              return (
                <div
                  key={dow}
                  className="flex flex-col gap-3 rounded-md border home-card-gradient border-0 ring-1 ring-primary/10 bg-muted/10 p-4 md:flex-row md:items-end md:justify-between"
                >
                  <div className="font-medium text-foreground min-w-28">{label}</div>
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {t("common.start")}
                      </Label>
                      <Input
                        type="time"
                        value={dayState[dow].start}
                        onChange={(e) =>
                          handleTimeChange(dow, "start", e.target.value)
                        }
                        disabled={anyBusy || clinicBlocked}
                        className="bg-background home-card-gradient border-0 ring-1 ring-primary/10 w-36"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {t("common.end")}
                      </Label>
                      <Input
                        type="time"
                        value={dayState[dow].end}
                        onChange={(e) =>
                          handleTimeChange(dow, "end", e.target.value)
                        }
                        disabled={anyBusy || clinicBlocked}
                        className="bg-background home-card-gradient border-0 ring-1 ring-primary/10 w-36"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={() => saveDay(dow)}
                      disabled={anyBusy || clinicBlocked}
                    >
                      {savingDow === dow && saveLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4 me-2" />
                          {t("common.save")}
                        </>
                      )}
                    </Button>
                    {dayState[dow].id ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => removeDay(dow)}
                        disabled={anyBusy || clinicBlocked}
                        className="border-primary/20"
                      >
                        {clearingDow === dow && removeLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="h-4 w-4 me-2" />
                            {t("common.clear")}
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
