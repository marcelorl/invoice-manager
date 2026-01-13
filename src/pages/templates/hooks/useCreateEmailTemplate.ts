import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useCreateEmailTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: any) => api.createEmailTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Template created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating template", description: error.message, variant: "destructive" });
    },
  });
}
