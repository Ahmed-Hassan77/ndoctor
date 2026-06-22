"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/locale-provider";
import { HeaderNav } from "@/components/header-nav";
import { HeaderControls } from "@/components/header-controls";
import AuthSection from "@/components/auth-buttons";

/**
 * @param {{ user: import("@prisma/client").User | null | undefined }} props
 */
export function HeaderMobileMenu({ user }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-1 lg:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9"
        aria-expanded={open}
        aria-label={open ? t("common.close") : t("nav.menu")}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-16 z-40 bg-background/80 backdrop-blur-sm"
            aria-label={t("common.close")}
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-b border-border bg-background shadow-lg">
            <div className="container mx-auto flex flex-col gap-4 px-4 py-4">
              <Link
                href="/doctors"
                className="text-sm font-medium text-foreground"
                onClick={() => setOpen(false)}
              >
                {t("nav.findDoctors")}
              </Link>
              <HeaderNav user={user} />
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <HeaderControls />
                <AuthSection />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
