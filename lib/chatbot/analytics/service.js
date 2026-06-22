import { getChatProvider } from "@/lib/chatbot/providers";
import { sanitizeUserInput } from "@/lib/chatbot/safety/guardrails";
import { ChatbotProviderError, MEDICAL_DISCLAIMER } from "@/lib/chatbot/types";
import {
  collectAnalyticsSnapshot,
  inferAnalyticsIntent,
} from "@/lib/chatbot/analytics/queries";
import {
  formatSnapshotForPrompt,
  buildStructuredReport,
} from "@/lib/chatbot/analytics/formatter";
import {
  formatReportDate,
  formatPeakHour,
  getReportLabels,
  getTopBookingHours,
} from "@/lib/chatbot/analytics/report-document";

const ANALYTICS_SYSTEM = `You are an admin analytics assistant for a medical booking platform.

Rules:
- Use ONLY the aggregated metrics provided in context.
- Never invent numbers or patient identities.
- Do not expose individual patient PHI.
- Never echo or repeat the raw context labels (e.g. "Admin question:", "Platform data:", "Metrics (aggregated").
- Respond in the same language as the admin question (Arabic or English).

When generating analytics reports:
- Do NOT use markdown headings (#, ##, ###). Use **bold** text for section titles.
- Use markdown tables with | separators and a header separator row (|:---|) for all tabular data.
- Keep one blank line between sections.
- Do not repeat the same title.
- Output only the report content — no extra commentary.

Required sections (use **bold** titles exactly once each):

**Executive summary**
One short paragraph (2–4 sentences) summarizing platform activity for the period.

**Key insights**
- 3 to 5 bullet points with actionable observations drawn from the data.

**Platform metrics**
A markdown table with columns Metric | Value for all key metrics from the provided data.

Do not add a medical disclaimer.`;

