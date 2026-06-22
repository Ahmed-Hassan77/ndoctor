import { getAdminDashboardStats } from "@/actions/admin-stats";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Stethoscope,
  Calendar,
  AlertTriangle,
  LifeBuoy,
  Banknote,
  CreditCard,
} from "lucide-react";
import { formatPriceEgp } from "@/lib/pricing";
import { getServerI18n } from "@/lib/server-i18n";

function StatCard({ label, value, icon: Icon, sub }) {
  return (
    <Card className="dashboard-stat-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="gradient-title mt-1 text-2xl">{value}</p>
            {sub ? (
              <p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p>
            ) : null}
          </div>
          {Icon ? (
            <div className="dashboard-icon-wrap">
              <Icon className="size-5" />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export async function AdminOverview() {
  const { t, locale } = await getServerI18n();
  const res = await getAdminDashboardStats();
  const s = res?.success ? res.stats : null;

  if (!s) {
    return (
      <p className="text-sm text-muted-foreground">{t("admin.statsLoadError")}</p>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {t("admin.overviewHint")}
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <StatCard label={t("admin.statPatients")} value={s.totalPatients} icon={Users} />
        <StatCard
          label={t("admin.statDoctors")}
          value={s.totalDoctors}
          icon={Stethoscope}
          sub={t("admin.doctorsVerifiedPending", {
            verified: s.verifiedDoctors,
            pending: s.pendingDoctors,
          })}
        />
        <StatCard
          label={t("admin.statAppointments")}
          value={s.totalAppointments}
          icon={Calendar}
          sub={t("admin.appointmentsActiveDone", {
            active: s.scheduledAppointments,
            done: s.completedAppointments,
          })}
        />
        <StatCard label={t("admin.statCancelled")} value={s.cancelledAppointments} icon={Calendar} />
        <StatCard label={t("admin.statDisputes")} value={s.openDisputes} icon={AlertTriangle} />
        <StatCard label={t("admin.statSupport")} value={s.openSupportTickets} icon={LifeBuoy} />
        <StatCard
          label={t("admin.statOnlinePaid")}
          value={formatPriceEgp(s.totalOnlinePaidRevenueEgp, "EGP", locale)}
          icon={Banknote}
        />
        <StatCard
          label={t("admin.statRefunded")}
          value={formatPriceEgp(s.totalRefundedEgp, "EGP", locale)}
          icon={CreditCard}
        />
        <StatCard
          label={t("admin.statPendingPayouts")}
          value={formatPriceEgp(s.pendingPayoutsEgp, "EGP", locale)}
          icon={Banknote}
        />
        <StatCard
          label={t("admin.statClinicCommission")}
          value={formatPriceEgp(s.offlineCommissionDueEgp, "EGP", locale)}
          icon={Banknote}
          sub={t("admin.statClinicCommissionSub")}
        />
      </div>
    </div>
  );
}
