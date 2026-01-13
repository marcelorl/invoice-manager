// Supabase Edge Function - Send Invoice Email
// This function only handles third-party email sending via Resend
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { handleCORS } from '../_shared/middlewares/cors.ts'
import { PDFDocument, rgb, StandardFonts } from 'https://cdn.skypack.dev/pdf-lib@1.17.1'
import { sendInvoiceSchema } from './validation.ts'
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

// Format date short (mm/dd/yy)
function formatDateShort(dateString: string): string {
  // Parse YYYY-MM-DD as local date to avoid timezone issues
  const [year, month, day] = dateString.split('T')[0].split('-')
  const shortYear = year.slice(-2)
  return `${month}/${day}/${shortYear}`
}

// Generate PDF from invoice data - matches InvoicePreview component exactly
async function generateInvoicePDF(invoice: any, settings: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([612, 792]) // Letter size (8.5" x 11")
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 60
  const pageWidth = 612
  const contentWidth = pageWidth - (2 * margin)
  let yPos = 732 // Start position (792 - 60 margin)

  const grayColor = rgb(0.4, 0.4, 0.4)
  const lightGrayColor = rgb(0.5, 0.5, 0.5)
  const blackColor = rgb(0, 0, 0)

  // ===== HEADER SECTION =====
  // Company name (left, bold, large)
  page.drawText(settings?.company_name || 'Your Company', {
    x: margin,
    y: yPos,
    size: 18,
    font: boldFont,
    color: blackColor,
  })

  // INVOICE text (right, large, gray)
  page.drawText('INVOICE', {
    x: pageWidth - margin - 100,
    y: yPos,
    size: 26,
    font: boldFont,
    color: lightGrayColor,
  })

  yPos -= 18

  // Company details (gray text)
  if (settings) {
    page.drawText(settings.owner_name, { x: margin, y: yPos, size: 10, font, color: grayColor })
    yPos -= 12
    page.drawText(settings.address, { x: margin, y: yPos, size: 10, font, color: grayColor })
    yPos -= 12
    const cityLine = `${settings.city}, ${settings.state} ${settings.postal_code}`
    page.drawText(cityLine, { x: margin, y: yPos, size: 10, font, color: grayColor })
    yPos -= 12
    page.drawText(settings.country, { x: margin, y: yPos, size: 10, font, color: grayColor })
    yPos -= 12
  }

  yPos -= 30

  // ===== BILL TO & INVOICE DETAILS SECTION =====
  const billToY = yPos

  // Bill To (left side)
  page.drawText('BILL TO:', { x: margin, y: yPos, size: 9, font: boldFont, color: lightGrayColor })
  yPos -= 14
  page.drawText(invoice.client?.name || 'Client', { x: margin, y: yPos, size: 11, font: boldFont, color: blackColor })
  yPos -= 14

  if (invoice.client) {
    page.drawText(invoice.client.address, { x: margin, y: yPos, size: 10, font, color: grayColor })
    yPos -= 12
    const cityLine = `${invoice.client.city}, ${invoice.client.state} ${invoice.client.postal_code}`
    page.drawText(cityLine, { x: margin, y: yPos, size: 10, font, color: grayColor })
    yPos -= 12
    page.drawText(invoice.client.country, { x: margin, y: yPos, size: 10, font, color: grayColor })
    yPos -= 12
  }

  // Invoice details (right side, aligned grid)
  const rightColX = pageWidth - margin - 180
  const valueColX = pageWidth - margin - 80
  let detailY = billToY

  page.drawText('Invoice#', { x: rightColX, y: detailY, size: 10, font, color: lightGrayColor })
  page.drawText(invoice.invoice_number, { x: valueColX, y: detailY, size: 10, font: boldFont, color: blackColor })
  detailY -= 14

  page.drawText('Invoice Date', { x: rightColX, y: detailY, size: 10, font, color: lightGrayColor })
  page.drawText(formatDate(invoice.issue_date), { x: valueColX, y: detailY, size: 10, font, color: blackColor })
  detailY -= 14

  page.drawText('Due Date', { x: rightColX, y: detailY, size: 10, font, color: lightGrayColor })
  page.drawText(formatDate(invoice.due_date), { x: valueColX, y: detailY, size: 10, font, color: blackColor })

  yPos -= 30

  // ===== ITEMS TABLE =====
  // Table header
  const descX = margin
  const dateX = pageWidth - margin - 240
  const qtyX = pageWidth - margin - 180
  const rateX = pageWidth - margin - 110
  const amountX = pageWidth - margin - 44 // Increased by 4 pixels

  // Calculate column widths
  const descColWidth = dateX - descX
  const dateColWidth = qtyX - dateX
  const qtyColWidth = rateX - qtyX
  const rateColWidth = amountX - rateX
  const amountColWidth = pageWidth - margin - amountX

  // Draw dark grey background for table header
  page.drawRectangle({
    x: margin,
    y: yPos - 4,
    width: contentWidth,
    height: 18,
    color: rgb(0.25, 0.25, 0.25),
  })

  // Center-aligned headers (vertically centered in header box)
  const headerSize = 10
  const headerYPos = yPos + 2 // Vertically center text in 18px high box
  const descHeader = 'Item Description'
  const dateHeader = 'Date'
  const qtyHeader = 'Qty'
  const rateHeader = 'Rate'
  const amountHeader = 'Amount'

  const descHeaderWidth = boldFont.widthOfTextAtSize(descHeader, headerSize)
  page.drawText(descHeader, { x: descX + (descColWidth - descHeaderWidth) / 2, y: headerYPos, size: headerSize, font: boldFont, color: rgb(1, 1, 1) })

  const dateHeaderWidth = boldFont.widthOfTextAtSize(dateHeader, headerSize)
  page.drawText(dateHeader, { x: dateX + (dateColWidth - dateHeaderWidth) / 2, y: headerYPos, size: headerSize, font: boldFont, color: rgb(1, 1, 1) })

  const qtyHeaderWidth = boldFont.widthOfTextAtSize(qtyHeader, headerSize)
  page.drawText(qtyHeader, { x: qtyX + (qtyColWidth - qtyHeaderWidth) / 2, y: headerYPos, size: headerSize, font: boldFont, color: rgb(1, 1, 1) })

  const rateHeaderWidth = boldFont.widthOfTextAtSize(rateHeader, headerSize)
  page.drawText(rateHeader, { x: rateX + (rateColWidth - rateHeaderWidth) / 2, y: headerYPos, size: headerSize, font: boldFont, color: rgb(1, 1, 1) })

  const amountHeaderWidth = boldFont.widthOfTextAtSize(amountHeader, headerSize)
  page.drawText(amountHeader, { x: amountX + (amountColWidth - amountHeaderWidth) / 2, y: headerYPos, size: headerSize, font: boldFont, color: rgb(1, 1, 1) })

  yPos -= 14

  // Table rows
  for (const item of invoice.items) {
    // Wrap description if too long
    const maxDescWidth = dateX - descX - 10
    const description = item.description
    const descWords = description.split(' ')
    let descLine = ''
    const descLines: string[] = []

    for (const word of descWords) {
      const testLine = descLine + (descLine ? ' ' : '') + word
      const textWidth = font.widthOfTextAtSize(testLine, 10)

      if (textWidth > maxDescWidth && descLine) {
        descLines.push(descLine)
        descLine = word
      } else {
        descLine = testLine
      }
    }
    if (descLine) descLines.push(descLine)

    // Draw first line with all columns (center-aligned for numeric columns)
    const dateText = formatDateShort(item.item_date)
    const qtyText = String(item.quantity)
    const rateText = parseFloat(item.rate).toFixed(2)
    const amountText = parseFloat(item.amount).toFixed(2)

    page.drawText(descLines[0] || '', { x: descX, y: yPos, size: 10, font, color: blackColor })

    const dateTextWidth = font.widthOfTextAtSize(dateText, 10)
    page.drawText(dateText, { x: dateX + (dateColWidth - dateTextWidth) / 2, y: yPos, size: 10, font, color: grayColor })

    const qtyTextWidth = font.widthOfTextAtSize(qtyText, 10)
    page.drawText(qtyText, { x: qtyX + (qtyColWidth - qtyTextWidth) / 2, y: yPos, size: 10, font, color: grayColor })

    const rateTextWidth = font.widthOfTextAtSize(rateText, 10)
    page.drawText(rateText, { x: rateX + (rateColWidth - rateTextWidth) / 2, y: yPos, size: 10, font, color: grayColor })

    const amountTextWidth = boldFont.widthOfTextAtSize(amountText, 10)
    page.drawText(amountText, { x: amountX + (amountColWidth - amountTextWidth) / 2, y: yPos, size: 10, font: boldFont, color: blackColor })

    yPos -= 14

    // Draw remaining description lines
    for (let i = 1; i < descLines.length; i++) {
      page.drawText(descLines[i], { x: descX, y: yPos, size: 10, font, color: blackColor })
      yPos -= 14
    }

    // Item separator line
    page.drawLine({
      start: { x: margin, y: yPos + 4 },
      end: { x: pageWidth - margin, y: yPos + 4 },
      thickness: 0.5,
      color: rgb(0.9, 0.9, 0.9),
    })
    yPos -= 8
  }

  yPos -= 15

  // ===== TOTALS SECTION =====
  const totalsLabelX = pageWidth - margin - 180
  const totalsValueX = pageWidth - margin - 60

  page.drawText('Subtotal', { x: totalsLabelX, y: yPos, size: 10, font, color: lightGrayColor })
  page.drawText(parseFloat(invoice.subtotal).toFixed(2), { x: totalsValueX, y: yPos, size: 10, font, color: blackColor })
  yPos -= 14

  page.drawText('Tax', { x: totalsLabelX, y: yPos, size: 10, font, color: lightGrayColor })
  page.drawText(parseFloat(invoice.tax).toFixed(2), { x: totalsValueX, y: yPos, size: 10, font, color: blackColor })
  yPos -= 8

  // Total border line
  page.drawLine({
    start: { x: totalsLabelX, y: yPos },
    end: { x: pageWidth - margin, y: yPos },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  yPos -= 14

  // Draw light grey background for TOTAL row
  page.drawRectangle({
    x: totalsLabelX,
    y: yPos - 6,
    width: pageWidth - margin - totalsLabelX,
    height: 24,
    color: rgb(0.95, 0.95, 0.95),
  })

  page.drawText('TOTAL', { x: totalsLabelX + 4, y: yPos + 2, size: 13, font: boldFont, color: blackColor })
  page.drawText(formatCurrency(invoice.total), { x: totalsValueX, y: yPos + 2, size: 13, font: boldFont, color: blackColor })

  // ===== NOTES & TERMS SECTION (AT BOTTOM) =====
  // Calculate height needed for terms section
  let termsLines: string[] = []
  if (invoice.client?.terms) {
    const maxWidth = contentWidth
    const terms = invoice.client.terms
    const words = terms.split(' ')
    let line = ''

    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word
      const textWidth = font.widthOfTextAtSize(testLine, 9)

      if (textWidth > maxWidth && line) {
        termsLines.push(line)
        line = word
      } else {
        line = testLine
      }
    }
    if (line) termsLines.push(line)
  }

  // Calculate total height needed for bottom sections
  const paymentInfoLines = settings ? 9 : 0 // 7 fields + 2 spacing lines
  const termsHeaderHeight = invoice.client?.terms ? 14 : 0
  const termsContentHeight = termsLines.length * 11
  const totalBottomHeight = (paymentInfoLines * 11) + termsHeaderHeight + termsContentHeight + 24

  // Start from bottom of page
  let bottomYPos = margin + totalBottomHeight

  // ===== PAYMENT INFORMATION SECTION =====
  if (settings) {
    page.drawText('Payment Information', { x: margin, y: bottomYPos, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.3) })
    bottomYPos -= 12

    const infoSize = 9
    const infoColor = grayColor

    page.drawText(`Beneficiary Name: ${settings.beneficiary_name}`, { x: margin, y: bottomYPos, size: infoSize, font, color: infoColor })
    bottomYPos -= 11
    page.drawText(`Beneficiary CNPJ: ${settings.beneficiary_cnpj}`, { x: margin, y: bottomYPos, size: infoSize, font, color: infoColor })
    bottomYPos -= 11
    page.drawText(`SWIFT/BIC Code: ${settings.swift_code}`, { x: margin, y: bottomYPos, size: infoSize, font, color: infoColor })
    bottomYPos -= 11
    page.drawText(`Bank Address: ${settings.bank_address}`, { x: margin, y: bottomYPos, size: infoSize, font, color: infoColor })
    bottomYPos -= 11
    page.drawText(`Routing Number: ${settings.routing_number}`, { x: margin, y: bottomYPos, size: infoSize, font, color: infoColor })
    bottomYPos -= 11
    page.drawText(`Account Number: ${settings.account_number}`, { x: margin, y: bottomYPos, size: infoSize, font, color: infoColor })
    bottomYPos -= 11
    page.drawText(`Account Type: ${settings.account_type}`, { x: margin, y: bottomYPos, size: infoSize, font, color: infoColor })
    bottomYPos -= 11

    bottomYPos -= 12
  }

  // ===== TERMS & CONDITIONS SECTION =====
  if (invoice.client?.terms) {
    page.drawText('Terms & Conditions', { x: margin, y: bottomYPos, size: 10, font: boldFont, color: rgb(0.3, 0.3, 0.3) })
    bottomYPos -= 12

    for (const line of termsLines) {
      page.drawText(line, { x: margin, y: bottomYPos, size: 9, font, color: grayColor })
      bottomYPos -= 11
    }
  }

  return await pdfDoc.save()
}

