import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { handleCORS } from "../_shared/middlewares/cors.ts"
import { saveToGoogleDriveSchema } from './validation.ts'
import { logger } from '../_shared/utils/logger.ts'

Deno.serve(handleCORS(async (req) => {
  logger('Save to Google Drive function invoked', { method: req.method, url: req.url }, 'INFO')

  // Validate request body
  const body = await req.json()
  logger('Request body received', { body }, 'INFO')

  const validation = saveToGoogleDriveSchema.safeParse(body)

  if (!validation.success) {
    logger('Validation failed', { errors: validation.error.flatten().fieldErrors }, 'ERROR')
    return new Response(
      JSON.stringify({
        error: 'Validation error',
        details: validation.error.flatten().fieldErrors
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }

  const { invoiceId } = validation.data
  logger('Request validated successfully', { invoiceId }, 'INFO')

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Get invoice with client data
  logger('Fetching invoice from database', { invoiceId }, 'INFO')
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(`
      *,
      client:clients(*)
    `)
    .eq('id', invoiceId)
    .single()

  if (invoiceError) {
    logger('Error fetching invoice', { invoiceId, error: invoiceError }, 'ERROR')
    return new Response(
      JSON.stringify({ error: invoiceError.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }

  if (!invoice) {
    logger('Invoice not found', { invoiceId }, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Invoice not found' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 404,
      }
    )
  }

  logger('Invoice fetched successfully', {
    invoiceId,
    invoiceNumber: invoice.invoice_number,
    clientName: invoice.client?.name
  }, 'INFO')

  // Check if client has Google Drive folder configured
  const googleDriveFolderUrl = invoice.client?.google_drive_folder_url
  logger('Checking Google Drive folder configuration', {
    hasGoogleDriveFolder: !!googleDriveFolderUrl,
    folderUrl: googleDriveFolderUrl
  }, 'INFO')

  if (!googleDriveFolderUrl) {
    logger('Client does not have Google Drive folder configured', { clientName: invoice.client?.name }, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Client does not have a Google Drive folder configured' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }

  // Extract folder ID from URL
  logger('Extracting folder ID from URL', { folderUrl: googleDriveFolderUrl }, 'INFO')
  const folderIdMatch = googleDriveFolderUrl.match(/folders\/([a-zA-Z0-9_-]+)/)
  if (!folderIdMatch) {
    logger('Invalid Google Drive folder URL format', { folderUrl: googleDriveFolderUrl }, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Invalid Google Drive folder URL' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
  const folderId = folderIdMatch[1]
  logger('Folder ID extracted successfully', { folderId }, 'INFO')

  // Check if invoice has a PDF file in storage
  logger('Checking if invoice has PDF file', { filePath: invoice.file_path }, 'INFO')
  if (!invoice.file_path) {
    logger('Invoice PDF not generated yet', { invoiceNumber: invoice.invoice_number }, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Invoice PDF has not been generated yet. Please generate the PDF first.' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }

  // Download the PDF from Supabase storage
  logger('Downloading PDF from Supabase storage', { filePath: invoice.file_path }, 'INFO')
  const { data: pdfData, error: downloadError } = await supabase.storage
    .from('invoices')
    .download(invoice.file_path)

  if (downloadError) {
    logger('Failed to download PDF from storage', { filePath: invoice.file_path, error: downloadError }, 'ERROR')
    return new Response(
      JSON.stringify({ error: `Failed to download PDF: ${downloadError.message}` }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }

  if (!pdfData) {
    logger('PDF data is empty', { filePath: invoice.file_path }, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Failed to download invoice PDF' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }

  logger('PDF downloaded successfully', { filePath: invoice.file_path, size: pdfData.size }, 'INFO')

  // Convert blob to base64
  logger('Converting PDF to base64', {}, 'INFO')
  const arrayBuffer = await pdfData.arrayBuffer()
  const base64Pdf = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
  logger('PDF converted to base64', { base64Length: base64Pdf.length }, 'INFO')

  // Get Google Drive credentials from env
  logger('Checking Google Drive credentials', {}, 'INFO')
  const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID')
  const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')
  const googleRefreshToken = Deno.env.get('GOOGLE_REFRESH_TOKEN')

  if (!googleClientId || !googleClientSecret || !googleRefreshToken) {
    logger('Google Drive credentials not configured', {
      hasClientId: !!googleClientId,
      hasClientSecret: !!googleClientSecret,
      hasRefreshToken: !!googleRefreshToken
    }, 'ERROR')
    return new Response(
      JSON.stringify({ error: 'Google Drive credentials not configured. Please set up GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN.' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }

  logger('Google Drive credentials found', {}, 'INFO')

  // Get access token from refresh token
  logger('Requesting Google access token', {}, 'INFO')
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: googleRefreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text()
    logger('Failed to get Google access token', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      error
    }, 'ERROR')
    return new Response(
      JSON.stringify({ error: `Failed to get Google access token: ${error}` }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }

  const { access_token } = await tokenResponse.json()
  logger('Google access token obtained successfully', {}, 'INFO')

  // Prepare file metadata
  const fileName = `${invoice.invoice_number}.pdf`
  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/pdf',
  }

  logger('Preparing file upload to Google Drive', {
    fileName,
    folderId,
    invoiceNumber: invoice.invoice_number
  }, 'INFO')

  // Upload to Google Drive using multipart upload
  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/pdf\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Pdf +
    closeDelimiter

  logger('Uploading file to Google Drive', {
    fileName,
    folderId,
    requestBodyLength: multipartRequestBody.length
  }, 'INFO')

  const uploadResponse = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  )

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    logger('Failed to upload to Google Drive', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText,
      error
    }, 'ERROR')
    return new Response(
      JSON.stringify({ error: `Failed to upload to Google Drive: ${error}` }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }

  const uploadResult = await uploadResponse.json()
  logger('File uploaded to Google Drive successfully', {
    fileId: uploadResult.id,
    fileName,
    invoiceNumber: invoice.invoice_number
  }, 'INFO')

  const response = {
    success: true,
    fileId: uploadResult.id,
    fileName: fileName,
    message: `Invoice ${invoice.invoice_number} saved to Google Drive successfully`,
  }

  logger('Save to Google Drive function completed successfully', {
    invoiceId,
    invoiceNumber: invoice.invoice_number,
    fileId: uploadResult.id,
    fileName
  }, 'INFO')

  return new Response(
    JSON.stringify(response),
    {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    }
  )
}))
