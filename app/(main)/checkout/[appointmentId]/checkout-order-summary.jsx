import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { labelPaymentStatus } from "@/lib/labels";
import { getServerI18n } from "@/lib/server-i18n";
import { specialtyLabel } from "@/lib/specialty-i18n";
import { formatPriceEgp } from "@/lib/pricing";
import { Calendar, Stethoscope, Video, MapPin, Banknote } from "lucide-react";

export async function CheckoutOrderSummary({ appointment }) {
  const { t, dict } = await getServerI18n();
  const isOnline = appointment.appointmentMode !== "OFFLINE";
  const amount = formatPriceEgp(
    appointment.priceSnapshotEgp,
    appointment.currencySnapshot
  );

  return (
    <Card className="border-border bg-muted/10 h-fit lg:sticky lg:top-24">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          {t("checkout.orderSummary")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-3">
          <div className="flex gap-3">
            <Stethoscope className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("checkout.doctor")}</p>
              <p className="font-medium text-foreground break-words">
                {appointment.doctor?.name ?? "—"}
              </p>
              {appointment.doctor?.specialty ? (
                <p className="text-muted-foreground text-xs mt-0.5">
                  {specialtyLabel(dict, appointment.doctor.specialty)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex gap-3">
            {isOnline ? (
              <Video className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            ) : (
              <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">{t("checkout.visitType")}</p>
              <p className="font-medium text-foreground">
                {isOnline
                  ? t("checkout.onlineVideoConsultation")
                  : t("checkout.clinicVisitLabel")}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Calendar className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">{t("checkout.appointment")}</p>
              <p className="font-medium text-foreground">
                {formatAppointmentDateTime(appointment.startTime)}
              </p>
            </div>
          </div>
        </div>

        <Separator className="bg-primary/10" />

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Banknote className="h-4 w-4 text-primary" />
            <span>{t("checkout.total")}</span>
          </div>
          <span className="text-lg font-bold text-primary">{amount}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {t("checkout.paymentStatus")}
          </span>
          <Badge variant="outline" className="text-xs">
            {labelPaymentStatus(dict, appointment.paymentStatus)}
          </Badge>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/40">
          {t("checkout.demoGatewayNote")}
        </p>
      </CardContent>
    </Card>
  );
}
