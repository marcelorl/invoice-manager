import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useGenerateInvoicePdf(invoiceId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (!invoiceId) throw new Error("Invoice ID is required");
      return api.generateInvoicePdf(invoiceId);
    },
    onSuccess: () => {
      toast({
        title: "PDF generated",
        description: "Invoice PDF has been generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to generate PDF",
        description: error.message,
      });
    },
  });
}
