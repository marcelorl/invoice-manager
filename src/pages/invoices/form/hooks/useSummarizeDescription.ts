import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useSummarizeDescription() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (rawDescription: string) => api.summarizeDescription(rawDescription),
    onError: (error: any) => {
      const isOllamaError = error.message?.includes('Cannot connect to Ollama');

      toast({
        title: isOllamaError ? "Ollama is not running" : "Error generating summary",
        description: isOllamaError
          ? "Please start Ollama on your local machine (http://localhost:11434)"
          : error.message,
        variant: "destructive"
      });
    },
  });
}
