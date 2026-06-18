/**
 * @param {object} snapshot
 */
export function formatSnapshotForPrompt(snapshot) {
  const lines = [
    `Analytics period: ${snapshot.rangeLabel}`,
    `From: ${snapshot.period.from}`,
    `To: ${snapshot.period.to}`,
    "",
    "Metrics (aggregated, no patient PII):",
    `- Active patients (total): ${snapshot.metrics.totalPatients}`,
    `- Doctors (total / verified): ${snapshot.metrics.totalDoctors} / ${snapshot.metrics.verifiedDoctors}`,
    `- Appointments in range: ${snapshot.metrics.appointmentsInRange}`,
    `- Completed in range: ${snapshot.metrics.completedInRange}`,
    `- Cancelled in range: ${snapshot.metrics.cancelledInRange}`,
    `- Cancellation rate: ${snapshot.metrics.cancellationRatePercent}%`,
    `- New patients in range: ${snapshot.metrics.newPatientsInRange}`,
    `- New doctors in range: ${snapshot.metrics.newDoctorsInRange}`,
    `- Peak booking hour (0-23): ${snapshot.metrics.peakBookingHour ?? "n/a"}`,
    "",
    "Top specialties:",
    ...snapshot.topSpecialties.map(
      (s) => `- ${s.specialty}: ${s.count} doctors`
    ),
    "",
    "Top governorates:",
    ...snapshot.topGovernorates.map(
      (g) => `- ${g.governorate}: ${g.count} doctors`
    ),
    "",
    "Doctor performance (names only, aggregated bookings):",
    ...snapshot.doctorPerformance.map(
      (d) =>
        `- ${d.name} (${d.specialty ?? "General"}): rating ${d.averageRating?.toFixed?.(1) ?? "n/a"}, bookings ${d.bookingsInRange ?? 0}`
    ),
  ];
  return lines.join("\n");
}

/**
 * @param {string} aiText
 * @param {object} snapshot
 * @param {{ question?: string; locale?: string }} [meta]
 * @param {{ narrative?: string; summary?: string; insights?: string[] }} [cleaned]
 */
export function buildStructuredReport(aiText, snapshot, meta = {}, cleaned = null) {
  const locale = meta.locale === "ar" ? "ar" : "en";
  const narrative = cleaned?.narrative ?? aiText;
  const summary =
    cleaned?.summary ??
    aiText.split("\n").find((l) => l.trim())?.trim() ??
    aiText.slice(0, 500);
  const insights =
    cleaned?.insights ??
    aiText
      .split("\n")
      .map((l) => l.replace(/^[-*•]\s*/, "").trim())
      .filter((l) => l.length > 10)
      .slice(0, 5);

  return {
    summary,
    narrative,
    question: meta.question ?? null,
    locale,
    insights,
    metrics: snapshot.metrics,
    topSpecialties: snapshot.topSpecialties,
    topGovernorates: snapshot.topGovernorates,
    doctorPerformance: snapshot.doctorPerformance,
    hourlyDistribution: snapshot.hourlyDistribution,
    period: snapshot.period,
    generatedAt: new Date().toISOString(),
    rangeLabel: snapshot.rangeLabel,
  };
}
