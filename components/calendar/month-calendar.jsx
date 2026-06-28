"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

const STATE_STYLES = {
  available: "bg-primary/15 text-primary ring-1 ring-primary/30 hover:bg-primary/25",
  unavailable: "bg-muted/30 text-muted-foreground",
  booked: "bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/25",
  blocked: "bg-destructive/10 text-destructive ring-1 ring-destructive/20",
  pending: "bg-blue-500/10 text-blue-600 ring-1 ring-blue-500/20",
  selected: "bg-primary text-primary-foreground ring-2 ring-primary shadow-sm",
};

/**
 * @param {object} props
 * @param {number} props.year
 * @param {number} props.month - 1-12
 * @param {(year: number, month: number) => void} props.onMonthChange
 * @param {Array<{ date: string; state?: string; slotCount?: number; disabled?: boolean }>} [props.dayStates]
 * @param {string | null} [props.selectedDate]
 * @param {(date: string) => void} [props.onSelectDate]
 * @param {boolean} [props.showLegend]
 * @param {string} [props.dir]
 */
export function MonthCalendar({
  year,
  month,
  onMonthChange,
  dayStates = [],
  selectedDate = null,
  onSelectDate,
  showLegend = false,
  dir = "ltr",
}) {
  const { t, locale } = useLocale();

  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const startPad = firstOfMonth.getDay();

  const monthLabel = firstOfMonth.toLocaleDateString(
    locale === "ar" ? "ar-EG" : "en-US",
    { month: "long", year: "numeric" }
  );

  const stateByDate = Object.fromEntries(dayStates.map((d) => [d.date, d]));

  const prevMonth = () => {
    if (month === 1) onMonthChange(year - 1, 12);
    else onMonthChange(year, month - 1);
  };

  const nextMonth = () => {
    if (month === 12) onMonthChange(year + 1, 1);
    else onMonthChange(year, month + 1);
  };

  const weekdayLabels = [
    t("common.days.sun"),
    t("common.days.mon"),
    t("common.days.tue"),
    t("common.days.wed"),
    t("common.days.thu"),
    t("common.days.fri"),
    t("common.days.sat"),
  ];

  const cells = [];
  for (let i = 0; i < startPad; i++) {
    cells.push({ type: "pad", key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ type: "day", day, dateStr });
  }

  return (
    <div className="min-w-0 w-full space-y-3" dir={dir}>
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={prevMonth}
          aria-label={t("calendar.prevMonth")}
        >
          <ChevronLeft className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
        </Button>
        <p className="truncate text-sm font-semibold text-foreground sm:text-base">
          {monthLabel}
        </p>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={nextMonth}
          aria-label={t("calendar.nextMonth")}
        >
          <ChevronRight className={cn("h-4 w-4", dir === "rtl" && "rotate-180")} />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-medium text-muted-foreground sm:gap-1 sm:text-xs">
        {weekdayLabels.map((label) => (
          <div key={label} className="truncate py-0.5 sm:py-1">
            <span className="sm:hidden">{label.charAt(0)}</span>
            <span className="hidden sm:inline">{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1.5">
        {cells.map((cell) => {
          if (cell.type === "pad") {
            return (
              <div key={cell.key} className="aspect-square min-h-7 sm:min-h-10" />
            );
          }

          const info = stateByDate[cell.dateStr];
          const state =
            selectedDate === cell.dateStr
              ? "selected"
              : info?.state ?? "unavailable";
          const disabled =
            info?.disabled === true ||
            state === "unavailable" ||
            state === "blocked" ||
            (info?.slotCount === 0 && state !== "booked");

          return (
            <button
              key={cell.dateStr}
              type="button"
              disabled={disabled && selectedDate !== cell.dateStr}
              onClick={() => onSelectDate?.(cell.dateStr)}
              className={cn(
                "aspect-square min-h-7 rounded-md text-[11px] font-medium transition-colors sm:min-h-10 sm:text-sm",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                STATE_STYLES[state] ?? STATE_STYLES.unavailable,
                disabled &&
                  selectedDate !== cell.dateStr &&
                  "cursor-not-allowed opacity-60"
              )}
            >
              {cell.day}
              {info?.slotCount > 0 && state === "available" ? (
                <span className="mx-auto mt-0.5 block h-1 w-1 rounded-full bg-primary sm:h-1.5 sm:w-1.5" />
              ) : null}
            </button>
          );
        })}
      </div>

      {showLegend ? (
        <div className="flex flex-wrap gap-2 pt-1 text-[10px] sm:text-xs">
          {[
            ["available", t("calendar.available")],
            ["booked", t("calendar.booked")],
            ["blocked", t("calendar.blocked")],
            ["unavailable", t("calendar.unavailable")],
          ].map(([key, label]) => (
            <span
              key={key}
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5",
                STATE_STYLES[key]
              )}
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