Deno.serve(handleCORS(async (req) => {
  logger('Send invoice function invoked', { method: req.method, url: req.url }, 'INFO')

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  // Validate request body
  const body = await req.json()
  logger('Request body received', { body }, 'INFO')

  const validation = sendInvoiceSchema.safeParse(body)

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

  const { invoiceId, to, subject, body: emailBody, useTemplate, saveToGoogleDrive } = validation.data
  logger('Request validated successfully', { invoiceId, to, subject, useTemplate, saveToGoogleDrive }, 'INFO')

  // Fetch invoice with client and items (always needed for PDF attachment)
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

  // Use client email if not provided
  const recipientEmail = to || invoice.client?.target_email
  if (!recipientEmail) {
    logger('No recipient email available', { invoiceId, clientHasEmail: !!invoice.client?.target_email }, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'No recipient email address available. Please provide an email or configure one for the client.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  logger('Recipient email determined', { recipientEmail }, 'INFO')

  // Fetch business settings (needed for both template and PDF generation)
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

  let emailHtml = emailBody
  let emailSubject = subject

  // Prepare common template data for placeholder replacement
  const commonTemplateData = {
    invoice_number: invoice.invoice_number,
    invoice_date: formatDate(invoice.issue_date),
    due_date: formatDate(invoice.due_date),
    amount: formatCurrency(invoice.total),
    total: formatCurrency(invoice.total),
    client_name: invoice.client?.name || 'Client',
  }

  // Convert plain text body to HTML if not using template
  if (!useTemplate && emailBody) {
    // Replace placeholders in the body
    let processedBody = replacePlaceholders(emailBody, commonTemplateData)
    // Convert line breaks to HTML
    emailHtml = processedBody.replace(/\n/g, '<br>')
  }

  // Generate HTML from template if requested
  if (useTemplate) {
    logger('Using template for invoice', { invoiceId, clientTemplateId: invoice.client?.email_template_id }, 'INFO')

    // Fetch email template (either client's specific template or first available)
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

    // Replace placeholders in template body and subject
    emailHtml = replacePlaceholders(template.body, templateData)
    emailSubject = replacePlaceholders(template.subject, templateData)
    logger('Template applied successfully', {
      subject: emailSubject,
      templateDataKeys: Object.keys(templateData)
    }, 'INFO')
  }

  // Generate or download PDF
  let pdfAttachment = null
  let pdfBytes: Uint8Array | null = null

  if (invoice.file_path) {
    logger('Downloading PDF from storage', { filePath: invoice.file_path }, 'INFO')
    const { data: pdfData, error: downloadError } = await supabaseClient.storage
      .from('invoices')
      .download(invoice.file_path)

    if (!downloadError && pdfData) {
      const arrayBuffer = await pdfData.arrayBuffer()
      pdfBytes = new Uint8Array(arrayBuffer)
      logger('PDF downloaded successfully', { invoiceNumber: invoice.invoice_number, size: pdfBytes.length }, 'INFO')
    } else {
      logger('Could not download PDF for attachment', { error: downloadError }, 'WARNING')
    }
  }

  // If no PDF exists, generate one
  if (!pdfBytes) {
    logger('Generating PDF for invoice', { invoiceNumber: invoice.invoice_number }, 'INFO')
    try {
      pdfBytes = await generateInvoicePDF(invoice, settings)
      logger('PDF generated successfully', { size: pdfBytes.length }, 'INFO')

      // Save generated PDF to storage
      const fileName = `inv-${invoice.invoice_number}.pdf`
      logger('Uploading PDF to storage', { fileName }, 'INFO')
      const { error: uploadError } = await supabaseClient.storage
        .from('invoices')
        .upload(fileName, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        })

      if (!uploadError) {
        // Update invoice with file_path
        const { error: updateError } = await supabaseClient
          .from('invoices')
          .update({ file_path: fileName })
          .eq('id', invoiceId)

        if (updateError) {
          logger('Error updating invoice file_path', { error: updateError }, 'ERROR')
        } else {
          logger('PDF saved to storage and invoice updated', { fileName }, 'INFO')
        }
      } else {
        logger('Error uploading PDF to storage', { error: uploadError }, 'ERROR')
      }
    } catch (error) {
      logger('Error generating PDF', { error: error.message }, 'ERROR')
    }
  }

  // Generate notes (payment information) and terms text
  let notesText = ''
  if (settings) {
    notesText = `Payment Information\n\n`
    notesText += `Beneficiary Name: ${settings.beneficiary_name}\n`
    notesText += `Beneficiary CNPJ: ${settings.beneficiary_cnpj}\n`
    notesText += `SWIFT/BIC Code: ${settings.swift_code}\n`
    notesText += `Bank Address: ${settings.bank_address}\n`
    notesText += `Routing Number: ${settings.routing_number}\n`
    notesText += `Account Number: ${settings.account_number}\n`
    notesText += `Account Type: ${settings.account_type}`
  }
  const termsText = invoice.client?.terms || ''

  // Update invoice notes and terms
  const { error: updateNotesError } = await supabaseClient
    .from('invoices')
    .update({
      notes: notesText,
      terms: termsText
    })
    .eq('id', invoiceId)

  if (updateNotesError) {
    logger('Error updating invoice notes/terms', { error: updateNotesError }, 'ERROR')
  } else {
    logger('Invoice notes and terms updated successfully', {}, 'INFO')
  }

  // Attach PDF to email if available
  if (pdfBytes) {
    const base64Pdf = btoa(String.fromCharCode(...pdfBytes))
    pdfAttachment = {
      filename: `${invoice.invoice_number}.pdf`,
      content: base64Pdf,
    }
    logger('PDF attached to email', { invoiceNumber: invoice.invoice_number }, 'INFO')
  } else {
    logger('No PDF available for attachment', {}, 'WARNING')
  }

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

  const emailPayload: any = {
    from: FROM_EMAIL,
    to: [recipientEmail],
    subject: emailSubject,
    html: emailHtml,
  }

  // Add CC email if client has one configured
  if (invoice.client?.cc_email) {
    emailPayload.cc = [invoice.client.cc_email]
    logger('CC email added', { ccEmail: invoice.client.cc_email }, 'INFO')
  }

  // Add PDF attachment if available
  if (pdfAttachment) {
    emailPayload.attachments = [pdfAttachment]
  }

  logger('Preparing to send email via Resend', {
    from: FROM_EMAIL,
    to: emailPayload.to,
    cc: emailPayload.cc,
    subject: emailSubject,
    hasAttachment: !!pdfAttachment
  }, 'INFO')

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  })

  const resendData = await resendResponse.json()

  if (!resendResponse.ok) {
    logger('Resend API error', {
      status: resendResponse.status,
      statusText: resendResponse.statusText,
      error: resendData
    }, 'ERROR')
    return new Response(
      JSON.stringify({ error: resendData.message || 'Failed to send email' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  logger('Email sent successfully via Resend', {
    messageId: resendData.id,
    to: emailPayload.to,
    cc: emailPayload.cc
  }, 'INFO')

  // Mark invoice as sent in the database
  logger('Updating invoice status to sent', { invoiceId }, 'INFO')
  const { error: updateError } = await supabaseClient
    .from('invoices')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)

  if (updateError) {
    logger('Error updating invoice status', { invoiceId, error: updateError }, 'ERROR')
    // Don't fail the request if we can't update the status
  } else {
    logger('Invoice status updated to sent', { invoiceId }, 'INFO')
  }

  // Save to Google Drive if requested
  let googleDriveResult = null
  if (saveToGoogleDrive) {
    logger('Saving invoice to Google Drive', { invoiceId }, 'INFO')
    try {
      const googleDriveResponse = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/functions/v1/save-to-google-drive`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || '',
          },
          body: JSON.stringify({ invoiceId }),
        }
      )

      if (googleDriveResponse.ok) {
        googleDriveResult = await googleDriveResponse.json()
        logger('Invoice saved to Google Drive successfully', {
          invoiceId,
          result: googleDriveResult
        }, 'INFO')
      } else {
        const errorData = await googleDriveResponse.json()
        logger('Google Drive save failed', {
          invoiceId,
          status: googleDriveResponse.status,
          error: errorData
        }, 'ERROR')
        googleDriveResult = { error: errorData.error }
      }
    } catch (error) {
      logger('Error saving to Google Drive', {
        invoiceId,
        error: error.message
      }, 'ERROR')
      googleDriveResult = { error: error.message }
    }
  }

  const finalResponse = {
    success: true,
    message: 'Invoice sent successfully',
    messageId: resendData.id,
    googleDrive: googleDriveResult,
  }

  logger('Send invoice function completed successfully', {
    invoiceId,
    invoiceNumber: invoice.invoice_number,
    messageId: resendData.id,
    googleDriveSaved: !!googleDriveResult && !googleDriveResult.error
  }, 'INFO')

  return new Response(
    JSON.stringify(finalResponse),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
}))
