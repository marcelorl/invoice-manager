import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function usePreviewInvoiceEmail(invoiceId: string | undefined) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error("Invoice ID is required");
      return api.getInvoiceEmailPreview(invoiceId);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to load preview",
        description: error.message,
      });
    },
  });
}
