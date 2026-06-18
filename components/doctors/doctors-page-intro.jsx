"use client";

import { useLocale } from "@/components/locale-provider";

export function DoctorsPageIntro() {
  const { t } = useLocale();
  return (
    <div className="mb-8 flex flex-col items-center gap-2 text-center lg:items-start lg:text-start">
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl lg:text-[2.35rem]">
        <span className="gradient-title">{t("doctors.title")}</span>
      </h1>
      <div
        aria-hidden
        className="h-1 w-24 rounded-full bg-gradient-to-r from-primary to-blue-900"
      />
      <p className="max-w-2xl pt-2 text-base text-muted-foreground md:text-lg">
        {t("doctors.subtitle")}
      </p>
    </div>
  );
}