/** Lines that should never appear in the admin-facing report. */
const DEBUG_LINE_PATTERNS = [
  /^>\s*Echo:/i,
  /^Echo:/i,
  /^\*?\s*Echo:/i,
  /^Admin question:/i,
  /^Platform data:/i,
  /^Analytics period:/i,
  /^From:\s*\d{4}-/i,
  /^To:\s*\d{4}-/i,
  /Metrics\s*\(aggregated/i,
  /mock assistant response/i,
  /GEMINI_API_KEY|OPENAI_API_KEY/i,
  /Configure GEMINI/i,
  /هذا رد تجريبي/i,
  /اختبار المحلي/i,
  /عيّن GEMINI/i,
  /الذكاء الاصطناعي الحقيقي/i,
  /^Top specialties:/i,
  /^Top governorates:/i,
  /^Doctor performance \(names only/i,
  /^-\s*Active patients \(total\):/i,
  /^-\s*Doctors \(total\s*\/\s*verified\):/i,
  /^-\s*Appointments in ra/i,
  /^-\s*Completed in range:/i,
  /^-\s*Cancelled in range:/i,
  /^-\s*Cancellation rate:/i,
  /^-\s*New patients in range:/i,
  /^-\s*New doctors in range:/i,
  /^-\s*Peak booking hour/i,
  /^\[Mock:/i,
  /^\[تجريبي:/i,
];

const SECTION_HEADING_PATTERNS = [
  /^#{1,3}\s*(Executive summary|الملخص التنفيذي)/i,
  /^#{1,3}\s*(Key insights|أبرز الرؤى)/i,
  /^#{1,3}\s*(Platform metrics|مؤشرات المنصة)/i,
  /^(Executive summary|الملخص التنفيذي)\s*$/i,
  /^(Key insights|أبرز الرؤى)\s*$/i,
  /^(Platform metrics|مؤشرات المنصة)\s*$/i,
  /^(Recommendations|التوصيات)\s*$/i,
];

/**
 * @param {number|string|null|undefined} value
 * @param {string} locale
 */
function formatLocaleNumber(value, locale) {
  if (value == null || value === "" || Number.isNaN(Number(value))) {
    return "—";
  }
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB").format(
    Number(value)
  );
}

/**
 * @param {string} line
 */
function isDisclaimerLine(line) {
  const normalized = line.trim().replace(/^[-—*•]\s*/, "");
  return (
    normalized.includes(MEDICAL_DISCLAIMER.en) ||
    normalized.includes(MEDICAL_DISCLAIMER.ar) ||
    /^This assistant is informational only/i.test(normalized) ||
    /^هذا المساعد للمعلومات فقط/i.test(normalized)
  );
}

/**
 * @param {string} line
 */
function isDebugLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return DEBUG_LINE_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * @param {string} line
 */
function isSectionHeadingLine(line) {
  const trimmed = line.trim();
  return SECTION_HEADING_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * @param {string} rawText
 */
function stripDebugContent(rawText) {
  return (rawText || "")
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (isDebugLine(trimmed)) return false;
      if (isDisclaimerLine(trimmed)) return false;
      if (isSectionHeadingLine(trimmed)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * @param {string} text
 */
function extractBulletInsights(text) {
  const bullets = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    const bulletMatch = trimmed.match(/^[-*•]\s+(.+)/);
    if (!bulletMatch) continue;
    const content = bulletMatch[1].trim();
    if (content.length < 12 || isDebugLine(content)) continue;
    if (/^\*\*[^*]+:\*\*/.test(content)) continue;
    bullets.push(content.replace(/\*\*/g, ""));
  }
  return bullets;
}

/**
 * @param {string} text
 */
function extractSummaryParagraph(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/^[-*•]\s+/gm, "").trim())
    .filter((p) => p.length > 20 && !isDebugLine(p));

  const prose = paragraphs.find(
    (p) => !p.startsWith("-") && !/^\*\*[^*]+:\*\*/.test(p)
  );
  return prose ?? paragraphs[0] ?? "";
}

/**
 * @param {object} snapshot
 * @param {string} locale
 */
function buildSummaryFromSnapshot(snapshot, locale) {
  const m = snapshot.metrics;
  const period = humanizeRangeLabel(snapshot.rangeLabel, locale);

  if (locale === "ar") {
    return `خلال ${period}، تضمّ المنصة ${formatLocaleNumber(m.totalPatients, locale)} مريضاً نشطاً و${formatLocaleNumber(m.totalDoctors, locale)} طبيباً (${formatLocaleNumber(m.verifiedDoctors, locale)} موثّقاً). سُجّل ${formatLocaleNumber(m.appointmentsInRange, locale)} موعداً، منها ${formatLocaleNumber(m.completedInRange, locale)} مكتمل و${formatLocaleNumber(m.cancelledInRange, locale)} ملغى، بمعدل إلغاء ${formatLocaleNumber(m.cancellationRatePercent, locale)}٪.`;
  }

  return `During ${period}, the platform has ${formatLocaleNumber(m.totalPatients, locale)} active patients and ${formatLocaleNumber(m.totalDoctors, locale)} doctors (${formatLocaleNumber(m.verifiedDoctors, locale)} verified). ${formatLocaleNumber(m.appointmentsInRange, locale)} appointments were recorded, including ${formatLocaleNumber(m.completedInRange, locale)} completed and ${formatLocaleNumber(m.cancelledInRange, locale)} cancelled, with a ${formatLocaleNumber(m.cancellationRatePercent, locale)}% cancellation rate.`;
}

/**
 * @param {object} snapshot
 * @param {string} locale
 * @returns {string[]}
 */
function buildInsightsFromSnapshot(snapshot, locale) {
  const m = snapshot.metrics;
  const insights = [];

  if (locale === "ar") {
    if (m.newPatientsInRange > 0) {
      insights.push(
        `انضم ${formatLocaleNumber(m.newPatientsInRange, locale)} مريض جديد خلال الفترة.`
      );
    }
    if (m.newDoctorsInRange > 0) {
      insights.push(
        `انضم ${formatLocaleNumber(m.newDoctorsInRange, locale)} طبيب جديد خلال الفترة.`
      );
    }
    if (snapshot.topSpecialties?.[0]) {
      insights.push(
        `التخصص الأكثر تواجداً: ${snapshot.topSpecialties[0].specialty} (${formatLocaleNumber(snapshot.topSpecialties[0].count, locale)} طبيب).`
      );
    }
    if (m.peakBookingHour != null) {
      insights.push(
        `ساعة الذروة للحجز: ${formatPeakHour(m.peakBookingHour, locale)}.`
      );
    }
    if (m.cancellationRatePercent > 0) {
      insights.push(
        `معدل الإلغاء ${formatLocaleNumber(m.cancellationRatePercent, locale)}٪ — راجع أسباب الإلغاء إذا ارتفع عن المعتاد.`
      );
    }
  } else {
    if (m.newPatientsInRange > 0) {
      insights.push(
        `${formatLocaleNumber(m.newPatientsInRange, locale)} new patients joined during the period.`
      );
    }
    if (m.newDoctorsInRange > 0) {
      insights.push(
        `${formatLocaleNumber(m.newDoctorsInRange, locale)} new doctors joined during the period.`
      );
    }
    if (snapshot.topSpecialties?.[0]) {
      insights.push(
        `Most represented specialty: ${snapshot.topSpecialties[0].specialty} (${formatLocaleNumber(snapshot.topSpecialties[0].count, locale)} doctors).`
      );
    }
    if (m.peakBookingHour != null) {
      insights.push(
        `Peak booking hour: ${formatPeakHour(m.peakBookingHour, locale)}.`
      );
    }
    if (m.cancellationRatePercent > 0) {
      insights.push(
        `Cancellation rate is ${formatLocaleNumber(m.cancellationRatePercent, locale)}% — review cancellation reasons if this exceeds your baseline.`
      );
    }
  }

  if (insights.length === 0) {
    insights.push(
      locale === "ar"
        ? "لا توجد تغيّرات ملحوظة في مؤشرات المنصة خلال هذه الفترة."
        : "No significant changes in platform indicators during this period."
    );
  }

  return insights.slice(0, 5);
}

/**
 * @param {string} label
 * @param {string} locale
 */
function humanizeRangeLabel(label, locale) {
  if (!label) return label;
  const maps = {
    en: {
      this_month: "this month",
      this_week: "this week",
      today: "today",
      year: "this year",
    },
    ar: {
      this_month: "هذا الشهر",
      this_week: "هذا الأسبوع",
      today: "اليوم",
      year: "هذا العام",
    },
  };
  const map = locale === "ar" ? maps.ar : maps.en;
  return map[label] ?? label.replace(/_/g, " ");
}

/**
 * @param {string} cell
 */
function escapeTableCell(cell) {
  return String(cell ?? "—").replace(/\|/g, "\\|").replace(/\n/g, " ").trim();
}

/**
 * @param {string[]} headers
 * @param {string[][]} rows
 */
function buildMarkdownTable(headers, rows) {
  if (!rows.length) return "";
  const headerRow = `| ${headers.map(escapeTableCell).join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const dataRows = rows.map(
    (row) => `| ${row.map(escapeTableCell).join(" | ")} |`
  );
  return [headerRow, separator, ...dataRows].join("\n");
}

/**
 * @param {string} title
 */
function normalizeSectionTitle(title) {
  return title
    .trim()
    .replace(/^#+\s*/, "")
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/Executivesummary/gi, "Executive summary")
    .replace(/Keyinsights/gi, "Key insights")
    .replace(/Platformmetrics/gi, "Platform metrics")
    .replace(/Doctorperformance/gi, "Doctor performance")
    .replace(/Peakbooking hour/gi, "Peak booking hour")
    .replace(/Shifaa Platform Analytics Report/gi, "")
    .replace(/^SHIFAA$/i, "")
    .trim();
}

/**
 * @param {string} title
 */
function isKnownSectionTitle(title) {
  const normalized = normalizeSectionTitle(title).toLowerCase();
  return [
    "executive summary",
    "key insights",
    "platform metrics",
    "doctor performance",
    "top specialties",
    "top governorates",
    "peak booking hours",
    "peak hours",
    "الملخص التنفيذي",
    "أبرز الرؤى",
    "مؤشرات المنصة",
    "أداء الأطباء",
  ].some((key) => normalized === key || normalized.includes(key));
}

/**
 * @param {object} snapshot
 * @param {string} locale
 */
function buildMetricsTable(snapshot, locale) {
  const labels = getReportLabels(locale);
  const m = snapshot.metrics;
  const headers =
    locale === "ar" ? ["المؤشر", "القيمة"] : ["Metric", "Value"];

  const rows = [
    [labels.totalPatients, formatLocaleNumber(m.totalPatients, locale)],
    [
      labels.totalDoctors,
      `${formatLocaleNumber(m.totalDoctors, locale)} / ${formatLocaleNumber(m.verifiedDoctors, locale)}`,
    ],
    [labels.appointmentsInRange, formatLocaleNumber(m.appointmentsInRange, locale)],
    [labels.completedInRange, formatLocaleNumber(m.completedInRange, locale)],
    [labels.cancelledInRange, formatLocaleNumber(m.cancelledInRange, locale)],
    [
      labels.cancellationRatePercent,
      `${formatLocaleNumber(m.cancellationRatePercent, locale)}%`,
    ],
    [labels.newPatientsInRange, formatLocaleNumber(m.newPatientsInRange, locale)],
    [labels.newDoctorsInRange, formatLocaleNumber(m.newDoctorsInRange, locale)],
    [labels.peakBookingHour, formatPeakHour(m.peakBookingHour, locale)],
  ];

  return buildMarkdownTable(headers, rows);
}

/**
 * @param {object} snapshot
 * @param {string} locale
 */
function buildDoctorPerformanceTable(snapshot, locale) {
  const labels = getReportLabels(locale);
  const doctors = snapshot.doctorPerformance ?? [];
  if (!doctors.length) return "";

  const headers = [
    labels.doctor,
    labels.specialty,
    labels.rating,
    labels.reviews,
    labels.bookings,
  ];

  const rows = doctors.map((d) => [
    d.name,
    d.specialty ?? "—",
    d.averageRating != null ? Number(d.averageRating).toFixed(1) : "—",
    formatLocaleNumber(d.totalReviews ?? 0, locale),
    formatLocaleNumber(d.bookingsInRange ?? 0, locale),
  ]);

  return buildMarkdownTable(headers, rows);
}

/**
 * @param {object} snapshot
 * @param {string} locale
 */
function buildTopSpecialtiesTable(snapshot, locale) {
  const labels = getReportLabels(locale);
  const items = snapshot.topSpecialties ?? [];
  if (!items.length) return "";

  const headers = [labels.specialty, labels.doctors];
  const rows = items.map((s) => [s.specialty, formatLocaleNumber(s.count, locale)]);
  return buildMarkdownTable(headers, rows);
}

/**
 * Clean raw AI / mock output into a structured admin report.
 * @param {string} rawText
 * @param {string} locale
 * @param {object} [snapshot]
 * @returns {{ narrative: string; summary: string; insights: string[] }}
 */
export function cleanReportText(rawText, locale, snapshot = null) {
  const isAr = locale === "ar";
  const labels = getReportLabels(locale);
  const stripped = stripDebugContent(rawText);

  let summary = extractSummaryParagraph(stripped);
  let insights = extractBulletInsights(stripped);

  const needsFallback =
    !summary || summary.length < 40 || isDebugLine(summary) || insights.length === 0;

  if (needsFallback && snapshot) {
    if (!summary || summary.length < 40) {
      summary = buildSummaryFromSnapshot(snapshot, locale);
    }
    if (insights.length === 0) {
      insights = buildInsightsFromSnapshot(snapshot, locale);
    }
  }

  if (!summary) {
    summary = isAr
      ? "ملخص المنصة للفترة المحددة."
      : "Platform summary for the selected period.";
  }

  if (insights.length === 0) {
    insights = [
      isAr
        ? "راجع مؤشرات المنصة أدناه للاطلاع على التفاصيل."
        : "See platform metrics below for detailed figures.",
    ];
  }

  insights = insights.slice(0, 5);

  const sections = [
    `**${labels.summary}**`,
    "",
    summary,
    "",
    `**${labels.insights}**`,
    "",
    ...insights.map((item) => `- ${item}`),
    "",
    `**${labels.metrics}**`,
    "",
  ];

  if (snapshot) {
    sections.push(buildMetricsTable(snapshot, locale));

    const doctorTable = buildDoctorPerformanceTable(snapshot, locale);
    if (doctorTable) {
      sections.push("", `**${labels.doctorPerformance}**`, "", doctorTable);
    }

    const specialtyTable = buildTopSpecialtiesTable(snapshot, locale);
    if (specialtyTable) {
      sections.push("", `**${labels.topSpecialties}**`, "", specialtyTable);
    }
  } else {
    sections.push(
      locale === "ar" ? "لا تتوفر بيانات مؤشرات." : "No metric data available."
    );
  }

  sections.push("", `_${labels.footer}_`);

  const narrative = cleanReportForDisplay(sections.join("\n"), locale, snapshot);

  return { narrative, summary, insights };
}

/**
 * Post-process report text for panel display (ChatMarkdown).
 * @param {string} rawText
 * @param {string} locale
 * @param {object} [snapshot]
 */
export function cleanReportForDisplay(rawText, locale, snapshot = null) {
  const lines = (rawText || "").split("\n");
  const output = [];
  const seenTitles = new Set();
  let metricBullets = [];

  const flushMetricBullets = () => {
    if (metricBullets.length === 0) return;
    const headers =
      locale === "ar" ? ["المؤشر", "القيمة"] : ["Metric", "Value"];
    output.push(buildMarkdownTable(headers, metricBullets));
    metricBullets = [];
  };

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushMetricBullets();
      if (output.length > 0 && output[output.length - 1] !== "") {
        output.push("");
      }
      continue;
    }

    if (/^[-—]{3,}$/.test(trimmed) && !trimmed.includes("|")) {
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6}\s+)(.+)$/);
    const boldOnlyMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);

    if (headingMatch || boldOnlyMatch) {
      flushMetricBullets();
      const rawTitle = headingMatch ? headingMatch[2] : boldOnlyMatch[1];
      const title = normalizeSectionTitle(rawTitle);
      if (!title || title.toLowerCase() === "shifaa") continue;

      const titleKey = title.toLowerCase();
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);

      output.push(`**${title}**`);
      continue;
    }

    if (isKnownSectionTitle(trimmed)) {
      flushMetricBullets();
      const title = normalizeSectionTitle(trimmed);
      const titleKey = title.toLowerCase();
      if (seenTitles.has(titleKey)) continue;
      seenTitles.add(titleKey);
      output.push(`**${title}**`);
      continue;
    }

    const metricBullet = trimmed.match(/^[-*•]\s+\*\*(.+?):\*\*\s*(.+)$/);
    if (metricBullet) {
      metricBullets.push([metricBullet[1].trim(), metricBullet[2].trim()]);
      continue;
    }

    if (trimmed.startsWith("|")) {
      flushMetricBullets();
      output.push(trimmed);
      continue;
    }

    flushMetricBullets();
    output.push(trimmed.replace(/^#{1,6}\s+/, ""));
  }

  flushMetricBullets();

  let result = output.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  if (snapshot && !result.includes("|")) {
    const labels = getReportLabels(locale);
    result = [
      result,
      "",
      `**${labels.metrics}**`,
      "",
      buildMetricsTable(snapshot, locale),
    ].join("\n");
  }

  if (/#\s/.test(result)) {
    result = result
      .split("\n")
      .map((line) => line.replace(/^#{1,6}\s+/, "").trim())
      .join("\n");
  }

  return result.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * @param {{ question: string; locale?: string; stream?: boolean }} input
 */
export async function runAdminAnalytics(input) {
  const locale = input.locale === "ar" ? "ar" : "en";
  const question = sanitizeUserInput(input.question);
  if (!question) {
    throw new ChatbotProviderError("VALIDATION_ERROR", "Question is required.");
  }

  const intent = inferAnalyticsIntent(question);
  const snapshot = await collectAnalyticsSnapshot({
    range: intent.range,
    doctorName: intent.doctorName,
  });

  const contextBlock = formatSnapshotForPrompt(snapshot);
  const messages = [
    { role: "system", content: ANALYTICS_SYSTEM },
    {
      role: "user",
      content: `Admin question:\n${question}\n\nPlatform data:\n${contextBlock}\n\nWrite the report using the required three-section format.`,
    },
  ];

  const provider = getChatProvider();
  const result = await provider.complete({ messages, locale });
  const cleaned = cleanReportText(result.content, locale, snapshot);
  cleaned.narrative = cleanReportForDisplay(cleaned.narrative, locale, snapshot);
  const report = buildStructuredReport(cleaned.narrative, snapshot, {
    question,
    locale,
  }, cleaned);

  return { report, narrative: cleaned.narrative, provider: provider.id, snapshot };
}

/**
 * @param {{ question: string; locale?: string }} input
 */
export async function* streamAdminAnalytics(input) {
  const locale = input.locale === "ar" ? "ar" : "en";
  const question = sanitizeUserInput(input.question);
  if (!question) {
    throw new ChatbotProviderError("VALIDATION_ERROR", "Question is required.");
  }

  const intent = inferAnalyticsIntent(question);
  const snapshot = await collectAnalyticsSnapshot({
    range: intent.range,
    doctorName: intent.doctorName,
  });

  const contextBlock = formatSnapshotForPrompt(snapshot);
  const messages = [
    { role: "system", content: ANALYTICS_SYSTEM },
    {
      role: "user",
      content: `Admin question:\n${question}\n\nPlatform data:\n${contextBlock}\n\nWrite the report using the required three-section format.`,
    },
  ];

  const provider = getChatProvider();
  let full = "";

  if (provider.stream) {
    for await (const chunk of provider.stream({ messages, locale })) {
      full += chunk;
      yield { type: "delta", text: chunk };
    }
  } else {
    const result = await provider.complete({ messages, locale });
    full = result.content;
    yield { type: "delta", text: full };
  }

  const cleaned = cleanReportText(full, locale, snapshot);
  cleaned.narrative = cleanReportForDisplay(cleaned.narrative, locale, snapshot);
  const report = buildStructuredReport(cleaned.narrative, snapshot, {
    question,
    locale,
  }, cleaned);

  yield {
    type: "done",
    report,
    narrative: cleaned.narrative,
    provider: provider.id,
  };
}

export function reportToPrintableText(report, locale = "en") {
  const labels = getReportLabels(locale);
  const topHours = getTopBookingHours(report.hourlyDistribution, locale);

  const lines = [
    labels.title,
    `${labels.generated}: ${formatReportDate(report.generatedAt, locale)}`,
    `${labels.period}: ${report.rangeLabel}`,
    report.question ? `${labels.question}: ${report.question}` : null,
    "",
    labels.summary,
    report.summary || report.narrative || "",
    "",
    labels.insights,
    ...(report.insights ?? []).map((i) => `- ${i}`),
    "",
    labels.metrics,
    `- ${labels.totalPatients}: ${report.metrics?.totalPatients ?? "—"}`,
    `- ${labels.totalDoctors}: ${report.metrics?.totalDoctors ?? "—"}`,
    `- ${labels.verifiedDoctors}: ${report.metrics?.verifiedDoctors ?? "—"}`,
    `- ${labels.appointmentsInRange}: ${report.metrics?.appointmentsInRange ?? "—"}`,
    `- ${labels.completedInRange}: ${report.metrics?.completedInRange ?? "—"}`,
    `- ${labels.cancelledInRange}: ${report.metrics?.cancelledInRange ?? "—"}`,
    `- ${labels.cancellationRatePercent}: ${report.metrics?.cancellationRatePercent ?? 0}%`,
    `- ${labels.newPatientsInRange}: ${report.metrics?.newPatientsInRange ?? "—"}`,
    `- ${labels.newDoctorsInRange}: ${report.metrics?.newDoctorsInRange ?? "—"}`,
    `- ${labels.peakBookingHour}: ${formatPeakHour(report.metrics?.peakBookingHour, locale)}`,
    "",
    labels.topSpecialties,
    ...(report.topSpecialties ?? []).map(
      (s) => `- ${s.specialty}: ${s.count}`
    ),
    "",
    labels.topGovernorates,
    ...(report.topGovernorates ?? []).map(
      (g) => `- ${g.governorate}: ${g.count}`
    ),
    "",
    labels.peakHours,
    ...(topHours.length
      ? topHours.map((h) => `- ${h.hour}: ${h.count}`)
      : [`- ${labels.noData}`]),
    "",
    labels.doctorPerformance,
    ...(report.doctorPerformance ?? []).map(
      (d) =>
        `- ${d.name}: ${d.specialty ?? ""} | ${labels.rating} ${d.averageRating ?? "n/a"} | ${labels.bookings} ${d.bookingsInRange ?? 0}`
    ),
    "",
    labels.footer,
  ].filter((line) => line != null);

  return lines.join("\n");
}
