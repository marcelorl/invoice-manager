import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "@/lib/supabase";

interface BusinessSettings {
  id: string;
  company_name: string;
  owner_name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  email: string;
  phone: string;
  beneficiary_name: string;
  beneficiary_cnpj: string;
  swift_code: string;
  bank_name: string;
  bank_address: string;
  routing_number: string;
  account_number: string;
  account_type: string;
}

interface BusinessSettingsContextValue {
  settings: BusinessSettings | null;
  isLoading: boolean;
  error: Error | null;
}

const BusinessSettingsContext = createContext<BusinessSettingsContextValue | undefined>(undefined);

export function BusinessSettingsProvider({ children }: { children: ReactNode }) {
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["business-settings"],
    queryFn: getSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return (
    <BusinessSettingsContext.Provider value={{ settings: settings || null, isLoading, error: error as Error | null }}>
      {children}
    </BusinessSettingsContext.Provider>
  );
}

export function useBusinessSettings() {
  const context = useContext(BusinessSettingsContext);
  if (context === undefined) {
    throw new Error("useBusinessSettings must be used within BusinessSettingsProvider");
  }
  return context;
}
