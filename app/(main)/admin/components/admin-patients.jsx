"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Loader2, UserX, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import useFetch from "@/hooks/use-fetch";
import {
  getAdminPatients,
  setPatientAccountStatus,
  deletePatientAccount,
} from "@/actions/admin-patients";
import { useLocale } from "@/components/locale-provider";
import { getDateFnsLocale } from "@/lib/date-locale";

/**
 * @param {object} props
 * @param {Array} props.initialPatients
 * @param {object | null} props.initialPagination
 */
export function AdminPatients({ initialPatients, initialPagination }) {
  const { t, locale } = useLocale();
  const dateLocale = getDateFnsLocale(locale);
  const [patients, setPatients] = useState(initialPatients);
  const [pagination, setPagination] = useState(initialPagination);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState(null);
  const [dialogAction, setDialogAction] = useState(null);

  const { loading: actionLoading, fn: setStatus } = useFetch(setPatientAccountStatus);
  const { fn: deleteAccount } = useFetch(deletePatientAccount);

  const load = async (page = 1) => {
    setLoading(true);
    const res = await getAdminPatients({
      page,
      search: search.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
    });
    if (res?.success) {
      setPatients(res.patients ?? []);
      setPagination(res.pagination);
    }
    setLoading(false);
  };

  const confirmAction = async () => {
    if (!target || !dialogAction) return;
    const fd = new FormData();
    fd.append("patientId", target.id);
    let res;
    if (dialogAction === "deactivate") {
      fd.append("status", "DEACTIVATED");
      res = await setStatus(fd);
    } else if (dialogAction === "activate") {
      fd.append("status", "ACTIVE");
      res = await setStatus(fd);
    } else if (dialogAction === "delete") {
      res = await deleteAccount(fd);
    }
    if (res?.success) {
      toast.success(t(`admin.patient${dialogAction === "delete" ? "Deleted" : "StatusUpdated"}`));
      setTarget(null);
      setDialogAction(null);
      await load(pagination?.page ?? 1);
    }
  };

  return (
    <Card className="home-card-gradient border-0 ring-1 ring-primary/10">
      <CardHeader>
        <CardTitle>{t("admin.patientsTitle")}</CardTitle>
        <CardDescription>{t("admin.patientsDesc")}</CardDescription>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="ps-8"
              placeholder={t("admin.searchPatients")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(1)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="ACTIVE">{t("admin.active")}</SelectItem>
              <SelectItem value="DEACTIVATED">{t("admin.suspended")}</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={() => load(1)} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.apply")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {patients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("admin.noPatientsMatch")}
          </p>
        ) : (
          <div className="space-y-3">
            {patients.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground truncate">{p.name ?? "—"}</p>
                    <Badge variant={p.accountStatus === "ACTIVE" ? "outline" : "secondary"}>
                      {p.accountStatus === "ACTIVE" ? t("admin.active") : t("admin.suspended")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground break-all">{p.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("admin.registered")}{" "}
                    {format(new Date(p.createdAt), "PP", { locale: dateLocale })}
                    {" · "}
                    {t("admin.appointmentCount", { count: p.appointmentCount })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {p.accountStatus === "ACTIVE" ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTarget(p);
                        setDialogAction("deactivate");
                      }}
                    >
                      <UserX className="h-3.5 w-3.5 me-1" />
                      {t("admin.deactivate")}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTarget(p);
                        setDialogAction("activate");
                      }}
                    >
                      <UserCheck className="h-3.5 w-3.5 me-1" />
                      {t("admin.reinstate")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="destructiveOutline"
                    size="sm"
                    onClick={() => {
                      setTarget(p);
                      setDialogAction("delete");
                    }}
                  >
                    {t("admin.deletePatient")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.totalPages > 1 ? (
          <div className="mt-4 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || loading}
              onClick={() => load(pagination.page - 1)}
            >
              {t("common.back")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("admin.pageOf", {
                page: pagination.page,
                total: pagination.totalPages,
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => load(pagination.page + 1)}
            >
              {t("common.continue")}
            </Button>
          </div>
        ) : null}
      </CardContent>

      <Dialog open={!!target && !!dialogAction} onOpenChange={() => { setTarget(null); setDialogAction(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("admin.confirmAction")}</DialogTitle>
            <DialogDescription>
              {dialogAction === "delete"
                ? t("admin.confirmDeletePatient", { name: target?.name ?? target?.email })
                : dialogAction === "deactivate"
                  ? t("admin.confirmDeactivatePatient", { name: target?.name ?? target?.email })
                  : t("admin.confirmActivatePatient", { name: target?.name ?? target?.email })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => { setTarget(null); setDialogAction(null); }}>
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant={dialogAction === "delete" ? "destructiveSolid" : "default"}
              onClick={confirmAction}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
