"use client";

import { createContext, useContext, useMemo } from "react";
import { getDictionary, getDir, t as translate } from "@/lib/i18n";
import * as labelFns from "@/lib/labels";
import { formatPriceEgp } from "@/lib/pricing";
import { getPaymentCancellationPolicy } from "@/lib/policy-i18n";

const LocaleContext = createContext({
  locale: "en",
  dir: "ltr",
  dict: getDictionary("en"),
  t: (path, vars) => translate(getDictionary("en"), path, vars),
  labels: {},
  formatPrice: (amount, currency) => formatPriceEgp(amount, currency, "en"),
  policy: getPaymentCancellationPolicy(getDictionary("en")),
});

export function LocaleProvider({ locale, children }) {
  const value = useMemo(() => {
    const dict = getDictionary(locale);
    const dir = getDir(locale);
    const labels = {
      appointmentStatus: (s) => labelFns.labelAppointmentStatus(dict, s),
      paymentStatus: (s) => labelFns.labelPaymentStatus(dict, s),
      paymentMethod: (m) => labelFns.labelPaymentMethod(dict, m),
      refundStatus: (s) => labelFns.labelRefundStatus(dict, s),
      disputeStatus: (s) => labelFns.labelDisputeStatus(dict, s),
      payoutStatus: (s) => labelFns.labelPayoutStatus(dict, s),
      supportStatus: (s) => labelFns.labelSupportStatus(dict, s),
      supportCategory: (c) => labelFns.labelSupportCategory(dict, c),
      supportPriority: (p) => labelFns.labelSupportPriority(dict, p),
      reviewModeration: (s) => labelFns.labelReviewModeration(dict, s),
      notificationType: (tpe) => labelFns.labelNotificationType(dict, tpe),
      verificationStatus: (s) => labelFns.labelVerificationStatus(dict, s),
      appointmentMode: (m) => labelFns.labelAppointmentMode(dict, m),
      transactionStatus: (s) => labelFns.labelTransactionStatus(dict, s),
      specialty: (name) => labelFns.specialtyLabel(dict, name),
      gender: (g) => labelFns.labelGender(dict, g),
      medicalAttachmentCategory: (c) =>
        labelFns.labelMedicalAttachmentCategory(dict, c),
      availabilityExceptionType: (type) =>
        labelFns.labelAvailabilityExceptionType(dict, type),
      refundOutcome: (o) => labelFns.labelRefundOutcome(dict, o),
      doctorAccountStatus: (s) => labelFns.labelDoctorAccountStatus(dict, s),
    };
    return {
      locale,
      dir,
      dict,
      t: (path, vars) => translate(dict, path, vars),
      labels,
      formatPrice: (amount, currency) =>
        formatPriceEgp(amount, currency, locale),
      policy: getPaymentCancellationPolicy(dict),
    };
  }, [locale]);

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
