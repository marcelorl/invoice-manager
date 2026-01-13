import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

export const summarizeDescriptionSchema = z.object({
  rawDescription: z.string().min(1, 'Raw description is required'),
  ollamaUrl: z.string().url().optional().default('http://host.docker.internal:11434'),
  model: z.string().optional().default('llama3.2'),
})

export type SummarizeDescriptionRequest = z.infer<typeof summarizeDescriptionSchema>
