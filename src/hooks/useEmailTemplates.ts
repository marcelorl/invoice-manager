import { useQuery } from "@tanstack/react-query";
import type { EmailTemplate } from "@shared/types";
import * as api from "@/lib/supabase";

export function useEmailTemplates() {
  return useQuery<EmailTemplate[]>({
    queryKey: ["email-templates"],
    queryFn: api.getEmailTemplates,
  });
}
