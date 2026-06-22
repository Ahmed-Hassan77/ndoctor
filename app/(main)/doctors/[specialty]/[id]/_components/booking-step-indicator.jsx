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
      className={cn("min-w-0", className)}
    >
      <ol className="flex flex-wrap items-center gap-1 text-xs sm:text-sm">
        {STEPS.map((step, index) => {
          const done = index < currentIndex;
          const active = step.id === current;
          return (
            <li key={step.id} className="flex min-w-0 items-center gap-1">
              {index > 0 && (
                <span
                  className="mx-0.5 hidden text-muted-foreground sm:inline"
                  aria-hidden
                >
                  /
                </span>
              )}
              <span
                className={cn(
                  "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 font-medium",
                  active && "bg-primary/15 text-primary",
                  done && !active && "text-primary/80",
                  !active && !done && "text-muted-foreground"
                )}
              >
                {done ? (
                  <Check className="h-3 w-3 shrink-0" aria-hidden />
                ) : (
                  <span
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px]",
                      active
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
