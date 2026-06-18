import { Bell } from "lucide-react";
import { getMyNotifications } from "@/actions/notifications";
import { NotificationsList } from "./notifications-list";
import { redirect } from "next/navigation";
import { checkUser } from "@/lib/checkUser";
import { getServerI18n } from "@/lib/server-i18n";
import { PageHeader } from "@/components/page-header";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("meta.notificationsTitle") };
}

export default async function NotificationsPage() {
  const { t, dir } = await getServerI18n();
  const user = await checkUser();
  if (!user) redirect("/sign-in");
  if (user.role === "UNASSIGNED") redirect("/onboarding");

  const result = await getMyNotifications(100);
  const notifications =
    result?.success === true ? result.notifications ?? [] : [];
  const unreadCount =
    result?.success === true ? result.unreadCount ?? 0 : 0;

  const backHref =
    user.role === "ADMIN"
      ? "/admin"
      : user.role === "DOCTOR"
        ? "/doctor"
        : "/appointments";

  return (
    <div dir={dir} className="mx-auto max-w-2xl">
      <PageHeader
        icon={<Bell />}
        title={t("notifications.title")}
        backLink={backHref}
      />
      <p className="-mt-4 mb-6 text-sm text-muted-foreground">
        {unreadCount > 0
          ? t("notifications.unreadCount", { count: unreadCount })
          : t("notifications.noUnread")}
      </p>
      <NotificationsList
        initialNotifications={notifications}
        initialUnreadCount={unreadCount}
      />
    </div>
  );
}
