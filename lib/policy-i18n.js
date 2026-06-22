import { t } from "@/lib/i18n";

/**
 * @param {import("@/lib/dictionaries/en").default} dict
 */
export function getPaymentCancellationPolicy(dict) {
  const bullets = dict.policy?.bullets ?? [];
  return {
    title: t(dict, "policy.title"),
    checkboxLabel: t(dict, "policy.checkbox"),
    summaryShort: t(dict, "policy.summaryShort"),
    bullets: Array.isArray(bullets) ? bullets : [],
  };
}
