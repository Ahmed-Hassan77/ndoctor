import z from "zod";
import { parseUtcIsoInstant } from "@/lib/datetime";
import { OTHER_SPECIALTY } from "@/lib/specialities";
import { refineDoctorBilingualScripts, refineClinicBilingualScripts } from "@/lib/bilingual-text";

const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

const utcInstantField = (fieldKey) =>
  z
    .string()
    .min(1, `validation.${fieldKey}Required`)
    .transform((raw, ctx) => {
      const d = parseUtcIsoInstant(raw);
      if (!d) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            fieldKey === "startTime"
              ? "validation.invalidStartTime"
              : "validation.invalidEndTime",
        });
        return z.NEVER;
      }
      return d;
    });

export const appointmentModeEnum = z.enum(["ONLINE", "OFFLINE"]);

export const rescheduleAppointmentSchema = z
  .object({
    appointmentId: z.string().min(1, "validation.appointmentIdRequired"),
    startTime: utcInstantField("startTime"),
    endTime: utcInstantField("endTime"),
  })
  .refine((d) => d.endTime.getTime() > d.startTime.getTime(), {
    message: "validation.endAfterStart",
    path: ["endTime"],
  });

export const bookAppointmentSchema = z.object({
  doctorId: z.string().uuid("validation.invalidDoctorId"),
  startTime: utcInstantField("startTime"),
  endTime: utcInstantField("endTime"),
  appointmentMode: z.preprocess(
    (v) =>
      v != null && String(v).toUpperCase() === "OFFLINE" ? "OFFLINE" : "ONLINE",
    z.enum(["ONLINE", "OFFLINE"])
  ),
  description: z
    .string()
    .max(2000)
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? null : v)),
  clinicId: z
    .string()
    .uuid("validation.invalidClinicId")
    .optional()
    .nullable()
    .transform((v) => (v == null || v === "" ? null : v)),
  policyAccepted: z
    .preprocess(
      (v) => v === true || v === "true" || v === "on" || v === "1",
      z.boolean()
    )
    .refine((v) => v === true, {
      message: "validation.policyRequired",
    }),
});

export const setWorkTimeSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(HH_MM, "validation.startTimeFormat"),
    endTime: z.string().regex(HH_MM, "validation.endTimeFormat"),
    mode: z.preprocess(
      (v) =>
        v != null && String(v).toUpperCase() === "OFFLINE" ? "OFFLINE" : "ONLINE",
      z.enum(["ONLINE", "OFFLINE"])
    ),
    clinicId: z
      .string()
      .uuid()
      .optional()
      .nullable()
      .transform((v) => (v == null || v === "" ? null : v)),
  })
  .refine(
    (d) => {
      const [sh, sm] = d.startTime.split(":").map(Number);
      const [eh, em] = d.endTime.split(":").map(Number);
      return sh * 60 + sm < eh * 60 + em;
    },
    { message: "validation.endAfterStart", path: ["endTime"] }
  )
  .refine((d) => d.mode !== "OFFLINE" || Boolean(d.clinicId), {
    message: "validation.clinicRequired",
    path: ["clinicId"],
  });

export const clinicIdSchema = z.object({
  clinicId: z.string().uuid("validation.invalidClinicId"),
});

const clinicLocationFields = {
  governorateEn: z
    .string()
    .trim()
    .min(1, "validation.governorateEnRequired")
    .max(80),
  governorateAr: z
    .string()
    .trim()
    .min(1, "validation.governorateArRequired")
    .max(80),
  areaEn: z.string().trim().min(1, "validation.areaEnRequired").max(120),
  areaAr: z.string().trim().min(1, "validation.areaArRequired").max(120),
  addressEn: z.string().trim().min(3, "validation.addressEnRequired").max(500),
  addressAr: z.string().trim().min(3, "validation.addressArRequired").max(500),
  buildingInfoEn: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v == null || v.trim() === "" ? null : v.trim())),
  buildingInfoAr: z
    .string()
    .max(200)
    .optional()
    .nullable()
    .transform((v) => (v == null || v.trim() === "" ? null : v.trim())),
  phone: z
    .string()
    .max(30)
    .optional()
    .nullable()
    .transform((v) => (v == null || v.trim() === "" ? null : v.trim())),
  googleMapsUrl: z
    .string()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      if (!t) return null;
      try {
        new URL(t);
        return t;
      } catch {
        return null;
      }
    }),
  consultationPriceEgp: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0).max(100000).optional()
  ),
  isActive: z
    .preprocess(
      (v) => v === true || v === "true" || v === "1",
      z.boolean()
    )
    .optional(),
};

