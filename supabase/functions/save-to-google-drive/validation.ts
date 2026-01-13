import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

export const saveToGoogleDriveSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID format'),
})

export type SaveToGoogleDriveRequest = z.infer<typeof saveToGoogleDriveSchema>
