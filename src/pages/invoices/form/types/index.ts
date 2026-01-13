import type { Invoice, InvoiceItem, Client } from "@shared/types";
import { z } from "zod";

export const invoiceItemSchema = z.object({
  description: z.string().optional(),
  raw_description: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  rate: z.coerce.number().min(0, "Rate must be positive"),
  item_date: z.string().min(1, "Date is required"),
});

export const invoiceFormSchema = z.object({
  invoice_number: z.string().min(1, "Invoice number is required"),
  client_id: z.string().min(1, "Client is required"),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().min(1, "Due date is required"),
  tax_rate: z.coerce.number().min(0).max(100).optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export type InvoiceWithItems = Invoice & {
  items: InvoiceItem[];
  client: Client | null;
};
