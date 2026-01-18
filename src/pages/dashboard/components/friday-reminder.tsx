import { useQuery } from "@tanstack/react-query";
import type { Invoice, Client } from "@shared/types";
import * as api from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, X, Calendar, DollarSign } from "lucide-react";
import { formatCurrency, formatDate, isFriday, getNextFriday, getDaysUntilDue } from "@/lib/utils";
import { useState } from "react";
import { Link } from "wouter";

type InvoiceWithClient = Invoice & { client: Client | null };

export function FridayReminder() {
  const [dismissed, setDismissed] = useState(false);

  const { data: invoices } = useQuery<InvoiceWithClient[]>({
    queryKey: ["invoices"],
    queryFn: api.getInvoices,
  });

  const upcomingInvoices = invoices?.filter((inv) => {
    if (inv.status === "paid") return false;
    const daysUntil = getDaysUntilDue(inv.due_date);
    return daysUntil > 0 && daysUntil <= 14;
  }) || [];

  const overdueInvoices = invoices?.filter((inv) => {
    if (inv.status === "paid") return false;
    return getDaysUntilDue(inv.due_date) < 0;
  }) || [];

  if (dismissed || (upcomingInvoices.length === 0 && overdueInvoices.length === 0)) {
    return null;
  }

  const showFridayBanner = isFriday();

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-base text-amber-900 dark:text-amber-100">
              {showFridayBanner ? "Friday Invoice Reminder" : "Invoice Reminder"}
            </CardTitle>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              {showFridayBanner 
                ? "It's Friday! Review your pending invoices before the weekend."
                : `Next reminder on ${formatDate(getNextFriday())}`
              }
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          className="text-amber-600 hover:text-amber-800 dark:text-amber-400"
          data-testid="button-dismiss-reminder"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {overdueInvoices.length > 0 && (
            <div className="rounded-md bg-red-100 dark:bg-red-900/30 p-3">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Overdue ({overdueInvoices.length})
              </h4>
              <div className="space-y-2">
                {overdueInvoices.slice(0, 3).map((inv) => (
                  <Link href={`/invoices/${inv.id}`} key={inv.id}>
                    <div className="flex items-center justify-between text-sm hover-elevate p-2 rounded cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-red-600" />
                        <span className="font-medium">{inv.invoice_id}</span>
                        <span className="text-muted-foreground">- {inv.client?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-3 w-3" />
                        <span className="font-semibold">{formatCurrency(inv.total)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {upcomingInvoices.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                Due Soon ({upcomingInvoices.length})
              </h4>
              <div className="space-y-2">
                {upcomingInvoices.slice(0, 3).map((inv) => (
                  <Link href={`/invoices/${inv.id}`} key={inv.id}>
                    <div className="flex items-center justify-between text-sm hover-elevate p-2 rounded cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-amber-600" />
                        <span className="font-medium">{inv.invoice_id}</span>
                        <span className="text-muted-foreground">- {inv.client?.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                        <span>Due {formatDate(inv.due_date)}</span>
                        <span className="font-semibold">{formatCurrency(inv.total)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
