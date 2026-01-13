import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useUpdateClient() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => api.updateClient(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error updating client", description: error.message, variant: "destructive" });
    },
  });
}
