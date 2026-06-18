import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * @param {{ label?: string; variant?: "spinner" | "skeleton" }} props
 */
export function RouteLoading({ label, variant = "spinner" }) {
  if (variant === "skeleton") {
    return (
      <div className="space-y-4 py-4" aria-busy="true" aria-live="polite">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-16"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      {label ? (
        <p className="text-sm text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}
