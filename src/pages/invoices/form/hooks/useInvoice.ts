import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/supabase";
import type { InvoiceWithItems } from "../types";

export function useInvoice(invoiceId: string | undefined, enabled: boolean) {
  return useQuery<InvoiceWithItems>({
    queryKey: ["invoices", invoiceId],
    queryFn: () => api.getInvoice(invoiceId!),
    enabled: enabled && !!invoiceId,
  });
}
