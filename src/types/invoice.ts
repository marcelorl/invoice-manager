import type { Invoice, Client } from "@shared/types";

export type InvoiceWithClient = Invoice & { client: Client | null };
