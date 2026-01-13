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
    invoiceNumber: invoice.invoice_number,
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

  // Prepare template data
  const templateData = {
    invoice_number: invoice.invoice_number,
    invoice_date: formatDate(invoice.issue_date),
    due_date: formatDate(invoice.due_date),
    amount: formatCurrency(invoice.total),
    subtotal: parseFloat(invoice.subtotal).toFixed(2),
    tax: parseFloat(invoice.tax).toFixed(2),
    total: formatCurrency(invoice.total),
    total_raw: parseFloat(invoice.total).toFixed(2),
    terms: invoice.client?.terms || 'Please make the payment by the due date.',

    // Client data
    client_name: invoice.client?.name || 'Client',
    client_email: invoice.client?.target_email || '',
    client_address: invoice.client?.address || '',
    client_city: invoice.client?.city || '',
    client_state: invoice.client?.state || '',
    client_postal_code: invoice.client?.postal_code || '',
    client_country: invoice.client?.country || '',
    client_terms: invoice.client?.terms || '',

    // Business settings data
    company_name: settings?.company_name || 'Your Company',
    owner_name: settings?.owner_name || '',
    company_address: settings?.address || '',
    company_city: settings?.city || '',
    company_state: settings?.state || '',
    company_postal_code: settings?.postal_code || '',
    company_country: settings?.country || '',
    company_email: settings?.email || '',
    company_phone: settings?.phone || '',
    beneficiary_name: settings?.beneficiary_name || '',
    beneficiary_cnpj: settings?.beneficiary_cnpj || '',
    swift_code: settings?.swift_code || '',
    bank_name: settings?.bank_name || '',
    bank_address: settings?.bank_address || '',
    routing_number: settings?.routing_number || '',
    account_number: settings?.account_number || '',
    account_type: settings?.account_type || '',
  }

  // Replace placeholders in template body
  logger('Applying template with placeholder data', {
    invoiceNumber: invoice.invoice_number,
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
    invoiceNumber: invoice.invoice_number,
    subject: emailSubject
  }, 'INFO')

  return new Response(
    JSON.stringify(response),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
}))
