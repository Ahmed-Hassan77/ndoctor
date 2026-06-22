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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Timer, Loader2 } from "lucide-react";
import { updateSystemConfig } from "@/actions/doctor";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/locale-provider";

export function SlotDurationSettings({ initialMinutes }) {
  const { t } = useLocale();
  const [value, setValue] = useState(String(initialMinutes ?? "30"));
  const router = useRouter();
  const { loading, fn, setData } = useFetch(updateSystemConfig);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    const fd = new FormData();
    fd.append("key", "slot_duration");
    fd.append("value", value.trim());
    const res = await fn(fd);
    if (res?.success) {
      toast.success(t("admin.slotDurationUpdated"));
      setData(undefined);
      router.refresh();
    }
  };

  return (
    <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary shrink-0" />
          {t("admin.slotDurationTitle")}
        </CardTitle>
        <CardDescription>{t("admin.slotDurationDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={onSubmit}
          className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div className="space-y-2 max-w-xs">
            <Label htmlFor="slot_duration">{t("admin.minutes")}</Label>
            <Input
              id="slot_duration"
              type="number"
              min={5}
              max={240}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={loading}
              className="bg-background home-card-gradient border-0 ring-1 ring-primary/10"
            />
          </div>
          <Button type="submit" disabled={loading} className=" shrink-0">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin me-2" />
                {t("doctorDash.saving")}
              </>
            ) : (
              t("common.save")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
