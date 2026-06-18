import React from "react";
import Link from "next/link";
import Image from "next/image";
import AuthSection from "./auth-buttons";
import { checkUser } from "@/lib/checkUser";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { HeaderNav } from "@/components/header-nav";
import { HeaderControls } from "@/components/header-controls";
import { HeaderMobileMenu } from "@/components/header-mobile-menu";
import { getServerI18n } from "@/lib/server-i18n";

export default async function Header() {
  const user = await checkUser();
  const { t } = await getServerI18n();

  return (
    <header className="glass-header fixed top-0 z-50 w-full shadow-sm">
      <nav className="container mx-auto flex h-[4.5rem] items-center justify-between gap-2 px-4 lg:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <Image
            src="/logo-single.png"
            alt={t("footer.brandName")}
            width={200}
            height={60}
            className="h-9 w-auto object-contain sm:h-10"
            priority
          />
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-2">
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            <HeaderNav user={user} />
          </div>
          {user &&
            (user.role === "PATIENT" ||
              user.role === "DOCTOR" ||
              user.role === "ADMIN") && (
              <NotificationBell userRole={user.role} />
            )}
          <div className="hidden lg:flex lg:items-center lg:gap-1">
            <HeaderControls />
            <AuthSection />
          </div>
          <HeaderMobileMenu user={user} />
        </div>
      </nav>
    </header>
  );
}
