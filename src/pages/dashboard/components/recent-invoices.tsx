import { Link } from "wouter";
import { useInvoices } from "@/hooks/useInvoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function RecentInvoices() {
  const { data: invoices, isLoading } = useInvoices();

  const recentInvoices = invoices?.slice(0, 5) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Recent Invoices</CardTitle>
        <Link href="/invoices">
          <Button variant="ghost" size="sm" className="gap-1" data-testid="button-view-all-invoices">
            View All
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {recentInvoices.length > 0 ? (
          <div className="space-y-4">
            {recentInvoices.map((invoice) => (
              <Link href={`/invoices/${invoice.id}`} key={invoice.id}>
                <div 
                  className="flex items-center justify-between p-3 rounded-md hover-elevate cursor-pointer"
                  data-testid={`recent-invoice-${invoice.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm font-medium">{invoice.invoice_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.client?.name || "No client"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatCurrency(invoice.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(invoice.due_date)}
                      </p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No invoices yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
