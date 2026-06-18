"use client";

import { forwardRef } from "react";
import {
  formatReportDate,
  getReportLabels,
  getTopBookingHours,
  getReportMetricRows,
} from "@/lib/chatbot/analytics/report-document";

const COLORS = {
  white: "#ffffff",
  slate900: "#0f172a",
  slate800: "#1e293b",
  slate700: "#334155",
  slate500: "#64748b",
  slate200: "#e2e8f0",
  slate100: "#f1f5f9",
  slate50: "#f8fafc",
};

const FONT = "Almarai, 'Segoe UI', Tahoma, sans-serif";

function ReportTable({ headers, rows, dir }) {
  if (!rows?.length) {
    return null;
  }

  return (
    <table
      dir={dir}
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "14px",
        fontFamily: FONT,
      }}
    >
      <thead>
        <tr style={{ backgroundColor: COLORS.slate100 }}>
          {headers.map((header) => (
            <th
              key={header}
              style={{
                border: `1px solid ${COLORS.slate200}`,
                padding: "8px 12px",
                textAlign: "start",
                fontWeight: 600,
                color: COLORS.slate900,
              }}
            >
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={index}>
            {row.map((cell, cellIndex) => (
              <td
                key={cellIndex}
                style={{
                  border: `1px solid ${COLORS.slate200}`,
                  padding: "8px 12px",
                  color: COLORS.slate800,
                }}
              >
                {cell ?? "—"}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Plain-text narrative renderer safe for html2canvas (no Tailwind / oklch). */
function ReportNarrative({ content, dir }) {
  if (!content) return null;

  const blocks = content.split(/\n{2,}/);

  return (
    <div dir={dir} style={{ fontFamily: FONT, fontSize: "14px", color: COLORS.slate800 }}>
      {blocks.map((block, index) => {
        const lines = block.split("\n");
        const isList = lines.every((line) => /^[\s]*[-*•]\s/.test(line) || line.trim() === "");

        if (isList && lines.some((line) => /^[\s]*[-*•]\s/.test(line))) {
          return (
            <ul
              key={index}
              style={{
                margin: "0 0 12px 0",
                paddingInlineStart: "20px",
                listStyleType: "disc",
              }}
            >
              {lines
                .filter((line) => line.trim())
                .map((line, lineIndex) => (
                  <li key={lineIndex} style={{ marginBottom: "4px" }}>
                    {line.replace(/^[\s]*[-*•]\s*/, "")}
                  </li>
                ))}
            </ul>
          );
        }

        return (
          <p key={index} style={{ margin: "0 0 12px 0", lineHeight: 1.6 }}>
            {block}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Off-screen printable report used for PDF export.
 * Uses inline hex styles only — html2canvas cannot parse Tailwind v4 oklch() colors.
 */
export const AnalyticsReportSheet = forwardRef(function AnalyticsReportSheet(
  { report, narrative, question, locale, dir, t },
  ref
) {
  if (!report && !narrative) {
    return null;
  }

  const labels = getReportLabels(locale);
  const metricRows = report ? getReportMetricRows(report, t) : [];
  const topHours = getTopBookingHours(report?.hourlyDistribution, locale);
  const summaryText = report?.summary || "";
  const bodyText = summaryText;

  const sectionTitle = {
    margin: "0 0 12px 0",
    fontSize: "18px",
    fontWeight: 700,
    color: COLORS.slate900,
    fontFamily: FONT,
  };

  return (
    <div
      ref={ref}
      aria-hidden
      data-pdf-report
      style={{
        position: "fixed",
        left: "-10000px",
        top: 0,
        width: "794px",
        pointerEvents: "none",
        backgroundColor: COLORS.white,
        fontFamily: FONT,
        color: COLORS.slate900,
        lineHeight: 1.6,
      }}
    >
      <div
        dir={dir}
        style={{
          backgroundColor: COLORS.white,
          padding: "40px",
          fontFamily: FONT,
          color: COLORS.slate900,
        }}
      >
        <header
          style={{
            borderBottom: `1px solid ${COLORS.slate200}`,
            paddingBottom: "16px",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: COLORS.slate500,
            }}
          >
            Shifaa
          </p>
          <h1
            style={{
              margin: "4px 0 0 0",
              fontSize: "24px",
              fontWeight: 700,
              color: COLORS.slate900,
            }}
          >
            {labels.title}
          </h1>
        </header>

        <section style={{ marginTop: "24px", fontSize: "14px", color: COLORS.slate700 }}>
          <p style={{ margin: "0 0 8px 0" }}>
            <span style={{ fontWeight: 600, color: COLORS.slate900 }}>
              {labels.generated}:{" "}
            </span>
            {formatReportDate(report?.generatedAt ?? new Date().toISOString(), locale)}
          </p>
          {report?.rangeLabel ? (
            <p style={{ margin: "0 0 8px 0" }}>
              <span style={{ fontWeight: 600, color: COLORS.slate900 }}>
                {labels.period}:{" "}
              </span>
              {report.rangeLabel}
            </p>
          ) : null}
          {question ? (
            <p style={{ margin: 0 }}>
              <span style={{ fontWeight: 600, color: COLORS.slate900 }}>
                {labels.question}:{" "}
              </span>
              {question}
            </p>
          ) : null}
        </section>

        {bodyText ? (
          <section style={{ marginTop: "32px" }}>
            <h2 style={sectionTitle}>{labels.summary}</h2>
            <div
              style={{
                borderRadius: "8px",
                border: `1px solid ${COLORS.slate200}`,
                backgroundColor: COLORS.slate50,
                padding: "16px",
              }}
            >
              <ReportNarrative content={bodyText} dir={dir} />
            </div>
          </section>
        ) : null}

        {report?.insights?.length ? (
          <section style={{ marginTop: "32px" }}>
            <h2 style={sectionTitle}>{labels.insights}</h2>
            <ul
              style={{
                margin: 0,
                paddingInlineStart: "20px",
                fontSize: "14px",
                color: COLORS.slate800,
                listStyleType: "disc",
              }}
            >
              {report.insights.map((item, index) => (
                <li key={index} style={{ marginBottom: "4px" }}>
                  {item}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {metricRows.length ? (
          <section style={{ marginTop: "32px" }}>
            <h2 style={sectionTitle}>{labels.metrics}</h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              {metricRows.map((row) => (
                <div
                  key={row.key}
                  style={{
                    borderRadius: "8px",
                    border: `1px solid ${COLORS.slate200}`,
                    padding: "12px",
                    backgroundColor: COLORS.white,
                  }}
                >
                  <p style={{ margin: 0, fontSize: "12px", color: COLORS.slate500 }}>
                    {row.label}
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "18px",
                      fontWeight: 600,
                      color: COLORS.slate900,
                    }}
                  >
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {report?.topSpecialties?.length ? (
          <section style={{ marginTop: "32px" }}>
            <h2 style={sectionTitle}>{labels.topSpecialties}</h2>
            <ReportTable
              dir={dir}
              headers={[labels.specialty, labels.doctors]}
              rows={report.topSpecialties.map((row) => [row.specialty, row.count])}
            />
          </section>
        ) : null}

        {report?.topGovernorates?.length ? (
          <section style={{ marginTop: "32px" }}>
            <h2 style={sectionTitle}>{labels.topGovernorates}</h2>
            <ReportTable
              dir={dir}
              headers={[labels.governorate, labels.doctors]}
              rows={report.topGovernorates.map((row) => [row.governorate, row.count])}
            />
          </section>
        ) : null}

        {topHours.length ? (
          <section style={{ marginTop: "32px" }}>
            <h2 style={sectionTitle}>{labels.peakHours}</h2>
            <ReportTable
              dir={dir}
              headers={[labels.hour, labels.count]}
              rows={topHours.map((row) => [row.hour, row.count])}
            />
          </section>
        ) : null}

        {report?.doctorPerformance?.length ? (
          <section style={{ marginTop: "32px" }}>
            <h2 style={sectionTitle}>{labels.doctorPerformance}</h2>
            <ReportTable
              dir={dir}
              headers={[
                labels.doctor,
                labels.specialty,
                labels.rating,
                labels.reviews,
                labels.bookings,
              ]}
              rows={report.doctorPerformance.map((row) => [
                row.name,
                row.specialty ?? "—",
                row.averageRating != null
                  ? Number(row.averageRating).toFixed(1)
                  : "—",
                row.totalReviews ?? "—",
                row.bookingsInRange ?? 0,
              ])}
            />
          </section>
        ) : null}

        <footer
          style={{
            marginTop: "40px",
            borderTop: `1px solid ${COLORS.slate200}`,
            paddingTop: "16px",
            fontSize: "12px",
            color: COLORS.slate500,
          }}
        >
          {labels.footer}
        </footer>
      </div>
    </div>
  );
});
