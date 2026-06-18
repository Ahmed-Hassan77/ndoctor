"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { requestPayout } from "@/actions/payout";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";
import { getDateFnsLocale } from "@/lib/date-locale";
import { Banknote, TrendingUp, CreditCard, Activity, Loader2 } from "lucide-react";

export function DoctorEarnings({ earnings, payouts = [] }) {
  const { t, labels, locale, formatPrice } = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [showPayoutDialog, setShowPayoutDialog] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("bank_transfer");

  const {
    onlinePaidGrossEgp = 0,
    onlineNetAvailableEgp = 0,
    offlineClinicCollectedEgp = 0,
    offlineCommissionDueEgp = 0,
    totalPlatformFeesEgp = 0,
    thisMonthOnlineNetEgp = 0,
    completedAppointments = 0,
    availablePayoutEgp = 0,
    platformCommissionPercent = 15,
    currency = "EGP",
  } = earnings;

  const { loading, fn: submitPayoutRequest } = useFetch(requestPayout);

  const pendingPayout =
    earnings.pendingPayout ??
    payouts.find((p) => p.status === "PROCESSING");

  const handlePayoutRequest = async (e) => {
    e.preventDefault();
    if (!payoutAccount.trim()) {
      toast.error(t("doctorDash.payoutRequired"));
      return;
    }
    const formData = new FormData();
    formData.append("payoutAccount", payoutAccount);
    formData.append("payoutMethod", payoutMethod);
    formData.append("paypalEmail", payoutAccount);
    const res = await submitPayoutRequest(formData);
    if (res?.success) {
      setShowPayoutDialog(false);
      setPayoutAccount("");
      toast.success(t("doctorDash.payoutSubmitted"));
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="dashboard-stat-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("doctorDash.onlineNetPayout")}
                </p>
                <p className="gradient-title mt-1 text-2xl">
                  {formatPrice(availablePayoutEgp, currency)}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {t("doctorDash.grossOnlineLabel")}:{" "}
                  {formatPrice(onlinePaidGrossEgp, currency)} ·{" "}
                  {t("doctorDash.platformFeePercent", {
                    percent: platformCommissionPercent,
                  })}
                </p>
              </div>
              <div className="dashboard-icon-wrap">
                <Banknote className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-stat-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("doctorDash.thisMonthOnline")}
                </p>
                <p className="gradient-title mt-1 text-2xl">
                  {formatPrice(thisMonthOnlineNetEgp, currency)}
                </p>
              </div>
              <div className="dashboard-icon-wrap">
                <TrendingUp className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-stat-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("doctorDash.clinicCollected")}
                </p>
                <p className="gradient-title mt-1 text-2xl">
                  {formatPrice(offlineClinicCollectedEgp, currency)}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {t("doctorDash.commissionDue")}{" "}
                  {formatPrice(offlineCommissionDueEgp, currency)}
                </p>
              </div>
              <div className="dashboard-icon-wrap">
                <CreditCard className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="dashboard-stat-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("doctorDash.totalPlatformFees")}
                </p>
                <p className="gradient-title mt-1 text-2xl">
                  {formatPrice(totalPlatformFeesEgp, currency)}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {completedAppointments} {t("doctorDash.completedVisits")}
                </p>
              </div>
              <div className="dashboard-icon-wrap">
                <Activity className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t("doctorDash.requestPayoutOnline")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingPayout ? (
            <div className="rounded-lg border border-amber-800/40 bg-amber-950/30 p-4 text-sm">
              <p className="font-medium text-foreground">
                {t("doctorDash.pendingPayoutLabel")}
              </p>
              <p className="text-muted-foreground mt-1">
                {formatPrice(
                  pendingPayout.netAmountEgp ??
                    Math.round(pendingPayout.netAmount),
                  currency
                )}{" "}
                · {t("doctorDash.submittedAt")}{" "}
                {format(new Date(pendingPayout.createdAt), "PP", {
                  locale: dateLocale,
                })}
              </p>
            </div>
          ) : null}

          {!pendingPayout && availablePayoutEgp > 0 ? (
            <Button onClick={() => setShowPayoutDialog(true)}>
              {t("doctorDash.requestPayoutButton")}
            </Button>
          ) : null}

          {!pendingPayout && availablePayoutEgp <= 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("doctorDash.noOnlineEarnings")}
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            {t("doctorDash.clinicPaymentsNote")}
          </p>
        </CardContent>
      </Card>

      {payouts.length > 0 ? (
        <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {t("doctorDash.payoutHistory")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {payouts.map((payout) => (
              <div
                key={payout.id}
                className="flex justify-between items-center border-b border-border/40 pb-2 text-sm">
                <span>
                  {formatPrice(
                    payout.netAmountEgp ?? Math.round(payout.netAmount),
                    payout.currency ?? currency
                  )}
                </span>
                <Badge variant="outline">
                  {labels.payoutStatus(payout.status)}
                </Badge>
                <span className="text-muted-foreground">
                  {format(new Date(payout.createdAt), "PP", {
                    locale: dateLocale,
                  })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("doctorDash.payoutDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("doctorDash.payoutDialogDesc", {
                amount: formatPrice(availablePayoutEgp, currency),
                percent: platformCommissionPercent,
              })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePayoutRequest} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("doctorDash.payoutMethod")}</Label>
              <Input
                value={payoutMethod}
                onChange={(e) => setPayoutMethod(e.target.value)}
                placeholder={t("doctorDash.payoutMethodPlaceholder")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("doctorDash.accountDetails")}</Label>
              <Input
                value={payoutAccount}
                onChange={(e) => setPayoutAccount(e.target.value)}
                placeholder={t("doctorDash.accountDetailsPlaceholder")}
                required
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("common.submit")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
