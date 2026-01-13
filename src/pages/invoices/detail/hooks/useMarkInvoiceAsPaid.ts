import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useMarkInvoiceAsPaid(invoiceId: string | undefined) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (paidDate: string) => api.markInvoiceAsPaid(invoiceId!, paidDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      toast({ title: "Invoice marked as paid" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
