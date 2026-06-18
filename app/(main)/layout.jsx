import { DashboardShell } from "@/components/dashboard/dashboard-shell";

const MainLayout = ({ children }) => {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 md:py-10">
      <DashboardShell>{children}</DashboardShell>
    </div>
  );
};

export default MainLayout;
