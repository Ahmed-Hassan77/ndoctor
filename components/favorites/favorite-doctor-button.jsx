"use client";

import { useState, useEffect } from "react";
import { Heart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { toggleFavoriteDoctor, isDoctorFavorited } from "@/actions/favorites";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/locale-provider";

export function FavoriteDoctorButton({
  doctorId,
  initialFavorited,
  showLabel = false,
  className,
}) {
  const { t } = useLocale();
  const [favorited, setFavorited] = useState(initialFavorited ?? false);
  const [checking, setChecking] = useState(initialFavorited === undefined);
  const { loading, fn: toggle } = useFetch(toggleFavoriteDoctor);

  useEffect(() => {
    if (initialFavorited !== undefined) return;
    let active = true;
    isDoctorFavorited(doctorId).then((res) => {
      if (!active) return;
      if (res?.success) setFavorited(res.favorited);
      setChecking(false);
    });
    return () => {
      active = false;
    };
  }, [doctorId, initialFavorited]);

  const handleClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const fd = new FormData();
    fd.append("doctorId", doctorId);
    const res = await toggle(fd);
    if (res?.success) {
      const next = res.favorited === true;
      setFavorited(next);
      toast.success(
        next ? t("favorites.doctorSaved") : t("favorites.doctorRemoved")
      );
    }
  };

  if (checking) {
    return (
      <Button type="button" variant="ghost" size="icon" disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      className={cn(
        "shrink-0 text-muted-foreground hover:text-rose-400",
        favorited && "text-rose-500 hover:text-rose-400",
        className
      )}
      disabled={loading}
      onClick={handleClick}
      aria-label={
        favorited ? t("favorites.removeFromFavorites") : t("favorites.saveDoctor")
      }
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={cn("h-4 w-4", favorited && "fill-current")} />
      )}
      {showLabel ? (
        <span className="ms-1">
          {favorited ? t("favorites.saved") : t("favorites.save")}
        </span>
      ) : null}
    </Button>
  );
}
