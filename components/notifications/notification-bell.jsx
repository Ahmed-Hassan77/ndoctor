"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/actions/notifications";
import { formatDistanceToNow } from "date-fns";
import { useLocale } from "@/components/locale-provider";
import { getDateFnsLocale } from "@/lib/date-locale";
import { getNotificationDisplay } from "@/lib/notification-i18n";

export function NotificationBell({ userRole }) {
  const { locale, t, dict, labels } = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef(null);

  const load = useCallback(async () => {
    const res = await getMyNotifications(12);
    if (res?.success) {
      setNotifications(res.notifications ?? []);
      setUnreadCount(res.unreadCount ?? 0);
    }
    return res;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      setLoading(true);
      load().finally(() => {
        if (!cancelled) setLoading(false);
      });
    };

    const idleId =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback(run, { timeout: 2000 })
        : null;
    const timeoutId = idleId == null ? setTimeout(run, 800) : null;

    return () => {
      cancelled = true;
      if (idleId != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId != null) clearTimeout(timeoutId);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await load();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, load]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (!open) return undefined;
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleClick = async (n) => {
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
    setOpen(false);
    if (n.linkUrl) router.push(n.linkUrl);
  };

  const handleMarkAll = async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
    setNotifications((list) =>
      list.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() }))
    );
  };

  if (!userRole || userRole === "UNASSIGNED") return null;

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative h-10 w-10 shrink-0"
        aria-label={`${t("notifications.bellTitle")}${unreadCount ? `, ${unreadCount}` : ""}`}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 end-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div
          className={cn(
            "absolute end-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)]",
            "rounded-lg border border-primary/25 bg-background shadow-xl",
            "flex flex-col overflow-hidden"
          )}
        >
          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
            <span className="text-sm font-semibold text-foreground">
              {t("notifications.bellTitle")}
            </span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs text-primary hover:text-primary flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                {t("notifications.markAllRead")}
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(60vh,320px)] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("notifications.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-border/50">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleClick(n)}
                      className={cn(
                        "w-full text-start px-3 py-3 hover:bg-muted/40 transition-colors",
                        !n.readAt && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.readAt ? (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        ) : (
                          <span className="mt-1.5 h-2 w-2 shrink-0" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground line-clamp-1">
                            {
                              getNotificationDisplay(
                                dict,
                                n,
                                labels.notificationType
                              ).title
                            }
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {
                              getNotificationDisplay(
                                dict,
                                n,
                                labels.notificationType
                              ).message
                            }
                          </p>
                          <p className="text-[10px] text-muted-foreground/80 mt-1">
                            {formatDistanceToNow(new Date(n.createdAt), {
                              addSuffix: true,
                              locale: getDateFnsLocale(locale),
                            })}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border/60 p-2">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="block w-full text-center text-xs font-medium text-primary hover:text-primary py-2"
            >
              {t("notifications.viewAll")}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
