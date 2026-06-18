import { cn } from "@/lib/utils";

/**
 * Panel wrapper matching the public-site / doctors marketplace shell.
 * @param {{ children: React.ReactNode; className?: string }} props
 */
export function DashboardShell({ children, className }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-border/50 bg-gradient-to-br from-muted/30 via-background to-primary/[0.04] p-5 shadow-sm md:p-8",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * @param {{ children: React.ReactNode; className?: string }} props
 */
export function DashboardPanel({ children, className }) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border border-primary/10 bg-card/90 p-5 shadow-sm ring-1 ring-primary/5 backdrop-blur-sm md:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export const dashboardTabsListClass =
  "flex h-auto min-h-14 w-full self-start flex-col gap-1 rounded-2xl border border-primary/10 bg-card/90 p-2 shadow-sm backdrop-blur-sm md:min-h-0 md:col-span-1";

export const dashboardTabTriggerClass =
  "flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all data-active:bg-primary data-active:text-primary-foreground data-active:shadow-md md:justify-start";

export const dashboardTabsGridClass =
  "grid grid-cols-1 gap-6 md:items-start md:grid-cols-[minmax(11rem,14rem)_1fr]";
