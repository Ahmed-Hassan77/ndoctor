"use client";

import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLocale } from "@/components/locale-provider";

/**
 * @param {{ error: Error & { digest?: string }; reset: () => void }} props
 */
export function RouteError({ error, reset }) {
  const { t, dir } = useLocale();

  return (
    <div dir={dir} className="flex min-h-[40vh] items-center justify-center py-12">
      <div className="w-full max-w-md space-y-4">
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("errors.genericTitle")}</AlertTitle>
          <AlertDescription>{t("errors.genericDescription")}</AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={reset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t("errors.tryAgain")}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/">{t("nav.home")}</Link>
          </Button>
        </div>
        {process.env.NODE_ENV === "development" && error?.message ? (
          <p className="text-xs text-muted-foreground break-all">{error.message}</p>
        ) : null}
      </div>
    </div>
  );
}
