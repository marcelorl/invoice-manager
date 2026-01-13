import { DashboardStats } from "./components/dashboard-stats";
import { FridayReminder } from "./components/friday-reminder";
import { RevenueChart } from "./components/revenue-chart";

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's an overview of your invoices.</p>
      </div>

      <FridayReminder />

      <DashboardStats />

      <RevenueChart />
    </div>
  );
}
