"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MonthCalendar } from "@/components/calendar/month-calendar";
import { getAvailableSlotsForMonth } from "@/actions/appointments";
import { useLocale } from "@/components/locale-provider";
import { SlotTimeLabel } from "@/components/booking/slot-time-label";

/**
 * @param {object} props
 * @param {string} props.doctorId
 * @param {'ONLINE' | 'OFFLINE'} props.mode
 * @param {string | null} [props.clinicId]
 * @param {(slot: object) => void} props.onSelectSlot
 * @param {string} [props.dir]
 */
export function MonthSlotPicker({
  doctorId,
  mode,
  clinicId = null,
  onSelectSlot,
  dir = "ltr",
}) {
  const { t } = useLocale();
  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState([]);
  const [dayStates, setDayStates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  useEffect(() => {
    if (mode === "OFFLINE" && !clinicId) {
      setDays([]);
      setDayStates([]);
      setSelectedDate(null);
      setSelectedSlot(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setSelectedDate(null);
      setSelectedSlot(null);
      const res = await getAvailableSlotsForMonth({
        doctorId,
        year,
        month,
        mode,
        clinicId,
        clientNowIso: new Date().toISOString(),
      });
      if (!cancelled && res?.success) {
        setDays(res.days ?? []);
        setDayStates(res.dayStates ?? []);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorId, mode, clinicId, year, month]);

  const handleMonthChange = (y, m) => {
    setYear(y);
    setMonth(m);
  };

  const slotsForDay = days.find((d) => d.date === selectedDate)?.slots ?? [];
  const monthHasSlots = days.some((d) => (d.slots?.length ?? 0) > 0);

  return (
    <div className="min-w-0 space-y-4" dir={dir}>
      <div className="relative">
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : null}
        <MonthCalendar
          year={year}
          month={month}
          onMonthChange={handleMonthChange}
          dayStates={dayStates}
          selectedDate={selectedDate}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setSelectedSlot(null);
          }}
          dir={dir}
        />
      </div>

      {!loading && !monthHasSlots ? (
        <div className="rounded-lg border border-dashed border-primary/20 px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">
            {t("calendar.noAvailabilityMonth")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("calendar.tryAnotherMonth")}
          </p>
        </div>
      ) : null}

      {selectedDate ? (
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-foreground">
            {t("calendar.selectTime")}
          </p>
          {slotsForDay.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("slotPicker.noSlots")}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {slotsForDay.map((slot) => {
                const selected = selectedSlot?.startTime === slot.startTime;
                return (
                  <button
                    key={slot.startTime}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      "flex min-h-[4.5rem] w-full min-w-0 items-center rounded-lg border px-3 py-2.5 text-start transition-colors",
                      selected
                        ? "border-primary bg-primary/15 shadow-sm"
                        : "border-primary/15 hover:border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    <SlotTimeLabel
                      startTime={slot.startTime}
                      endTime={slot.endTime}
                      variant="stacked"
                    />
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-stretch pt-2 sm:justify-end">
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!selectedSlot}
              onClick={() => selectedSlot && onSelectSlot(selectedSlot)}
            >
              {t("common.confirm")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
