"use client";

import { memo } from "react";
import { getSpecialtyVisual } from "@/lib/specialities";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-7 w-7",
};

/**
 * @param {object} props
 * @param {string} props.name
 * @param {"sm" | "md" | "lg"} [props.size]
 * @param {string} [props.className]
 */
export const SpecialtyIcon = memo(function SpecialtyIcon({
  name,
  size = "md",
  className,
}) {
  const { icon: Icon, accent } = getSpecialtyVisual(name);
  return (
    <Icon
      className={cn(SIZE_CLASS[size], accent, className)}
      aria-hidden
    />
  );
});

/**
 * @param {object} props
 * @param {string} props.name
 * @param {"sm" | "md" | "lg"} [props.iconSize]
 * @param {string} [props.className]
 */
export const SpecialtyIconBadge = memo(function SpecialtyIconBadge({
  name,
  iconSize = "md",
  className,
}) {
  const { bg } = getSpecialtyVisual(name);
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        iconSize === "lg" ? "h-12 w-12" : iconSize === "sm" ? "h-8 w-8" : "h-10 w-10",
        bg,
        className
      )}
    >
      <SpecialtyIcon name={name} size={iconSize} />
    </div>
  );
});
