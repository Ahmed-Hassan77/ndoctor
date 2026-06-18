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
import { Check, Ban, Loader2, User, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { updateDoctorActiveStatus } from "@/actions/admin";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";

export function VerifiedDoctors({ doctors }) {
  const { t, labels } = useLocale();
  const [searchTerm, setSearchTerm] = useState("");
  const [targetDoctor, setTargetDoctor] = useState(null);
  const [actionType, setActionType] = useState(null);

  const {
    loading,
    fn: submitStatusUpdate,
  } = useFetch(updateDoctorActiveStatus);

  const filteredDoctors = doctors.filter((doctor) => {
    const query = searchTerm.toLowerCase();
    return (
      doctor.name.toLowerCase().includes(query) ||
      doctor.specialty.toLowerCase().includes(query) ||
      doctor.email.toLowerCase().includes(query)
    );
  });

  const handleStatusChange = async (doctor, suspend) => {
    const confirmed = window.confirm(
      suspend
        ? t("admin.confirmSuspend", { name: doctor.name })
        : t("admin.confirmReinstate", { name: doctor.name })
    );
    if (!confirmed || loading) return;

    const formData = new FormData();
    formData.append("doctorId", doctor.id);
    formData.append("suspend", suspend ? "true" : "false");

    setTargetDoctor(doctor);
    setActionType(suspend ? "SUSPEND" : "REINSTATE");

    const res = await submitStatusUpdate(formData);
    if (res?.success) {
      toast.success(
        suspend
          ? t("admin.suspendedSuccess", { name: doctor.name })
          : t("admin.reinstatedSuccess", { name: doctor.name })
      );
      setTargetDoctor(null);
      setActionType(null);
    }
  };

  return (
    <div>
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-xl font-bold text-foreground">
                {t("admin.manageDoctors")}
              </CardTitle>
              <CardDescription>{t("admin.manageDoctorsDesc")}</CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("admin.searchDoctors")}
                className="pl-8 bg-background home-card-gradient border-0 ring-1 ring-primary/10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filteredDoctors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm
                ? t("admin.noDoctorsMatch")
                : t("admin.noVerifiedDoctors")}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDoctors.map((doctor) => {
                const isSuspended = doctor.verificationStatus === "REJECTED";
                return (
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
                              {t("onboarding.yearsCount", {
                                count: doctor.experience,
                              })}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {doctor.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end md:self-auto">
                          {isSuspended ? (
                            <>
                              <Badge variant="destructiveSolid">
                                {t("admin.suspended")}
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleStatusChange(doctor, false)
                                }
                                disabled={loading}
                                className="border-primary/20 hover:bg-muted/80">
                                {loading && targetDoctor?.id === doctor.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4 mr-1" />
                                )}
                                {t("admin.reinstate")}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Badge
                                variant="outline"
                                className="bg-primary/10 border-primary/20 text-primary">
                                {t("admin.active")}
                              </Badge>
                              <Button
                                variant="destructiveOutline"
                                size="sm"
                                onClick={() => handleStatusChange(doctor, true)}
                                disabled={loading}
                              >
                                {loading && targetDoctor?.id === doctor.id ? (
                                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                ) : (
                                  <Ban className="h-4 w-4 mr-1" />
                                )}
                                {t("admin.suspend")}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
