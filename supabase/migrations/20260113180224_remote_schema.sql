alter table "public"."invoices" drop constraint "invoices_invoice_number_key";

drop index if exists "public"."invoices_invoice_number_key";

CREATE UNIQUE INDEX invoices_client_id_invoice_number_key ON public.invoices USING btree (client_id, invoice_number);

alter table "public"."invoices" add constraint "invoices_client_id_invoice_number_key" UNIQUE using index "invoices_client_id_invoice_number_key";


