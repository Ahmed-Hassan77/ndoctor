"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";
import { updateDoctorPracticeAddress } from "@/actions/doctor";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useLocale } from "@/components/locale-provider";

export function DoctorPracticeAddress({
  initialPracticeAddress = "",
  dir = "ltr",
}) {
  const { t } = useLocale();
  const [address, setAddress] = useState(initialPracticeAddress ?? "");
  const { loading, fn: saveAddress, setData: clearSave } =
    useFetch(updateDoctorPracticeAddress);

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("practiceAddress", address);
    const res = await saveAddress(fd);
    if (res?.success) {
      toast.success(t("doctorDash.practiceAddressSaved"));
      clearSave(undefined);
    }
  };

  const hasSaved = Boolean((initialPracticeAddress ?? "").trim());

  return (
    <Card
      key={initialPracticeAddress ?? ""}
      className="home-card-gradient border-0 ring-1 ring-primary/10"
      dir={dir}
    >
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary shrink-0" />
          {t("doctorDash.inPersonPracticeAddress")}
        </CardTitle>
        <CardDescription>
          {t("doctorDash.practiceAddressClearHint")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="practiceAddress">{t("doctorDash.address")}</Label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <Textarea
                id="practiceAddress"
                name="practiceAddress"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("doctorDash.addressPlaceholder")}
                rows={4}
                className="bg-background home-card-gradient border-0 ring-1 ring-primary/10 min-h-[100px] sm:flex-1 sm:min-w-0"
                disabled={loading}
              />
              <Button
                type="submit"
                disabled={loading}
                className=" shrink-0 sm:self-start sm:min-w-[9.5rem]">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                    {t("doctorDash.saving")}
                  </>
                ) : hasSaved ? (
                  t("doctorDash.updateAddress")
                ) : (
                  t("doctorDash.addAddress")
                )}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
