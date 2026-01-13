import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useUpdateInvoice(invoiceId: string | undefined) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => api.updateInvoice(invoiceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoices", invoiceId] });
      toast({ title: "Invoice updated successfully" });
      navigate(`/invoices/${invoiceId}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating invoice", description: error.message, variant: "destructive" });
    },
  });
}
