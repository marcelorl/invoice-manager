import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { parse } from 'date-fns'
import type { Database } from '@shared/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey)

// ============================================================================
// CLIENTS
// ============================================================================

export async function getClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function getClient(id: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createClient(client: any) {
  const { data, error } = await supabase
    .from('clients')
    .insert(client)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateClient(id: string, updates: any) {
  const { data, error } = await supabase
    .from('clients')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteClient(id: string) {
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// INVOICES
// ============================================================================

export async function getInvoices() {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      client:clients(*),
      items:invoice_items(*)
    `)
    .order('issue_date', { ascending: false })

  if (error) throw error
  return data
}

export async function getInvoice(id: string) {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      client:clients(*),
      items:invoice_items(*)
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function getNextInvoiceNumber(clientId?: string): Promise<string> {
  // If no client is selected, return '1' as default
  if (!clientId) {
    return '1'
  }

  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_id')
    .eq('client_id', clientId)

  if (error) throw error

  // If no invoices exist for this client, start with 1
  if (!data || data.length === 0) {
    return '1'
  }

  // Find the maximum invoice number for this client
  let maxNumber = 0

  data.forEach(invoice => {
    const num = Number(invoice.invoice_id)
    if (num > maxNumber) {
      maxNumber = num
    }
  })

  // Return max + 1
  return (maxNumber + 1).toString()
}

// Helper to calculate invoice totals
function calculateInvoiceTotals(items: any[], taxRate: number = 0) {
  const itemsWithAmount = items.map(item => {
    const qty = Number(item.quantity) || 0
    const rate = Number(item.rate) || 0
    const amount = qty * rate
    return {
      ...item,
      quantity: qty,
      rate: rate,
      amount: amount.toFixed(2),
    }
  })

  const subtotal = itemsWithAmount.reduce((sum, item) => {
    return sum + Number(item.amount)
  }, 0)

  const taxRateNum = Number(taxRate) || 0
  const tax = subtotal * (taxRateNum / 100)
  const total = subtotal + tax

  return {
    itemsWithAmount,
    subtotal: subtotal.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
  }
}

export async function createInvoice(invoiceData: any) {
  const { items, tax_rate, ...invoice } = invoiceData

  // Calculate totals
  const { itemsWithAmount, subtotal, tax, total } = calculateInvoiceTotals(items, tax_rate || 0)

  // Insert invoice
  const { data: newInvoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      ...invoice,
      subtotal,
      tax_rate: (tax_rate || 0).toString(),
      tax,
      total,
      status: invoice.status || 'pending',
    })
    .select()
    .single()

  if (invoiceError) throw invoiceError

  // Insert items
  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(
      itemsWithAmount.map(item => ({
        invoice_id: newInvoice.id,
        description: item.description,
        raw_description: item.raw_description || null,
        quantity: item.quantity,
        rate: item.rate.toString(),
        amount: item.amount,
        item_date: item.item_date,
      }))
    )

  if (itemsError) throw itemsError

  // Return full invoice with items
  return getInvoice(newInvoice.id)
}

export async function updateInvoice(id: string, invoiceData: any) {
  const { items, tax_rate, ...invoice } = invoiceData

  let updateData: any = {}

  if (items) {
    // Recalculate totals
    const { itemsWithAmount, subtotal, tax, total } = calculateInvoiceTotals(items, tax_rate || 0)
    updateData = {
      ...invoice,
      subtotal,
      tax,
      total,
      tax_rate: (tax_rate || 0).toString(),
    }

    // Delete existing items
    const { error: deleteError } = await supabase
      .from('invoice_items')
      .delete()
      .eq('invoice_id', id)

    if (deleteError) throw deleteError

    // Insert new items
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(
        itemsWithAmount.map(item => ({
          invoice_id: id,
          description: item.description,
          raw_description: item.raw_description || null,
          quantity: item.quantity,
          rate: item.rate.toString(),
          amount: item.amount,
          item_date: item.item_date,
        }))
      )

    if (itemsError) throw itemsError
  } else {
    updateData = invoice
  }

  // Update invoice
  const { error: updateError } = await supabase
    .from('invoices')
    .update(updateData)
    .eq('id', id)

  if (updateError) throw updateError

  // Return full invoice with items
  return getInvoice(id)
}

export async function deleteInvoice(id: string) {
  // Get the invoice to check if it has a file
  const invoice = await getInvoice(id)

  // Delete the PDF file from storage if it exists
  if (invoice.file_path) {
    try {
      await deleteInvoicePDF(invoice.file_path)
    } catch (error) {
      console.error('Error deleting PDF file:', error)
      // Continue with invoice deletion even if file deletion fails
    }
  }

  // Items will cascade delete due to ON DELETE CASCADE
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function markInvoiceAsPaid(id: string, paidDate: string) {
  // Parse YYYY-MM-DD as local date and convert to ISO timestamp
  const parsedDate = parse(paidDate, 'yyyy-MM-dd', new Date())
  const paidAtTimestamp = parsedDate.toISOString()

  const { data, error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: paidAtTimestamp,
    })
    .eq('id', id)
    .select(`
      *,
      client:clients(*),
      items:invoice_items(*)
    `)
    .single()

  if (error) throw error
  return data
}

// ============================================================================
// BUSINESS SETTINGS
// ============================================================================

export async function getSettings() {
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .maybeSingle()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

export async function saveSettings(settings: any) {
  // Check if settings exist
  const { data: existing } = await supabase
    .from('business_settings')
    .select('id')
    .maybeSingle()

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('business_settings')
      .update(settings)
      .eq('id', existing.id)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Insert
    const { data, error } = await supabase
      .from('business_settings')
      .insert(settings)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

// ============================================================================
// EMAIL TEMPLATES
// ============================================================================

export async function getEmailTemplates() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('name')

  if (error) throw error
  return data
}

export async function getEmailTemplate(id: string) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createEmailTemplate(template: any) {
  const { data, error } = await supabase
    .from('email_templates')
    .insert(template)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateEmailTemplate(id: string, updates: any) {
  const { data, error } = await supabase
    .from('email_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteEmailTemplate(id: string) {
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ============================================================================
// REMINDERS
// ============================================================================

export async function getReminders() {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .order('scheduled_for')

  if (error) throw error
  return data
}

// ============================================================================
// EDGE FUNCTIONS (for third-party services only)
// ============================================================================

export async function sendInvoiceEmail(invoiceId: string, emailData?: { to?: string; subject?: string; body?: string; useTemplate?: boolean; saveToGoogleDrive?: boolean }) {
  const { data, error } = await supabase.functions.invoke('send-invoice', {
    body: {
      invoiceId,
      ...emailData,
    },
  })

  if (error) throw error
  return data
}

export async function getInvoiceEmailPreview(invoiceId: string) {
  const { data, error } = await supabase.functions.invoke('email-preview', {
    body: { invoiceId },
  })

  if (error) throw error
  return data
}

export async function saveToGoogleDrive(invoiceId: string) {
  const { data, error } = await supabase.functions.invoke('save-to-google-drive', {
    body: { invoiceId },
  })

  if (error) throw error
  return data
}

export async function summarizeDescription(rawDescription: string) {
  const { data, error } = await supabase.functions.invoke('summarize-description', {
    body: {
      rawDescription,
    },
  })

  if (error) throw error
  return data
}


// ============================================================================
// STORAGE - Invoice PDF Files
// ============================================================================

/**
 * Generate a signed URL for an invoice PDF with 5-minute expiry
 * @param filePath - The storage path of the file
 * @returns The signed URL valid for 5 minutes
 */
export async function getInvoicePDFSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from('invoices')
    .createSignedUrl(filePath, 300) // 300 seconds = 5 minutes

  if (error) throw error
  return data.signedUrl
}

/**
 * Delete an invoice PDF file from storage
 * @param filePath - The storage path of the file
 */
export async function deleteInvoicePDF(filePath: string) {
  const { error } = await supabase.storage
    .from('invoices')
    .remove([filePath])

  if (error) throw error
}
