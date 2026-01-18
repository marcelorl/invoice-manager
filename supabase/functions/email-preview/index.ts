// Supabase Edge Function - Preview Invoice Email
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCORS } from '../_shared/middlewares/cors.ts'
import { emailPreviewSchema } from './validation.ts'
import { logger } from '../_shared/utils/logger.ts'

// Helper function to replace template placeholders with actual data
function replacePlaceholders(template: string, data: Record<string, any>): string {
  let result = template

  // Replace all {{placeholder}}, #{placeholder}, and {placeholder} with actual values
  Object.keys(data).forEach(key => {
    const value = data[key] ?? ''
    // Support {{key}}, #{key}, and {key} syntax
    const regexDoubleCurly = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    const regexHash = new RegExp(`#{\\s*${key}\\s*}`, 'g')
    const regexSingleCurly = new RegExp(`{\\s*${key}\\s*}`, 'g')
    result = result.replace(regexDoubleCurly, String(value))
    result = result.replace(regexHash, String(value))
    result = result.replace(regexSingleCurly, String(value))
  })

  return result
}

// Format currency
function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `$ ${num.toFixed(2)}`
}

// Format date
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  })
}

Deno.serve(handleCORS(async (req) => {
  logger('Email preview function invoked', { method: req.method, url: req.url }, 'INFO')

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Validate request body
  const body = await req.json()
  logger('Request body received', { body }, 'INFO')

  const validation = emailPreviewSchema.safeParse(body)

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

  const { invoiceId } = validation.data
  logger('Request validated successfully', { invoiceId }, 'INFO')

  // Fetch invoice with client and items
  logger('Fetching invoice from database', { invoiceId }, 'INFO')
  const { data: invoice, error: invoiceError } = await supabaseClient
    .from('invoices')
    .select(`
      *,
      client:clients(*),
      items:invoice_items(*)
    `)
    .eq('id', invoiceId)
    .single()

  if (invoiceError || !invoice) {
    logger('Invoice not found', { invoiceId, error: invoiceError }, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Invoice not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  logger('Invoice fetched successfully', {
    invoiceId,
    invoiceNumber: invoice.invoice_id,
    clientName: invoice.client?.name,
    itemsCount: invoice.items?.length
  }, 'INFO')

  // Fetch business settings
  logger('Fetching business settings', {}, 'INFO')
  const { data: settings, error: settingsError } = await supabaseClient
    .from('business_settings')
    .select('*')
    .limit(1)
    .maybeSingle()

  if (settingsError && settingsError.code !== 'PGRST116') {
    logger('Error fetching settings', { error: settingsError }, 'ERROR')
  } else {
    logger('Business settings fetched', { hasSettings: !!settings }, 'INFO')
  }

  // Fetch email template (either client's specific template or first available)
  logger('Fetching email template', { clientTemplateId: invoice.client?.email_template_id }, 'INFO')
  let { data: template, error: templateError } = await supabaseClient
    .from('email_templates')
    .select('*')
    .eq('id', invoice.client?.email_template_id)
    .maybeSingle()

  if (templateError) {
    logger('Error fetching client-specific template', { error: templateError }, 'WARNING')
  }

  // If no client-specific template, get the first available template
  if (!template) {
    logger('No client-specific template found, fetching first available template', {}, 'INFO')
    const { data: firstTemplate } = await supabaseClient
      .from('email_templates')
      .select('*')
      .limit(1)
      .maybeSingle()

    template = firstTemplate
  }

  if (!template) {
    logger('No email template found', {}, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'No email template found. Please create an email template.' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  logger('Email template found', { templateId: template.id, templateName: template.name }, 'INFO')

  // Use metadata if available, otherwise fall back to live data
  const metadata = invoice.metadata
  const billTo = metadata?.billTo || invoice.client
  const business = metadata?.business || settings
  const terms = metadata?.terms || invoice.client?.terms || 'Please make the payment by the due date.'

  // Prepare template data
  const templateData = {
    invoice_number: invoice.invoice_id,
    invoice_date: formatDate(invoice.issue_date),
    due_date: formatDate(invoice.due_date),
    amount: formatCurrency(invoice.total),
    subtotal: parseFloat(invoice.subtotal).toFixed(2),
    tax: parseFloat(invoice.tax).toFixed(2),
    total: formatCurrency(invoice.total),
    total_raw: parseFloat(invoice.total).toFixed(2),
    terms: terms,

    // Client data (from metadata or live)
    client_name: billTo?.name || 'Client',
    client_email: billTo?.email || billTo?.target_email || '',
    client_address: billTo?.address || '',
    client_city: billTo?.city || '',
    client_state: billTo?.state || '',
    client_postal_code: billTo?.postal_code || '',
    client_country: billTo?.country || '',
    client_terms: terms,

    // Business settings data (from metadata or live)
    company_name: business?.company_name || 'Your Company',
    owner_name: business?.owner_name || '',
    company_address: business?.address || '',
    company_city: business?.city || '',
    company_state: business?.state || '',
    company_postal_code: business?.postal_code || '',
    company_country: business?.country || '',
    company_email: business?.email || '',
    company_phone: business?.phone || '',
    beneficiary_name: business?.beneficiary_name || '',
    beneficiary_cnpj: business?.beneficiary_cnpj || '',
    swift_code: business?.swift_code || '',
    bank_name: business?.bank_name || '',
    bank_address: business?.bank_address || '',
    routing_number: business?.routing_number || '',
    account_number: business?.account_number || '',
    account_type: business?.account_type || '',
  }

  // Replace placeholders in template body
  logger('Applying template with placeholder data', {
    invoiceNumber: invoice.invoice_id,
    templateDataKeys: Object.keys(templateData)
  }, 'INFO')
  const emailHtml = replacePlaceholders(template.body, templateData)
  const emailSubject = replacePlaceholders(template.subject, templateData)

  logger('Template applied successfully', {
    subject: emailSubject,
    htmlLength: emailHtml.length
  }, 'INFO')

  const response = {
    html: emailHtml,
    subject: emailSubject,
  }

  logger('Email preview function completed successfully', {
    invoiceId,
    invoiceNumber: invoice.invoice_id,
    subject: emailSubject
  }, 'INFO')

  return new Response(
    JSON.stringify(response),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
}))
