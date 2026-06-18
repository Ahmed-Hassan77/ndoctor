import { t } from "@/lib/i18n";

const PREFIX = "__i18n__:";
const LEGACY_TYPE_MAP = {
  "Payout requested": "PAYOUT_REQUESTED",
  "Visit completed": "VISIT_COMPLETED",
  "Patient confirmed visit": "PATIENT_CONFIRMED_VISIT",
};

function normalizeNotificationType(type, title) {
  if (typeof type === "string" && type.length > 0) {
    if (LEGACY_TYPE_MAP[type]) return LEGACY_TYPE_MAP[type];
    if (/^[A-Z_]+$/.test(type)) return type;
    const normalized = type.trim().toUpperCase().replace(/\s+/g, "_");
    if (normalized) return normalized;
  }
  if (typeof title === "string" && LEGACY_TYPE_MAP[title]) {
    return LEGACY_TYPE_MAP[title];
  }
  return type ?? "";
}

function translateLegacyNotificationMessage(dict, raw) {
  if (!raw) return "";
  const normalized = raw.trim().replace(/^[\.\s]+/, "");

  const payout = normalized.match(
    /^Your payout request for (.+?) is being processed\.?$/i
  );
  if (payout) {
    return t(dict, "notifications.bodies.payoutRequested", {
      amount: payout[1],
    });
  }

  const completed = normalized.match(
    /^Visit with (.+?) on (.+?) is fully completed\.?$/i
  );
  if (completed) {
    return t(dict, "notifications.bodies.visitCompletedLegacy", {
      name: completed[1],
      when: completed[2],
    });
  }

  if (
    normalized.toLowerCase() ===
    "patient confirmed the visit. please confirm from your dashboard if needed."
  ) {
    return t(dict, "notifications.bodies.patientConfirmedPendingDoctor", {
      patient: t(dict, "notifications.bodies.patientLabel"),
    });
  }

  return raw;
}

/**
 * @param {string} bodyKey - key under notifications.bodies
 * @param {Record<string, string | number>} [vars]
 */
export function encodeNotificationMessage(bodyKey, vars = {}) {
  return `${PREFIX}${bodyKey}:${JSON.stringify(vars)}`;
}

/**
 * @param {import("@/lib/dictionaries/en").default} dict
 * @param {string | null | undefined} raw
 */
export function decodeNotificationMessage(dict, raw) {
  if (!raw || !raw.startsWith(PREFIX)) {
    return translateLegacyNotificationMessage(dict, raw ?? "");
  }
  const rest = raw.slice(PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep === -1) return raw;
  const key = rest.slice(0, sep);
  let vars = {};
  try {
    vars = JSON.parse(rest.slice(sep + 1) || "{}");
  } catch {
    return raw;
  }
  const resolved = { ...vars };
  if (resolved.mode === "clinic" || resolved.mode === "online") {
    resolved.mode = t(dict, `notifications.modes.${resolved.mode}`);
  }
  if (
    typeof resolved.canceller === "string" &&
    resolved.canceller.startsWith("canceller")
  ) {
    if (resolved.canceller === "cancellerDoctor" && resolved.name) {
      resolved.canceller = t(dict, "notifications.bodies.cancellerDoctor", {
        name: String(resolved.name),
      });
    } else {
      const ck = t(dict, `notifications.bodies.${resolved.canceller}`);
      resolved.canceller = ck !== `notifications.bodies.${resolved.canceller}` ? ck : resolved.canceller;
    }
  }
  if (typeof resolved.refundNote === "string" && resolved.refundNote.startsWith(PREFIX)) {
    resolved.refundNote = decodeNotificationMessage(dict, resolved.refundNote);
  }
  if (
    typeof resolved.action === "string" &&
    resolved.action.startsWith("visitSummaryAction")
  ) {
    const ak = t(dict, `notifications.bodies.${resolved.action}`);
    resolved.action = ak !== `notifications.bodies.${resolved.action}` ? ak : resolved.action;
  }

  const path = `notifications.bodies.${key}`;
  const translated = t(dict, path, resolved);
  return translated !== path ? translated : raw;
}

/**
 * @param {import("@/lib/dictionaries/en").default} dict
 * @param {{ type: string; title?: string; message?: string }} notification
 * @param {(type: string) => string} labelNotificationType
 */
export function getNotificationDisplay(dict, notification, labelNotificationType) {
  const normalizedType = normalizeNotificationType(
    notification.type,
    notification.title
  );
  const path = `enums.notificationType.${normalizedType}`;
  const translatedType = t(dict, path);

  return {
    title:
      translatedType !== path
        ? translatedType
        : labelNotificationType(notification.type),
    message: decodeNotificationMessage(dict, notification.message),
  };
}
