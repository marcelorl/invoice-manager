import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useCreateInvoice() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => api.createInvoice(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({ title: "Invoice created successfully" });
      navigate(`/invoices/${data.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error creating invoice", description: error.message, variant: "destructive" });
    },
  });
}
