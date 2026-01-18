alter table "public"."invoices" drop constraint "invoices_client_id_invoice_number_key";

drop index if exists "public"."idx_invoices_invoice_number";

drop index if exists "public"."invoices_client_id_invoice_number_key";

alter table "public"."invoices" drop column "invoice_number";

alter table "public"."invoices" add column "transferred_at" timestamp with time zone;

alter table "public"."invoices" alter column "invoice_id" set not null;


