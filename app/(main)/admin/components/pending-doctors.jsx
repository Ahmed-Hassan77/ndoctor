"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, User, Medal, FileText, ExternalLink } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { updateDoctorStatus } from "@/actions/admin";
import useFetch from "@/hooks/use-fetch";
import { BarLoader } from "react-spinners";
import { useLocale } from "@/components/locale-provider";
import { getDateFnsLocale } from "@/lib/date-locale";

export function PendingDoctors({ doctors }) {
  const { t, labels, locale } = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const {
    loading,
    fn: submitStatusUpdate,
  } = useFetch(updateDoctorStatus);

  const handleViewDetails = (doctor) => {
    setSelectedDoctor(doctor);
  };

  const handleCloseDialog = () => {
    setSelectedDoctor(null);
  };

  const handleUpdateStatus = async (doctorId, status) => {
    if (loading) return;

    const formData = new FormData();
    formData.append("doctorId", doctorId);
    formData.append("status", status);

    const res = await submitStatusUpdate(formData);
    if (res?.success) {
      handleCloseDialog();
    }
  };

  return (
    <div>
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            {t("admin.pendingVerificationsTitle")}
          </CardTitle>
          <CardDescription>{t("admin.pendingVerificationsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.noPendingVerifications")}
            </div>
          ) : (
            <div className="space-y-4">
              {doctors.map((doctor) => (
                <Card
                  key={doctor.id}
                  className="bg-background home-card-gradient border-0 ring-1 ring-primary/10 hover:border-primary/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-muted/20 rounded-full p-2">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            {doctor.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {labels.specialty(doctor.specialty)} •{" "}
                            {t("onboarding.yearsCount", { count: doctor.experience })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-auto">
                        <Badge
                          variant="outline"
                          className="bg-muted/40 border-border/60 text-foreground">
                          {t("admin.statusPending")}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(doctor)}
                          className="border-primary/20 hover:bg-muted/80">
                          {t("common.viewDetails")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDoctor && (
        <Dialog open={!!selectedDoctor} onOpenChange={handleCloseDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {t("admin.doctorVerificationDetails")}
              </DialogTitle>
              <DialogDescription>{t("admin.reviewDoctorHint")}</DialogDescription>
            </DialogHeader>

            <div className="min-w-0 space-y-6 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="min-w-0 space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t("admin.fullName")}
                  </h4>
                  <p className="break-words text-base font-medium text-foreground">
                    {selectedDoctor.name}
                  </p>
                </div>
                <div className="min-w-0 space-y-1 sm:col-span-2 lg:col-span-1">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t("admin.email")}
                  </h4>
                  <p className="break-all text-base font-medium text-foreground">
                    {selectedDoctor.email}
                  </p>
                </div>
                <div className="min-w-0 space-y-1">
                  <h4 className="text-sm font-medium text-muted-foreground">
                    {t("admin.applicationDate")}
                  </h4>
                  <p className="break-words text-base font-medium text-foreground">
                    {format(new Date(selectedDoctor.createdAt), "PPP", {
                      locale: dateLocale,
                    })}
                  </p>
                </div>
              </div>

              <Separator className="bg-primary/10" />

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Medal className="h-5 w-5 text-primary" />
                  <h3 className="text-foreground font-medium">
                    {t("admin.professionalInfo")}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-2">
                  <div className="min-w-0 space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {t("admin.specialty")}
                    </h4>
                    <p className="break-words text-foreground">
                      {labels.specialty(selectedDoctor.specialty)}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {t("admin.yearsExperience")}
                    </h4>
                    <p className="text-foreground">
                      {t("onboarding.yearsCount", {
                        count: selectedDoctor.experience,
                      })}
                    </p>
                  </div>

                  <div className="min-w-0 space-y-1 sm:col-span-2">
                    <h4 className="text-sm font-medium text-muted-foreground">
                      {t("admin.credentials")}
                    </h4>
                    <a
                      href={selectedDoctor.credentialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full break-all items-start gap-1 text-primary hover:text-primary/80">
                      <span className="break-all">{t("admin.viewCredentials")}</span>
                      <ExternalLink className="h-4 w-4 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>

              <Separator className="bg-primary/10" />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-foreground font-medium">
                    {t("admin.serviceDescription")}
                  </h3>
                </div>
                <p className="break-words whitespace-pre-line text-muted-foreground [overflow-wrap:anywhere]">
                  {selectedDoctor.description}
                </p>
              </div>
            </div>

            {loading && (
              <div className="min-w-0 w-full overflow-hidden">
                <BarLoader width="100%" color="#36d7b7" />
              </div>
            )}

            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between sm:items-stretch">
              <Button
                variant="destructiveSolid"
                onClick={() =>
                  handleUpdateStatus(selectedDoctor.id, "REJECTED")
                }
                disabled={loading}
                className="w-full shrink-0 sm:w-auto">
                <X className="me-2 h-4 w-4 shrink-0" />
                {t("admin.rejectDoctor")}
              </Button>
              <Button
                onClick={() =>
                  handleUpdateStatus(selectedDoctor.id, "VERIFIED")
                }
                disabled={loading}
                className="w-full shrink-0 sm:w-auto">
                <Check className="me-2 h-4 w-4 shrink-0" />
                {t("admin.approveDoctor")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
