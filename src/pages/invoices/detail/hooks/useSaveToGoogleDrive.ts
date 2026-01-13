import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import * as api from "@/lib/supabase";

export function useSaveToGoogleDrive(invoiceId: string | undefined) {
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => api.saveToGoogleDrive(invoiceId!),
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message || "Invoice saved to Google Drive" });
    },
    onError: (error: Error) => {
      toast({ title: "Error saving to Google Drive", description: error.message, variant: "destructive" });
    },
  });
}
