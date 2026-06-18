import { getCurrentUser } from "@/actions/onboarding";
import { redirect } from "next/navigation";
import { getServerI18n } from "@/lib/server-i18n";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return {
    title: t("meta.onboardingTitle"),
    description: t("meta.onboardingDescription"),
  };
}

export default async function OnboardingLayout({ children }) {
  const user = await getCurrentUser();

  if (user) {
    if (user.role === "PATIENT") {
      redirect("/doctors");
    } else if (user.role === "DOCTOR") {
      if (user.verificationStatus === "VERIFIED") {
        redirect("/doctor");
      } else {
        redirect("/doctor/verification");
      }
    } else if (user.role === "ADMIN") {
      redirect("/admin");
    }
  }

  const { t } = await getServerI18n();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-10 text-center">
        <h1 className="gradient-title mb-2 text-3xl font-bold md:text-4xl">
          {t("onboarding.welcomeTitle")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("onboarding.welcomeSubtitle")}</p>
      </div>
      {children}
    </div>
  );
}
