import { redirect, notFound } from "next/navigation";
import { Shield } from "lucide-react";
import { getCheckoutAppointment } from "@/actions/payments";
import { CheckoutClient } from "./checkout-client";
import { CheckoutOrderSummary } from "./checkout-order-summary";
import { PageHeader } from "@/components/page-header";
import { getServerI18n } from "@/lib/server-i18n";

export default async function CheckoutPage({ params }) {
  const { appointmentId } = await params;
  const { t } = await getServerI18n();
  const result = await getCheckoutAppointment(appointmentId);

  if (!result?.success) {
    if (result?.code === "UNAUTHORIZED") redirect("/sign-in");
    notFound();
  }

  const { appointment } = result;

  if (appointment.paymentStatus === "PAID") {
    redirect("/appointments");
  }

  if (appointment.status === "CANCELLED") {
    redirect("/appointments");
  }

  const serialized = {
    ...appointment,
    startTime:
      appointment.startTime instanceof Date
        ? appointment.startTime.toISOString()
        : appointment.startTime,
    endTime:
      appointment.endTime instanceof Date
        ? appointment.endTime.toISOString()
        : appointment.endTime,
    paymentTransactions: (appointment.paymentTransactions ?? []).map((tx) => ({
      ...tx,
      createdAt:
        tx.createdAt instanceof Date ? tx.createdAt.toISOString() : tx.createdAt,
      paidAt: tx.paidAt instanceof Date ? tx.paidAt.toISOString() : tx.paidAt,
    })),
  };

  const summaryAppointment = {
    ...serialized,
    doctor: appointment.doctor,
  };

  return (
    <div>
      <PageHeader
        icon={<Shield />}
        title={t("checkout.title")}
        backLink="/appointments"
        backLabel={t("nav.appointments")}
      />
      <p className="-mt-4 mb-8 max-w-xl text-sm text-muted-foreground">
        {t("checkout.subtitle")}
      </p>

      <div className="grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_320px] lg:gap-8">
        <div className="order-1 min-w-0 w-full">
          <CheckoutClient appointment={serialized} />
        </div>
        <div className="order-2 min-w-0 w-full lg:sticky lg:top-24">
          <CheckoutOrderSummary appointment={summaryAppointment} />
        </div>
      </div>
    </div>
  );
}
