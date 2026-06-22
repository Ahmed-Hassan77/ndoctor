"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Stethoscope, Loader2 } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

/**
 * @param {{ loading: boolean; onChoosePatient: () => void; onChooseDoctor: () => void }} props
 */
export function OnboardingRoleChooser({
  loading,
  onChoosePatient,
  onChooseDoctor,
}) {
  const { t } = useLocale();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card
        className="home-card-gradient border-0 ring-1 ring-primary/10 hover:border-primary/25 cursor-pointer transition-all"
        onClick={() => !loading && onChoosePatient()}
      >
        <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold text-foreground mb-2">
            {t("onboarding.joinPatient")}
          </CardTitle>
          <CardDescription className="mb-4">
            {t("onboarding.patientDesc")}
          </CardDescription>
          <Button className="mt-2 w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("onboarding.processing")}
              </>
            ) : (
              t("onboarding.continuePatient")
            )}
          </Button>
        </CardContent>
      </Card>

      <Card
        className="home-card-gradient border-0 ring-1 ring-primary/10 hover:border-primary/25 cursor-pointer transition-all"
        onClick={() => !loading && onChooseDoctor()}
      >
        <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Stethoscope className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold text-foreground mb-2">
            {t("onboarding.joinDoctor")}
          </CardTitle>
          <CardDescription className="mb-4">
            {t("onboarding.doctorDesc")}
          </CardDescription>
          <Button className="mt-2 w-full" disabled={loading}>
            {t("onboarding.continueDoctor")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
