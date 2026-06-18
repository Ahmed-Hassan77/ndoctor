"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { getAdminPaymentTransactions, refundMockPayment } from "@/actions/payments";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { getDateFnsLocale } from "@/lib/date-locale";

const REFUND_TIERS = [
  { value: "full", outcome: "FULL" },
  { value: "partial90", outcome: "PARTIAL" },
  { value: "none", outcome: "NONE" },
];

export function AdminPayments({ initialTransactions = [] }) {
  const { t, labels, locale, formatPrice } = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(!initialTransactions.length);
  const [refundId, setRefundId] = useState("");
  const [refundTier, setRefundTier] = useState("full");
  const [refundNote, setRefundNote] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialTransactions.length) return;
    (async () => {
      setLoading(true);
      const res = await getAdminPaymentTransactions();
      if (res?.success) setTransactions(res.transactions ?? []);
      setLoading(false);
    })();
  }, [initialTransactions.length]);

  const runRefund = async () => {
    if (!refundId) {
      toast.error(t("admin.selectPaidTxn"));
      return;
    }
    const txn = transactions.find((tr) => tr.id === refundId);
    if (!txn) return;
    setBusy(true);
    const fd = new FormData();
    fd.append("appointmentId", txn.appointmentId);
    fd.append("reason", "ADMIN_APPROVED_REFUND");
    fd.append("overrideTier", refundTier);
    fd.append("adminNote", refundNote);
    const res = await refundMockPayment(fd);
    setBusy(false);
    if (res?.success) {
      toast.success(t("admin.refundProcessed"));
      const refresh = await getAdminPaymentTransactions();
      if (refresh?.success) setTransactions(refresh.transactions ?? []);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle>{t("admin.manualRefund")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-w-lg">
          <div className="space-y-2">
            <Label>{t("admin.transaction")}</Label>
            <Select value={refundId} onValueChange={setRefundId}>
              <SelectTrigger>
                <SelectValue placeholder={t("admin.selectPaidTxnPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {transactions
                  .filter((tr) => tr.status === "PAID")
                  .map((tr) => (
                    <SelectItem key={tr.id} value={tr.id}>
                      {tr.appointment?.doctor?.name} ·{" "}
                      {formatPrice(tr.amountEgp)} ·{" "}
                      {labels.paymentMethod(tr.method)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("admin.outcome")}</Label>
            <Select value={refundTier} onValueChange={setRefundTier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REFUND_TIERS.map((tier) => (
                  <SelectItem key={tier.value} value={tier.value}>
                    {labels.refundOutcome(tier.outcome)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={refundNote}
            onChange={(e) => setRefundNote(e.target.value)}
            placeholder={t("admin.adminNoteRequired")}
            rows={2}
          />
          <Button disabled={busy} onClick={runRefund}>
            {t("admin.processRefund")}
          </Button>
        </CardContent>
      </Card>

      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle>{t("admin.paymentTransactions")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-[60vh] overflow-y-auto">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.noTransactions")}
            </p>
          ) : (
            transactions.map((tr) => (
              <div
                key={tr.id}
                className="border border-border/40 rounded-lg p-3 text-sm space-y-1"
              >
                <div className="flex flex-wrap gap-2 justify-between">
                  <span className="font-medium">
                    {formatPrice(tr.amountEgp, tr.currency)}
                  </span>
                  <Badge variant="outline">
                    {labels.transactionStatus(tr.status)}
                  </Badge>
                </div>
                <p className="text-muted-foreground">
                  {labels.paymentMethod(tr.method)} · MOCK · ref{" "}
                  {tr.providerReference ?? "—"}
                </p>
                <p>
                  {t("admin.drBadge")} {tr.appointment?.doctor?.name} ·{" "}
                  {t("admin.patient")} {tr.appointment?.patient?.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("admin.created")}{" "}
                  {format(new Date(tr.createdAt), "PPp", { locale: dateLocale })}
                  {tr.paidAt
                    ? ` · ${t("admin.paid")} ${format(new Date(tr.paidAt), "PPp", { locale: dateLocale })}`
                    : ""}
                  {tr.refundedAt
                    ? ` · ${t("admin.refunded")} ${format(new Date(tr.refundedAt), "PPp", { locale: dateLocale })}`
                    : ""}
                </p>
                {tr.refundAmountEgp != null ? (
                  <p className="text-xs text-muted-foreground">
                    {t("admin.refundLine", {
                      amount: tr.refundAmountEgp,
                      fee: tr.refundFeeEgp
                        ? t("admin.refundFeePart", { fee: tr.refundFeeEgp })
                        : "",
                    })}
                    {tr.refundReason ? ` — ${tr.refundReason}` : ""}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
