import { handleCORS } from '../_shared/middlewares/cors.ts'
import { summarizeDescriptionSchema } from './validation.ts'
import { logger } from '../_shared/utils/logger.ts'

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

async function callOllama(
  ollamaUrl: string,
  model: string,
  rawDescription: string
): Promise<string> {
  const apiUrl = `${ollamaUrl}/api/generate`

  logger('Calling Ollama API', { apiUrl, model }, 'INFO')

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt: `${SYSTEM_PROMPT}\n\nNow summarize this description:\n\n"${rawDescription}"\n\nOne-line summary:`,
        stream: false,
        options: {
          temperature: 0.3, // Lower temperature for consistent, focused output
          top_p: 0.9,
          num_predict: 50, // Limit to keep responses concise
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger('Ollama API error response', { status: response.status, error: errorText }, 'ERROR')
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    logger('Ollama response received', { hasResponse: !!data.response }, 'INFO')

    if (!data.response) {
      throw new Error('No response from Ollama')
    }

    // Clean up the response (remove quotes, extra whitespace)
    let summary = data.response.trim()
    summary = summary.replace(/^["']|["']$/g, '') // Remove surrounding quotes
    summary = summary.replace(/\n/g, ' ').replace(/\s+/g, ' ') // Normalize whitespace

    return summary
  } catch (error) {
    // Check if it's a network error (Ollama not running)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      logger('Ollama connection failed', { ollamaUrl }, 'ERROR')
      throw new Error('Cannot connect to Ollama. Please ensure Ollama is running at ' + ollamaUrl)
    }
    throw error
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

  const { rawDescription, ollamaUrl, model } = validation.data
  logger('Request validated successfully', { rawDescription, ollamaUrl, model }, 'INFO')

  try {
    const summary = await callOllama(ollamaUrl, model, rawDescription)

    logger('Summary generated successfully', {
      inputLength: rawDescription.length,
      outputLength: summary.length,
      summary
    }, 'INFO')

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        model,
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
        isOllamaConnectionError: error.message?.includes('Cannot connect to Ollama'),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}))
