"use client";



import { useEffect, useMemo, useRef, useState } from "react";

import { Loader2 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {

  Select,

  SelectContent,

  SelectItem,

  SelectTrigger,

  SelectValue,

} from "@/components/ui/select";

import { MonthCalendar } from "@/components/calendar/month-calendar";

import { getDoctorScheduleCalendar } from "@/actions/calendar";

import { useLocale } from "@/components/locale-provider";

import { formatAppointmentTime } from "@/lib/appointment-display";

import {

  beginDedupedRequest,

  endDedupedRequest,

} from "@/hooks/use-inflight";



/**

 * @param {object} props

 * @param {Array<{ id: string; name: string }>} [props.clinics]

 * @param {string} [props.dir]

 * @param {boolean} [props.enabled]

 */

export function DoctorScheduleCalendar({

  clinics = [],

  dir = "ltr",

  enabled = true,

}) {

  const { t, labels } = useLocale();

  const now = useMemo(() => new Date(), []);

  const [year, setYear] = useState(now.getFullYear());

  const [month, setMonth] = useState(now.getMonth() + 1);

  const [mode, setMode] = useState("ONLINE");

  const [clinicId, setClinicId] = useState("");

  const [loading, setLoading] = useState(true);

  const [dayStates, setDayStates] = useState([]);

  const [appointments, setAppointments] = useState([]);

  const [selectedDate, setSelectedDate] = useState(null);



  const requestIdRef = useRef(0);

  const activeKeyRef = useRef(null);



  const fetchKey = `${year}-${month}-${mode}-${clinicId || "all"}`;



  useEffect(() => {

    if (!enabled) {

      setLoading(false);

      return;

    }



    const { skip, requestId } = beginDedupedRequest(

      activeKeyRef,

      requestIdRef,

      fetchKey

    );

    if (skip) return;



    let cancelled = false;



    (async () => {

      setLoading(true);

      try {

        const res = await getDoctorScheduleCalendar({

          year,

          month,

          mode,

          clinicId: mode === "OFFLINE" && clinicId ? clinicId : null,

        });

        if (

          !cancelled &&

          requestId === requestIdRef.current &&

          res?.success

        ) {

          setDayStates(res.dayStates ?? []);

          setAppointments(res.appointments ?? []);

        }

      } finally {

        endDedupedRequest(activeKeyRef, fetchKey);

        if (!cancelled && requestId === requestIdRef.current) {

          setLoading(false);

        }

      }

    })();



    return () => {

      cancelled = true;

      endDedupedRequest(activeKeyRef, fetchKey);

    };

  }, [enabled, fetchKey, year, month, mode, clinicId]);



  const dayAppointments = selectedDate

    ? appointments.filter((a) => {

        const d = new Date(a.startTime);

        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

        return key === selectedDate;

      })

    : [];



  return (

    <Card className="home-card-gradient border-0 ring-1 ring-primary/10" dir={dir}>

      <CardHeader className="space-y-3">

        <CardTitle className="text-lg">{t("calendar.doctorScheduleTitle")}</CardTitle>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">

          <Select value={mode} onValueChange={setMode}>

            <SelectTrigger className="w-full sm:w-[160px]">

              <SelectValue />

            </SelectTrigger>

            <SelectContent>

              <SelectItem value="ONLINE">{t("doctorDash.onlineTab")}</SelectItem>

              <SelectItem value="OFFLINE">{t("doctorDash.offlineTab")}</SelectItem>

            </SelectContent>

          </Select>

          {mode === "OFFLINE" && clinics.length > 0 ? (

            <Select value={clinicId || "all"} onValueChange={(v) => setClinicId(v === "all" ? "" : v)}>

              <SelectTrigger className="w-full sm:w-[200px]">

                <SelectValue placeholder={t("clinics.selectClinic")} />

              </SelectTrigger>

              <SelectContent>

                <SelectItem value="all">{t("clinics.allClinics")}</SelectItem>

                {clinics.map((c) => (

                  <SelectItem key={c.id} value={c.id}>

                    {c.name}

                  </SelectItem>

                ))}

              </SelectContent>

            </Select>

          ) : null}

        </div>

      </CardHeader>

      <CardContent className="space-y-4">

        <div className="relative">

          {loading ? (

            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">

              <Loader2 className="h-6 w-6 animate-spin text-primary" />

            </div>

          ) : null}

          <MonthCalendar

            year={year}

            month={month}

            onMonthChange={(y, m) => {

              setYear(y);

              setMonth(m);

            }}

            dayStates={dayStates}

            selectedDate={selectedDate}

            onSelectDate={setSelectedDate}

            showLegend

            dir={dir}

          />

        </div>

        {selectedDate ? (

          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">

            <p className="text-sm font-medium text-foreground mb-2">

              {t("calendar.dayDetail")} — {selectedDate}

            </p>

            {dayAppointments.length === 0 ? (

              <p className="text-xs text-muted-foreground">{t("calendar.noAppointmentsDay")}</p>

            ) : (

              <ul className="space-y-2 text-sm">

                {dayAppointments.map((a) => (

                  <li key={a.id} className="flex flex-wrap justify-between gap-2">

                    <span>{formatAppointmentTime(a.startTime)}</span>

                    <span className="text-muted-foreground">

                      {labels.appointmentStatus(a.status)}

                    </span>

                  </li>

                ))}

              </ul>

            )}

          </div>

        ) : null}

      </CardContent>

    </Card>

  );

}


