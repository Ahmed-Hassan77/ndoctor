import {
  formatPriceEgp,
  resolveClinicPriceEgp,
  resolveConsultationDurationMinutes,
  resolveFollowUpPriceEgp,
  resolveOnlinePriceEgp,
  DEFAULT_CURRENCY,
} from "@/lib/pricing";
import {
  formatClinicLocationSummary,
  hasUsableClinicLocation,
} from "@/lib/clinic-location";
import { doctorSupportsMode } from "@/lib/doctor-availability";

export { formatClinicLocationSummary, hasUsableClinicLocation, doctorSupportsMode };

/**
 * @param {import("@prisma/client").User | null | undefined} doctor
 */
/**
 * @param {import("@prisma/client").User | null | undefined} doctor
 * @param {string} [locale]
 */
export function getDoctorPricingSummary(doctor, locale = "en") {
  const currency = doctor?.currency?.trim() || DEFAULT_CURRENCY;
  return {
    onlineEgp: resolveOnlinePriceEgp(doctor),
    clinicEgp: resolveClinicPriceEgp(doctor),
    followUpEgp: resolveFollowUpPriceEgp(doctor),
    durationMinutes: resolveConsultationDurationMinutes(doctor),
    currency,
    onlineLabel: formatPriceEgp(resolveOnlinePriceEgp(doctor), currency, locale),
    clinicLabel: formatPriceEgp(resolveClinicPriceEgp(doctor), currency, locale),
    followUpLabel: resolveFollowUpPriceEgp(doctor)
      ? formatPriceEgp(resolveFollowUpPriceEgp(doctor), currency, locale)
      : null,
  };
}
