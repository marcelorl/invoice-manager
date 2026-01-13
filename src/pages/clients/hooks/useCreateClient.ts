import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useCreateClient() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (client: any) => api.createClient(client),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating client", description: error.message, variant: "destructive" });
    },
  });
}
