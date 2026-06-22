"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/components/locale-provider";
import { formatPriceEgp } from "@/lib/pricing";
import { Banknote, CreditCard } from "lucide-react";

/**
 * Payment / refund summary on appointment cards.
 */
export function AppointmentPaymentPanel({ appointment, userRole }) {
  const { t, labels, formatPrice, policy } = useLocale();
  const price = formatPrice(
    appointment.priceSnapshotEgp,
    appointment.currencySnapshot
  );
  const canPay =
    userRole === "PATIENT" &&
    appointment.appointmentMode === "ONLINE" &&
    (appointment.paymentStatus === "PENDING" ||
      appointment.paymentStatus === "FAILED") &&
    appointment.status !== "CANCELLED";

  const refundLabel =
    appointment.refundStatus === "REFUNDED"
      ? t("appointments.fullRefund")
      : appointment.refundStatus === "PARTIALLY_REFUNDED"
        ? t("doctorDash.refundAmountLine", {
            amount: appointment.refundAmountEgp ?? 0,
          }) +
          " " +
          t("doctorDash.refundFeeLine", {
            fee: appointment.refundFeeEgp ?? 0,
          })
        : appointment.refundStatus === "NOT_ELIGIBLE"
          ? t("appointments.notRefundable")
          : appointment.refundStatus
            ? labels.refundStatus(appointment.refundStatus)
            : null;

  return (
    <div className="rounded-lg border border-border/50 bg-muted/15 p-3 space-y-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Banknote className="h-4 w-4 shrink-0 text-primary" />
        <span className="font-medium text-foreground">{price}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="text-xs">
          {labels.paymentMethod(appointment.paymentMethod)}
        </Badge>
        <Badge
          variant="outline"
          className={
            appointment.paymentStatus === "PAID"
              ? "border-primary/30 text-primary"
              : appointment.paymentStatus === "FAILED"
                ? "border-red-800/50 text-red-300"
                : ""
          }
        >
          {labels.paymentStatus(appointment.paymentStatus)}
        </Badge>
        {refundLabel ? (
          <Badge variant="outline" className="text-xs border-amber-700/40">
            {refundLabel}
          </Badge>
        ) : null}
      </div>
      {userRole === "PATIENT" && appointment.appointmentMode === "OFFLINE" ? (
        <p className="text-xs text-muted-foreground">
          {t("appointments.payAtClinicArrival")}
        </p>
      ) : null}
      {canPay ? (
        <Button asChild size="sm" className="w-full ">
          <Link href={`/checkout/${appointment.id}`}>
            <CreditCard className="mr-2 h-4 w-4" />
            {t("common.payNow")}
          </Link>
        </Button>
      ) : null}
      {userRole === "PATIENT" ? (
        <p className="text-[11px] text-muted-foreground leading-snug">
          {policy.summaryShort}
        </p>
      ) : null}
    </div>
  );
}
