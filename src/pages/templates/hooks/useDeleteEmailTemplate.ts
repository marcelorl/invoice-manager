import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useDeleteEmailTemplate() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => api.deleteEmailTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast({ title: "Template deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting template", description: error.message, variant: "destructive" });
    },
  });
}
