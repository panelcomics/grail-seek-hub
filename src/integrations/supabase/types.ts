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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      claim_sale_items: {
        Row: {
          category: string
          city: string | null
          claim_sale_id: string
          condition: string
          created_at: string
          distance_miles: number | null
          id: string
          image_url: string | null
          is_claimed: boolean
          latitude: number | null
          longitude: number | null
          state: string | null
          title: string
        }
        Insert: {
          category: string
          city?: string | null
          claim_sale_id: string
          condition: string
          created_at?: string
          distance_miles?: number | null
          id?: string
          image_url?: string | null
          is_claimed?: boolean
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          title: string
        }
        Update: {
          category?: string
          city?: string | null
          claim_sale_id?: string
          condition?: string
          created_at?: string
          distance_miles?: number | null
          id?: string
          image_url?: string | null
          is_claimed?: boolean
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "claim_sale_items_claim_sale_id_fkey"
            columns: ["claim_sale_id"]
            isOneToOne: false
            referencedRelation: "claim_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_sales: {
        Row: {
          claimed_items: number
          created_at: string
          end_time: string
          id: string
          price: number
          start_time: string
          status: string
          title: string
          total_items: number
          updated_at: string
        }
        Insert: {
          claimed_items?: number
          created_at?: string
          end_time: string
          id?: string
          price?: number
          start_time: string
          status?: string
          title: string
          total_items?: number
          updated_at?: string
        }
        Update: {
          claimed_items?: number
          created_at?: string
          end_time?: string
          id?: string
          price?: number
          start_time?: string
          status?: string
          title?: string
          total_items?: number
          updated_at?: string
        }
        Relationships: []
      }
      claims: {
        Row: {
          claim_sale_id: string
          claimed_at: string
          id: string
          item_id: string
          quantity: number
          shipping_tier: string
          total_price: number
          user_id: string
        }
        Insert: {
          claim_sale_id: string
          claimed_at?: string
          id?: string
          item_id: string
          quantity?: number
          shipping_tier: string
          total_price: number
          user_id: string
        }
        Update: {
          claim_sale_id?: string
          claimed_at?: string
          id?: string
          item_id?: string
          quantity?: number
          shipping_tier?: string
          total_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claims_claim_sale_id_fkey"
            columns: ["claim_sale_id"]
            isOneToOne: false
            referencedRelation: "claim_sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "claims_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "claim_sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          city: string
          created_at: string | null
          description: string | null
          end_date: string
          event_type: string
          id: string
          image_url: string | null
          is_featured: boolean | null
          latitude: number
          longitude: number
          name: string
          start_date: string
          state: string
          venue: string | null
          website_url: string | null
        }
        Insert: {
          city: string
          created_at?: string | null
          description?: string | null
          end_date: string
          event_type: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          latitude: number
          longitude: number
          name: string
          start_date: string
          state: string
          venue?: string | null
          website_url?: string | null
        }
        Update: {
          city?: string
          created_at?: string | null
          description?: string | null
          end_date?: string
          event_type?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          latitude?: number
          longitude?: number
          name?: string
          start_date?: string
          state?: string
          venue?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
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
  public: {
    Enums: {},
  },
} as const
