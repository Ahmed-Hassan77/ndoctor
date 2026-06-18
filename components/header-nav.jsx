"use client";

import Link from "next/link";
import {
  Calendar,
  CreditCard,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  User,
  Heart,
  LifeBuoy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/locale-provider";

export function HeaderNav({ user }) {
  const { t } = useLocale();

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link href="/doctors" className="hidden sm:block">
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          {t("nav.findDoctors")}
        </Button>
      </Link>

      {user?.role === "ADMIN" && (
        <Link href="/admin">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex items-center gap-2"
          >
            <ShieldCheck className="h-4 w-4" />
            {t("nav.adminDashboard")}
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden size-9">
            <ShieldCheck className="h-4 w-4" />
          </Button>
        </Link>
      )}

      {user?.role === "DOCTOR" && (
        <>
          <Link href="/support">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex items-center gap-2"
            >
              <LifeBuoy className="h-4 w-4" />
              {t("nav.support")}
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden size-9">
              <LifeBuoy className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/doctor">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex items-center gap-2"
            >
              <Stethoscope className="h-4 w-4" />
              {t("nav.doctorDashboard")}
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden size-9">
              <Stethoscope className="h-4 w-4" />
            </Button>
          </Link>
        </>
      )}

      {user?.role === "ADMIN" && (
        <Link href="/support">
          <Button variant="ghost" size="icon" className="size-9" title={t("nav.support")}>
            <LifeBuoy className="h-4 w-4" />
          </Button>
        </Link>
      )}

      {user?.role === "PATIENT" && (
        <>
          <Link href="/appointments">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex items-center gap-2"
            >
              <Calendar className="h-4 w-4" />
              {t("nav.myAppointments")}
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden size-9">
              <Calendar className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/favorites">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex items-center gap-2"
            >
              <Heart className="h-4 w-4" />
              {t("nav.savedDoctors")}
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden size-9">
              <Heart className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/support">
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex items-center gap-2"
            >
              <LifeBuoy className="h-4 w-4" />
              {t("nav.support")}
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:inline-flex lg:hidden size-9">
              <LifeBuoy className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/patient/profile">
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex items-center gap-2"
            >
              <HeartPulse className="h-4 w-4" />
              {t("nav.medicalProfile")}
            </Button>
            <Button variant="ghost" size="icon" className="hidden md:inline-flex lg:hidden size-9">
              <HeartPulse className="h-4 w-4" />
            </Button>
          </Link>
        </>
      )}

      {user?.role === "UNASSIGNED" && (
        <Link href="/onboarding">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            {t("nav.completeProfile")}
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden size-9">
            <User className="h-4 w-4" />
          </Button>
        </Link>
      )}

      {user?.role === "PATIENT" && (
        <Link href="/pricing">
          <Badge
            variant="outline"
            className="h-9 border-primary/25 bg-primary/5 px-2 sm:px-3 flex items-center gap-1.5"
          >
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            <span className="text-primary hidden md:inline text-xs">
              {t("nav.payments")}
            </span>
          </Badge>
        </Link>
      )}
    </div>
  );
}
