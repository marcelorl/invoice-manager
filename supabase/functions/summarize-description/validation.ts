import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

export const summarizeDescriptionSchema = z.object({
  rawDescription: z.string().min(1, 'Raw description is required'),
})

export type SummarizeDescriptionRequest = z.infer<typeof summarizeDescriptionSchema>
