"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppointmentCard } from "@/components/appointment-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar, History } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

export default function DoctorAppointmentsList({
  activeAppointments = [],
  historyAppointments = [],
  dir = "ltr",
}) {
  const router = useRouter();
  const { t, labels } = useLocale();
  const [historyFilter, setHistoryFilter] = useState("ALL");

  const filteredHistory = useMemo(() => {
    if (historyFilter === "COMPLETED") {
      return historyAppointments.filter((a) => a.status === "COMPLETED");
    }
    if (historyFilter === "CANCELLED") {
      return historyAppointments.filter((a) => a.status === "CANCELLED");
    }
    return historyAppointments;
  }, [historyAppointments, historyFilter]);

  const refetch = () => router.refresh();

  const emptyActive = (
    <div className="text-center py-8">
      <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="text-xl font-medium text-foreground mb-2">
        {t("doctorDash.noActiveAppointmentsTitle")}
      </h3>
      <p className="text-muted-foreground">{t("doctorDash.noActiveAppointmentsDesc")}</p>
    </div>
  );

  const emptyHistory = (
    <div className="text-center py-8">
      <History className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="text-xl font-medium text-foreground mb-2">
        {t("doctorDash.noHistoryTitle")}
      </h3>
      <p className="text-muted-foreground">{t("doctorDash.noHistoryDesc")}</p>
    </div>
  );

  return (
    <Card className="home-card-gradient border-0 ring-1 ring-primary/10" dir={dir}>
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center">
          <Calendar className="h-5 w-5 me-2 text-primary" />
          {t("doctorDash.tabAppointments")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 h-11 mb-4">
            <TabsTrigger value="active" className="gap-2">
              <Calendar className="h-4 w-4 hidden sm:inline" />
              {t("doctorDash.upcomingActive")}
              {activeAppointments.length> 0 ? (
                <span className="text-xs opacity-80">
                  ({activeAppointments.length})
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4 hidden sm:inline" />
              {t("common.history")}
              {historyAppointments.length> 0 ? (
                <span className="text-xs opacity-80">
                  ({historyAppointments.length})
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="border-none p-0 mt-0">
            {activeAppointments.length> 0 ? (
              <div className="space-y-4">
                {activeAppointments.map((appointment) => (
                  <AppointmentCard
                    key={`${appointment.id}-${appointment.startTime}`}
                    appointment={appointment}
                    userRole="DOCTOR"
                    refetchAppointments={refetch}
                    dir={dir}
                  />
                ))}
              </div>
            ) : (
              emptyActive
            )}
          </TabsContent>

          <TabsContent value="history" className="border-none p-0 mt-0">
            <div className="flex flex-wrap gap-2 mb-4">
              {[
                { id: "ALL", label: t("common.all") },
                { id: "COMPLETED", label: labels.appointmentStatus("COMPLETED") },
                { id: "CANCELLED", label: labels.appointmentStatus("CANCELLED") },
              ].map(({ id, label }) => (
                <Button
                  key={id}
                  type="button"
                  size="sm"
                  variant={historyFilter === id ? "default" : "outline"}
                  className={
                    historyFilter === id
                      ? ""
                      : "border-primary/20"
                  }
                  onClick={() => setHistoryFilter(id)}>
                  {label}
                </Button>
              ))}
            </div>

            {filteredHistory.length> 0 ? (
              <div className="space-y-4">
                {filteredHistory.map((appointment) => (
                  <AppointmentCard
                    key={`${appointment.id}-${appointment.startTime}-${appointment.status}`}
                    appointment={appointment}
                    userRole="DOCTOR"
                    refetchAppointments={refetch}
                    dir={dir}
                  />
                ))}
              </div>
            ) : historyAppointments.length> 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t("common.filterEmpty")}
              </p>
            ) : (
              emptyHistory
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
