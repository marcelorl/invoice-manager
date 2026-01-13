import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Invoice, Client } from "@shared/types";
import * as api from "@/lib/supabase";
import { formatCurrency, formatDate, getDaysUntilDue, isFriday, getNextFriday, getLastDayOfMonth, isLastDayOfMonth, toNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Calendar, Send, Clock, AlertTriangle, CheckCircle, Users, CalendarDays } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type InvoiceWithClient = Invoice & { client: Client | null };

export default function RemindersPage() {
  const { data: invoices, isLoading: invoicesLoading } = useQuery<InvoiceWithClient[]>({
    queryKey: ["invoices"],
    queryFn: api.getInvoices,
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: api.getClients,
  });
  
  const isLoading = invoicesLoading || clientsLoading;

  const overdueInvoices = invoices?.filter((inv) => {
    if (inv.status === "paid") return false;
    return getDaysUntilDue(inv.due_date) < 0;
  }) || [];

  const dueSoonInvoices = invoices?.filter((inv) => {
    if (inv.status === "paid") return false;
    const daysUntil = getDaysUntilDue(inv.due_date);
    return daysUntil >= 0 && daysUntil <= 7;
  }) || [];

  const upcomingInvoices = invoices?.filter((inv) => {
    if (inv.status === "paid") return false;
    const daysUntil = getDaysUntilDue(inv.due_date);
    return daysUntil > 7 && daysUntil <= 30;
  }) || [];

  const fridayMessage = isFriday()
    ? "It's Friday! Perfect time to follow up on pending invoices."
    : `Next Friday reminder: ${formatDate(getNextFriday())}`;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Reminders</h1>
        <p className="text-muted-foreground">{fridayMessage}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(overdueInvoices.reduce((sum, inv) => sum + toNumber(inv.total), 0))} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Due This Week
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{dueSoonInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(dueSoonInvoices.reduce((sum, inv) => sum + toNumber(inv.total), 0))} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Upcoming (30 days)
            </CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{upcomingInvoices.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(upcomingInvoices.reduce((sum, inv) => sum + toNumber(inv.total), 0))} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid This Month
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {invoices?.filter((inv) => inv.status === "paid").length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(invoices?.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + toNumber(inv.total), 0) || 0)} collected
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={overdueInvoices.length > 0 ? "border-red-200 dark:border-red-800" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${overdueInvoices.length > 0 ? "text-red-600" : "text-muted-foreground"}`} />
              <div>
                <CardTitle>Overdue Invoices</CardTitle>
                <CardDescription>Invoices past their due date</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {overdueInvoices.length > 0 ? (
              <div className="space-y-3">
                {overdueInvoices.map((invoice) => (
                  <InvoiceReminderItem key={invoice.id} invoice={invoice} type="overdue" />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-600" />
                <p>No overdue invoices</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className={dueSoonInvoices.length > 0 ? "border-amber-200 dark:border-amber-800" : ""}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className={`h-5 w-5 ${dueSoonInvoices.length > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
              <div>
                <CardTitle>Due This Week</CardTitle>
                <CardDescription>Invoices due in the next 7 days</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dueSoonInvoices.length > 0 ? (
              <div className="space-y-3">
                {dueSoonInvoices.map((invoice) => (
                  <InvoiceReminderItem key={invoice.id} invoice={invoice} type="soon" />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2" />
                <p>No invoices due this week</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {upcomingInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <CardTitle>Upcoming (Next 30 Days)</CardTitle>
                <CardDescription>Invoices due in the next month</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {upcomingInvoices.map((invoice) => (
                <InvoiceReminderItem key={invoice.id} invoice={invoice} type="upcoming" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <ClientReminderSchedules 
        clients={clients || []} 
        invoices={invoices || []} 
      />
    </div>
  );
}

function InvoiceReminderItem({
  invoice,
  type
}: {
  invoice: InvoiceWithClient;
  type: "overdue" | "soon" | "upcoming"
}) {
  const daysUntilDue = getDaysUntilDue(invoice.due_date);
  
  return (
    <div className="flex items-center justify-between p-3 rounded-md border hover-elevate">
      <div className="flex items-center gap-3">
        <div>
          <Link href={`/invoices/${invoice.id}`}>
            <span className="text-sm font-medium hover:underline cursor-pointer">
              {invoice.invoice_number}
            </span>
          </Link>
          <p className="text-xs text-muted-foreground">{invoice.client?.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">{formatCurrency(invoice.total)}</p>
          <p className={`text-xs ${type === "overdue" ? "text-red-600" : type === "soon" ? "text-amber-600" : "text-muted-foreground"}`}>
            {type === "overdue" 
              ? `${Math.abs(daysUntilDue)} days overdue` 
              : daysUntilDue === 0 
                ? "Due today"
                : `${daysUntilDue} days left`
            }
          </p>
        </div>
        <div className="flex gap-1">
          <Link href={`/invoices/${invoice.id}/send`}>
            <Button variant="ghost" size="icon" data-testid={`button-send-reminder-${invoice.id}`}>
              <Send className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ClientReminderSchedules({
  clients,
  invoices
}: {
  clients: Client[];
  invoices: InvoiceWithClient[];
}) {
  const weeklyFridayClients = clients.filter(c => c.reminder_type === "weekly_friday");
  const monthlyEndClients = clients.filter(c => c.reminder_type === "monthly_end");

  const getUnpaidInvoicesForClient = (clientId: string) => {
    return invoices.filter(inv => inv.client_id === clientId && inv.status !== "paid");
  };

  const getTotalUnpaid = (clientId: string) => {
    return getUnpaidInvoicesForClient(clientId).reduce((sum, inv) => sum + toNumber(inv.total), 0);
  };

  if (weeklyFridayClients.length === 0 && monthlyEndClients.length === 0) {
    return null;
  }

  const showFridayAlert = isFriday() && weeklyFridayClients.some(c => getUnpaidInvoicesForClient(c.id).length > 0);
  const showMonthEndAlert = isLastDayOfMonth() && monthlyEndClients.some(c => getUnpaidInvoicesForClient(c.id).length > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-violet-600" />
          <div>
            <CardTitle>Client Reminder Schedules</CardTitle>
            <CardDescription>Clients with configured automatic reminder schedules</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="weekly" className="w-full">
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-reminder-schedules">
            <TabsTrigger value="weekly" className="flex items-center gap-2" data-testid="tab-weekly-reminders">
              Fridays
              {showFridayAlert && <Badge variant="destructive" className="ml-1">Today</Badge>}
            </TabsTrigger>
            <TabsTrigger value="monthly" className="flex items-center gap-2" data-testid="tab-monthly-reminders">
              Monthly
              {showMonthEndAlert && <Badge variant="destructive" className="ml-1">Today</Badge>}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="weekly" className="mt-4">
            {weeklyFridayClients.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>Next reminder: {isFriday() ? "Today" : formatDate(getNextFriday())}</span>
                </div>
                {weeklyFridayClients.map((client) => {
                  const unpaidCount = getUnpaidInvoicesForClient(client.id).length;
                  const unpaidTotal = getTotalUnpaid(client.id);
                  const displayEmail = client.target_email;
                  return (
                    <div key={client.id} className="flex items-center justify-between p-3 rounded-md border hover-elevate" data-testid={`client-reminder-${client.id}`}>
                      <div>
                        <Link href="/clients">
                          <span className="text-sm font-medium hover:underline cursor-pointer">{client.name}</span>
                        </Link>
                        <p className="text-xs text-muted-foreground">{displayEmail || "No email configured"}</p>
                        {client.cc_email && <p className="text-xs text-muted-foreground">CC: {client.cc_email}</p>}
                      </div>
                      <div className="text-right">
                        {unpaidCount > 0 ? (
                          <>
                            <p className="text-sm font-semibold tabular-nums">{formatCurrency(unpaidTotal)}</p>
                            <p className="text-xs text-muted-foreground">{unpaidCount} unpaid invoice{unpaidCount !== 1 ? "s" : ""}</p>
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs">All paid</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p>No clients with weekly Friday reminders</p>
                <p className="text-xs mt-1">Configure reminder schedules in Client settings</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="monthly" className="mt-4">
            {monthlyEndClients.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>Next reminder: {isLastDayOfMonth() ? "Today" : formatDate(getLastDayOfMonth())}</span>
                </div>
                {monthlyEndClients.map((client) => {
                  const unpaidCount = getUnpaidInvoicesForClient(client.id).length;
                  const unpaidTotal = getTotalUnpaid(client.id);
                  const displayEmail = client.target_email;
                  return (
                    <div key={client.id} className="flex items-center justify-between p-3 rounded-md border hover-elevate" data-testid={`client-reminder-${client.id}`}>
                      <div>
                        <Link href="/clients">
                          <span className="text-sm font-medium hover:underline cursor-pointer">{client.name}</span>
                        </Link>
                        <p className="text-xs text-muted-foreground">{displayEmail || "No email configured"}</p>
                        {client.cc_email && <p className="text-xs text-muted-foreground">CC: {client.cc_email}</p>}
                      </div>
                      <div className="text-right">
                        {unpaidCount > 0 ? (
                          <>
                            <p className="text-sm font-semibold tabular-nums">{formatCurrency(unpaidTotal)}</p>
                            <p className="text-xs text-muted-foreground">{unpaidCount} unpaid invoice{unpaidCount !== 1 ? "s" : ""}</p>
                          </>
                        ) : (
                          <Badge variant="secondary" className="text-xs">All paid</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2" />
                <p>No clients with monthly end-of-month reminders</p>
                <p className="text-xs mt-1">Configure reminder schedules in Client settings</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
