import { TabsContent } from "@/components/ui/tabs";
import { PendingDoctors } from "./components/pending-doctors";
import { VerifiedDoctors } from "./components/verified-doctors";
import { PendingPayouts } from "./components/pending-payouts";
import { AppointmentReview } from "./components/appointment-review";
import { AdminPayments } from "./components/admin-payments";
import { AdminOverview } from "./components/admin-overview";
import { AdminSupport } from "./components/admin-support";
import { AdminReviews } from "./components/admin-reviews";
import { AdminPatients } from "./components/admin-patients";
import { AdminAnalyticsPanel } from "@/components/admin/analytics/admin-analytics-panel";
import { getAdminPaymentTransactions } from "@/actions/payments";
import { getAllSupportTickets } from "@/actions/support";
import { getAllReviewsForAdmin } from "@/actions/admin-reviews";
import { getAdminPatients } from "@/actions/admin-patients";
import {
  getPendingDoctors,
  getVerifiedDoctors,
  getPendingPayouts,
} from "@/actions/admin";
import { getAdminAppointmentsForReview } from "@/actions/admin-appointments";

export default async function AdminPage() {
  const [
    pendingDoctorsData,
    verifiedDoctorsData,
    pendingPayoutsData,
    adminAppointmentsRes,
    paymentsRes,
    supportRes,
    reviewsRes,
    patientsRes,
  ] = await Promise.all([
    getPendingDoctors(),
    getVerifiedDoctors(),
    getPendingPayouts(),
    getAdminAppointmentsForReview(),
    getAdminPaymentTransactions(),
    getAllSupportTickets({}),
    getAllReviewsForAdmin({}),
    getAdminPatients({ page: 1 }),
  ]);

  const adminAppointments =
    adminAppointmentsRes?.success === true
      ? adminAppointmentsRes.appointments ?? []
      : [];

  const initialPatients =
    patientsRes?.success === true ? patientsRes.patients ?? [] : [];
  const patientsPagination =
    patientsRes?.success === true ? patientsRes.pagination : null;

  return (
    <>
      <TabsContent value="overview" className="border-none p-0">
        <AdminOverview />
      </TabsContent>

      <TabsContent value="pending" className="border-none p-0">
        <PendingDoctors doctors={pendingDoctorsData.doctors || []} />
      </TabsContent>

      <TabsContent value="doctors" className="border-none p-0">
        <VerifiedDoctors doctors={verifiedDoctorsData.doctors || []} />
      </TabsContent>

      <TabsContent value="appointments" className="border-none p-0">
        <AppointmentReview initialAppointments={adminAppointments} />
      </TabsContent>

      <TabsContent value="payments" className="border-none p-0">
        <AdminPayments
          initialTransactions={
            paymentsRes?.success ? paymentsRes.transactions ?? [] : []
          }
        />
      </TabsContent>

      <TabsContent value="payouts" className="border-none p-0">
        <PendingPayouts payouts={pendingPayoutsData.payouts || []} />
      </TabsContent>

      <TabsContent value="support" className="border-none p-0">
        <AdminSupport
          initialTickets={
            supportRes?.success ? supportRes.tickets ?? [] : []
          }
        />
      </TabsContent>

      <TabsContent value="reviews" className="border-none p-0">
        <AdminReviews
          initialReviews={
            reviewsRes?.success ? reviewsRes.reviews ?? [] : []
          }
          initialDoctors={
            reviewsRes?.success ? reviewsRes.doctors ?? [] : []
          }
        />
      </TabsContent>

      <TabsContent value="patients" className="border-none p-0">
        <AdminPatients
          initialPatients={initialPatients}
          initialPagination={patientsPagination}
        />
      </TabsContent>

      <TabsContent value="analytics" className="border-none p-0">
        <AdminAnalyticsPanel />
      </TabsContent>
    </>
  );
}
