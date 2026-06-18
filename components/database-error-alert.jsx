"use client";

import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocale } from "@/components/locale-provider";
import { DB_UNAVAILABLE } from "@/lib/db-safe";

/**
 * @param {{ code?: string | null; className?: string }} props
 */
export function DatabaseErrorAlert({ code, className = "" }) {
  const { t } = useLocale();
  if (!code) return null;

  const title =
    code === DB_UNAVAILABLE
      ? t("errors.databaseTitle")
      : t("errors.genericTitle");
  const description =
    code === DB_UNAVAILABLE
      ? t("errors.databaseDescription")
      : t("errors.genericDescription");

  return (
    <Alert
      variant="destructive"
      className={`border-destructive/30 bg-destructive/5 ${className}`}
    >
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{description}</AlertDescription>
    </Alert>
  );
}