const withClinicScriptRefine = (schema) =>
  schema.superRefine((data, ctx) => refineClinicBilingualScripts(data, ctx));

/** Location/contact fields submitted from the dashboard branch form (name comes from doctor profile). */
export const clinicBranchSchema = withClinicScriptRefine(
  z.object(clinicLocationFields)
);

export const clinicSchema = withClinicScriptRefine(
  z.object({
    nameEn: z.string().trim().min(2, "validation.clinicNameRequired").max(120),
    nameAr: z
      .string()
      .max(120)
      .optional()
      .nullable()
      .transform((v) => {
        const t = (v ?? "").trim();
        return t === "" ? null : t;
      }),
    ...clinicLocationFields,
  })
);

export const workTimeIdSchema = z.object({
  workTimeId: z.string().min(1, "validation.workTimeIdRequired"),
});

export const systemConfigKeySchema = z.object({
  key: z.enum(["slot_duration"]),
});

export const updateSystemConfigSchema = z.object({
  key: z.enum(["slot_duration"]),
  value: z
    .string()
    .regex(/^\d+$/, "validation.digitsOnly")
    .refine((v) => parseInt(v, 10) > 0, "validation.positiveInteger"),
});

export const workTimeZoneSchema = z.object({
  workTimeZone: z
    .string()
    .trim()
    .min(2, "validation.timezoneRequired")
    .max(64, "validation.timezoneTooLong"),
});

export const practiceAddressSchema = z.object({
  practiceAddress: z
    .string()
    .max(2000, "validation.fieldTooLong")
    .transform((v) => {
      const t = (v ?? "").trim();
      return t === "" ? null : t;
    }),
});

export const generateVideoTokenSchema = z.object({
  appointmentId: z.string().uuid("validation.invalidAppointmentId"),
});

const appointmentIdUuid = z.string().uuid("validation.invalidAppointmentId");

const optionalActionNote = z
  .string()
  .max(2000, "validation.noteTooLong")
  .optional()
  .nullable()
  .transform((v) => {
    const t = (v ?? "").trim();
    return t === "" ? null : t;
  });

export const appointmentIdActionSchema = z.object({
  appointmentId: appointmentIdUuid,
  reason: optionalActionNote,
  note: optionalActionNote,
});

export const adminMarkCompletedSchema = z.object({
  appointmentId: appointmentIdUuid,
  adminCompletionNote: optionalActionNote,
});

export const adminAppointmentIdSchema = z.object({
  appointmentId: appointmentIdUuid,
});

export const adminOpenDisputeSchema = z.object({
  appointmentId: appointmentIdUuid,
  disputeReason: optionalActionNote,
});

export const adminResolveDisputeSchema = z.object({
  appointmentId: appointmentIdUuid,
  disputeStatus: z.enum(["RESOLVED", "REJECTED"], {
    errorMap: () => ({ message: "validation.disputeStatusInvalid" }),
  }),
  disputeResolutionNote: optionalActionNote,
  refundOutcome: z
    .enum(["none", "full", "partial90"])
    .optional()
    .default("none"),
});

const visitSummaryText = (max) =>
  z
    .string()
    .max(max, "validation.fieldTooLong")
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t === "" ? null : t;
    });

export const visitSummarySchema = z.object({
  appointmentId: appointmentIdUuid,
  diagnosis: visitSummaryText(10000),
  prescription: visitSummaryText(10000),
  recommendations: visitSummaryText(10000),
  followUpInstructions: visitSummaryText(10000),
  followUpDate: z.preprocess(
    (v) => (v === "" || v == null || v === undefined ? null : v),
    z.union([
      z.null(),
      z.coerce.date({ invalid_type_error: "validation.invalidFollowUpDate" }),
    ])
  ),
  patientFriendlySummary: visitSummaryText(10000),
  redFlags: visitSummaryText(5000),
  privateDoctorNotes: visitSummaryText(10000),
});

