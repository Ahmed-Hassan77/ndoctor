"use client";

import { useState } from "react";
import { LifeBuoy } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import { createSupportTicket } from "@/actions/support";
import { formatAppointmentDateTime } from "@/lib/appointment-display";
import { formatDistanceToNow } from "date-fns";
import { useLocale } from "@/components/locale-provider";
import { getDateFnsLocale } from "@/lib/date-locale";

function statusBadgeClass(status) {
  if (status === "OPEN") return "border-border/60 text-foreground";
  if (status === "IN_REVIEW") return "border-blue-700/50 text-blue-300";
  if (status === "RESOLVED") return "border-primary/30 text-primary/80";
  return "border-muted-foreground/40";
}

export function SupportPageClient({
  initialTickets = [],
  appointments = [],
  userRole,
}) {
  const { t, labels, locale } = useLocale();
  const CATEGORIES = [
    "BOOKING",
    "PAYMENT",
    "REFUND",
    "DOCTOR_COMPLAINT",
    "TECHNICAL",
    "OTHER",
  ].map((value) => ({
    value,
    label: labels.supportCategory(value),
  }));
  const [tickets, setTickets] = useState(initialTickets);
  const [category, setCategory] = useState("BOOKING");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [appointmentId, setAppointmentId] = useState("");

  const { loading, fn: submit } = useFetch(createSupportTicket);

  const backHref =
    userRole === "ADMIN"
      ? "/admin"
      : userRole === "DOCTOR"
        ? "/doctor"
        : "/appointments";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("category", category);
    fd.append("subject", subject);
    fd.append("message", message);
    if (appointmentId && appointmentId !== "none") {
      fd.append("appointmentId", appointmentId);
    }
    const res = await submit(fd);
    if (res?.success && res.ticket) {
      toast.success(t("support.submitted"));
      setTickets((t) => [res.ticket, ...t]);
      setSubject("");
      setMessage("");
      setAppointmentId("");
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        icon={<LifeBuoy />}
        title={t("support.title")}
        backLink={backHref}
        backLabel={t("support.back")}
      />
      <p className="-mt-4 mb-8 text-sm text-muted-foreground">{t("support.subtitle")}</p>

      <Card className="home-card-gradient mb-8 border-0 ring-1 ring-primary/10">
        <CardHeader>
          <CardTitle className="text-lg">{t("support.newTicket")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t("support.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {appointments.length > 0 ? (
              <div className="space-y-2">
                <Label>{t("support.relatedAppointment")}</Label>
                <Select
                  value={appointmentId || "none"}
                  onValueChange={setAppointmentId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("support.none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("support.none")}</SelectItem>
                    {appointments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {formatAppointmentDateTime(a.startTime)} —{" "}
                        {labels.appointmentStatus(a.status)} (
                        {labels.appointmentMode(a.appointmentMode)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="subject">{t("support.subject")}</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t("support.message")}</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={5}
                minLength={10}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
            >
              {t("support.submit")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">{t("support.yourTickets")}</h2>
        {tickets.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("support.noTickets")}</p>
        ) : (
          tickets.map((ticket) => (
            <Card key={ticket.id} className="home-card-gradient border-0 ring-1 ring-primary/10">
              <CardContent className="p-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground break-words">
                    {ticket.subject}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      {labels.supportCategory(ticket.category)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(ticket.status)}
                    >
                      {labels.supportStatus(ticket.status)}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground break-words whitespace-pre-line">
                  {ticket.message}
                </p>
                {ticket.adminResponse ? (
                  <div className="rounded-md bg-primary/10 border border-border p-3 text-sm">
                    <p className="text-xs font-medium text-primary mb-1">
                      {t("support.adminResponse")}
                    </p>
                    <p className="text-foreground whitespace-pre-line break-words">
                      {ticket.adminResponse}
                    </p>
                  </div>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(ticket.createdAt), {
                    addSuffix: true,
                    locale: getDateFnsLocale(locale),
                  })}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
