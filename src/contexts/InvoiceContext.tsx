import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getInvoice, getClient, getClients } from "@/lib/supabase";
import type { Invoice, Client, InvoiceItem } from "@shared/types";

interface InvoiceWithRelations extends Invoice {
  items: InvoiceItem[];
  client: Client | null;
}

interface InvoiceContextValue {
  invoice: InvoiceWithRelations | null;
  client: Client | null;
  clients: Client[];
  isLoadingInvoice: boolean;
  isLoadingClient: boolean;
  isLoadingClients: boolean;
  error: Error | null;
}

const InvoiceContext = createContext<InvoiceContextValue | undefined>(undefined);

export function InvoiceProvider({ invoiceId, children }: { invoiceId: string | undefined; children: ReactNode }) {
  const { data: invoice, isLoading: isLoadingInvoice, error } = useQuery({
    queryKey: ["invoices", invoiceId],
    queryFn: () => getInvoice(invoiceId!),
    enabled: !!invoiceId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  const { data: client, isLoading: isLoadingClient } = useQuery({
    queryKey: ["clients", invoice?.client_id],
    queryFn: () => getClient(invoice!.client_id!),
    enabled: !!invoice?.client_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: clients, isLoading: isLoadingClients } = useQuery({
    queryKey: ["clients"],
    queryFn: getClients,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <InvoiceContext.Provider
      value={{
        invoice: invoice || null,
        client: client || invoice?.client || null,
        clients: clients || [],
        isLoadingInvoice,
        isLoadingClient,
        isLoadingClients,
        error: error as Error | null,
      }}
    >
      {children}
    </InvoiceContext.Provider>
  );
}

export function useInvoiceContext() {
  const context = useContext(InvoiceContext);
  if (context === undefined) {
    throw new Error("useInvoiceContext must be used within InvoiceProvider");
  }
  return context;
}

export function useInvoiceContextSafe() {
  const context = useContext(InvoiceContext);
  return context || { invoice: null, client: null, clients: [], isLoadingInvoice: false, isLoadingClient: false, isLoadingClients: false, error: null };
}
