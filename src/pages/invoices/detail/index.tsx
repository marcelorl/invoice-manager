import { useRoute, Link } from "wouter";
import { InvoiceProvider, useInvoiceContext } from "@/contexts/InvoiceContext";
import { useInvoiceActions } from "./hooks/useInvoiceActions";
import { InvoiceActions } from "./components/invoice-actions";
import { InvoiceDetailsCard } from "./components/invoice-details-card";
import { InvoiceLineItems } from "./components/invoice-line-items";
import { InvoiceInfoSidebar } from "./components/invoice-info-sidebar";
import { InvoiceTermsCard } from "./components/invoice-terms-card";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { ArrowLeft, Eye } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function InvoiceDetailContent() {
  const [, params] = useRoute("/invoices/:id");
  const invoiceId = params?.id;

  const { invoice, client, isLoadingInvoice: isLoading } = useInvoiceContext();
  const { emailPreviewHtml, showEmailPreview, setShowEmailPreview } = useInvoiceActions(invoiceId, invoice);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <h2 className="text-xl font-semibold">Invoice not found</h2>
        <Link href="/invoices">
          <Button variant="outline" className="mt-4">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold">{invoice.invoice_number}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-muted-foreground">
              {invoice.client?.name || "No client"} &bull; Due {formatDate(invoice.due_date)}
            </p>
          </div>
        </div>

        <InvoiceActions invoiceId={invoiceId!} />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-6">
          <InvoiceDetailsCard client={invoice.client} />

          <InvoiceLineItems
            items={invoice.items}
            subtotal={invoice.subtotal}
            tax={invoice.tax}
            total={invoice.total}
          />

          {invoice.client?.terms && (
            <InvoiceTermsCard terms={invoice.client.terms} />
          )}
        </div>

        <div className="space-y-6">
          <InvoiceInfoSidebar
            issueDate={invoice.issue_date}
            dueDate={invoice.due_date}
            sentAt={invoice.sent_at}
            paidAt={invoice.paid_at}
          />
        </div>
      </div>

      <Dialog open={showEmailPreview} onOpenChange={setShowEmailPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Email Preview
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            <iframe
              srcDoc={emailPreviewHtml}
              className="w-full h-[600px] border-0"
              title="Email Preview"
              data-testid="iframe-email-preview"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InvoiceDetailPage() {
  const [, params] = useRoute("/invoices/:id");
  const invoiceId = params?.id;

  return (
    <InvoiceProvider invoiceId={invoiceId}>
      <InvoiceDetailContent />
    </InvoiceProvider>
  );
}
