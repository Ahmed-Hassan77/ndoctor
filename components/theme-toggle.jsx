"use client";

import { useTheme } from "@/components/theme-provider";
import { useSyncExternalStore } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { t } = useLocale();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="size-9 shrink-0"
        aria-hidden
      />
    );
  }

  const cycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const Icon =
    theme === "system"
      ? Monitor
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  const label =
    theme === "light"
      ? t("theme.light")
      : theme === "dark"
        ? t("theme.dark")
        : t("theme.system");

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-9 shrink-0"
      onClick={cycle}
      title={t("theme.toggle")}
      aria-label={`${t("theme.toggle")}: ${label}`}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
