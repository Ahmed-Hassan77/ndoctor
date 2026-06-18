/**
 * Labels and helpers for analytics report export (PDF / text).
 */

export const REPORT_LABELS = {
  en: {
    title: "Shifaa Platform Analytics Report",
    generated: "Generated",
    period: "Reporting period",
    question: "Admin question",
    summary: "Executive summary",
    insights: "Key insights",
    metrics: "Platform metrics",
    topSpecialties: "Top specialties (verified doctors)",
    topGovernorates: "Top governorates (verified doctors)",
    doctorPerformance: "Doctor performance",
    peakHours: "Peak booking hours",
    footer:
      "Confidential — aggregated platform data only. No individual patient records are included.",
    specialty: "Specialty",
    governorate: "Governorate",
    doctors: "Doctors",
    doctor: "Doctor",
    rating: "Rating",
    reviews: "Reviews",
    bookings: "Bookings",
    hour: "Hour",
    count: "Appointments",
    noData: "No data for this period",
    totalDoctors: "Total doctors",
    totalPatients: "Active patients",
    verifiedDoctors: "Verified doctors",
    appointmentsInRange: "Appointments in period",
    cancellationRatePercent: "Cancellation rate",
    completedInRange: "Completed appointments",
    cancelledInRange: "Cancelled appointments",
    newPatientsInRange: "New patients",
    newDoctorsInRange: "New doctors",
    peakBookingHour: "Peak booking hour",
  },
  ar: {
    title: "تقرير تحليلات منصة شفاء",
    generated: "تاريخ الإنشاء",
    period: "فترة التقرير",
    question: "سؤال المسؤول",
    summary: "الملخص التنفيذي",
    insights: "أبرز الرؤى",
    metrics: "مؤشرات المنصة",
    topSpecialties: "أكثر التخصصات (أطباء موثّقون)",
    topGovernorates: "أكثر المحافظات (أطباء موثّقون)",
    doctorPerformance: "أداء الأطباء",
    peakHours: "ساعات الذروة للحجز",
    footer:
      "سري — بيانات مجمّعة للمنصة فقط. لا تتضمن سجلات مرضى فردية.",
    specialty: "التخصص",
    governorate: "المحافظة",
    doctors: "الأطباء",
    doctor: "الطبيب",
    rating: "التقييم",
    reviews: "المراجعات",
    bookings: "الحجوزات",
    hour: "الساعة",
    count: "المواعيد",
    noData: "لا توجد بيانات لهذه الفترة",
    totalDoctors: "إجمالي الأطباء",
    totalPatients: "المرضى النشطون",
    verifiedDoctors: "الأطباء الموثّقون",
    appointmentsInRange: "المواعيد في الفترة",
    cancellationRatePercent: "معدل الإلغاء",
    completedInRange: "مواعيد مكتملة",
    cancelledInRange: "مواعيد ملغاة",
    newPatientsInRange: "مرضى جدد",
    newDoctorsInRange: "أطباء جدد",
    peakBookingHour: "ساعة الذروة",
  },
};

/**
 * @param {string} locale
 */
export function getReportLabels(locale) {
  return locale === "ar" ? REPORT_LABELS.ar : REPORT_LABELS.en;
}

/**
 * @param {string} iso
 * @param {string} locale
 */
export function formatReportDate(iso, locale) {
  if (!iso) return "—";
  const date = new Date(iso);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

/**
 * @param {number|null} hour
 * @param {string} locale
 */
export function formatPeakHour(hour, locale) {
  if (hour == null || hour < 0 || hour > 23) {
    return locale === "ar" ? "غير متاح" : "N/A";
  }
  const start = new Date(2000, 0, 1, hour, 0);
  const end = new Date(2000, 0, 1, hour + 1, 0);
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

/**
 * @param {number[]} hourlyDistribution
 * @param {string} locale
 * @param {number} [limit=5]
 */
export function getTopBookingHours(hourlyDistribution, locale, limit = 5) {
  if (!Array.isArray(hourlyDistribution) || hourlyDistribution.length === 0) {
    return [];
  }
  return hourlyDistribution
    .map((count, hour) => ({ hour, count }))
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((row) => ({
      hour: formatPeakHour(row.hour, locale),
      count: row.count,
    }));
}

/**
 * @param {object} report
 * @param {(key: string) => string} t
 */
export function getReportMetricRows(report, t) {
  const m = report?.metrics ?? {};
  return [
    ["totalPatients", m.totalPatients],
    ["totalDoctors", m.totalDoctors],
    ["verifiedDoctors", m.verifiedDoctors],
    ["appointmentsInRange", m.appointmentsInRange],
    ["completedInRange", m.completedInRange],
    ["cancelledInRange", m.cancelledInRange],
    ["cancellationRatePercent", `${m.cancellationRatePercent ?? 0}%`],
    ["newPatientsInRange", m.newPatientsInRange],
    ["newDoctorsInRange", m.newDoctorsInRange],
    [
      "peakBookingHour",
      formatPeakHour(m.peakBookingHour, report?.locale ?? "en"),
    ],
  ].map(([key, value]) => ({
    key,
    label: t(`admin.analyticsMetrics.${key}`),
    value: value ?? "—",
  }));
}
