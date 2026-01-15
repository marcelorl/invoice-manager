// Shared TypeScript types for the application
// These are derived from auto-generated Supabase database types

import type { Database } from './database.types'

// Export database Row types as simple type aliases
export type Client = Database['public']['Tables']['clients']['Row']

export type Invoice = Database['public']['Tables']['invoices']['Row']
export type InvoiceItem = Database['public']['Tables']['invoice_items']['Row']
export type BusinessSettings = Database['public']['Tables']['business_settings']['Row']
export type EmailTemplate = Database['public']['Tables']['email_templates']['Row']
export type Reminder = Database['public']['Tables']['reminders']['Row']

// Export Insert types for creating new records
export type ClientInsert = Database['public']['Tables']['clients']['Insert']
export type InvoiceInsert = Database['public']['Tables']['invoices']['Insert']
export type InvoiceItemInsert = Database['public']['Tables']['invoice_items']['Insert']
export type BusinessSettingsInsert = Database['public']['Tables']['business_settings']['Insert']
export type EmailTemplateInsert = Database['public']['Tables']['email_templates']['Insert']
export type ReminderInsert = Database['public']['Tables']['reminders']['Insert']

// Export Update types for updating existing records
export type ClientUpdate = Database['public']['Tables']['clients']['Update']
export type InvoiceUpdate = Database['public']['Tables']['invoices']['Update']
export type InvoiceItemUpdate = Database['public']['Tables']['invoice_items']['Update']
export type BusinessSettingsUpdate = Database['public']['Tables']['business_settings']['Update']
export type EmailTemplateUpdate = Database['public']['Tables']['email_templates']['Update']
export type ReminderUpdate = Database['public']['Tables']['reminders']['Update']

// Invoice metadata structure - historical snapshot at time of invoice generation
export interface InvoiceMetadata {
  // Client data snapshot
  billTo: {
    name: string
    address: string
    city: string
    state: string
    postal_code: string
    country: string
    email: string
    cc_email?: string
  }
  // Business settings snapshot
  business: {
    company_name: string
    owner_name: string
    address: string
    city: string
    state: string
    postal_code: string
    country: string
    email: string
    phone: string
    bank_name: string
    bank_address: string
    swift_code: string
    routing_number: string
    account_number: string
    account_type: string
    beneficiary_name: string
    beneficiary_cnpj: string
  }
  // Terms and conditions
  terms: string
  // Payment information notes
  notes: string
}

// Extended types for frontend use (combining related data)
export type InvoiceWithClient = Invoice & {
  client: Client | null
  items: InvoiceItem[]
}
