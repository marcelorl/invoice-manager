import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/supabase";
import type { InvoiceWithDetails } from "../types";

export function useInvoice(invoiceId: string | undefined) {
  return useQuery<InvoiceWithDetails>({
    queryKey: ["invoices", invoiceId],
    queryFn: () => api.getInvoice(invoiceId!),
    enabled: !!invoiceId,
  });
}
