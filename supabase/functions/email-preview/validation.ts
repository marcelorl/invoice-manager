import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

export const emailPreviewSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID format'),
})

export type EmailPreviewRequest = z.infer<typeof emailPreviewSchema>
