import { useState, useEffect } from "react";
import { useInvoice } from "./useInvoice";
import { useMarkInvoiceAsPaid } from "./useMarkInvoiceAsPaid";
import { useDeleteInvoice } from "./useDeleteInvoice";
import { useSaveToGoogleDrive } from "./useSaveToGoogleDrive";
import { useSendInvoiceEmail } from "./useSendInvoiceEmail";
import { usePreviewInvoiceEmail } from "./usePreviewInvoiceEmail";
import { getInvoicePDFSignedUrl } from "@/lib/supabase";

/**
 * Custom hook that encapsulates all invoice action logic
 * Eliminates prop drilling by managing data fetching and mutations internally
 */
export function useInvoiceActions(invoiceId: string | undefined) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [emailPreviewHtml, setEmailPreviewHtml] = useState<string>("");
  const [showEmailPreview, setShowEmailPreview] = useState(false);

  const { data: invoice, isLoading } = useInvoice(invoiceId);
  const markAsPaidMutation = useMarkInvoiceAsPaid(invoiceId);
  const deleteMutation = useDeleteInvoice(invoiceId);
  const saveToGoogleDriveMutation = useSaveToGoogleDrive(invoiceId);
  const sendEmailMutation = useSendInvoiceEmail(invoiceId);
  const previewEmailMutation = usePreviewInvoiceEmail(invoiceId);

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

  return {
    // Invoice data
    invoice,
    isLoading,
    invoiceNumber: invoice?.invoice_number || '',
    status: invoice?.status || '',
    clientEmail,
    hasGoogleDriveFolder,
    pdfUrl,

    // Action handlers
    onMarkAsPaid: handleMarkAsPaid,
    onDelete: handleDelete,
    onSaveToGoogleDrive: handleSaveToGoogleDrive,
    onSendEmail: handleSendEmail,
    onPreviewEmail: handlePreviewEmail,

    // Loading states
    isMarkingPaid: markAsPaidMutation.isPending,
    isSavingToGoogleDrive: saveToGoogleDriveMutation.isPending,
    isSendingEmail: sendEmailMutation.isPending,
    isLoadingPreview: previewEmailMutation.isPending,

    // Email preview state
    emailPreviewHtml,
    showEmailPreview,
    setShowEmailPreview,
  };
}
