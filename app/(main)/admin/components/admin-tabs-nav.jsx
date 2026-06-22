"use client";

import {
  ShieldCheck,
  AlertCircle,
  Users,
  CreditCard,
  ClipboardList,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import { useLocale } from "@/components/locale-provider";
import {
  DashboardPanel,
  dashboardTabTriggerClass,
  dashboardTabsGridClass,
  dashboardTabsListClass,
} from "@/components/dashboard/dashboard-shell";

const TABS = [
  { value: "overview", icon: LayoutDashboard, labelKey: "admin.overview" },
  { value: "pending", icon: AlertCircle, labelKey: "admin.verification" },
  { value: "doctors", icon: Users, labelKey: "admin.doctors" },
  { value: "appointments", icon: ClipboardList, labelKey: "admin.appointments" },
  { value: "payments", icon: CreditCard, labelKey: "admin.payments" },
  { value: "payouts", icon: CreditCard, labelKey: "admin.payouts" },
  { value: "support", icon: LifeBuoy, labelKey: "admin.support" },
  { value: "reviews", icon: MessageSquare, labelKey: "admin.reviews" },
  { value: "patients", icon: Users, labelKey: "admin.patients" },
  { value: "analytics", icon: Sparkles, labelKey: "admin.analytics" },
];

export function AdminTabsNav({ children }) {
  const { t } = useLocale();

  return (
    <>
      <PageHeader
        icon={<ShieldCheck />}
        title={t("nav.adminDashboard")}
        backLink="/"
      />
      <Tabs defaultValue="overview" className={dashboardTabsGridClass}>
        <TabsList
          className={`${dashboardTabsListClass} flex-wrap sm:flex-row md:flex-col md:flex-nowrap`}>
          {TABS.map(({ value, icon: Icon, labelKey }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={`${dashboardTabTriggerClass} text-xs sm:text-sm`}>
              <Icon className="hidden size-4 shrink-0 md:inline" />
              <span>{t(labelKey)}</span>
            </TabsTrigger>
          ))}
        </TabsList>
        <DashboardPanel>{children}</DashboardPanel>
      </Tabs>
    </>
  );
}
