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
      bulk_scans: {
        Row: {
          completed_at: string | null
          created_at: string
          event_id: string | null
          id: string
          processed_items: number | null
          status: string
          total_items: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          processed_items?: number | null
          status: string
          total_items: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          processed_items?: number | null
          status?: string
          total_items?: number
          user_id?: string
        }
        Relationships: []
      }
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
          city: string | null
          claimed_items: number
          created_at: string
          description: string | null
          end_time: string
          id: string
          latitude: number | null
          longitude: number | null
          price: number
          seller_id: string | null
          shipping_amount: number | null
          start_time: string
          state: string | null
          status: string
          title: string
          total_items: number
          updated_at: string
          zip: string | null
        }
        Insert: {
          city?: string | null
          claimed_items?: number
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          price?: number
          seller_id?: string | null
          shipping_amount?: number | null
          start_time: string
          state?: string | null
          status?: string
          title: string
          total_items?: number
          updated_at?: string
          zip?: string | null
        }
        Update: {
          city?: string | null
          claimed_items?: number
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          price?: number
          seller_id?: string | null
          shipping_amount?: number | null
          start_time?: string
          state?: string | null
          status?: string
          title?: string
          total_items?: number
          updated_at?: string
          zip?: string | null
        }
        Relationships: []
      }
      claims: {
        Row: {
          claim_sale_id: string
          claimed_at: string
          id: string
          is_winner: boolean | null
          item_id: string
          item_price: number
          quantity: number
          seller_fee: number
          shipping_method: string | null
          shipping_tier: string
          total_price: number
          user_id: string
        }
        Insert: {
          claim_sale_id: string
          claimed_at?: string
          id?: string
          is_winner?: boolean | null
          item_id: string
          item_price?: number
          quantity?: number
          seller_fee?: number
          shipping_method?: string | null
          shipping_tier: string
          total_price: number
          user_id: string
        }
        Update: {
          claim_sale_id?: string
          claimed_at?: string
          id?: string
          is_winner?: boolean | null
          item_id?: string
          item_price?: number
          quantity?: number
          seller_fee?: number
          shipping_method?: string | null
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
      collections: {
        Row: {
          category: string
          condition: string
          created_at: string
          current_value: number
          grade: string | null
          id: string
          image_url: string | null
          notes: string | null
          purchase_date: string
          purchase_price: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          condition: string
          created_at?: string
          current_value: number
          grade?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          purchase_date: string
          purchase_price: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          condition?: string
          created_at?: string
          current_value?: number
          grade?: string | null
          id?: string
          image_url?: string | null
          notes?: string | null
          purchase_date?: string
          purchase_price?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      custom_alerts: {
        Row: {
          alert_name: string
          category: string | null
          created_at: string
          id: string
          is_active: boolean | null
          item_title: string
          location_city: string | null
          location_state: string | null
          max_price: number
          notify_email: boolean | null
          notify_push: boolean | null
          radius_miles: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_name: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          item_title: string
          location_city?: string | null
          location_state?: string | null
          max_price: number
          notify_email?: boolean | null
          notify_push?: boolean | null
          radius_miles?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_name?: string
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          item_title?: string
          location_city?: string | null
          location_state?: string | null
          max_price?: number
          notify_email?: boolean | null
          notify_push?: boolean | null
          radius_miles?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deal_matches: {
        Row: {
          alert_id: string
          distance_miles: number | null
          id: string
          image_url: string | null
          is_saved: boolean | null
          is_viewed: boolean | null
          location: string | null
          matched_at: string
          price: number
          source: string
          source_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_id: string
          distance_miles?: number | null
          id?: string
          image_url?: string | null
          is_saved?: boolean | null
          is_viewed?: boolean | null
          location?: string | null
          matched_at?: string
          price: number
          source: string
          source_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_id?: string
          distance_miles?: number | null
          id?: string
          image_url?: string | null
          is_saved?: boolean | null
          is_viewed?: boolean | null
          location?: string | null
          matched_at?: string
          price?: number
          source?: string
          source_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_matches_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "custom_alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_usage: {
        Row: {
          claim_id: string | null
          code_id: string
          created_at: string | null
          id: string
          item_price: number
          month_year: string
          savings_amount: number
          user_id: string
        }
        Insert: {
          claim_id?: string | null
          code_id: string
          created_at?: string | null
          id?: string
          item_price: number
          month_year: string
          savings_amount?: number
          user_id: string
        }
        Update: {
          claim_id?: string | null
          code_id?: string
          created_at?: string | null
          id?: string
          item_price?: number
          month_year?: string
          savings_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_usage_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_usage_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "influencer_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      event_listings: {
        Row: {
          booth_number: string | null
          category: string
          condition: string
          created_at: string
          event_id: string
          grade: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          price: number
          seller_id: string
          title: string
        }
        Insert: {
          booth_number?: string | null
          category: string
          condition: string
          created_at?: string
          event_id: string
          grade?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          price: number
          seller_id: string
          title: string
        }
        Update: {
          booth_number?: string | null
          category?: string
          condition?: string
          created_at?: string
          event_id?: string
          grade?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          price?: number
          seller_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_listings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
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
      influencer_codes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          code: string
          created_at: string | null
          discount_rate: number | null
          id: string
          is_active: boolean | null
          monthly_cap: number | null
          user_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          code: string
          created_at?: string | null
          discount_rate?: number | null
          id?: string
          is_active?: boolean | null
          monthly_cap?: number | null
          user_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          code?: string
          created_at?: string | null
          discount_rate?: number | null
          id?: string
          is_active?: boolean | null
          monthly_cap?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount: number
          buyer_id: string
          claim_id: string
          claim_sale_id: string
          created_at: string
          id: string
          paid_at: string | null
          payment_method: string | null
          payment_status: string
          seller_id: string
          shipping_amount: number
          stripe_session_id: string | null
          total: number
          updated_at: string
        }
        Insert: {
          amount?: number
          buyer_id: string
          claim_id: string
          claim_sale_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          seller_id: string
          shipping_amount?: number
          stripe_session_id?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          claim_id?: string
          claim_sale_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: string
          seller_id?: string
          shipping_amount?: number
          stripe_session_id?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_claim_id_fkey"
            columns: ["claim_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_claim_sale_id_fkey"
            columns: ["claim_sale_id"]
            isOneToOne: false
            referencedRelation: "claim_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      price_alerts: {
        Row: {
          alert_type: string
          collection_id: string
          created_at: string
          id: string
          is_read: boolean | null
          percentage_change: number | null
          threshold_value: number | null
          user_id: string
        }
        Insert: {
          alert_type: string
          collection_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          percentage_change?: number | null
          threshold_value?: number | null
          user_id: string
        }
        Update: {
          alert_type?: string
          collection_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          percentage_change?: number | null
          threshold_value?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          collection_id: string
          id: string
          price: number
          recorded_at: string
          source: string
        }
        Insert: {
          collection_id: string
          id?: string
          price: number
          recorded_at?: string
          source: string
        }
        Update: {
          collection_id?: string
          id?: string
          price?: number
          recorded_at?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
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
      scanned_items: {
        Row: {
          category: string
          comparable_sales: Json | null
          condition: string
          created_at: string
          estimated_value: number
          grade: string
          id: string
          image_url: string | null
          is_listed: boolean | null
          scan_data: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          comparable_sales?: Json | null
          condition: string
          created_at?: string
          estimated_value: number
          grade: string
          id?: string
          image_url?: string | null
          is_listed?: boolean | null
          scan_data?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          comparable_sales?: Json | null
          condition?: string
          created_at?: string
          estimated_value?: number
          grade?: string
          id?: string
          image_url?: string | null
          is_listed?: boolean | null
          scan_data?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          trade_post_id: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          trade_post_id: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          trade_post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_comments_trade_post_id_fkey"
            columns: ["trade_post_id"]
            isOneToOne: false
            referencedRelation: "trade_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_posts: {
        Row: {
          created_at: string
          description: string
          era: string | null
          id: string
          is_active: boolean | null
          location_city: string | null
          location_state: string | null
          offering_items: string[]
          seeking_items: string[]
          title: string
          type: string | null
          updated_at: string
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string
          description: string
          era?: string | null
          id?: string
          is_active?: boolean | null
          location_city?: string | null
          location_state?: string | null
          offering_items: string[]
          seeking_items: string[]
          title: string
          type?: string | null
          updated_at?: string
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string
          description?: string
          era?: string | null
          id?: string
          is_active?: boolean | null
          location_city?: string | null
          location_state?: string | null
          offering_items?: string[]
          seeking_items?: string[]
          title?: string
          type?: string | null
          updated_at?: string
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_description: string | null
          badge_name: string
          badge_type: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_description?: string | null
          badge_name: string
          badge_type: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_description?: string | null
          badge_name?: string
          badge_type?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_ratings: {
        Row: {
          created_at: string
          id: string
          rating: number
          review_text: string | null
          reviewed_user_id: string
          reviewer_id: string
          transaction_type: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          review_text?: string | null
          reviewed_user_id: string
          reviewer_id: string
          transaction_type?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          review_text?: string | null
          reviewed_user_id?: string
          reviewer_id?: string
          transaction_type?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      calculate_discounted_fee: {
        Args: {
          item_price: number
          shipping_method: string
          target_user_id: string
        }
        Returns: {
          cap_reached: boolean
          discount_applied: boolean
          discount_rate: number
          fee_amount: number
          savings: number
        }[]
      }
      get_event_listing_count: {
        Args: { target_event_id: string }
        Returns: number
      }
      get_monthly_savings: { Args: { target_user_id: string }; Returns: number }
      get_user_rating: {
        Args: { target_user_id: string }
        Returns: {
          average_rating: number
          total_ratings: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
