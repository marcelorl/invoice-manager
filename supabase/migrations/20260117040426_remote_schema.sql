alter table "public"."invoices" drop column "notes";

alter table "public"."invoices" drop column "terms";

alter table "public"."invoices" add column "metadata" jsonb;


