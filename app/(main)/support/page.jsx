import { redirect } from "next/navigation";
import { checkUser } from "@/lib/checkUser";
import { getMySupportTickets, getMyAppointmentsForSupport } from "@/actions/support";
import { SupportPageClient } from "./support-client";

import { getServerI18n } from "@/lib/server-i18n";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t("meta.supportTitle") };
}

export default async function SupportPage() {
  const user = await checkUser();
  if (!user) redirect("/sign-in");
  if (user.role === "UNASSIGNED") redirect("/onboarding");

  const [ticketsRes, apptsRes] = await Promise.all([
    getMySupportTickets(),
    getMyAppointmentsForSupport(),
  ]);

  const tickets =
    ticketsRes?.success === true ? ticketsRes.tickets ?? [] : [];
  const appointments =
    apptsRes?.success === true ? apptsRes.appointments ?? [] : [];

  return (
    <SupportPageClient
      initialTickets={tickets}
      appointments={appointments}
      userRole={user.role}
    />
  );
}
