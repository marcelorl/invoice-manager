import { useQuery } from "@tanstack/react-query";
import type { Client } from "@shared/types";
import * as api from "@/lib/supabase";

export function useClients() {
  return useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: api.getClients,
  });
}
