import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/supabase";
import type { InvoiceWithClient } from "@/types/invoice";

export function useInvoices() {
  return useQuery<InvoiceWithClient[]>({
    queryKey: ["invoices"],
    queryFn: api.getInvoices,
  });
}
