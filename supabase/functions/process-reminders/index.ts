// Supabase Edge Function - Process Reminders
// This function runs daily at 8pm to check for reminders and send emails
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCORS } from '../_shared/middlewares/cors.ts'
import { logger } from '../_shared/utils/logger.ts'

// Helper to check if today is Friday
function isFriday(): boolean {
  const today = new Date()
  return today.getDay() === 5 // Friday is day 5
}

// Helper to check if today is the last day of the month
function isLastDayOfMonth(): boolean {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.getMonth() !== today.getMonth()
}

// Format currency
function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `$${num.toFixed(2)}`
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
  logger('Process reminders function invoked', { method: req.method, url: req.url }, 'INFO')

  // Extract authorization token from request header
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    logger('No authorization header provided', {}, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Authorization header required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const token = authHeader.replace('Bearer ', '')

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    token,
  )

  // Check what type of reminder day it is
  const isFridayToday = isFriday()
  const isLastDay = isLastDayOfMonth()

  logger('Checking reminder conditions', { isFriday: isFridayToday, isLastDayOfMonth: isLastDay }, 'INFO')

  if (!isFridayToday && !isLastDay) {
    logger('Not a reminder day, skipping', {}, 'INFO')
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Not a reminder day (not Friday or last day of month)',
        skipped: true
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  // Get clients based on reminder type
  let clientsToRemind: any[] = []

  if (isFridayToday) {
    logger('Friday detected, fetching weekly clients', {}, 'INFO')
    const { data: weeklyClients, error: weeklyError } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('reminder_type', 'weekly_friday')

    if (weeklyError) {
      logger('Error fetching weekly clients', { error: weeklyError }, 'ERROR')
    } else {
      clientsToRemind = [...clientsToRemind, ...(weeklyClients || [])]
      logger('Weekly clients fetched', { count: weeklyClients?.length }, 'INFO')
    }
  }

  if (isLastDay) {
    logger('Last day of month detected, fetching monthly clients', {}, 'INFO')
    const { data: monthlyClients, error: monthlyError } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('reminder_type', 'monthly_end')

    if (monthlyError) {
      logger('Error fetching monthly clients', { error: monthlyError }, 'ERROR')
    } else {
      clientsToRemind = [...clientsToRemind, ...(monthlyClients || [])]
      logger('Monthly clients fetched', { count: monthlyClients?.length }, 'INFO')
    }
  }

  if (clientsToRemind.length === 0) {
    logger('No clients to remind', {}, 'INFO')
    return new Response(
      JSON.stringify({
        success: true,
        message: 'No clients configured for reminders on this day',
        clientCount: 0
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  logger('Clients to remind found', { count: clientsToRemind.length }, 'INFO')

  // Fetch all unpaid invoices
  const { data: unpaidInvoices, error: invoicesError } = await supabaseClient
    .from('invoices')
    .select('*, client:clients(*)')
    .neq('status', 'paid')

  if (invoicesError) {
    logger('Error fetching unpaid invoices', { error: invoicesError }, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Failed to fetch unpaid invoices' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  logger('Unpaid invoices fetched', { count: unpaidInvoices?.length }, 'INFO')

  // Filter invoices by clients that need reminders
  const clientIds = new Set(clientsToRemind.map(c => c.id))
  const relevantInvoices = (unpaidInvoices || []).filter(inv =>
    inv.client_id && clientIds.has(inv.client_id)
  )

  logger('Relevant unpaid invoices filtered', { count: relevantInvoices.length }, 'INFO')

  // Group invoices by client
  const invoicesByClient = new Map<string, any[]>()
  for (const invoice of relevantInvoices) {
    const clientId = invoice.client_id
    if (!invoicesByClient.has(clientId)) {
      invoicesByClient.set(clientId, [])
    }
    invoicesByClient.get(clientId)!.push(invoice)
  }

  // Build email content
  const clientsWithUnpaidInvoices = clientsToRemind.filter(client =>
    invoicesByClient.has(client.id)
  )

  if (clientsWithUnpaidInvoices.length === 0) {
    logger('No unpaid invoices for clients with reminders', {}, 'INFO')
    return new Response(
      JSON.stringify({
        success: true,
        message: 'No unpaid invoices for clients with reminders',
        clientCount: clientsToRemind.length,
        unpaidCount: 0
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  logger('Building reminder email', { clientsWithUnpaid: clientsWithUnpaidInvoices.length }, 'INFO')

  // Build HTML email
  const reminderType = isFridayToday ? 'Weekly Friday' : 'End of Month'
  const today = formatDate(new Date().toISOString())

  let emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
        .client-section { background-color: white; margin: 15px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #4F46E5; }
        .client-name { font-size: 18px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
        .client-email { color: #6b7280; font-size: 14px; margin-bottom: 10px; }
        .invoice-item { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .invoice-item:last-child { border-bottom: none; }
        .invoice-number { font-weight: 600; color: #4F46E5; }
        .total { font-size: 18px; font-weight: bold; color: #059669; margin-top: 10px; }
        .summary { background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 20px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Invoice Reminder - ${reminderType}</h1>
          <p>${today}</p>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>This is your ${reminderType.toLowerCase()} reminder for unpaid invoices. The following clients have outstanding invoices:</p>
  `

  let totalUnpaid = 0
  let totalInvoiceCount = 0

  for (const client of clientsWithUnpaidInvoices) {
    const invoices = invoicesByClient.get(client.id) || []
    const clientTotal = invoices.reduce((sum, inv) => sum + parseFloat(inv.total), 0)
    totalUnpaid += clientTotal
    totalInvoiceCount += invoices.length

    emailHtml += `
      <div class="client-section">
        <div class="client-name">${client.name}</div>
        <div class="client-email">📧 ${client.target_email || 'No email'}</div>
        <div style="margin-top: 10px;">
    `

    for (const invoice of invoices) {
      emailHtml += `
        <div class="invoice-item">
          <span class="invoice-number">${invoice.invoice_id}</span>
          <span style="float: right;">${formatCurrency(invoice.total)}</span>
          <br>
          <span style="font-size: 12px; color: #6b7280;">Due: ${formatDate(invoice.due_date)}</span>
        </div>
      `
    }

    emailHtml += `
        </div>
        <div class="total">Total: ${formatCurrency(clientTotal)}</div>
      </div>
    `
  }

  emailHtml += `
          <div class="summary">
            <strong>Summary:</strong><br>
            ${clientsWithUnpaidInvoices.length} client(s) with ${totalInvoiceCount} unpaid invoice(s)<br>
            <span style="font-size: 20px; color: #059669; font-weight: bold;">Total Outstanding: ${formatCurrency(totalUnpaid)}</span>
          </div>

          <p style="margin-top: 20px;">Please follow up on these outstanding invoices at your earliest convenience.</p>
        </div>
        <div class="footer">
          <p>This is an automated reminder from your Invoice Management System</p>
        </div>
      </div>
    </body>
    </html>
  `

  // Get business settings for email
  const { data: settings } = await supabaseClient
    .from('business_settings')
    .select('email')
    .limit(1)
    .maybeSingle()

  const businessEmail = settings?.email

  if (!businessEmail) {
    logger('No business email configured', {}, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Business email not configured in business_settings table' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  logger('Business email found', { email: businessEmail }, 'INFO')

  // Send email via Resend
  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
  const FROM_EMAIL = settings?.email || 'onboarding@resend.dev'

  if (!RESEND_API_KEY) {
    logger('Resend API key not configured', {}, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Resend API key not configured' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  const emailSubject = `Invoice Reminder: ${reminderType} - ${clientsWithUnpaidInvoices.length} Client(s) with Unpaid Invoices`

  logger('Sending reminder email', { to: businessEmail, subject: emailSubject }, 'INFO')

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [businessEmail],
      subject: emailSubject,
      html: emailHtml,
    }),
  })

  const resendData = await resendResponse.json()

  if (!resendResponse.ok) {
    logger('Resend API error', {
      status: resendResponse.status,
      error: resendData
    }, 'ERROR')
    return new Response(
      JSON.stringify({ error: resendData.message || 'Failed to send reminder email' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  logger('Reminder email sent successfully', {
    messageId: resendData.id,
    clientCount: clientsWithUnpaidInvoices.length,
    invoiceCount: totalInvoiceCount,
    totalAmount: totalUnpaid
  }, 'INFO')

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Reminder email sent successfully',
      messageId: resendData.id,
      reminderType,
      clientCount: clientsWithUnpaidInvoices.length,
      invoiceCount: totalInvoiceCount,
      totalUnpaid: formatCurrency(totalUnpaid),
      sentTo: businessEmail
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
}))
