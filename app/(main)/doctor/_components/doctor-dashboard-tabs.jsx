"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, Clock, DollarSign, Video, MapPin } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import {
  DashboardPanel,
  dashboardTabTriggerClass,
  dashboardTabsGridClass,
  dashboardTabsListClass,
} from "@/components/dashboard/dashboard-shell";
import DoctorAppointmentsList from "./appointments-list";
import { DoctorEarnings } from "./doctor-earnings";
import { DoctorProfileSettings } from "./doctor-profile-settings";
import { DoctorScheduleCalendar } from "./doctor-schedule-calendar";
import { ClinicsManager } from "./clinics-manager";
import { AvailabilityExceptionsPanel } from "./availability-exceptions";
import { WorkTimeSettings } from "./work-time-settings";

/**
 * Client shell for the doctor dashboard. Heavy availability widgets mount only
 * after the user opens that tab, avoiding eager server-action storms on load.
 */
export function DoctorDashboardTabs({
  user,
  activeAppointments,
  historyAppointments,
  earnings,
  payouts,
  initialClinics,
  initialExceptions,
  onlineWorkTimes,
  offlineWorkTimes,
  workTimeKeyOnline,
  workTimeKeyOffline,
}) {
  const { t, dir } = useLocale();
  const [activeTab, setActiveTab] = useState("earnings");

  const activeClinics = useMemo(
    () => initialClinics.filter((c) => c.isActive),
    [initialClinics]
  );

  const handleTabChange = (value) => {
    setActiveTab(value);
  };

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className={dashboardTabsGridClass}
    >
      <TabsList
        className={`${dashboardTabsListClass} flex sm:flex-row md:flex-col`}
      >
        <TabsTrigger value="earnings" className={dashboardTabTriggerClass}>
          <DollarSign className="hidden size-4 md:inline" />
          <span>{t("doctorDash.earnings")}</span>
        </TabsTrigger>
        <TabsTrigger value="appointments" className={dashboardTabTriggerClass}>
          <Calendar className="hidden size-4 md:inline" />
          <span>{t("doctorDash.tabAppointments")}</span>
        </TabsTrigger>
        <TabsTrigger value="availability" className={dashboardTabTriggerClass}>
          <Clock className="hidden size-4 md:inline" />
          <span>{t("doctorDash.availability")}</span>
        </TabsTrigger>
      </TabsList>
      <DashboardPanel>
        <TabsContent value="appointments" className="border-none p-0">
          <DoctorAppointmentsList
            activeAppointments={activeAppointments}
            historyAppointments={historyAppointments}
            dir={dir}
          />
        </TabsContent>
        <TabsContent value="availability" className="border-none p-0 space-y-6">
          {activeTab === "availability" ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="home-card-gradient flex items-start gap-3 rounded-2xl p-4 ring-1 ring-primary/10">
                  <Video className="mt-0.5 size-6 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {t("doctorDash.manageOnlineTitle")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("doctorDash.manageOnlineDesc")}
                    </p>
                  </div>
                </div>
                <div className="home-card-gradient flex items-start gap-3 rounded-2xl p-4 ring-1 ring-primary/10">
                  <MapPin className="mt-0.5 size-6 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-foreground">
                      {t("doctorDash.manageOfflineTitle")}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("doctorDash.manageOfflineDesc")}
                    </p>
                  </div>
                </div>
              </div>

              <DoctorProfileSettings user={user} dir={dir} />

              <DoctorScheduleCalendar
                enabled
                clinics={activeClinics}
                dir={dir}
              />

              <ClinicsManager
                initialClinics={initialClinics}
                doctor={user}
                dir={dir}
              />

              <AvailabilityExceptionsPanel
                initialExceptions={initialExceptions}
                clinics={initialClinics}
              />

              <Tabs defaultValue="online_availability" className="w-full">
                <TabsList className="grid h-11 w-full max-w-md grid-cols-2">
                  <TabsTrigger value="online_availability" className="gap-2">
                    <Video className="hidden size-4 sm:inline" />
                    {t("doctorDash.onlineTab")}
                  </TabsTrigger>
                  <TabsTrigger value="offline_availability" className="gap-2">
                    <MapPin className="hidden size-4 sm:inline" />
                    {t("doctorDash.offlineTab")}
                  </TabsTrigger>
                </TabsList>
                <TabsContent
                  value="online_availability"
                  className="mt-4 border-none p-0"
                >
                  <WorkTimeSettings
                    key={`wt-online-${workTimeKeyOnline}`}
                    workTimes={onlineWorkTimes}
                    dir={dir}
                    mode="ONLINE"
                  />
                </TabsContent>
                <TabsContent
                  value="offline_availability"
                  className="mt-4 border-none p-0"
                >
                  <WorkTimeSettings
                    key={`wt-offline-${workTimeKeyOffline}`}
                    workTimes={offlineWorkTimes}
                    clinics={initialClinics}
                    dir={dir}
                    mode="OFFLINE"
                  />
                </TabsContent>
              </Tabs>
            </>
          ) : null}
        </TabsContent>
        <TabsContent value="earnings" className="border-none p-0">
          <DoctorEarnings earnings={earnings || {}} payouts={payouts || []} />
        </TabsContent>
      </DashboardPanel>
    </Tabs>
  );
}
