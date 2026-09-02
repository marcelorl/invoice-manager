import { useState, useEffect } from "react";
import { useMarkInvoiceAsPaid } from "./useMarkInvoiceAsPaid";
import { useMarkInvoiceAsTransferred } from "./useMarkInvoiceAsTransferred";
import { useDeleteInvoice } from "./useDeleteInvoice";
import { useSaveToGoogleDrive } from "./useSaveToGoogleDrive";
import { useSendInvoiceEmail } from "./useSendInvoiceEmail";
import { usePreviewInvoiceEmail } from "./usePreviewInvoiceEmail";
import { useGenerateInvoicePdf } from "./useGenerateInvoicePdf";
import { getInvoicePDFSignedUrl } from "@/lib/supabase";
import type { Invoice, Client, InvoiceItem } from "@shared/types";

interface InvoiceWithRelations extends Invoice {
  items: InvoiceItem[];
  client: Client | null;
}

/**
 * Custom hook that encapsulates all invoice action logic
 * Uses invoice data from context instead of fetching it
 */
export function useInvoiceActions(invoiceId: string | undefined, invoice: InvoiceWithRelations | null) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string>("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const markAsPaidMutation = useMarkInvoiceAsPaid(invoiceId);
  const markAsTransferredMutation = useMarkInvoiceAsTransferred(invoiceId);
  const deleteMutation = useDeleteInvoice(invoiceId);
  const saveToGoogleDriveMutation = useSaveToGoogleDrive(invoiceId);
  const sendEmailMutation = useSendInvoiceEmail(invoiceId);
  const previewEmailMutation = usePreviewInvoiceEmail(invoiceId);
  const generatePdfMutation = useGenerateInvoicePdf(invoiceId);

  // Fetch PDF URL when invoice file_path changes
  useEffect(() => {
    if (invoice?.file_path) {
      getInvoicePDFSignedUrl(invoice.file_path)
        .then(url => setPdfUrl(url))
        .catch(error => {
          console.error('Failed to get PDF URL:', error);
          setPdfUrl(null);
        });
    } else {
      setPdfUrl(null);
    }
  }, [invoice?.file_path]);

  // Derived state
  const hasGoogleDriveFolder = !!invoice?.client?.google_drive_folder_url;
  const clientEmail = invoice?.client?.target_email || null;

  // Action handlers
  const handleMarkAsPaid = (paidDate: string) => markAsPaidMutation.mutate(paidDate);

  const handleMarkAsTransferred = (transferredDate: string) => markAsTransferredMutation.mutate(transferredDate);

  const handleDelete = () => deleteMutation.mutate();

  const handleSaveToGoogleDrive = () => saveToGoogleDriveMutation.mutate();

  const handleSendEmail = () => {
    sendEmailMutation.mutate({
      saveToGoogleDrive: hasGoogleDriveFolder
    });
  };

  const handlePreviewEmail = () => {
    previewEmailMutation.mutate(undefined, {
      onSuccess: (data) => {
        setEmailPreviewHtml(data.html);
        setShowEmailPreview(true);
      },
    });
  };

  const handleGeneratePdf = () => generatePdfMutation.mutate();

  return {
    // Invoice data (derived from context)
    invoiceNumber: invoice?.invoice_id || '',
    status: invoice?.status || '',
    clientEmail,
    hasGoogleDriveFolder,
    pdfUrl,

    // Action handlers
    onMarkAsPaid: handleMarkAsPaid,
    onMarkAsTransferred: handleMarkAsTransferred,
    onDelete: handleDelete,
    onSaveToGoogleDrive: handleSaveToGoogleDrive,
    onSendEmail: handleSendEmail,
    onPreviewEmail: handlePreviewEmail,
    onGeneratePdf: handleGeneratePdf,

    // Loading states
    isMarkingPaid: markAsPaidMutation.isPending,
    isMarkingTransferred: markAsTransferredMutation.isPending,
    isSavingToGoogleDrive: saveToGoogleDriveMutation.isPending,
    isSendingEmail: sendEmailMutation.isPending,
    isLoadingPreview: previewEmailMutation.isPending,
    isGeneratingPdf: generatePdfMutation.isPending,

    // Email preview state
    emailPreviewHtml,
    showEmailPreview,
    setShowEmailPreview,
  };
}
