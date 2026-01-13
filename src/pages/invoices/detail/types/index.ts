import type { Invoice, InvoiceItem, Client } from "@shared/types";

export type InvoiceWithDetails = Invoice & {
  items: InvoiceItem[];
  client: Client | null;
};
