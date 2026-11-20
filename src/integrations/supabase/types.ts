export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      campaign_batches: {
        Row: {
          campaign_id: string
          created_at: string
          error: string | null
          id: number
          recipients: number
          request_id: number | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error?: string | null
          id?: never
          recipients: number
          request_id?: number | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error?: string | null
          id?: never
          recipients?: number
          request_id?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_batches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          channel: string
          created_at: string
          ends_on: string | null
          failed_count: number
          html: string | null
          id: string
          image_path: string | null
          kind: string
          message: string
          product_ids: string[]
          recipients: number
          sent_at: string | null
          sent_count: number
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          ends_on?: string | null
          failed_count?: number
          html?: string | null
          id?: string
          image_path?: string | null
          kind?: string
          message: string
          product_ids?: string[]
          recipients?: number
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          ends_on?: string | null
          failed_count?: number
          html?: string | null
          id?: string
          image_path?: string | null
          kind?: string
          message?: string
          product_ids?: string[]
          recipients?: number
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          enabled: boolean
          id: string
          label: string
          sort_order: number
        }
        Insert: {
          enabled?: boolean
          id: string
          label: string
          sort_order?: number
        }
        Update: {
          enabled?: boolean
          id?: string
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      email_secrets: {
        Row: {
          api_key: string
          id: number
          updated_at: string
        }
        Insert: {
          api_key: string
          id?: number
          updated_at?: string
        }
        Update: {
          api_key?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_settings: {
        Row: {
          id: number
          provider: string
          sender_email: string | null
          sender_name: string
          shop_address: string
          site_url: string
          updated_at: string
        }
        Insert: {
          id?: number
          provider?: string
          sender_email?: string | null
          sender_name?: string
          shop_address?: string
          site_url?: string
          updated_at?: string
        }
        Update: {
          id?: number
          provider?: string
          sender_email?: string | null
          sender_name?: string
          shop_address?: string
          site_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          address: string
          created_at: string
          customer_name: string
          email: string | null
          id: string
          items: Json
          notes: string | null
          order_number: number
          phone: string
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          customer_name: string
          email?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: number
          phone: string
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          customer_name?: string
          email?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: number
          phone?: string
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string
          department: string
          fabric: string
          gallery: string[]
          id: string
          image_path: string | null
          image_url: string | null
          is_active: boolean
          is_new_arrival: boolean
          name: string
          origin: string
          price: number
          sizes: string[]
          tag: string
          updated_at: string
          video: string | null
        }
        Insert: {
          created_at?: string
          department: string
          fabric?: string
          gallery?: string[]
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean
          is_new_arrival?: boolean
          name: string
          origin?: string
          price?: number
          sizes?: string[]
          tag?: string
          updated_at?: string
          video?: string | null
        }
        Update: {
          created_at?: string
          department?: string
          fabric?: string
          gallery?: string[]
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_active?: boolean
          is_new_arrival?: boolean
          name?: string
          origin?: string
          price?: number
          sizes?: string[]
          tag?: string
          updated_at?: string
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_department_fkey"
            columns: ["department"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_settings: {
        Row: {
          id: number
          updated_at: string
          video: string | null
        }
        Insert: {
          id?: number
          updated_at?: string
          video?: string | null
        }
        Update: {
          id?: number
          updated_at?: string
          video?: string | null
        }
        Relationships: []
      }
      staff: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          role_title: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          role_title?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          role_title?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          confirm_sent_at: string | null
          confirmed_at: string | null
          consent_at: string
          consent_email: boolean
          consent_text: string | null
          consent_whatsapp: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          source: string
          status: string
          token: string
          unsubscribed_at: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          confirm_sent_at?: string | null
          confirmed_at?: string | null
          consent_at?: string
          consent_email?: boolean
          consent_text?: string | null
          consent_whatsapp?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          source?: string
          status?: string
          token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          confirm_sent_at?: string | null
          confirmed_at?: string | null
          consent_at?: string
          consent_email?: boolean
          consent_text?: string | null
          consent_whatsapp?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          source?: string
          status?: string
          token?: string
          unsubscribed_at?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          created_at: string
          id: string
          message: string
          name: string
          product_id: string | null
          rating: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          name: string
          product_id?: string | null
          rating: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          name?: string
          product_id?: string | null
          rating?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "testimonials_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_text: { Args: { keep_lines?: boolean; t: string }; Returns: string }
      confirm_subscription: { Args: { p_token: string }; Returns: Json }
      email_http_send: { Args: { p_body: Json }; Returns: number }
      email_request_result: { Args: { p_request_id: number }; Returns: Json }
      email_status: { Args: never; Returns: Json }
      get_shop_video: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      html_escape: { Args: { t: string }; Returns: string }
      is_shop_media: {
        Args: { _bucket: string; _path: string }
        Returns: boolean
      }
      place_order: {
        Args: {
          p_address: string
          p_customer_name: string
          p_email: string
          p_lines: Json
          p_notes: string
          p_phone: string
        }
        Returns: Json
      }
      refresh_campaign: { Args: { p_id: string }; Returns: Json }
      resend_confirmations: { Args: never; Returns: number }
      send_campaign: {
        Args: { p_html: string; p_id: string; p_test?: boolean }
        Returns: Json
      }
      send_subscription_confirmation: {
        Args: { p_id: string }
        Returns: boolean
      }
      set_email_api_key: { Args: { p_key: string }; Returns: undefined }
      submit_testimonial: {
        Args: {
          p_message: string
          p_name: string
          p_product_id?: string
          p_rating: number
        }
        Returns: undefined
      }
      subscribe: {
        Args: {
          p_consent_email: boolean
          p_consent_whatsapp: boolean
          p_email: string
          p_name: string
          p_source?: string
          p_whatsapp: string
        }
        Returns: Json
      }
      unsubscribe: { Args: { p_token: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin"],
    },
  },
} as const
