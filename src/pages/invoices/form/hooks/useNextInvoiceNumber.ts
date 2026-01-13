import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/supabase";

export function useNextInvoiceNumber(enabled: boolean) {
  return useQuery({
    queryKey: ["next-invoice-number"],
    queryFn: api.getNextInvoiceNumber,
    enabled,
  });
}
