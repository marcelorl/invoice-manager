import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Edit,
  Send,
  Download,
  MoreHorizontal,
  CheckCircle,
  Trash2,
  CloudUpload,
  Eye,
  ArrowRightLeft,
} from "lucide-react";
import { useInvoiceContext } from "@/contexts/InvoiceContext";
import { useInvoiceActions } from "../hooks/useInvoiceActions";
import { formatDateForInput } from "@/lib/utils";

interface InvoiceActionsProps {
  invoiceId: string;
}

export function InvoiceActions({ invoiceId }: InvoiceActionsProps) {
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [showPaidDateDialog, setShowPaidDateDialog] = useState(false);
  const [showTransferredDateDialog, setShowTransferredDateDialog] = useState(false);
  const [paidDate, setPaidDate] = useState(formatDateForInput(new Date()));
  const [transferredDate, setTransferredDate] = useState(formatDateForInput(new Date()));

  // Get invoice from context
  const { invoice } = useInvoiceContext();

  const {
    invoiceNumber,
    status,
    hasGoogleDriveFolder,
    clientEmail,
    pdfUrl,
    onMarkAsPaid,
    onMarkAsTransferred,
    onDelete,
    onSaveToGoogleDrive,
    onSendEmail,
    onPreviewEmail,
    isMarkingPaid,
    isMarkingTransferred,
    isSavingToGoogleDrive,
    isSendingEmail,
    isLoadingPreview,
  } = useInvoiceActions(invoiceId, invoice);

  return (
    <div className="flex items-center gap-2">
      {status !== "paid" && (
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setShowPaidDateDialog(true)}
          disabled={isMarkingPaid}
          data-testid="button-mark-paid"
        >
          <CheckCircle className="h-4 w-4" />
          Mark as Paid
        </Button>
      )}

      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setShowTransferredDateDialog(true)}
        disabled={isMarkingTransferred}
        data-testid="button-mark-transferred"
      >
        <ArrowRightLeft className="h-4 w-4" />
        Mark as Transferred
      </Button>

      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setShowPdfModal(true)}
        disabled={!pdfUrl}
        data-testid="button-view-pdf"
      >
        <Download className="h-4 w-4" />
        View PDF
      </Button>

      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setShowSendConfirm(true)}
        disabled={!clientEmail || isSendingEmail}
        data-testid="button-send-email"
      >
        <Send className="h-4 w-4" />
        {isSendingEmail ? "Sending..." : "Send Email"}
      </Button>

      {hasGoogleDriveFolder && (
        <Button
          variant="outline"
          className="gap-2"
          onClick={onSaveToGoogleDrive}
          disabled={isSavingToGoogleDrive}
          data-testid="button-save-google-drive"
        >
          <CloudUpload className="h-4 w-4" />
          {isSavingToGoogleDrive ? "Saving..." : "Save to Google Drive"}
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" data-testid="button-more-actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={onPreviewEmail}
            disabled={isLoadingPreview}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isLoadingPreview ? "Loading..." : "Preview Email"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={`/invoices/${invoiceId}/edit`}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Invoice
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Invoice
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete invoice {invoiceNumber}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Invoice Email?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send invoice {invoiceNumber} to {clientEmail} with a professionally formatted email template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onSendEmail();
                setShowSendConfirm(false);
              }}
            >
              Send Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showPdfModal} onOpenChange={setShowPdfModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Invoice {invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="w-full h-[80vh] px-6 pb-6">
            {pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border rounded"
                title={`Invoice ${invoiceNumber}`}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No PDF available
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaidDateDialog} onOpenChange={setShowPaidDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="paid-date">Payment Date</Label>
              <Input
                id="paid-date"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                lang="en-US"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaidDateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onMarkAsPaid(paidDate);
                setShowPaidDateDialog(false);
              }}
              disabled={isMarkingPaid}
            >
              Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTransferredDateDialog} onOpenChange={setShowTransferredDateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Transferred</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="transferred-date">Transfer Date</Label>
              <Input
                id="transferred-date"
                type="date"
                value={transferredDate}
                onChange={(e) => setTransferredDate(e.target.value)}
                lang="en-US"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferredDateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onMarkAsTransferred(transferredDate);
                setShowTransferredDateDialog(false);
              }}
              disabled={isMarkingTransferred}
            >
              Mark as Transferred
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
