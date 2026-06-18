"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, format } from "date-fns";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notifications";
import { useLocale } from "@/components/locale-provider";
import { getDateFnsLocale } from "@/lib/date-locale";
import { getNotificationDisplay } from "@/lib/notification-i18n";

export function NotificationsList({
  initialNotifications = [],
  initialUnreadCount = 0,
}) {
  const { t, labels, locale, dict } = useLocale();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [busyId, setBusyId] = useState(null);

  const filtered = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((n) => !n.readAt);
    }
    return notifications;
  }, [notifications, filter]);

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    const now = new Date().toISOString();
    setNotifications((list) =>
      list.map((n) => ({ ...n, readAt: n.readAt ?? now }))
    );
    setUnreadCount(0);
    router.refresh();
  };

  const handleOpen = async (n) => {
    setBusyId(n.id);
    if (!n.readAt) {
      const fd = new FormData();
      fd.append("notificationId", n.id);
      await markNotificationRead(fd);
      setUnreadCount((c) => Math.max(0, c - 1));
      setNotifications((list) =>
        list.map((item) =>
          item.id === n.id
            ? { ...item, readAt: new Date().toISOString() }
            : item
        )
      );
    }
    setBusyId(null);
    if (n.linkUrl) router.push(n.linkUrl);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            className={
              filter === "all"
                ? ""
                : "border-primary/20"
            }
            onClick={() => setFilter("all")}
          >
            {t("common.all")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === "unread" ? "default" : "outline"}
            className={
              filter === "unread"
                ? ""
                : "border-primary/20"
            }
            onClick={() => setFilter("unread")}
          >
            {t("notifications.unread")}
            {unreadCount > 0 ? (
              <Badge
                variant="secondary"
                className="ml-2 h-5 min-w-5 px-1 text-[10px]"
              >
                {unreadCount}
              </Badge>
            ) : null}
          </Button>
        </div>
        {unreadCount > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-primary/20"
            onClick={handleMarkAll}
          >
            <Check className="h-4 w-4 mr-1" />
            {t("notifications.markAllRead")}
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="home-card-gradient rounded-2xl py-16 text-center ring-1 ring-primary/10">
          <Bell className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">
            {filter === "unread"
              ? t("notifications.noUnread")
              : t("notifications.empty")}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
            {t("notifications.updatesHint")}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                disabled={busyId === n.id}
                onClick={() => handleOpen(n)}
                className={cn(
                  "w-full text-left rounded-lg border p-4 transition-colors",
                  "hover:border-primary/25/50 hover:bg-muted/25",
                  !n.readAt
                    ? "border-primary/25/40 bg-primary/5"
                    : "border-border/60 bg-muted/10"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground">
                        {
                          getNotificationDisplay(
                            dict,
                            n,
                            labels.notificationType
                          ).title
                        }
                      </p>
                      {!n.readAt ? (
                        <span className="text-[10px] uppercase tracking-wide text-primary font-semibold">
                          {t("notifications.new")}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 break-words">
                      {
                        getNotificationDisplay(
                          dict,
                          n,
                          labels.notificationType
                        ).message
                      }
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {format(new Date(n.createdAt), "Pp", {
                        locale: getDateFnsLocale(locale),
                      })}
                      <span className="mx-1">·</span>
                      {formatDistanceToNow(new Date(n.createdAt), {
                        addSuffix: true,
                        locale: getDateFnsLocale(locale),
                      })}
                    </p>
                  </div>
                  {busyId === n.id ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
