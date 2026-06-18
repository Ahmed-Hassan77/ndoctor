"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Doctor photo from synced User.imageUrl with fallback if missing or load fails.
 * @param {object} props
 * @param {string | null | undefined} props.imageUrl
 * @param {string} [props.name]
 * @param {"sm" | "md" | "lg" | "profile" | "cover"} [props.size]
 * @param {string} [props.className]
 */
export function DoctorAvatar({
  imageUrl,
  name = "Doctor",
  size = "md",
  className,
}) {
  const [failed, setFailed] = useState(false);

  const sizeClasses = {
    sm: "h-12 w-12 rounded-full",
    md: "h-16 w-16 sm:h-20 sm:w-20 rounded-full",
    lg: "h-20 w-20 rounded-full",
    profile: "h-28 w-28 sm:h-32 sm:w-32 rounded-2xl",
    cover: "relative h-full w-full min-h-[220px] rounded-2xl",
  };

  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    profile: "h-14 w-14",
    cover: "h-16 w-16",
  };

  const dim = sizeClasses[size] ?? sizeClasses.md;
  const showImage = Boolean(imageUrl?.trim()) && !failed;
  const isCover = size === "cover";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden bg-primary/10",
        dim,
        className
      )}
    >
      {showImage ? (
        <Image
          src={imageUrl}
          alt={name}
          fill
          className={cn(
            "object-cover",
            isCover && "transition-transform duration-500 group-hover:scale-105"
          )}
          sizes={
            isCover
              ? "(max-width: 768px) 90vw, 320px"
              : size === "sm"
                ? "48px"
                : size === "profile"
                  ? "128px"
                  : "80px"
          }
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full min-h-[200px] w-full items-center justify-center bg-muted/80">
          <User
            className={cn(iconSizes[size] ?? iconSizes.md, "text-primary/70")}
          />
        </div>
      )}
    </div>
  );
}
