"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import React from "react";
import { Button } from "./ui/button";
import { useLocale } from "@/components/locale-provider";

/**
 * @param {object} props
 * @param {React.ReactNode} [props.icon]
 * @param {string} props.title
 * @param {string} [props.backLink]
 * @param {string} [props.backLabel]
 */
export function PageHeader({
  icon,
  title,
  backLink = "/",
  backLabel,
}) {
  const { t, dir } = useLocale();
  const label = backLabel ?? t("nav.home");

  return (
    <div dir={dir} className="mb-8 flex flex-col justify-between gap-5">
      <Link href={backLink}>
        <Button variant="outline" size="sm" className="mb-2 border-primary/20">
          <ArrowLeft className="h-4 w-4 me-2" />
          {label}
        </Button>
      </Link>
      <div className="flex items-end gap-3">
        {icon && (
          <div className="text-primary shrink-0">
            {React.cloneElement(icon, {
              className: "h-10 w-10 md:h-12 md:w-12",
            })}
          </div>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl lg:text-5xl gradient-title">
          {title}
        </h1>
      </div>
    </div>
  );
}
