import { cn } from "@/lib/utils";

/**
 * @param {{ title: string; icon?: React.ComponentType<{ className?: string }>; className?: string }} props
 */
export function HomeSectionHeading({ title, icon: Icon, className }) {
  return (
    <div className={cn("mb-10 text-center md:mb-12", className)}>
      {Icon ? (
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="size-8 text-primary" />
        </div>
      ) : null}
      <h2 className="gradient-title mb-4 text-3xl font-bold md:text-4xl">{title}</h2>
      <div
        aria-hidden
        className="mx-auto h-1 w-24 rounded-full bg-gradient-to-r from-primary to-blue-900"
      />
    </div>
  );
}
