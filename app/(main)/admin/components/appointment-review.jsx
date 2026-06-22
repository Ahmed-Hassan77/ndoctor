"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ClipboardList } from "lucide-react";
import useFetch from "@/hooks/use-fetch";
import { toast } from "sonner";
import {
  getAdminAppointmentsForReview,
  adminMarkAppointmentCompleted,
  adminOpenAppointmentDispute,
  adminResolveAppointmentDispute,
  adminCancelAppointment,
} from "@/actions/admin-appointments";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { useLocale } from "@/components/locale-provider";

const REFUND_OUTCOMES = [
  { value: "none", key: "NONE" },
  { value: "full", key: "FULL_DOCTOR_NO_SHOW" },
  { value: "partial90", key: "PARTIAL" },
];

const APPOINTMENT_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"];
const PAYMENT_STATUSES = ["PAID", "PENDING", "UNPAID", "REFUNDED"];
const DISPUTE_STATUSES = ["NONE", "OPEN", "RESOLVED"];
const RESOLVE_STATUSES = ["RESOLVED", "REJECTED"];

function EvidenceLine({ label, value }) {
  return (
    <p>
      <span className="text-muted-foreground">{label}: </span>
      <span className="text-foreground">{value}</span>
    </p>
  );
}

export function AppointmentReview({ initialAppointments = [] }) {
  const { t, labels } = useLocale();
  const [list, setList] = useState(initialAppointments);
  const [selectedId, setSelectedId] = useState(null);
  const [adminNote, setAdminNote] = useState("");
  const [disputeReason, setDisputeReason] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolveStatus, setResolveStatus] = useState("RESOLVED");
  const [refundOutcome, setRefundOutcome] = useState("none");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPayment, setFilterPayment] = useState("all");
  const [filterDispute, setFilterDispute] = useState("all");
  const [filterMode, setFilterMode] = useState("all");

  const yn = (at) => {
    if (!at) return t("common.no");
    return `${t("common.yes")} — ${formatAppointmentDateTime(at)}`;
  };

  const { loading: loadList, fn: loadAppointments } = useFetch(
    getAdminAppointmentsForReview
  );
  const { loading: markLoading, fn: submitMark } = useFetch(
    adminMarkAppointmentCompleted
  );
  const { loading: cancelLoading, fn: submitCancel } = useFetch(
    adminCancelAppointment
  );
  const { loading: openLoading, fn: submitOpen } = useFetch(
    adminOpenAppointmentDispute
  );
  const { loading: resolveLoading, fn: submitResolve } = useFetch(
    adminResolveAppointmentDispute
  );

  useEffect(() => {
    if (initialAppointments.length === 0) {
      loadAppointments().then((res) => {
        if (res?.success) setList(res.appointments ?? []);
      });
    }
  }, [initialAppointments.length, loadAppointments]);

  const filteredList = useMemo(() => {
    return list.filter((a) => {
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (filterPayment !== "all" && a.paymentStatus !== filterPayment)
        return false;
      if (filterDispute !== "all" && a.disputeStatus !== filterDispute)
        return false;
      if (filterMode !== "all" && a.appointmentMode !== filterMode) return false;
      return true;
    });
  }, [list, filterStatus, filterPayment, filterDispute, filterMode]);

  const selected =
    filteredList.find((a) => a.id === selectedId) ?? filteredList[0] ?? null;

  const refreshList = async () => {
    const res = await loadAppointments();
    if (res?.success) setList(res.appointments ?? []);
  };

  const patchSelected = (updated) => {
    if (!updated?.id) return;
    setList((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a))
    );
  };

  const runMark = async () => {
    const fd = new FormData();
    fd.append("appointmentId", selected.id);
    if (adminNote.trim()) fd.append("adminCompletionNote", adminNote.trim());
    const res = await submitMark(fd);
    if (res?.success) {
      toast.success(t("admin.markedCompleted"));
      patchSelected(res.appointment);
      await refreshList();
    }
  };

  const runCancel = async () => {
    if (!window.confirm(t("appointments.cancelAdminConfirm"))) {
      return;
    }
    const fd = new FormData();
    fd.append("appointmentId", selected.id);
    const res = await submitCancel(fd);
    if (res?.success) {
      toast.success(t("admin.cancelled"));
      patchSelected(res.appointment);
      await refreshList();
    }
  };

  const runOpenDispute = async () => {
    const fd = new FormData();
    fd.append("appointmentId", selected.id);
    if (disputeReason.trim()) fd.append("disputeReason", disputeReason.trim());
    const res = await submitOpen(fd);
    if (res?.success) {
      toast.success(t("admin.disputeOpened"));
      patchSelected(res.appointment);
      await refreshList();
    }
  };

  const runResolve = async () => {
    const fd = new FormData();
    fd.append("appointmentId", selected.id);
    fd.append("disputeStatus", resolveStatus);
    fd.append("refundOutcome", refundOutcome);
    if (resolutionNote.trim())
      fd.append("disputeResolutionNote", resolutionNote.trim());
    const res = await submitResolve(fd);
    if (res?.success) {
      toast.success(t("admin.disputeUpdated"));
      patchSelected(res.appointment);
      await refreshList();
    }
  };

  const busy =
    markLoading || cancelLoading || openLoading || resolveLoading || loadList;

  return (
    <Card className="border-border/80">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          {t("admin.appointmentReviewTitle")}
        </CardTitle>
        <CardDescription>{t("admin.appointmentReviewDesc")}</CardDescription>
        <div className="flex flex-wrap gap-2 pt-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder={t("admin.filterStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allStatus")}</SelectItem>
              {APPOINTMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {labels.appointmentStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterPayment} onValueChange={setFilterPayment}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder={t("appointments.payment")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allPayment")}</SelectItem>
              {PAYMENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {labels.paymentStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDispute} onValueChange={setFilterDispute}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder={t("appointments.dispute")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allDispute")}</SelectItem>
              {DISPUTE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {labels.disputeStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterMode} onValueChange={setFilterMode}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue placeholder={t("appointments.visitType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("admin.allMode")}</SelectItem>
              <SelectItem value="ONLINE">{t("common.online")}</SelectItem>
              <SelectItem value="OFFLINE">{t("common.clinic")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadList && list.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t("appointments.noAppointmentsFound")}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="max-h-[520px] overflow-y-auto space-y-2 border border-border/80 rounded-md p-2">
              {filteredList.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full text-start rounded-md p-2 text-sm transition-colors ${
                    selected?.id === a.id
                      ? "bg-primary/5 border border-primary/30"
                      : "hover:bg-muted/20 border border-transparent"
                  }`}
                >
                  <p className="font-medium text-foreground truncate">
                    {a.patient?.name ?? a.patient?.email} → {t("admin.drBadge")}{" "}
                    {a.doctor?.name ?? a.doctor?.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatAppointmentDateTime(a.startTime)} ·{" "}
                    {labels.appointmentStatus(a.status)} ·{" "}
                    {labels.paymentStatus(a.paymentStatus)}
                    {a.priceSnapshotEgp != null
                      ? ` · ${a.priceSnapshotEgp} ${t("common.egp")}`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {a.disputeStatus !== "NONE" ? (
                      <Badge variant="outline" className="text-xs">
                        {labels.disputeStatus(a.disputeStatus)}
                      </Badge>
                    ) : null}
                    {a.doctorMarkedCompletedAt ? (
                      <Badge variant="outline" className="text-xs">
                        Dr ✓
                      </Badge>
                    ) : null}
                    {a.patientConfirmedCompletedAt ? (
                      <Badge variant="outline" className="text-xs">
                        Pt ✓
                      </Badge>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            {selected ? (
              <div className="min-w-0 space-y-3 border border-border/80 rounded-md p-3 max-h-[520px] overflow-y-auto">
                <p className="text-xs text-muted-foreground font-mono break-all">
                  ID: {selected.id}
                </p>

                <div className="text-xs space-y-1">
                  <EvidenceLine
                    label={t("appointments.statusLabel")}
                    value={labels.appointmentStatus(selected.status)}
                  />
                  <EvidenceLine
                    label={t("appointments.disputeLabel")}
                    value={labels.disputeStatus(selected.disputeStatus ?? "NONE")}
                  />
                  <EvidenceLine
                    label={t("appointments.doctorConfirmed")}
                    value={yn(selected.doctorMarkedCompletedAt)}
                  />
                  <EvidenceLine
                    label={t("appointments.patientConfirmed")}
                    value={yn(selected.patientConfirmedCompletedAt)}
                  />
                  <EvidenceLine
                    label={t("appointments.completionSource")}
                    value={selected.completionSource ?? "—"}
                  />
                  <EvidenceLine
                    label={t("appointments.completedAt")}
                    value={
                      selected.completedAt
                        ? formatAppointmentDateTime(selected.completedAt)
                        : "—"
                    }
                  />
                  <EvidenceLine
                    label={t("appointments.patientNoShowReported")}
                    value={yn(selected.patientNoShowReportedAt)}
                  />
                  <EvidenceLine
                    label={t("appointments.doctorNoShowReported")}
                    value={yn(selected.doctorNoShowReportedAt)}
                  />
                  {(selected.noShowReason || selected.disputeReason) && (
                    <EvidenceLine
                      label={t("appointments.reasonLabel")}
                      value={
                        selected.disputeReason ??
                        selected.noShowReason ??
                        "—"
                      }
                    />
                  )}
                </div>

                {selected.appointmentMode === "ONLINE" ? (
                  <div className="text-xs space-y-1 border-t border-border/40 pt-2">
                    <p className="font-medium text-muted-foreground">
                      {t("appointments.videoEvidence")}
                    </p>
                    <EvidenceLine
                      label={t("appointments.patientJoinedVideo")}
                      value={yn(selected.patientJoinedVideoAt)}
                    />
                    <EvidenceLine
                      label={t("appointments.doctorJoinedVideo")}
                      value={yn(selected.doctorJoinedVideoAt)}
                    />
                    <EvidenceLine
                      label={t("appointments.patientLastSeenVideo")}
                      value={yn(selected.patientLastSeenVideoAt)}
                    />
                    <EvidenceLine
                      label={t("appointments.doctorLastSeenVideo")}
                      value={yn(selected.doctorLastSeenVideoAt)}
                    />
                  </div>
                ) : (
                  <div className="text-xs space-y-1 border-t border-border/40 pt-2">
                    <p className="font-medium text-muted-foreground">
                      {t("appointments.clinicEvidence")}
                    </p>
                    <EvidenceLine
                      label={t("appointments.clinicPaymentReceived")}
                      value={yn(selected.clinicPaymentReceivedAt)}
                    />
                    <EvidenceLine
                      label={t("appointments.clinicAttendance")}
                      value={yn(selected.clinicAttendanceConfirmedAt)}
                    />
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <Label className="text-xs">{t("admin.forceMarkCompleted")}</Label>
                  <Textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={2}
                    className="text-sm"
                    placeholder={t("admin.adminNoteOptional")}
                  />
                  <Button
                    size="sm"
                    disabled={busy || selected.status === "CANCELLED"}
                    onClick={runMark}
                    className="w-full"
                  >
                    {t("admin.markCompleted")}
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <Button
                    size="sm"
                    variant="destructiveOutline"
                    disabled={busy || selected.status === "CANCELLED"}
                    onClick={runCancel}
                    className="w-full"
                  >
                    {t("admin.cancelAppointment")}
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <Label className="text-xs">{t("admin.resolveDispute")}</Label>
                  <Select value={resolveStatus} onValueChange={setResolveStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOLVE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {labels.disputeStatus(s)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={refundOutcome} onValueChange={setRefundOutcome}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("admin.refundOutcome")} />
                    </SelectTrigger>
                    <SelectContent>
                      {REFUND_OUTCOMES.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {labels.refundOutcome(o.key)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
                    rows={2}
                    className="text-sm"
                    placeholder={t("appointments.resolutionNote")}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || selected.disputeStatus === "NONE"}
                    onClick={runResolve}
                    className="w-full"
                  >
                    {t("appointments.resolveRejectDispute")}
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <Label className="text-xs">
                    {t("appointments.openDisputeManual")}
                  </Label>
                  <Textarea
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={runOpenDispute}
                    className="w-full"
                  >
                    {t("admin.openDispute")}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
