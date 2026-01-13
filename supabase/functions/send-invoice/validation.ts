import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

export const sendInvoiceSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID format'),
  to: z.string().email('Invalid email address').optional(),
  subject: z.string().min(1, 'Subject is required').optional(),
  body: z.string().optional(),
  useTemplate: z.boolean().optional().default(false),
  saveToGoogleDrive: z.boolean().optional().default(false),
})

export type SendInvoiceRequest = z.infer<typeof sendInvoiceSchema>
