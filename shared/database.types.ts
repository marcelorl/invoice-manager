export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      business_settings: {
        Row: {
          account_number: string
          account_type: string
          address: string
          bank_address: string
          bank_name: string
          beneficiary_cnpj: string
          beneficiary_name: string
          city: string
          company_name: string
          country: string
          email: string
          id: string
          owner_name: string
          phone: string
          postal_code: string
          routing_number: string
          state: string
          swift_code: string
        }
        Insert: {
          account_number: string
          account_type: string
          address: string
          bank_address: string
          bank_name: string
          beneficiary_cnpj: string
          beneficiary_name: string
          city: string
          company_name: string
          country: string
          email: string
          id?: string
          owner_name: string
          phone: string
          postal_code: string
          routing_number: string
          state: string
          swift_code: string
        }
        Update: {
          account_number?: string
          account_type?: string
          address?: string
          bank_address?: string
          bank_name?: string
          beneficiary_cnpj?: string
          beneficiary_name?: string
          city?: string
          company_name?: string
          country?: string
          email?: string
          id?: string
          owner_name?: string
          phone?: string
          postal_code?: string
          routing_number?: string
          state?: string
          swift_code?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string
          cc_email: string | null
          city: string
          country: string
          email_template_id: string
          google_drive_folder_url: string | null
          id: string
          name: string
          postal_code: string
          rate: number
          reminder_date: string | null
          reminder_type: string
          state: string
          target_email: string
          terms: string
        }
        Insert: {
          address: string
          cc_email?: string | null
          city: string
          country: string
          email_template_id: string
          google_drive_folder_url?: string | null
          id?: string
          name: string
          postal_code: string
          rate?: number
          reminder_date?: string | null
          reminder_type: string
          state: string
          target_email: string
          terms?: string
        }
        Update: {
          address?: string
          cc_email?: string | null
          city?: string
          country?: string
          email_template_id?: string
          google_drive_folder_url?: string | null
          id?: string
          name?: string
          postal_code?: string
          rate?: number
          reminder_date?: string | null
          reminder_type?: string
          state?: string
          target_email?: string
          terms?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_email_template_id_fkey"
            columns: ["email_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          id: string
          name: string
          subject: string
        }
        Insert: {
          body: string
          id?: string
          name: string
          subject: string
        }
        Update: {
          body?: string
          id?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          amount: number
          description: string
          id: string
          invoice_id: string
          item_date: string
          quantity: number
          rate: number
          raw_description: string | null
        }
        Insert: {
          amount: number
          description: string
          id?: string
          invoice_id: string
          item_date?: string
          quantity?: number
          rate: number
          raw_description?: string | null
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          item_date?: string
          quantity?: number
          rate?: number
          raw_description?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          client_id: string | null
          created_at: string | null
          due_date: string
          file_path: string | null
          id: string
          invoice_id: number
          issue_date: string
          metadata: Json | null
          paid_at: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax: number
          tax_rate: number
          total: number
          transferred_at: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string | null
          due_date: string
          file_path?: string | null
          id?: string
          invoice_id: number
          issue_date: string
          metadata?: Json | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          transferred_at?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string | null
          due_date?: string
          file_path?: string | null
          id?: string
          invoice_id?: number
          issue_date?: string
          metadata?: Json | null
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          tax_rate?: number
          total?: number
          transferred_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          id: string
          invoice_id: string | null
          message: string | null
          scheduled_for: string
          sent: boolean | null
          sent_at: string | null
        }
        Insert: {
          id?: string
          invoice_id?: string | null
          message?: string | null
          scheduled_for: string
          sent?: boolean | null
          sent_at?: string | null
        }
        Update: {
          id?: string
          invoice_id?: string | null
          message?: string | null
          scheduled_for?: string
          sent?: boolean | null
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

