import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useMarkInvoiceAsTransferred(invoiceId: string | undefined) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (transferredDate: string) => api.markInvoiceAsTransferred(invoiceId!, transferredDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      toast({ title: "Invoice marked as transferred" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}
