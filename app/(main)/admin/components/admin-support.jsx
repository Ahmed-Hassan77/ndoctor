"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import {
  getAllSupportTickets,
  respondToSupportTicket,
  updateSupportTicketStatus,
} from "@/actions/support";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { getDateFnsLocale } from "@/lib/date-locale";

const SUPPORT_STATUSES = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"];
const SUPPORT_CATEGORIES = [
  "BOOKING",
  "PAYMENT",
  "REFUND",
  "DOCTOR_COMPLAINT",
  "TECHNICAL",
  "OTHER",
];
const SUPPORT_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"];
const REPLY_STATUSES = ["IN_REVIEW", "RESOLVED", "CLOSED"];

export function AdminSupport({ initialTickets = [] }) {
  const { t, labels, locale } = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("IN_REVIEW");

  const { fn: loadFn } = useFetch(getAllSupportTickets);
  const { loading: respondLoading, fn: respondFn } = useFetch(
    respondToSupportTicket
  );
  const { fn: statusFn } = useFetch(updateSupportTicketStatus);

  const refresh = async (filters = {}) => {
    const status = filters.status ?? statusFilter;
    const category = filters.category ?? categoryFilter;
    const priority = filters.priority ?? priorityFilter;
    const res = await loadFn({
      status: status === "all" ? undefined : status,
      category: category === "all" ? undefined : category,
      priority: priority === "all" ? undefined : priority,
    });
    if (res?.success) setTickets(res.tickets ?? []);
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    void refresh({ status: value });
  };

  const handleCategoryFilterChange = (value) => {
    setCategoryFilter(value);
    void refresh({ category: value });
  };

  const handlePriorityFilterChange = (value) => {
    setPriorityFilter(value);
    void refresh({ priority: value });
  };

  const filtered = tickets;
  const selected =
    filtered.find((tk) => tk.id === selectedId) ?? filtered[0] ?? null;

  const handleRespond = async () => {
    if (!selected || !response.trim()) {
      toast.error(t("admin.enterResponse"));
      return;
    }
    const fd = new FormData();
    fd.append("ticketId", selected.id);
    fd.append("adminResponse", response);
    fd.append("status", newStatus);
    const res = await respondFn(fd);
    if (res?.success) {
      toast.success(t("admin.responseSent"));
      setResponse("");
      await refresh();
      if (res.ticket) {
        setTickets((list) =>
          list.map((tk) => (tk.id === res.ticket.id ? res.ticket : tk))
        );
      }
    }
  };

  const handleStatusOnly = async (status) => {
    if (!selected) return;
    const fd = new FormData();
    fd.append("ticketId", selected.id);
    fd.append("status", status);
    const res = await statusFn(fd);
    if (res?.success) {
      toast.success(t("admin.statusUpdated"));
      await refresh();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.supportTickets")}</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder={t("admin.filterStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allStatus")}</SelectItem>
                {SUPPORT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {labels.supportStatus(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder={t("support.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allCategories")}</SelectItem>
                {SUPPORT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {labels.supportCategory(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={handlePriorityFilterChange}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder={t("support.priority")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("admin.allPriority")}</SelectItem>
                {SUPPORT_PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {labels.supportPriority(p)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="max-h-[60vh] overflow-y-auto space-y-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.noTicketsMatch")}
            </p>
          ) : (
            filtered.map((tk) => (
              <button
                key={tk.id}
                type="button"
                onClick={() => setSelectedId(tk.id)}
                className={`w-full text-left rounded-lg border p-3 text-sm transition-colors ${
                  selected?.id === tk.id
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/50 hover:bg-muted/20"
                }`}
              >
                <p className="font-medium text-foreground truncate">
                  {tk.subject}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {tk.user?.name ?? tk.user?.email} ·{" "}
                  {labels.supportCategory(tk.category)}
                </p>
                <div className="flex gap-1 mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {labels.supportStatus(tk.status)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {labels.supportPriority(tk.priority)}
                  </Badge>
                </div>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-lg">{t("admin.ticketDetail")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <p className="text-sm text-muted-foreground">
              {t("admin.selectTicket")}
            </p>
          ) : (
            <div className="space-y-4 text-sm min-w-0">
              <div>
                <p className="font-semibold text-foreground break-words">
                  {selected.subject}
                </p>
                <p className="text-muted-foreground text-xs mt-1 break-all">
                  {selected.user?.name} ({selected.user?.role}) —{" "}
                  {selected.user?.email}
                </p>
              </div>
              <p className="whitespace-pre-line break-words text-muted-foreground">
                {selected.message}
              </p>
              {selected.appointment ? (
                <p className="text-xs text-muted-foreground">
                  {t("admin.appointmentLabel")}{" "}
                  {formatAppointmentDateTime(selected.appointment.startTime)} —{" "}
                  {labels.appointmentStatus(selected.appointment.status)}
                </p>
              ) : null}
              {selected.adminResponse ? (
                <div className="rounded-md bg-muted/30 p-3 break-words">
                  <p className="text-xs font-medium text-primary">
                    {t("admin.previousResponse")}
                  </p>
                  <p className="mt-1">{selected.adminResponse}</p>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(selected.createdAt), {
                  addSuffix: true,
                  locale: dateLocale,
                })}
              </p>

              <div className="space-y-2 pt-2 border-t border-border/50">
                <Label>{t("admin.replyToUser")}</Label>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                />
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPLY_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {labels.supportStatus(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  className="w-full"
                  disabled={respondLoading}
                  onClick={handleRespond}
                >
                  {respondLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("admin.sendResponse")
                  )}
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleStatusOnly("RESOLVED")}
                  >
                    {t("admin.markResolved")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleStatusOnly("CLOSED")}
                  >
                    {t("admin.close")}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
