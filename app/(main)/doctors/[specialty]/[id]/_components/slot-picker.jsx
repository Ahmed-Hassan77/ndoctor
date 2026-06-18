"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { filterPastSlotsFromDays } from "@/lib/appointment-slots";
import { useLocale } from "@/components/locale-provider";
import { SlotTimeLabel } from "@/components/booking/slot-time-label";

export function SlotPicker({ days, onSelectSlot, dir = "ltr", cutoffMs }) {
  const { t } = useLocale();
  const [defaultCutoffMs] = useState(() => Date.now());
  const cutoff = cutoffMs ?? defaultCutoffMs;
  const visibleDays = useMemo(
    () => filterPastSlotsFromDays(days, cutoff),
    [days, cutoff]
  );
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [weekOpen, setWeekOpen] = useState(true);
  const [expandedDays, setExpandedDays] = useState(() => {
    const initial = {};
    for (const d of visibleDays) {
      if (d.slots?.length > 0) initial[d.date] = true;
    }
    return initial;
  });

  const toggleDay = (date) => {
    setExpandedDays((prev) => ({
      ...prev,
      [date]: !prev[date],
    }));
  };

  const confirmSelection = () => {
    if (selectedSlot) onSelectSlot(selectedSlot);
  };

  return (
    <div className="min-w-0 w-full space-y-3" dir={dir}>
      <button
        type="button"
        onClick={() => setWeekOpen((o) => !o)}
        className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border home-card-gradient border-0 ring-1 ring-primary/10 bg-primary/5 px-3 py-2.5 text-start transition-colors hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="break-words text-sm font-medium text-foreground">
          {t("slotPicker.thisWeek")}
        </span>
        <ChevronRight
          className={cn(
            "h-5 w-5 shrink-0 text-primary transition-transform duration-200",
            weekOpen && "rotate-90"
          )}
          aria-hidden
        />
      </button>

      {weekOpen && (
        <div className="min-w-0 space-y-2 border-s-2 home-card-gradient border-0 ring-1 ring-primary/10 ps-2">
          {visibleDays.map((day) => {
            const open = Boolean(expandedDays[day.date]);
            const slotCount = day.slots.length;

            return (
              <div
                key={day.date}
                className="min-w-0 overflow-hidden rounded-lg border border-primary/15 bg-muted/5"
              >
                <button
                  type="button"
                  onClick={() => toggleDay(day.date)}
                  className="flex w-full min-w-0 items-center justify-between gap-2 px-3 py-2.5 text-start hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {day.weekdayLabel ?? t("slotPicker.day")}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {day.displayDate}
                      {slotCount > 0 ? (
                        <span className="text-primary/90">
                          {" "}
                          · {slotCount}{" "}
                          {slotCount === 1
                            ? t("slotPicker.slot")
                            : t("slotPicker.slots")}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 text-primary transition-transform duration-200",
                      open && "rotate-90"
                    )}
                    aria-hidden
                  />
                </button>

                {open && (
                  <div className="border-t border-primary/15 px-2 py-2 sm:px-3">
                    {slotCount === 0 ? (
                      <p className="py-2 text-center text-xs text-muted-foreground">
                        {t("slotPicker.noSlots")}
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {day.slots.map((slot) => {
                          const selected =
                            selectedSlot?.startTime === slot.startTime &&
                            selectedSlot?.endTime === slot.endTime;
                          return (
                            <button
                              type="button"
                              key={`${slot.startTime}-${slot.endTime}`}
                              onClick={() => setSelectedSlot(slot)}
                              className={cn(
                                "flex min-h-[4.5rem] w-full min-w-0 items-center rounded-lg border px-3 py-2.5 text-start transition-all",
                                selected
                                  ? "border-primary bg-primary/15 text-foreground shadow-sm"
                                  : "home-card-gradient border-0 ring-1 ring-primary/10 text-muted-foreground hover:border-primary/25 hover:bg-primary/5 hover:text-foreground"
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-stretch border-t border-primary/15 pt-3 sm:justify-end">
        <Button
          type="button"
          onClick={confirmSelection}
          disabled={!selectedSlot}
          className="w-full  sm:w-auto"
        >
          {t("common.confirm")}
          <ChevronRight className="ms-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
