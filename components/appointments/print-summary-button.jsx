"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export function PrintSummaryButton() {
  const { t } = useLocale();

  return (
    <Button
      type="button"
      className="no-print "
      onClick={() => window.print()}
    >
      <Printer className="h-4 w-4 me-2" />
      {t("appointments.printSummary")}
    </Button>
  );
}
