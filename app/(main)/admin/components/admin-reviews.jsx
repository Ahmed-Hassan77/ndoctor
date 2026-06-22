"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import {
  getAllReviewsForAdmin,
  hideReview,
  unhideReview,
  flagReview,
} from "@/actions/admin-reviews";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { formatDistanceToNow, format } from "date-fns";
import { Loader2, Star } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { getDateFnsLocale } from "@/lib/date-locale";

function StarsRow({ value }) {
  const v = Number(value) || 0;
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            v>= i
              ? "fill-primary text-primary"
              : "text-muted-foreground/50"
          }`}
        />
      ))}
    </div>
  );
}

function statusBadge(status, t, labels) {
  if (status === "HIDDEN") {
    return <Badge variant="destructiveSolid">{t("admin.hidden")}</Badge>;
  }
  if (status === "FLAGGED") {
    return (
      <Badge className="bg-primary hover:bg-primary">{t("admin.flagged")}</Badge>
    );
  }
  return <Badge variant="secondary">{t("admin.visible")}</Badge>;
}

export function AdminReviews({ initialReviews = [], initialDoctors = [] }) {
  const { t, labels, locale } = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [reviews, setReviews] = useState(initialReviews);
  const [doctors, setDoctors] = useState(initialDoctors);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [doctorFilter, setDoctorFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [hiddenReason, setHiddenReason] = useState("");

  const { fn: loadFn, loading: listLoading } = useFetch(getAllReviewsForAdmin);
  const { loading: hideLoading, fn: hideFn } = useFetch(hideReview);
  const { loading: unhideLoading, fn: unhideFn } = useFetch(unhideReview);
  const { loading: flagLoading, fn: flagFn } = useFetch(flagReview);

  const refresh = async () => {
    const res = await loadFn({
      moderationStatus: statusFilter === "all" ? undefined : statusFilter,
      doctorId: doctorFilter === "all" ? undefined : doctorFilter,
      ratingValue: ratingFilter === "all" ? undefined : Number(ratingFilter),
    });
    if (res?.success) {
      setReviews(res.reviews ?? []);
      if (res.doctors?.length) setDoctors(res.doctors);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await loadFn({
        moderationStatus: statusFilter === "all" ? undefined : statusFilter,
        doctorId: doctorFilter === "all" ? undefined : doctorFilter,
        ratingValue: ratingFilter === "all" ? undefined : Number(ratingFilter),
      });
      if (!cancelled && res?.success) {
        setReviews(res.reviews ?? []);
        if (res.doctors?.length) setDoctors(res.doctors);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statusFilter, doctorFilter, ratingFilter, loadFn]);

  const selected =
    reviews.find((r) => r.id === selectedId) ?? reviews[0] ?? null;

  const patchReview = (updated) => {
    if (!updated) return;
    setReviews((list) =>
      list.map((r) => (r.id === updated.id ? updated : r))
    );
  };

  const runAction = async (fn, label) => {
    if (!selected) return;
    const fd = new FormData();
    fd.append("ratingId", selected.id);
    if (hiddenReason.trim()) fd.append("hiddenReason", hiddenReason.trim());
    const res = await fn(fd);
    if (res?.success) {
      toast.success(label);
      patchReview(res.review);
      setHiddenReason("");
      await refresh();
    }
  };

  const actionBusy = hideLoading || unhideLoading || flagLoading;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.reviewsModeration")}</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder={t("admin.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="VISIBLE">{t("admin.visible")}</SelectItem>
                <SelectItem value="HIDDEN">{t("admin.hidden")}</SelectItem>
                <SelectItem value="FLAGGED">{t("admin.flagged")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={doctorFilter} onValueChange={setDoctorFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue placeholder={t("admin.filterDoctor")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("doctors.modeAll")}</SelectItem>
                {doctors.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name || d.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[100px] h-8 text-xs">
                <SelectValue placeholder={t("admin.filterStars")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                {[5, 4, 3, 2, 1].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[70vh] overflow-y-auto">
          {listLoading && reviews.length === 0 ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              {t("admin.noReviewsFound")}
            </p>
          ) : (
            reviews.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedId(r.id)}
                className={`w-full text-start rounded-lg border p-3 transition-colors ${
                  selected?.id === r.id
                    ? "border-primary/40 bg-primary/5"
                    : "border-border hover:bg-muted/30"
                }`}>
                <div className="flex items-start justify-between gap-2">
                  <StarsRow value={r.value} />
                  {statusBadge(r.moderationStatus, t, labels)}
                </div>
                <p className="text-sm mt-2 line-clamp-2 break-words">
                  {r.review?.trim() || (
                    <span className="text-muted-foreground italic">
                      {t("admin.noWrittenReview")}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {r.patient?.name || t("admin.patient")} →{" "}
                  {r.doctor?.name || t("appointments.doctorLabel")} ·{" "}
                  {formatDistanceToNow(new Date(r.createdAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </p>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/80">
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.reviewDetail")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.selectReviewModerate")}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <StarsRow value={selected.value} />
                {statusBadge(selected.moderationStatus, t, labels)}
              </div>

              {selected.review ? (
                <p className="text-sm whitespace-pre-wrap break-words rounded-md bg-muted/30 p-3">
                  {selected.review}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  {t("admin.noWrittenReviewText")}
                </p>
              )}

              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">{t("admin.patient")}</dt>
                  <dd className="break-words">
                    {selected.patient?.name || "—"} ({selected.patient?.email || "—"})
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("appointments.doctorLabel")}
                  </dt>
                  <dd className="break-words">
                    {selected.doctor?.name || "—"} ({selected.doctor?.email || "—"})
                  </dd>
                </div>
                {selected.appointment?.startTime ? (
                  <div>
                    <dt className="text-muted-foreground">
                      {t("checkout.appointment")}
                    </dt>
                    <dd>
                      {formatAppointmentDateTime(selected.appointment.startTime)}
                      {" · "}
                      {labels.appointmentStatus(selected.appointment.status)}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-muted-foreground">{t("admin.submitted")}</dt>
                  <dd>
                    {format(new Date(selected.createdAt), "PPpp", {
                      locale: dateLocale,
                    })}
                  </dd>
                </div>
                {selected.hiddenReason ? (
                  <div>
                    <dt className="text-muted-foreground">{t("admin.noteLabel")}</dt>
                    <dd>{selected.hiddenReason}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="space-y-2">
                <Label htmlFor="hiddenReason">{t("admin.reasonAdminNote")}</Label>
                <Textarea
                  id="hiddenReason"
                  value={hiddenReason}
                  onChange={(e) => setHiddenReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {selected.moderationStatus !== "HIDDEN" ? (
                  <Button
                    variant="destructiveSolid"
                    size="sm"
                    disabled={actionBusy}
                    onClick={() => runAction(hideFn, t("admin.reviewHidden"))}>
                    {hideLoading && (
                      <Loader2 className="h-4 w-4 me-1 animate-spin" />
                    )}
                    {t("common.hide")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={actionBusy}
                    onClick={() =>
                      runAction(unhideFn, t("admin.reviewVisibleAgain"))
                    }>
                    {unhideLoading && (
                      <Loader2 className="h-4 w-4 me-1 animate-spin" />
                    )}
                    {t("admin.unhide")}
                  </Button>
                )}
                {selected.moderationStatus !== "FLAGGED" ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={actionBusy}
                    onClick={() => runAction(flagFn, t("admin.reviewFlagged"))}>
                    {flagLoading && (
                      <Loader2 className="h-4 w-4 me-1 animate-spin" />
                    )}
                    {t("admin.flag")}
                  </Button>
                ) : null}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
