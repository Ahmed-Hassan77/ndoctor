"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";

export function HeaderControls() {
  return (
    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
      <LanguageSwitcher compact />
      <ThemeToggle />
    </div>
  );
}