export const ratingSchema = z.object({
  appointmentId: z.string().uuid("validation.invalidAppointmentId"),
  value: z.coerce.number().int().min(1).max(5),
  review: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => (v == null || v === "" ? undefined : v)),
});

const positiveIntEgp = z.coerce
  .number({ invalid_type_error: "validation.mustBeNumber" })
  .int("validation.mustBeWholeNumber")
  .positive("validation.mustBePositive");

const optionalPositiveIntEgp = z.preprocess(
  (v) => (v === "" || v == null || v === undefined ? undefined : v),
  z.coerce.number().int().positive().optional()
);

const optionalTrimmedText = (max) =>
  z
    .string()
    .max(max, "validation.fieldTooLong")
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t === "" ? null : t;
    });

const optionalUrlField = z
  .string()
  .max(2000)
  .optional()
  .nullable()
  .transform((v) => {
    const t = (v ?? "").trim();
    return t === "" ? null : t;
  })
  .refine(
    (v) => v == null || z.string().url().safeParse(v).success,
    "validation.invalidUrl"
  );

const requiredTrimmed = (max, message) =>
  z.string().trim().min(1, message).max(max, "validation.fieldTooLong");

/** EGP pricing and shared clinic contact (doctor onboarding + dashboard). */
export const doctorClinicContactSchema = z.object({
  onlineConsultationPriceEgp: positiveIntEgp,
  clinicConsultationPriceEgp: positiveIntEgp,
  followUpPriceEgp: optionalPositiveIntEgp,
  consultationDurationMinutes: positiveIntEgp,
  clinicGoogleMapsUrl: optionalUrlField,
  clinicPhone: optionalTrimmedText(40),
});

/** Optional bilingual professional profile copy. */
export const doctorProfessionalFieldsSchema = z.object({
  clinicBuildingInfoEn: optionalTrimmedText(500),
  clinicBuildingInfoAr: optionalTrimmedText(500),
  servicesOfferedEn: optionalTrimmedText(3000),
  servicesOfferedAr: optionalTrimmedText(3000),
  educationEn: optionalTrimmedText(3000),
  educationAr: optionalTrimmedText(3000),
  languagesEn: optionalTrimmedText(500),
  languagesAr: optionalTrimmedText(500),
  cancellationPolicyEn: optionalTrimmedText(3000),
  cancellationPolicyAr: optionalTrimmedText(3000),
});

/** @deprecated alias */
export const doctorProfileFieldsSchema = doctorClinicContactSchema.merge(
  doctorProfessionalFieldsSchema
);

/** Public-facing bilingual copy shown on the marketplace and profile. */
export const doctorBilingualPublicSchema = z.object({
  nameEn: requiredTrimmed(120, "validation.nameEnRequired"),
  nameAr: requiredTrimmed(120, "validation.nameArRequired"),
  descriptionEn: z
    .string()
    .trim()
    .min(20, "validation.descriptionMin")
    .max(1000, "validation.descriptionMax"),
  descriptionAr: z
    .string()
    .trim()
    .min(20, "validation.descriptionMin")
    .max(1000, "validation.descriptionMax"),
  clinicGovernorateEn: requiredTrimmed(120, "validation.governorateEnRequired"),
  clinicGovernorateAr: requiredTrimmed(120, "validation.governorateArRequired"),
  clinicAreaEn: requiredTrimmed(120, "validation.areaEnRequired"),
  clinicAreaAr: requiredTrimmed(120, "validation.areaArRequired"),
  clinicAddressEn: requiredTrimmed(2000, "validation.addressEnRequired"),
  clinicAddressAr: requiredTrimmed(2000, "validation.addressArRequired"),
});

