"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

export function DoctorsEmptyResults({ titleKey, descriptionKey, showReset }) {
  const { t } = useLocale();
  return (
    <Card className="border-dashed border-border">
      <CardContent className="flex flex-col items-center py-14 text-center">
        <SearchX className="mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-xl font-semibold text-foreground">{t(titleKey)}</h3>
        <p className="mt-2 max-w-md text-muted-foreground">{t(descriptionKey)}</p>
        {showReset && (
          <Button asChild className="mt-6">
            <Link href="/doctors">{t("doctors.resetFilters")}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
