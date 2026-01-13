import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useDeleteInvoice(invoiceId: string | undefined) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => api.deleteInvoice(invoiceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoice deleted" });
      navigate("/invoices");
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting invoice", description: error.message, variant: "destructive" });
    },
  });
}
