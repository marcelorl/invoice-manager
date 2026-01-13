import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useSendInvoiceEmail(invoiceId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saveToGoogleDrive }: { saveToGoogleDrive: boolean }) => {
      if (!invoiceId) throw new Error("Invoice ID is required");

      return api.sendInvoiceEmail(invoiceId, {
        useTemplate: true, // Always use professional template
        saveToGoogleDrive,
      });
    },
    onSuccess: () => {
      toast({
        title: "Email sent",
        description: "Invoice email has been sent successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to send email",
        description: error.message,
      });
    },
  });
}
