"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setLocale } from "@/actions/locale";
import { useLocale } from "@/components/locale-provider";

export function LanguageSwitcher({ compact = false }) {
  const { locale, t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onChange = (value) => {
    if (value === locale) return;
    const fd = new FormData();
    fd.set("locale", value);
    startTransition(async () => {
      await setLocale(fd);
      router.refresh();
    });
  };

  if (compact) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 shrink-0"
        disabled={pending}
        title={t("lang.switch")}
        onClick={() => onChange(locale === "ar" ? "en" : "ar")}
        aria-label={t("lang.switch")}
      >
        <Languages className="h-4 w-4" />
        <span className="sr-only">{locale === "ar" ? "EN" : "ع"}</span>
      </Button>
    );
  }

  return (
    <Select value={locale} onValueChange={onChange} disabled={pending}>
      <SelectTrigger
        className="h-9 w-[7.5rem] text-xs"
        aria-label={t("lang.switch")}
      >
        <Languages className="h-3.5 w-3.5 me-1 shrink-0 opacity-70" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value="en">{t("lang.english")}</SelectItem>
        <SelectItem value="ar">{t("lang.arabic")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
