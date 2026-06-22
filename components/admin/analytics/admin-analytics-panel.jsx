"use client";

import { useCallback, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Download, Square } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { translateActionError } from "@/lib/i18n-errors";
import { ChatMarkdown } from "@/components/chatbot/chat-markdown";
import { TypingIndicator } from "@/components/chatbot/typing-indicator";
import { AnalyticsReportSheet } from "@/components/admin/analytics/analytics-report-sheet";
import { toast } from "sonner";
import { exportElementToPdf } from "@/lib/admin/analytics-pdf";
import { formatPeakHour } from "@/lib/chatbot/analytics/report-document";

const EXAMPLE_KEYS = [
  "usageMonth",
  "doctorPerformance",
  "specialties",
  "peakTimes",
];

const METRIC_KEYS = [
  "totalPatients",
  "totalDoctors",
  "verifiedDoctors",
  "appointmentsInRange",
  "completedInRange",
  "cancelledInRange",
  "cancellationRatePercent",
  "newPatientsInRange",
  "newDoctorsInRange",
  "peakBookingHour",
];

export function AdminAnalyticsPanel() {
  const { t, dict, dir, locale } = useLocale();
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [narrative, setNarrative] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const reportSheetRef = useRef(null);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
    setLoading(false);
  }, []);

  const ask = useCallback(
    async (text) => {
      const q = (text ?? question).trim();
      if (!q) return;

      setError(null);
      setLoading(true);
      setStreaming(true);
      setNarrative("");
      setReport(null);
      setLastQuestion(q);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/admin/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: q,
            locale,
            stream: true,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.code || "CHATBOT_FAILED");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let full = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const raw = line.slice(5).trim();
            if (raw === "[DONE]") continue;
            const event = JSON.parse(raw);
            if (event.type === "delta" && event.text) {
              full += event.text;
              setNarrative(full);
            } else if (event.type === "done") {
              setReport(event.report ?? null);
              if (event.narrative) setNarrative(event.narrative);
            } else if (event.type === "error") {
              throw new Error(event.error?.code || "CHATBOT_FAILED");
            }
          }
        }
      } catch (err) {
        if (err?.name !== "AbortError") {
          setError(err instanceof Error ? err.message : "CHATBOT_FAILED");
        }
      } finally {
        setLoading(false);
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [question, locale]
  );

  const canDownloadReport = Boolean(report || narrative);

  const downloadReport = useCallback(async () => {
    if (!canDownloadReport) return;

    setDownloadingPdf(true);
    try {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await new Promise((resolve) => setTimeout(resolve, 300));

      const element = reportSheetRef.current;
      if (!element) {
        throw new Error("Report template missing");
      }

      const stamp = new Date().toISOString().slice(0, 10);
      await exportElementToPdf(element, `shifaa-analytics-${stamp}.pdf`);
    } catch (err) {
      console.error("[AdminAnalyticsPanel] PDF download failed:", err);
      toast.error(t("admin.analyticsPdfFailed"));
    } finally {
      setDownloadingPdf(false);
    }
  }, [canDownloadReport, t]);

  const errorMessage = error
    ? translateActionError(dict, { code: error }) !== `errors.codes.${error}`
      ? translateActionError(dict, { code: error })
      : error
    : null;

  const displayQuestion = lastQuestion || report?.question || question;

  return (
    <>
      <AnalyticsReportSheet
        ref={reportSheetRef}
        report={report}
        narrative={narrative}
        question={displayQuestion}
        locale={locale}
        dir={dir}
        t={t}
      />

      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("admin.analyticsTitle")}
          </CardTitle>
          <CardDescription>{t("admin.analyticsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_KEYS.map((key) => (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  const label = t(`admin.analyticsExamples.${key}`);
                  setQuestion(label);
                  ask(label);
                }}
                disabled={loading}
              >
                {t(`admin.analyticsExamples.${key}`)}
              </Button>
            ))}
          </div>

          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("admin.analyticsPlaceholder")}
            rows={3}
            disabled={loading}
            dir={dir}
          />

          <div className="flex flex-wrap gap-2">
            {streaming ? (
              <Button type="button" variant="outline" onClick={cancel}>
                <Square className="me-2 h-4 w-4" />
                {t("chatbot.cancel")}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => ask(question)}
                disabled={loading || !question.trim()}
              >
                {loading ? (
                  <Loader2 className="me-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="me-2 h-4 w-4" />
                )}
                {t("admin.analyticsAsk")}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={downloadReport}
              disabled={!canDownloadReport || downloadingPdf || loading}
            >
              {downloadingPdf ? (
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="me-2 h-4 w-4" />
              )}
              {downloadingPdf
                ? t("admin.analyticsDownloading")
                : t("admin.analyticsDownload")}
            </Button>
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}

          {(loading && !narrative) || (streaming && !narrative) ? (
            <TypingIndicator />
          ) : null}

          {narrative ? (
            <div
              className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm"
              dir={dir}
            >
              <ChatMarkdown content={narrative} dir={dir} />
            </div>
          ) : null}

          {report?.metrics ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {METRIC_KEYS.map((key) => {
                let value = report.metrics[key];
                if (key === "cancellationRatePercent") {
                  value = `${value ?? 0}%`;
                } else if (key === "peakBookingHour") {
                  value = formatPeakHour(value, locale);
                }
                return (
                  <div
                    key={key}
                    className="rounded-lg border border-border/50 bg-background p-3 text-center"
                  >
                    <p className="text-xs text-muted-foreground">
                      {t(`admin.analyticsMetrics.${key}`)}
                    </p>
                    <p className="mt-1 text-lg font-semibold">{value ?? "—"}</p>
                  </div>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
