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
import {
  Check,
  User,
  DollarSign,
  Mail,
  Stethoscope,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { approvePayout } from "@/actions/admin";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { BarLoader } from "react-spinners";
import { useLocale } from "@/components/locale-provider";
import { getDateFnsLocale } from "@/lib/date-locale";
import { specialtyLabel } from "@/lib/specialty-i18n";

export function PendingPayouts({ payouts }) {
  const { t, labels, locale, dict } = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);

  const { loading, fn: submitApproval } = useFetch(approvePayout);

  const handleViewDetails = (payout) => {
    setSelectedPayout(payout);
  };

  const handleApprovePayout = (payout) => {
    setSelectedPayout(payout);
    setShowApproveDialog(true);
  };

  const confirmApproval = async () => {
    if (!selectedPayout || loading) return;

    const formData = new FormData();
    formData.append("payoutId", selectedPayout.id);

    const res = await submitApproval(formData);
    if (res?.success) {
      setShowApproveDialog(false);
      setSelectedPayout(null);
      toast.success(t("admin.payoutApproved"));
    }
  };

  const closeDialogs = () => {
    setSelectedPayout(null);
    setShowApproveDialog(false);
  };

  const netAmount =
    selectedPayout?.netAmountEgp ??
    (selectedPayout ? Math.round(selectedPayout.netAmount) : 0);

  return (
    <div>
      <Card className="bg-muted/20 border-border/80">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-foreground">
            {t("admin.pendingPayoutsTitle")}
          </CardTitle>
          <CardDescription>{t("admin.pendingPayoutsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("admin.noPendingPayouts")}
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <Card
                  key={payout.id}
                  className="bg-background border-border/80 hover:border-primary/30 transition-all"
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-muted/20 rounded-full p-2 mt-1">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium text-foreground">
                            {t("admin.drBadge")} {payout.doctor.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {specialtyLabel(dict, payout.doctor.specialty)}
                          </p>
                          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <DollarSign className="h-4 w-4 mr-1 text-primary" />
                              <span>
                                {payout.netAmountEgp != null
                                  ? `${payout.netAmountEgp} ${t("common.egp")}`
                                  : `${payout.netAmount.toFixed(2)}`}{" "}
                                {t("doctorDash.netLabel")}
                                {payout.grossAmountEgp != null
                                  ? ` (${t("doctorDash.grossLabel")} ${payout.grossAmountEgp} ${t("common.egp")})`
                                  : ""}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <Mail className="h-4 w-4 mr-1 text-primary" />
                              <span className="text-xs">{payout.paypalEmail}</span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t("admin.requested")}{" "}
                            {format(new Date(payout.createdAt), "PPp", {
                              locale: dateLocale,
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2 self-end lg:self-center">
                        <Badge
                          variant="outline"
                          className="bg-muted/40 border-border/60 text-foreground w-fit"
                        >
                          {t("admin.statusPending")}
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(payout)}
                            className="border-primary/20 hover:bg-muted/80"
                          >
                            {t("common.viewDetails")}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleApprovePayout(payout)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            {t("admin.approveDoctor")}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPayout && !showApproveDialog && (
        <Dialog open={!!selectedPayout} onOpenChange={closeDialogs}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {t("admin.payoutRequestDetails")}
              </DialogTitle>
              <DialogDescription>{t("admin.reviewPayoutHint")}</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  <h3 className="text-foreground font-medium">
                    {t("admin.doctorInfo")}
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.nameLabel")}
                    </p>
                    <p className="text-foreground">
                      {t("admin.drBadge")} {selectedPayout.doctor.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.email")}
                    </p>
                    <p className="text-foreground">{selectedPayout.doctor.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.specialty")}
                    </p>
                    <p className="text-foreground">
                      {specialtyLabel(dict, selectedPayout.doctor.specialty)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("doctorDash.payoutMethod")}
                    </p>
                    <p className="text-foreground">
                      {selectedPayout.payoutMethod ?? "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <h3 className="text-foreground font-medium">
                    {t("admin.payoutDetails")}
                  </h3>
                </div>
                <div className="bg-muted/20 p-4 rounded-lg border border-border/80 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("admin.grossEgp")}
                    </span>
                    <span className="text-foreground">
                      {selectedPayout.grossAmountEgp ??
                        Math.round(selectedPayout.amount)}{" "}
                      {t("common.egp")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {t("admin.platformFee")}
                    </span>
                    <span className="text-foreground">
                      -{selectedPayout.platformFeeEgp ??
                        Math.round(selectedPayout.platformFee)}{" "}
                      {t("common.egp")}
                    </span>
                  </div>
                  <div className="border-t border-border/80 pt-3 flex justify-between font-medium">
                    <span className="text-foreground">{t("admin.netPayout")}</span>
                    <span className="text-primary">
                      {selectedPayout.netAmountEgp ??
                        Math.round(selectedPayout.netAmount)}{" "}
                      {t("common.egp")}
                    </span>
                  </div>
                  <div className="border-t border-border/80 pt-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("admin.payoutAccount")}
                    </p>
                    <p className="text-foreground">
                      {selectedPayout.payoutAccount ?? selectedPayout.paypalEmail}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={closeDialogs}
                className="border-primary/20"
              >
                {t("admin.close")}
              </Button>
              <Button onClick={() => handleApprovePayout(selectedPayout)}>
                <Check className="h-4 w-4 mr-1" />
                {t("admin.approvePayout")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {showApproveDialog && selectedPayout && (
        <Dialog
          open={showApproveDialog}
          onOpenChange={() => setShowApproveDialog(false)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {t("admin.confirmPayoutApproval")}
              </DialogTitle>
              <DialogDescription>
                {t("admin.confirmPayoutQuestion")}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t("admin.payoutBullet1", { amount: netAmount })}
                  <ul className="mt-2 space-y-1 list-disc ps-4">
                    <li>{t("admin.payoutBullet2")}</li>
                    <li>{t("admin.payoutBullet3")}</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="bg-muted/20 p-4 rounded-lg border border-border/80">
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">
                    {t("appointments.doctorLabel")}:
                  </span>
                  <span className="text-foreground">
                    {t("admin.drBadge")} {selectedPayout.doctor.name}
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-muted-foreground">
                    {t("admin.amountToPay")}:
                  </span>
                  <span className="text-primary font-medium">
                    {selectedPayout.netAmountEgp ??
                      Math.round(selectedPayout.netAmount)}{" "}
                    {t("common.egp")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("doctorDash.payoutMethod")}:
                  </span>
                  <span className="text-foreground text-sm">
                    {selectedPayout.paypalEmail}
                  </span>
                </div>
              </div>
            </div>

            {loading && <BarLoader width={"100%"} color="#36d7b7" />}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowApproveDialog(false)}
                disabled={loading}
                className="border-primary/20"
              >
                {t("common.cancel")}
              </Button>
              <Button onClick={confirmApproval} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("admin.processing")}
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    {t("admin.confirmApproval")}
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
