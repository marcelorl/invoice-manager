import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useDeleteClient() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (clientId: string) => api.deleteClient(clientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Client deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting client", description: error.message, variant: "destructive" });
    },
  });
}
