import { useQuery } from "@tanstack/react-query";
import type { BusinessSettings } from "@shared/types";
import * as api from "@/lib/supabase";

export function useSettings() {
  return useQuery<BusinessSettings | null>({
    queryKey: ["settings"],
    queryFn: api.getSettings,
  });
}
