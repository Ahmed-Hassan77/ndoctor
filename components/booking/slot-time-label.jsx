"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatSlotTimeRange } from "@/lib/appointment-display";
import { useLocale } from "@/components/locale-provider";

/**
 * @param {object} props
 * @param {string} props.startTime ISO start
 * @param {string} props.endTime ISO end
 * @param {"compact" | "stacked"} [props.variant]
 * @param {boolean} [props.showIcon]
 * @param {string} [props.className]
 */
export function SlotTimeLabel({
  startTime,
  endTime,
  variant = "stacked",
  showIcon = true,
  className,
}) {
  const { t } = useLocale();
  const { start, end } = formatSlotTimeRange(startTime, endTime);

  if (variant === "compact") {
    return (
      <span className={cn("inline-flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5", className)}>
        {showIcon ? <Clock className="size-3.5 shrink-0 text-primary" aria-hidden /> : null}
        <span className="font-semibold tabular-nums">{start}</span>
        <span className="text-muted-foreground" aria-hidden>
          –
        </span>
        <span className="font-semibold tabular-nums">{end}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-start gap-2 text-start",
        className
      )}
    >
      {showIcon ? (
        <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      ) : null}
      <span className="min-w-0 leading-snug">
        <span className="block text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          {t("slotPicker.startsAt")}
        </span>
        <span className="block text-sm font-semibold tabular-nums text-foreground">
          {start}
        </span>
        <span className="mt-1 block text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground">
          {t("slotPicker.endsAt")}
        </span>
        <span className="block text-sm font-semibold tabular-nums text-foreground">
          {end}
        </span>
      </span>
    </span>
  );
}
