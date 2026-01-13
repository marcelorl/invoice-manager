import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useSummarizeDescription() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (rawDescription: string) => api.summarizeDescription(rawDescription),
    onError: (error: any) => {
      toast({
        title: "Error generating summary",
        description: error.message || "Failed to generate summary. Please try again.",
        variant: "destructive"
      });
    },
  });
}
