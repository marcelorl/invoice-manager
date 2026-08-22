import { handleCORS } from '../_shared/middlewares/cors.ts'
import { summarizeDescriptionSchema } from './validation.ts'
import { logger } from '../_shared/utils/logger.ts'
import Groq from 'npm:groq-sdk@0.37.0'

// Prompt engineering for one-line summaries
const SYSTEM_PROMPT = `You are a professional invoice line item summarizer. Your task is to convert detailed internal work descriptions into concise, client-friendly one-line summaries.

Guidelines:
- Keep summaries under 10 words when possible
- Use professional, clear language
- Focus on the deliverable/outcome, not internal details
- Remove technical jargon and internal references
- Be specific but brief

Examples:
Input: "Fixed critical bug in user authentication module where users couldn't reset passwords - spent 4 hours debugging JWT token validation and implemented proper error handling"
Output: "Authentication bug fix and error handling improvements"

Input: "Developed new REST API endpoint for user profile updates including validation middleware, database schema changes, and comprehensive unit tests"
Output: "User profile API endpoint development"

Input: "Project management and client communication for Q1 roadmap planning including 3 meetings and documentation"
Output: "Q1 roadmap planning and project coordination"`

const DEFAULT_MODEL = 'openai/gpt-oss-120b'

async function callGroq(
  apiKey: string,
  rawDescription: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  logger('Calling Groq API', { model }, 'INFO')

  try {
    const groq = new Groq({ apiKey })

    const requestParams: Record<string, any> = {
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: `Now summarize this description:\n\n"${rawDescription}"\n\nOne-line summary:`,
        },
      ],
      model,
      temperature: 0.3,
      max_completion_tokens: 1024,
      top_p: 0.9,
      stream: false,
    }

    // Reasoning model optimizations for faster responses without token truncation
    if (model.includes('gpt-oss')) {
      requestParams.reasoning_effort = 'low'
      requestParams.include_reasoning = false
    }

    const chatCompletion = await groq.chat.completions.create(requestParams as any)

    const choice = chatCompletion.choices?.[0]
    let summary = choice?.message?.content

    // Fallback if reasoning is placed in a separate property
    if (!summary && (choice?.message as any)?.reasoning) {
      summary = (choice?.message as any).reasoning
    }

    if (!summary) {
      logger('No response content from Groq', { choice }, 'ERROR')
      throw new Error(`No response from Groq (finish_reason: ${choice?.finish_reason || 'unknown'})`)
    }

    logger('Groq response received', { hasResponse: !!summary }, 'INFO')

    // Clean up the response (remove think tags if present, remove quotes, extra whitespace)
    let cleanedSummary = summary.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
    cleanedSummary = cleanedSummary.replace(/^["']|["']$/g, '').trim() // Remove surrounding quotes
    cleanedSummary = cleanedSummary.replace(/\n/g, ' ').replace(/\s+/g, ' ') // Normalize whitespace

    return cleanedSummary
  } catch (error) {
    logger('Groq API error', { error: error.message }, 'ERROR')
    throw new Error(`Groq API error: ${error.message}`)
  }
}

Deno.serve(handleCORS(async (req) => {
  logger('Summarize description function invoked', { method: req.method, url: req.url }, 'INFO')

  // Validate request body
  const body = await req.json()
  logger('Request body received', { body }, 'INFO')

  const validation = summarizeDescriptionSchema.safeParse(body)

  if (!validation.success) {
    logger('Validation failed', { errors: validation.error.flatten().fieldErrors }, 'ERROR')
    return new Response(
      JSON.stringify({
        error: 'Validation error',
        details: validation.error.flatten().fieldErrors
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const { rawDescription } = validation.data
  logger('Request validated successfully', { rawDescription }, 'INFO')

  // Get Groq API key and optional model from environment
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
  const GROQ_MODEL = Deno.env.get('GROQ_MODEL') || DEFAULT_MODEL

  if (!GROQ_API_KEY) {
    logger('Groq API key not configured', {}, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Groq API key not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const summary = await callGroq(GROQ_API_KEY, rawDescription, GROQ_MODEL)

    logger('Summary generated successfully', {
      inputLength: rawDescription.length,
      outputLength: summary.length,
      model: GROQ_MODEL,
      summary
    }, 'INFO')

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        model: GROQ_MODEL,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    logger('Error generating summary', { error: error.message }, 'ERROR')

    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to generate summary',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}))
