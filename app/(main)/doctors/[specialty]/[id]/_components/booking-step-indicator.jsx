"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

/**
 * @param {{ current: string; className?: string }} props
 */
export function BookingStepIndicator({ current, className }) {
  const { t, dir } = useLocale();
  const STEPS = [
    { id: "mode", label: t("booking.stepMode") },
    { id: "slot", label: t("booking.stepSlot") },
    { id: "concern", label: t("booking.stepDetails") },
    { id: "confirm", label: t("booking.stepConfirm") },
  ];
  const currentIndex = STEPS.findIndex((s) => s.id === current);

  return (
    <nav
      dir={dir}
      aria-label={t("booking.progressLabel")}
      className={cn("min-w-0 overflow-x-auto", className)}
    >
      <ol className="flex min-w-max items-center gap-1 pb-0.5 text-[11px] sm:text-sm">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = step.id === current;
          const isClinicStep = current === "clinic" && step.id === "slot";
          const stepActive = active || isClinicStep;
          return (
            <li key={step.id} className="flex shrink-0 items-center gap-1">
              {index > 0 && (
                <span
                  className="mx-0.5 text-muted-foreground"
                  aria-hidden
                >
                  /
                </span>
              )}
              <span
                className={cn(
                  "inline-flex max-w-[7.5rem] items-center gap-1 rounded-full px-1.5 py-0.5 font-medium sm:max-w-none sm:px-2",
                  stepActive && "bg-primary/15 text-primary",
                  done && !stepActive && "text-primary/80",
                  !stepActive && !done && "text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="h-3 w-3 shrink-0" aria-hidden />
                ) : (
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]",
                      stepActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </span>
                )}
                <span className="truncate">{step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
