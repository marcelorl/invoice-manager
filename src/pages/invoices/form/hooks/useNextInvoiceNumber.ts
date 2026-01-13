import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/supabase";

export function useNextInvoiceNumber(clientId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["next-invoice-number", clientId],
    queryFn: () => api.getNextInvoiceNumber(clientId),
    enabled: enabled && !!clientId,
  });
}
