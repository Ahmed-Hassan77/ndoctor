import Link from "next/link";
import { CreditCard, Shield, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { getPaymentCancellationPolicy } from "@/lib/policy-i18n";
import { getServerI18n } from "@/lib/server-i18n";

export default async function PricingPage() {
  const { t, dict } = await getServerI18n();
  const policy = getPaymentCancellationPolicy(dict);

  return (
    <div>
      <PageHeader icon={<CreditCard />} title={t("nav.pricing")} backLink="/" />

      <div className="mb-10 text-center">
        <Badge
          variant="outline"
          className="mb-4 border-primary/25 bg-primary/10 px-4 py-1 text-sm font-medium text-primary"
        >
          {t("pricing.badge")}
        </Badge>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          {t("pricing.intro")}
        </p>
      </div>

      <div className="mx-auto grid max-w-3xl gap-6">
        <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <div className="dashboard-icon-wrap">
                <CreditCard className="size-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {t("pricing.gatewayTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("pricing.gatewayDesc")}
                </p>
              </div>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                t("pricing.lineBookOnline"),
                t("pricing.lineDoctorFees"),
                t("pricing.lineProviderReady"),
              ].map((line) => (
                <li key={line} className="flex gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {line}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
          <CardContent className="space-y-3 p-6">
            <div className="flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {policy.title}
              </h2>
            </div>
            <ul className="list-disc space-y-2 ps-5 text-sm text-muted-foreground">
              {policy.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto mt-16 max-w-3xl text-center">
        <h2 className="gradient-title mb-2 text-2xl font-bold">
          {t("pricing.helpTitle")}
        </h2>
        <p className="mb-4 text-muted-foreground">
          <Link href="/support" className="font-medium text-primary hover:underline">
            {t("pricing.helpLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
