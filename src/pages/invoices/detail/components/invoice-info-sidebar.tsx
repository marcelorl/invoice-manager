import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Mail, Calendar, CheckCircle, ArrowRightLeft } from "lucide-react";

interface InvoiceInfoSidebarProps {
  issueDate: string;
  dueDate: string;
  sentAt?: string | null;
  paidAt?: string | null;
  transferredAt?: string | null;
}

export function InvoiceInfoSidebar({ issueDate, dueDate, sentAt, paidAt, transferredAt }: InvoiceInfoSidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Issue Date</p>
            <p className="text-sm font-medium">{formatDate(issueDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <p className="text-sm font-medium">{formatDate(dueDate)}</p>
          </div>
        </div>
        {sentAt && (
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Sent</p>
              <p className="text-sm font-medium">{formatDate(sentAt)}</p>
            </div>
          </div>
        )}
        {paidAt && (
          <div className="flex items-center gap-3">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <div>
              <p className="text-xs text-muted-foreground">Paid</p>
              <p className="text-sm font-medium">{formatDate(paidAt)}</p>
            </div>
          </div>
        )}
        {transferredAt && (
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
            <div>
              <p className="text-xs text-muted-foreground">Transferred</p>
              <p className="text-sm font-medium">{formatDate(transferredAt)}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
