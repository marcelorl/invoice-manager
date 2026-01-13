import { z } from "zod";

export const settingsSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  owner_name: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  bank_name: z.string().optional(),
  bank_address: z.string().optional(),
  swift_code: z.string().optional(),
  routing_number: z.string().optional(),
  account_number: z.string().optional(),
  account_type: z.string().optional(),
  beneficiary_name: z.string().optional(),
  beneficiary_cnpj: z.string().optional(),
});

export type SettingsFormValues = z.infer<typeof settingsSchema>;
