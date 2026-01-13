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

async function callGroq(
  apiKey: string,
  rawDescription: string
): Promise<string> {
  logger('Calling Groq API', { model: 'llama-3.1-8b-instant' }, 'INFO')

  try {
    const groq = new Groq({ apiKey })

    const chatCompletion = await groq.chat.completions.create({
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
      model: 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_completion_tokens: 100,
      top_p: 0.9,
      stream: false,
    })

    const summary = chatCompletion.choices[0]?.message?.content

    if (!summary) {
      throw new Error('No response from Groq')
    }

    logger('Groq response received', { hasResponse: !!summary }, 'INFO')

    // Clean up the response (remove quotes, extra whitespace)
    let cleanedSummary = summary.trim()
    cleanedSummary = cleanedSummary.replace(/^["']|["']$/g, '') // Remove surrounding quotes
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

  // Get Groq API key from environment
  const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')

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
    const summary = await callGroq(GROQ_API_KEY, rawDescription)

    logger('Summary generated successfully', {
      inputLength: rawDescription.length,
      outputLength: summary.length,
      summary
    }, 'INFO')

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        model: 'llama-3.1-8b-instant',
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
