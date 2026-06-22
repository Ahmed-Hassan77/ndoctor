"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getDoctorRatings } from "@/actions/ratings";
import { useLocale } from "@/components/locale-provider";

function StarsRow({ value, size = "md" }) {
  const v = Number(value) || 0;
  const h = size === "lg" ? "h-7 w-7" : "h-4 w-4";
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${h} ${
            v >= i
              ? "fill-primary text-primary"
              : "text-muted-foreground/50"
          }`}
        />
      ))}
    </div>
  );
}

export function DoctorRatingsClient({
  dir: dirProp,
  doctorId,
  doctorName,
  initialAverage,
  initialTotal,
  initialRatings,
  initialNextCursor,
  initialHasMore,
}) {
  const { t, dir: localeDir } = useLocale();
  const dir = dirProp ?? localeDir;
  const [ratings, setRatings] = useState(initialRatings);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore || !nextCursor) return;
    setLoading(true);
    try {
      const res = await getDoctorRatings(doctorId, nextCursor, 10);
      if (res?.success) {
        setRatings((prev) => [...prev, ...res.ratings]);
        setNextCursor(res.nextCursor);
        setHasMore(res.hasMore);
      }
    } finally {
      setLoading(false);
    }
  };

  const avgNum = Number(initialAverage) || 0;
  const total = initialTotal ?? 0;

  return (
    <div dir={dir} className="space-y-8">
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center gap-3">
            <h2 className="text-2xl font-bold text-foreground">
              {t("ratings.title", { name: doctorName })}
            </h2>
            <div className="flex flex-col items-center gap-2">
              <StarsRow value={avgNum} size="lg" />
              <p className="text-lg text-foreground">
                {total > 0 ? (
                  <>
                    <span className="font-semibold">{avgNum.toFixed(1)}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      ({t("common.reviews", { count: total })})
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">{t("common.noReviews")}</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t("ratings.patientReviews")}
        </h3>
        {ratings.length === 0 ? (
          <p className="text-muted-foreground">{t("ratings.noReviews")}</p>
        ) : (
          <ul className="space-y-4">
            {ratings.map((r) => (
              <li key={r.id}>
                <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {r.patientName}
                      </span>
                      <time
                        className="text-sm text-muted-foreground"
                        dateTime={r.createdAt}
                      >
                        {format(new Date(r.createdAt), "MMM d, yyyy")}
                      </time>
                    </div>
                    <StarsRow value={r.value} />
                    {r.review ? (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {r.review}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}

        {hasMore ? (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-primary/20"
              onClick={loadMore}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin me-2" />
                  {t("common.loading")}
                </>
              ) : (
                t("ratings.loadMore")
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
