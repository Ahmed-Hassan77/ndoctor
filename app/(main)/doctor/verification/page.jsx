import { ClipboardCheck, AlertCircle, XCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";
import { getServerI18n } from "@/lib/server-i18n";

export default async function VerificationPage() {
  const user = await getCurrentUser();
  const { t } = await getServerI18n();

  if (user?.verificationStatus === "VERIFIED") {
    redirect("/doctor");
  }

  const isRejected = user?.verificationStatus === "REJECTED";

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader className="text-center">
          <div
            className={`mx-auto mb-4 w-fit rounded-full p-4 ${
              isRejected ? "bg-red-900/20" : "bg-amber-900/20"
            }`}
          >
            {isRejected ? (
              <XCircle className="size-8 text-red-400" />
            ) : (
              <ClipboardCheck className="size-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {isRejected
              ? t("verification.declinedTitle")
              : t("verification.inProgressTitle")}
          </CardTitle>
          <CardDescription className="text-lg">
            {isRejected
              ? t("verification.declinedDesc")
              : t("verification.inProgressDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {isRejected ? (
            <div className="mb-6 flex items-start rounded-lg border border-red-900/20 bg-red-900/10 p-4">
              <AlertCircle className="me-3 mt-0.5 size-5 shrink-0 text-red-400" />
              <div className="text-start text-muted-foreground">
                <p className="mb-2">{t("verification.rejectionIntro")}</p>
                <ul className="mb-3 list-disc space-y-1 ps-5">
                  <li>{t("verification.rejectionReason1")}</li>
                  <li>{t("verification.rejectionReason2")}</li>
                  <li>{t("verification.rejectionReason3")}</li>
                </ul>
                <p>{t("verification.rejectionOutro")}</p>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex items-start rounded-lg border border-amber-900/20 bg-amber-900/10 p-4">
              <AlertCircle className="me-3 mt-0.5 size-5 shrink-0 text-primary" />
              <p className="text-start text-muted-foreground">
                {t("verification.pendingReview")}
              </p>
            </div>
          )}

          <p className="mb-6 text-muted-foreground">
            {isRejected ? t("verification.resubmitHint") : t("verification.waitHint")}
          </p>

          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            {isRejected ? (
              <>
                <Button asChild variant="outline" className="border-primary/20">
                  <Link href="/">{t("verification.returnHome")}</Link>
                </Button>
                <Button asChild>
                  <Link href="/doctor">{t("verification.updateInDashboard")}</Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="border-primary/20">
                  <Link href="/">{t("verification.returnHome")}</Link>
                </Button>
                <Button asChild>
                  <Link href="/support">{t("verification.contactSupport")}</Link>
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
