import { useInvoices } from "@/hooks/useInvoices";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, toNumber } from "@/lib/utils";
import { DollarSign, FileText, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardStats() {
  const { data: invoices, isLoading } = useInvoices();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalRevenue = invoices?.reduce((sum, inv) => sum + toNumber(inv.total), 0) || 0;
  const paidRevenue = invoices?.filter((inv) => inv.status === "paid")
    .reduce((sum, inv) => sum + toNumber(inv.total), 0) || 0;
  const pendingRevenue = invoices?.filter((inv) => inv.status === "pending" || inv.status === "sent")
    .reduce((sum, inv) => sum + toNumber(inv.total), 0) || 0;
  
  const totalInvoices = invoices?.length || 0;
  const pendingCount = invoices?.filter((inv) => inv.status === "pending" || inv.status === "sent").length || 0;
  const paidCount = invoices?.filter((inv) => inv.status === "paid").length || 0;

  const stats = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      description: `${totalInvoices} total invoices`,
      icon: DollarSign,
      color: "text-primary",
    },
    {
      title: "Paid",
      value: formatCurrency(paidRevenue),
      description: `${paidCount} invoices`,
      icon: CheckCircle,
      color: "text-emerald-600",
    },
    {
      title: "Pending",
      value: formatCurrency(pendingRevenue),
      description: `${pendingCount} invoices`,
      icon: Clock,
      color: "text-amber-600",
    },
    {
      title: "Total Invoices",
      value: totalInvoices.toString(),
      description: "All time",
      icon: FileText,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid={`stat-${stat.title.toLowerCase().replace(' ', '-')}`}>
              {stat.value}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