export const doctorFormSchema = z.object({
  specialty: z.string().min(1, "validation.specialtyRequired"),
  specialtyOtherEn: z.string().optional(),
  specialtyOtherAr: z.string().optional(),
  experience: z
    .number({ invalid_type_error: "validation.experienceNumber" })
    .int()
    .min(1, "validation.experienceMin")
    .max(70, "validation.experienceMax"),
  credentialUrl: z
    .string()
    .url("validation.invalidUrl")
    .min(1, "validation.credentialUrlRequired"),
});

export const doctorOnboardingSchema = doctorFormSchema
  .merge(doctorBilingualPublicSchema)
  .merge(doctorClinicContactSchema)
  .merge(doctorProfessionalFieldsSchema)
  .superRefine((data, ctx) => {
    refineDoctorBilingualScripts(data, ctx, {
      includeSpecialtyOther: data.specialty === OTHER_SPECIALTY,
    });

    if (data.specialty !== OTHER_SPECIALTY) return;
    const en = (data.specialtyOtherEn ?? "").trim();
    const ar = (data.specialtyOtherAr ?? "").trim();
    if (en.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specialtyOtherEn"],
        message: "validation.specialtyOtherRequired",
      });
    }
    if (ar.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specialtyOtherAr"],
        message: "validation.specialtyOtherArRequired",
      });
    }
    if (en.length > 80 || ar.length > 80) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["specialtyOtherEn"],
        message: "validation.specialtyOtherMax",
      });
    }
  });

export const doctorProfileSettingsSchema = doctorBilingualPublicSchema
  .merge(doctorClinicContactSchema)
  .merge(doctorProfessionalFieldsSchema)
  .superRefine((data, ctx) => {
    refineDoctorBilingualScripts(data, ctx, { includeSpecialtyOther: false });
  });

const optionalMedicalText = (max) =>
  z
    .string()
    .max(max, "validation.fieldTooLong")
    .optional()
    .nullable()
    .transform((v) => {
      const t = (v ?? "").trim();
      return t === "" ? null : t;
    });

const optionalGender = z.preprocess(
  (v) => (v === "" || v == null || v === undefined ? null : v),
  z.union([z.null(), z.enum(["Male", "Female"], {
    errorMap: () => ({ message: "validation.genderRequired" }),
  })])
);

const optionalBloodType = z.preprocess(
  (v) => (v === "" || v == null || v === undefined ? null : v),
  z.union([
    z.null(),
    z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], {
      errorMap: () => ({ message: "validation.bloodTypeInvalid" }),
    }),
  ])
);

export const patientMedicalProfileSchema = z.object({
  dateOfBirth: z.preprocess(
    (v) => (v === "" || v == null || v === undefined ? null : v),
    z.union([
      z.null(),
      z.coerce.date({
        invalid_type_error: "validation.dateOfBirthInvalid",
      }),
    ])
  ),
  gender: optionalGender,
  bloodType: optionalBloodType,
  allergies: optionalMedicalText(5000),
  chronicConditions: optionalMedicalText(5000),
  currentMedications: optionalMedicalText(5000),
  previousSurgeries: optionalMedicalText(5000),
  familyHistory: optionalMedicalText(5000),
  medicalNotes: optionalMedicalText(5000),
  emergencyContactName: optionalMedicalText(120),
  emergencyContactPhone: optionalMedicalText(40),
});

const medicalAttachmentCategoryEnum = z.enum([
  "LAB_TEST",
  "RADIOLOGY",
  "PRESCRIPTION",
  "REPORT",
  "OTHER",
]);

export const patientMedicalAttachmentSchema = z.object({
  fileUrl: z
    .string()
    .min(1, "validation.fileUrlRequired")
    .max(2000)
    .url("validation.fileUrlInvalid"),
  fileName: z
    .string()
    .min(1, "validation.fileNameRequired")
    .max(255, "validation.fileNameTooLong")
    .transform((v) => v.trim()),
  category: medicalAttachmentCategoryEnum,
  description: optionalMedicalText(500),
});

export const patientMedicalAttachmentIdSchema = z.object({
  attachmentId: z.string().uuid("validation.invalidAttachment"),
});
