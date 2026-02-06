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
      ai_condition_assessments: {
        Row: {
          condition_notes: string | null
          corner_condition: string | null
          created_at: string
          gloss_condition: string | null
          grade_range_high: number | null
          grade_range_low: number | null
          id: string
          image_url: string
          inventory_item_id: string | null
          pressing_potential: string | null
          spine_condition: string | null
          surface_condition: string | null
          user_id: string
        }
        Insert: {
          condition_notes?: string | null
          corner_condition?: string | null
          created_at?: string
          gloss_condition?: string | null
          grade_range_high?: number | null
          grade_range_low?: number | null
          id?: string
          image_url: string
          inventory_item_id?: string | null
          pressing_potential?: string | null
          spine_condition?: string | null
          surface_condition?: string | null
          user_id: string
        }
        Update: {
          condition_notes?: string | null
          corner_condition?: string | null
          created_at?: string
          gloss_condition?: string | null
          grade_range_high?: number | null
          grade_range_low?: number | null
          id?: string
          image_url?: string
          inventory_item_id?: string | null
          pressing_potential?: string | null
          spine_condition?: string | null
          surface_condition?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_condition_assessments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_condition_assessments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      art_listing_flags: {
        Row: {
          created_at: string | null
          flagged_by: string
          id: string
          listing_id: string
          reason: string | null
        }
        Insert: {
          created_at?: string | null
          flagged_by: string
          id?: string
          listing_id: string
          reason?: string | null
        }
        Update: {
          created_at?: string | null
          flagged_by?: string
          id?: string
          listing_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "art_listing_flags_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "claim_sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      art_removal_requests: {
        Row: {
          art_id: string
          artist_id: string
          created_at: string
          id: string
          reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          art_id: string
          artist_id: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          art_id?: string
          artist_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "art_removal_requests_art_id_fkey"
            columns: ["art_id"]
            isOneToOne: false
            referencedRelation: "original_art"
            referencedColumns: ["id"]
          },
        ]
      }
      artist_applications: {
        Row: {
          about_artist: string | null
          admin_notes: string | null
          artist_name: string
          coa_signature_url: string | null
          confirmed_creator: boolean
          created_at: string
          id: string
          instagram_url: string | null
          portfolio_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_images: string[]
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about_artist?: string | null
          admin_notes?: string | null
          artist_name: string
          coa_signature_url?: string | null
          confirmed_creator?: boolean
          created_at?: string
          id?: string
          instagram_url?: string | null
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_images: string[]
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about_artist?: string | null
          admin_notes?: string | null
          artist_name?: string
          coa_signature_url?: string | null
          confirmed_creator?: boolean
          created_at?: string
          id?: string
          instagram_url?: string | null
          portfolio_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_images?: string[]
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      auction_watches: {
        Row: {
          created_at: string | null
          id: string
          listing_id: string
          notified_10min: boolean | null
          notified_1hour: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          listing_id: string
          notified_10min?: boolean | null
          notified_1hour?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          listing_id?: string
          notified_10min?: boolean | null
          notified_1hour?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_watches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      baselane_feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          flag_key: string
          id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          flag_key: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          enabled?: boolean
          flag_key?: string
          id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      bids: {
        Row: {
          bid_amount: number
          created_at: string | null
          id: string
          is_winning_bid: boolean | null
          listing_id: string
          user_id: string
        }
        Insert: {
          bid_amount: number
          created_at?: string | null
          id?: string
          is_winning_bid?: boolean | null
          listing_id: string
          user_id: string
        }
        Update: {
          bid_amount?: number
          created_at?: string | null
          id?: string
          is_winning_bid?: boolean | null
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
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
      campaign_comments: {
        Row: {
          author_id: string
          body: string
          campaign_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          campaign_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          campaign_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_comments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_notifications: {
        Row: {
          campaign_id: string
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          type: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          type: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_notifications_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_pledges: {
        Row: {
          amount_cents: number
          backer_id: string
          campaign_id: string
          created_at: string
          currency: string
          id: string
          reward_id: string | null
          status: string
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount_cents: number
          backer_id: string
          campaign_id: string
          created_at?: string
          currency?: string
          id?: string
          reward_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount_cents?: number
          backer_id?: string
          campaign_id?: string
          created_at?: string
          currency?: string
          id?: string
          reward_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_pledges_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_pledges_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "campaign_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_rewards: {
        Row: {
          campaign_id: string
          claimed_quantity: number
          created_at: string
          description: string
          estimated_delivery_date: string | null
          id: string
          includes_shipping: boolean
          is_digital: boolean
          limit_quantity: number | null
          pledge_amount_cents: number
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          claimed_quantity?: number
          created_at?: string
          description: string
          estimated_delivery_date?: string | null
          id?: string
          includes_shipping?: boolean
          is_digital?: boolean
          limit_quantity?: number | null
          pledge_amount_cents: number
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          claimed_quantity?: number
          created_at?: string
          description?: string
          estimated_delivery_date?: string | null
          id?: string
          includes_shipping?: boolean
          is_digital?: boolean
          limit_quantity?: number | null
          pledge_amount_cents?: number
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_rewards_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_stretch_goals: {
        Row: {
          campaign_id: string
          created_at: string
          description: string
          id: string
          is_unlocked: boolean
          sort_order: number
          target_amount_cents: number
          title: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          description: string
          id?: string
          is_unlocked?: boolean
          sort_order?: number
          target_amount_cents: number
          title: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          description?: string
          id?: string
          is_unlocked?: boolean
          sort_order?: number
          target_amount_cents?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stretch_goals_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_updates: {
        Row: {
          author_id: string
          body_markdown: string
          campaign_id: string
          created_at: string
          id: string
          is_public: boolean
          title: string
        }
        Insert: {
          author_id: string
          body_markdown: string
          campaign_id: string
          created_at?: string
          id?: string
          is_public?: boolean
          title: string
        }
        Update: {
          author_id?: string
          body_markdown?: string
          campaign_id?: string
          created_at?: string
          id?: string
          is_public?: boolean
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_updates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          backers_count: number
          category: string
          cover_image_url: string | null
          created_at: string
          creator_id: string
          currency: string
          current_pledged_cents: number
          ends_at: string
          funding_goal_cents: number
          id: string
          is_demo: boolean
          location: string | null
          risks_markdown: string | null
          short_tagline: string
          slug: string
          starts_at: string
          status: string
          story_markdown: string | null
          title: string
          updated_at: string
          updates_count: number
          video_url: string | null
        }
        Insert: {
          backers_count?: number
          category: string
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          currency?: string
          current_pledged_cents?: number
          ends_at: string
          funding_goal_cents: number
          id?: string
          is_demo?: boolean
          location?: string | null
          risks_markdown?: string | null
          short_tagline: string
          slug: string
          starts_at?: string
          status?: string
          story_markdown?: string | null
          title: string
          updated_at?: string
          updates_count?: number
          video_url?: string | null
        }
        Update: {
          backers_count?: number
          category?: string
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          currency?: string
          current_pledged_cents?: number
          ends_at?: string
          funding_goal_cents?: number
          id?: string
          is_demo?: boolean
          location?: string | null
          risks_markdown?: string | null
          short_tagline?: string
          slug?: string
          starts_at?: string
          status?: string
          story_markdown?: string | null
          title?: string
          updated_at?: string
          updates_count?: number
          video_url?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          added_at: string
          bundle_group_id: string | null
          id: string
          listing_id: string
          seller_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          bundle_group_id?: string | null
          id?: string
          listing_id: string
          seller_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          bundle_group_id?: string | null
          id?: string
          listing_id?: string
          seller_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      claim_sale_items: {
        Row: {
          authenticity_flagged: boolean | null
          category: string
          city: string | null
          claim_sale_id: string
          coa_file_url: string | null
          condition: string
          created_at: string
          distance_miles: number | null
          flagged_at: string | null
          flagged_by: string | null
          flagged_reason: string | null
          has_coa: boolean | null
          id: string
          image_url: string | null
          is_claimed: boolean
          is_creator_owner: boolean | null
          is_original_physical: boolean | null
          latitude: number | null
          longitude: number | null
          state: string | null
          subcategory: string | null
          title: string
        }
        Insert: {
          authenticity_flagged?: boolean | null
          category: string
          city?: string | null
          claim_sale_id: string
          coa_file_url?: string | null
          condition: string
          created_at?: string
          distance_miles?: number | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          has_coa?: boolean | null
          id?: string
          image_url?: string | null
          is_claimed?: boolean
          is_creator_owner?: boolean | null
          is_original_physical?: boolean | null
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          subcategory?: string | null
          title: string
        }
        Update: {
          authenticity_flagged?: boolean | null
          category?: string
          city?: string | null
          claim_sale_id?: string
          coa_file_url?: string | null
          condition?: string
          created_at?: string
          distance_miles?: number | null
          flagged_at?: string | null
          flagged_by?: string | null
          flagged_reason?: string | null
          has_coa?: boolean | null
          id?: string
          image_url?: string | null
          is_claimed?: boolean
          is_creator_owner?: boolean | null
          is_original_physical?: boolean | null
          latitude?: number | null
          longitude?: number | null
          state?: string | null
          subcategory?: string | null
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
          claim_cutoff_at: string | null
          claimed_items: number
          created_at: string
          description: string | null
          end_time: string
          id: string
          latitude: number | null
          longitude: number | null
          price: number
          seller_id: string | null
          shipping_tier_id: string | null
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
          claim_cutoff_at?: string | null
          claimed_items?: number
          created_at?: string
          description?: string | null
          end_time: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          price?: number
          seller_id?: string | null
          shipping_tier_id?: string | null
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
          claim_cutoff_at?: string | null
          claimed_items?: number
          created_at?: string
          description?: string | null
          end_time?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          price?: number
          seller_id?: string | null
          shipping_tier_id?: string | null
          start_time?: string
          state?: string | null
          status?: string
          title?: string
          total_items?: number
          updated_at?: string
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_sales_shipping_tier_id_fkey"
            columns: ["shipping_tier_id"]
            isOneToOne: false
            referencedRelation: "shipping_tiers"
            referencedColumns: ["id"]
          },
        ]
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
      collector_signal_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          signal_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          signal_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collector_signal_events_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "collector_signals"
            referencedColumns: ["id"]
          },
        ]
      }
      collector_signals: {
        Row: {
          active_listing_count: number
          comic_title: string
          created_at: string
          id: string
          issue_number: string | null
          last_activity_at: string
          publisher: string | null
          scanner_count: number
          search_count: number
          signal_score: number
          variant: string | null
          watchlist_count: number
        }
        Insert: {
          active_listing_count?: number
          comic_title: string
          created_at?: string
          id?: string
          issue_number?: string | null
          last_activity_at?: string
          publisher?: string | null
          scanner_count?: number
          search_count?: number
          signal_score?: number
          variant?: string | null
          watchlist_count?: number
        }
        Update: {
          active_listing_count?: number
          comic_title?: string
          created_at?: string
          id?: string
          issue_number?: string | null
          last_activity_at?: string
          publisher?: string | null
          scanner_count?: number
          search_count?: number
          signal_score?: number
          variant?: string | null
          watchlist_count?: number
        }
        Relationships: []
      }
      comics: {
        Row: {
          cover_url: string | null
          created_at: string
          creators: string[] | null
          details: string | null
          id: string
          issue: string | null
          notes: string | null
          publisher: string | null
          series: string
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          creators?: string[] | null
          details?: string | null
          id?: string
          issue?: string | null
          notes?: string | null
          publisher?: string | null
          series: string
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          creators?: string[] | null
          details?: string | null
          id?: string
          issue?: string | null
          notes?: string | null
          publisher?: string | null
          series?: string
          updated_at?: string
          user_id?: string
          year?: string | null
        }
        Relationships: []
      }
      comicvine_issues: {
        Row: {
          artist: string | null
          cover_date: string | null
          id: number
          image_url: string | null
          issue_number: string | null
          key_notes: string | null
          last_synced_at: string | null
          name: string | null
          volume_id: number
          writer: string | null
        }
        Insert: {
          artist?: string | null
          cover_date?: string | null
          id: number
          image_url?: string | null
          issue_number?: string | null
          key_notes?: string | null
          last_synced_at?: string | null
          name?: string | null
          volume_id: number
          writer?: string | null
        }
        Update: {
          artist?: string | null
          cover_date?: string | null
          id?: number
          image_url?: string | null
          issue_number?: string | null
          key_notes?: string | null
          last_synced_at?: string | null
          name?: string | null
          volume_id?: number
          writer?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comicvine_issues_volume_id_fkey"
            columns: ["volume_id"]
            isOneToOne: false
            referencedRelation: "comicvine_volumes"
            referencedColumns: ["id"]
          },
        ]
      }
      comicvine_volumes: {
        Row: {
          deck: string | null
          id: number
          image_url: string | null
          issue_count: number | null
          last_synced_at: string | null
          name: string
          publisher: string | null
          slug: string
          start_year: number | null
        }
        Insert: {
          deck?: string | null
          id: number
          image_url?: string | null
          issue_count?: number | null
          last_synced_at?: string | null
          name: string
          publisher?: string | null
          slug: string
          start_year?: number | null
        }
        Update: {
          deck?: string | null
          id?: number
          image_url?: string | null
          issue_count?: number | null
          last_synced_at?: string | null
          name?: string
          publisher?: string | null
          slug?: string
          start_year?: number | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_time: string
          sale_id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_time?: string
          sale_id: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_time?: string
          sale_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "claim_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_applications: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          creator_type: string | null
          email: string | null
          full_name: string | null
          id: string
          is_profile_public: boolean | null
          portfolio_links: string[]
          public_slug: string | null
          requested_access: Json | null
          review_score: number | null
          role_requested: Database["public"]["Enums"]["creator_role_type"]
          sample_files: Json | null
          social_links: Json | null
          status: Database["public"]["Enums"]["creator_application_status"]
          tier: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_type?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_profile_public?: boolean | null
          portfolio_links?: string[]
          public_slug?: string | null
          requested_access?: Json | null
          review_score?: number | null
          role_requested: Database["public"]["Enums"]["creator_role_type"]
          sample_files?: Json | null
          social_links?: Json | null
          status?: Database["public"]["Enums"]["creator_application_status"]
          tier?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          creator_type?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_profile_public?: boolean | null
          portfolio_links?: string[]
          public_slug?: string | null
          requested_access?: Json | null
          review_score?: number | null
          role_requested?: Database["public"]["Enums"]["creator_role_type"]
          sample_files?: Json | null
          social_links?: Json | null
          status?: Database["public"]["Enums"]["creator_application_status"]
          tier?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      creator_public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          creator_application_id: string | null
          display_name: string
          featured_links: Json | null
          id: string
          is_visible: boolean | null
          public_slug: string
          short_bio: string | null
          social_links: Json | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          creator_application_id?: string | null
          display_name: string
          featured_links?: Json | null
          id?: string
          is_visible?: boolean | null
          public_slug: string
          short_bio?: string | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          creator_application_id?: string | null
          display_name?: string
          featured_links?: Json | null
          id?: string
          is_visible?: boolean | null
          public_slug?: string
          short_bio?: string | null
          social_links?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_public_profiles_creator_application_id_fkey"
            columns: ["creator_application_id"]
            isOneToOne: false
            referencedRelation: "creator_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_roles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          id: string
          is_artist: boolean
          is_writer: boolean
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          is_artist?: boolean
          is_writer?: boolean
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          is_artist?: boolean
          is_writer?: boolean
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
      deal_finder_results: {
        Row: {
          alert_id: string | null
          created_at: string
          discount_percent: number
          fair_market_value: number
          id: string
          image_url: string | null
          is_dismissed: boolean | null
          is_viewed: boolean | null
          listing_price: number
          source: string
          source_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          created_at?: string
          discount_percent: number
          fair_market_value: number
          id?: string
          image_url?: string | null
          is_dismissed?: boolean | null
          is_viewed?: boolean | null
          listing_price: number
          source?: string
          source_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          created_at?: string
          discount_percent?: number
          fair_market_value?: number
          id?: string
          image_url?: string | null
          is_dismissed?: boolean | null
          is_viewed?: boolean | null
          listing_price?: number
          source?: string
          source_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_finder_results_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "elite_deal_alerts"
            referencedColumns: ["id"]
          },
        ]
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
      disputes: {
        Row: {
          admin_notes: string | null
          created_at: string
          description: string
          email: string
          file_url: string | null
          id: string
          name: string
          resolved_at: string | null
          status: string
          trade_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          description: string
          email: string
          file_url?: string | null
          id?: string
          name: string
          resolved_at?: string | null
          status?: string
          trade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          description?: string
          email?: string
          file_url?: string | null
          id?: string
          name?: string
          resolved_at?: string | null
          status?: string
          trade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trades"
            referencedColumns: ["id"]
          },
        ]
      }
      elite_deal_alerts: {
        Row: {
          created_at: string
          id: string
          last_checked_at: string | null
          search_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          search_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_checked_at?: string | null
          search_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "elite_deal_alerts_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
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
      event_logs: {
        Row: {
          created_at: string | null
          event: string
          id: string
          meta: Json | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event?: string
          id?: string
          meta?: Json | null
          user_id?: string | null
        }
        Relationships: []
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
      favorite_sellers: {
        Row: {
          created_at: string | null
          id: string
          seller_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          seller_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          seller_id?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: []
      }
      gcd_index: {
        Row: {
          cover_url: string | null
          gcd_id: string | null
          id: string
          indexed_at: string | null
          issue: string | null
          publisher: string | null
          title: string | null
          variant_description: string | null
          year: number | null
        }
        Insert: {
          cover_url?: string | null
          gcd_id?: string | null
          id?: string
          indexed_at?: string | null
          issue?: string | null
          publisher?: string | null
          title?: string | null
          variant_description?: string | null
          year?: number | null
        }
        Update: {
          cover_url?: string | null
          gcd_id?: string | null
          id?: string
          indexed_at?: string | null
          issue?: string | null
          publisher?: string | null
          title?: string | null
          variant_description?: string | null
          year?: number | null
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
      inventory_items: {
        Row: {
          artist: string | null
          certification_number: string | null
          cgc_grade: string | null
          comicvine_issue_id: string | null
          comicvine_volume_id: string | null
          condition: string | null
          cover_artist: string | null
          cover_date: string | null
          created_at: string
          defect_notes: string | null
          details: string | null
          for_auction: boolean | null
          for_sale: boolean | null
          grade: string | null
          grading_company: string | null
          id: string
          images: Json | null
          in_search_of: string | null
          is_featured: boolean | null
          is_for_trade: boolean | null
          is_key: boolean | null
          is_reprint: boolean | null
          is_signed: boolean | null
          is_slab: boolean | null
          issue_id: string | null
          issue_number: string | null
          key_details: string | null
          key_issue: boolean | null
          key_type: string | null
          listed_price: number | null
          listing_status: string | null
          local_pickup: boolean | null
          offers_enabled: boolean | null
          owner_id: string | null
          pricing_currency: string | null
          pricing_high: number | null
          pricing_last_refreshed_at: string | null
          pricing_low: number | null
          pricing_mid: number | null
          pricing_source: string | null
          primary_image_rotation: number | null
          private_location: string | null
          private_notes: string | null
          publisher: string | null
          restoration_markers: Json | null
          scanner_confidence: number | null
          scanner_last_scanned_at: string | null
          series: string | null
          shipping_price: number | null
          signature_date: string | null
          signature_type: string | null
          signed_by: string | null
          sold_at: string | null
          sold_off_platform: boolean | null
          sold_off_platform_channel: string | null
          sold_off_platform_date: string | null
          storage_container_id: string | null
          storage_location: string | null
          title: string | null
          trade_notes: string | null
          updated_at: string
          user_id: string
          variant_description: string | null
          variant_details: string | null
          variant_notes: string | null
          variant_type: string | null
          volume_id: string | null
          volume_name: string | null
          writer: string | null
          year: number | null
        }
        Insert: {
          artist?: string | null
          certification_number?: string | null
          cgc_grade?: string | null
          comicvine_issue_id?: string | null
          comicvine_volume_id?: string | null
          condition?: string | null
          cover_artist?: string | null
          cover_date?: string | null
          created_at?: string
          defect_notes?: string | null
          details?: string | null
          for_auction?: boolean | null
          for_sale?: boolean | null
          grade?: string | null
          grading_company?: string | null
          id?: string
          images?: Json | null
          in_search_of?: string | null
          is_featured?: boolean | null
          is_for_trade?: boolean | null
          is_key?: boolean | null
          is_reprint?: boolean | null
          is_signed?: boolean | null
          is_slab?: boolean | null
          issue_id?: string | null
          issue_number?: string | null
          key_details?: string | null
          key_issue?: boolean | null
          key_type?: string | null
          listed_price?: number | null
          listing_status?: string | null
          local_pickup?: boolean | null
          offers_enabled?: boolean | null
          owner_id?: string | null
          pricing_currency?: string | null
          pricing_high?: number | null
          pricing_last_refreshed_at?: string | null
          pricing_low?: number | null
          pricing_mid?: number | null
          pricing_source?: string | null
          primary_image_rotation?: number | null
          private_location?: string | null
          private_notes?: string | null
          publisher?: string | null
          restoration_markers?: Json | null
          scanner_confidence?: number | null
          scanner_last_scanned_at?: string | null
          series?: string | null
          shipping_price?: number | null
          signature_date?: string | null
          signature_type?: string | null
          signed_by?: string | null
          sold_at?: string | null
          sold_off_platform?: boolean | null
          sold_off_platform_channel?: string | null
          sold_off_platform_date?: string | null
          storage_container_id?: string | null
          storage_location?: string | null
          title?: string | null
          trade_notes?: string | null
          updated_at?: string
          user_id: string
          variant_description?: string | null
          variant_details?: string | null
          variant_notes?: string | null
          variant_type?: string | null
          volume_id?: string | null
          volume_name?: string | null
          writer?: string | null
          year?: number | null
        }
        Update: {
          artist?: string | null
          certification_number?: string | null
          cgc_grade?: string | null
          comicvine_issue_id?: string | null
          comicvine_volume_id?: string | null
          condition?: string | null
          cover_artist?: string | null
          cover_date?: string | null
          created_at?: string
          defect_notes?: string | null
          details?: string | null
          for_auction?: boolean | null
          for_sale?: boolean | null
          grade?: string | null
          grading_company?: string | null
          id?: string
          images?: Json | null
          in_search_of?: string | null
          is_featured?: boolean | null
          is_for_trade?: boolean | null
          is_key?: boolean | null
          is_reprint?: boolean | null
          is_signed?: boolean | null
          is_slab?: boolean | null
          issue_id?: string | null
          issue_number?: string | null
          key_details?: string | null
          key_issue?: boolean | null
          key_type?: string | null
          listed_price?: number | null
          listing_status?: string | null
          local_pickup?: boolean | null
          offers_enabled?: boolean | null
          owner_id?: string | null
          pricing_currency?: string | null
          pricing_high?: number | null
          pricing_last_refreshed_at?: string | null
          pricing_low?: number | null
          pricing_mid?: number | null
          pricing_source?: string | null
          primary_image_rotation?: number | null
          private_location?: string | null
          private_notes?: string | null
          publisher?: string | null
          restoration_markers?: Json | null
          scanner_confidence?: number | null
          scanner_last_scanned_at?: string | null
          series?: string | null
          shipping_price?: number | null
          signature_date?: string | null
          signature_type?: string | null
          signed_by?: string | null
          sold_at?: string | null
          sold_off_platform?: boolean | null
          sold_off_platform_channel?: string | null
          sold_off_platform_date?: string | null
          storage_container_id?: string | null
          storage_location?: string | null
          title?: string | null
          trade_notes?: string | null
          updated_at?: string
          user_id?: string
          variant_description?: string | null
          variant_details?: string | null
          variant_notes?: string | null
          variant_type?: string | null
          volume_id?: string | null
          volume_name?: string | null
          writer?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_items_storage_container_id_fkey"
            columns: ["storage_container_id"]
            isOneToOne: false
            referencedRelation: "storage_containers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_trade_offers: {
        Row: {
          created_at: string
          id: string
          initiator_user_id: string
          message: string | null
          offered_item_id: string
          requested_item_id: string
          status: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          initiator_user_id: string
          message?: string | null
          offered_item_id: string
          requested_item_id: string
          status?: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          initiator_user_id?: string
          message?: string | null
          offered_item_id?: string
          requested_item_id?: string
          status?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          listing_id: string
          sort_order: number
          thumbnail_url: string | null
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          listing_id: string
          sort_order?: number
          thumbnail_url?: string | null
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          listing_id?: string
          sort_order?: number
          thumbnail_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_price_changes: {
        Row: {
          changed_at: string
          id: string
          listing_id: string
          new_price_cents: number
          old_price_cents: number
        }
        Insert: {
          changed_at?: string
          id?: string
          listing_id: string
          new_price_cents: number
          old_price_cents: number
        }
        Update: {
          changed_at?: string
          id?: string
          listing_id?: string
          new_price_cents?: number
          old_price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "listing_price_changes_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_views: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          comic_id: string | null
          condition_notes: string | null
          cover_date: string | null
          created_at: string | null
          details: string | null
          duration_days: number | null
          ends_at: string | null
          fee_cents: number | null
          id: string
          image_url: string | null
          inventory_item_id: string | null
          is_signed: boolean | null
          issue_number: string | null
          payout_cents: number | null
          price: number | null
          price_cents: number | null
          quantity: number | null
          reserve: number | null
          seller_notes: string | null
          shipping_price: number | null
          signature_date: string | null
          signature_type: string | null
          signed_by: string | null
          start_bid: number | null
          status: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
          volume_name: string | null
        }
        Insert: {
          comic_id?: string | null
          condition_notes?: string | null
          cover_date?: string | null
          created_at?: string | null
          details?: string | null
          duration_days?: number | null
          ends_at?: string | null
          fee_cents?: number | null
          id?: string
          image_url?: string | null
          inventory_item_id?: string | null
          is_signed?: boolean | null
          issue_number?: string | null
          payout_cents?: number | null
          price?: number | null
          price_cents?: number | null
          quantity?: number | null
          reserve?: number | null
          seller_notes?: string | null
          shipping_price?: number | null
          signature_date?: string | null
          signature_type?: string | null
          signed_by?: string | null
          start_bid?: number | null
          status?: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
          volume_name?: string | null
        }
        Update: {
          comic_id?: string | null
          condition_notes?: string | null
          cover_date?: string | null
          created_at?: string | null
          details?: string | null
          duration_days?: number | null
          ends_at?: string | null
          fee_cents?: number | null
          id?: string
          image_url?: string | null
          inventory_item_id?: string | null
          is_signed?: boolean | null
          issue_number?: string | null
          payout_cents?: number | null
          price?: number | null
          price_cents?: number | null
          quantity?: number | null
          reserve?: number | null
          seller_notes?: string | null
          shipping_price?: number | null
          signature_date?: string | null
          signature_type?: string | null
          signed_by?: string | null
          start_bid?: number | null
          status?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          volume_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_comic_id_fkey"
            columns: ["comic_id"]
            isOneToOne: false
            referencedRelation: "user_comics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          image_url: string | null
          sender_id: string
          text: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender_id: string
          text: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          image_url?: string | null
          sender_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_flags: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          listing_id: string
          reason: string
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          listing_id: string
          reason: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          reason?: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_flags_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      my_grails: {
        Row: {
          characters: string[] | null
          comicvine_id: number | null
          cover_image: string | null
          cover_thumb: string | null
          created_at: string | null
          description: string | null
          ebay_avg_price: number | null
          fee_tier: string | null
          full_title: string | null
          id: string
          issue_number: string | null
          publisher: string | null
          title: string
          trade_fee_each: number | null
          trade_fee_total: number | null
          updated_at: string | null
          user_id: string
          year: number | null
        }
        Insert: {
          characters?: string[] | null
          comicvine_id?: number | null
          cover_image?: string | null
          cover_thumb?: string | null
          created_at?: string | null
          description?: string | null
          ebay_avg_price?: number | null
          fee_tier?: string | null
          full_title?: string | null
          id?: string
          issue_number?: string | null
          publisher?: string | null
          title: string
          trade_fee_each?: number | null
          trade_fee_total?: number | null
          updated_at?: string | null
          user_id: string
          year?: number | null
        }
        Update: {
          characters?: string[] | null
          comicvine_id?: number | null
          cover_image?: string | null
          cover_thumb?: string | null
          created_at?: string | null
          description?: string | null
          ebay_avg_price?: number | null
          fee_tier?: string | null
          full_title?: string | null
          id?: string
          issue_number?: string | null
          publisher?: string | null
          title?: string
          trade_fee_each?: number | null
          trade_fee_total?: number | null
          updated_at?: string | null
          user_id?: string
          year?: number | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_opt_in: boolean
          id: string
          marketing_opt_in: boolean
          trade_notifications: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          email_opt_in?: boolean
          id?: string
          marketing_opt_in?: boolean
          trade_notifications?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          email_opt_in?: boolean
          id?: string
          marketing_opt_in?: boolean
          trade_notifications?: boolean
          user_id?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          link: string | null
          message: string
          sent: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          link?: string | null
          message: string
          sent?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          link?: string | null
          message?: string
          sent?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_sent: {
        Row: {
          created_at: string
          id: string
          notification_type: string
          reference_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_type: string
          reference_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_type?: string
          reference_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          metadata: Json | null
          read: boolean
          title: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          metadata?: Json | null
          read?: boolean
          title?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          message: string | null
          offer_amount: number
          seller_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          offer_amount: number
          seller_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          offer_amount?: number
          seller_id?: string
          status?: string
        }
        Relationships: []
      }
      order_risk_assessments: {
        Row: {
          created_at: string
          id: string
          order_id: string
          payout_hold: boolean
          reasons: Json | null
          risk_level: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          payout_hold?: boolean
          reasons?: Json | null
          risk_level?: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          payout_hold?: boolean
          reasons?: Json | null
          risk_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_risk_assessments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_events: {
        Row: {
          actor_role: string
          actor_user_id: string | null
          created_at: string
          event_note: string | null
          event_type: string
          id: string
          order_id: string
        }
        Insert: {
          actor_role: string
          actor_user_id?: string | null
          created_at?: string
          event_note?: string | null
          event_type: string
          id?: string
          order_id: string
        }
        Update: {
          actor_role?: string
          actor_user_id?: string | null
          created_at?: string
          event_note?: string | null
          event_type?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          amount_cents: number | null
          bundle_group_id: string | null
          buyer_id: string
          buyer_protection_fee: number | null
          carrier: string | null
          charge_id: string | null
          claim_id: string | null
          claim_sale_id: string | null
          created_at: string
          delivery_confirmed_at: string | null
          dispute_status: string | null
          id: string
          label_cost_cents: number | null
          label_url: string | null
          listing_id: string | null
          paid_at: string | null
          payment_intent_id: string | null
          payment_method: string | null
          payment_status: string
          payout_hold_until: string | null
          payout_released_at: string | null
          payout_status: string | null
          platform_fee_amount: number | null
          platform_fee_rate: number | null
          refund_amount: number | null
          seller_id: string
          shipped_at: string | null
          shipping_address: Json | null
          shipping_amount: number
          shipping_charged_cents: number | null
          shipping_margin_cents: number | null
          shipping_name: string | null
          shipping_status: string | null
          shippo_rate_id: string | null
          shippo_transaction_id: string | null
          status: string | null
          stripe_session_id: string | null
          total: number | null
          tracking_number: string | null
          transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          amount_cents?: number | null
          bundle_group_id?: string | null
          buyer_id: string
          buyer_protection_fee?: number | null
          carrier?: string | null
          charge_id?: string | null
          claim_id?: string | null
          claim_sale_id?: string | null
          created_at?: string
          delivery_confirmed_at?: string | null
          dispute_status?: string | null
          id?: string
          label_cost_cents?: number | null
          label_url?: string | null
          listing_id?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: string
          payout_hold_until?: string | null
          payout_released_at?: string | null
          payout_status?: string | null
          platform_fee_amount?: number | null
          platform_fee_rate?: number | null
          refund_amount?: number | null
          seller_id: string
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_amount?: number
          shipping_charged_cents?: number | null
          shipping_margin_cents?: number | null
          shipping_name?: string | null
          shipping_status?: string | null
          shippo_rate_id?: string | null
          shippo_transaction_id?: string | null
          status?: string | null
          stripe_session_id?: string | null
          total?: number | null
          tracking_number?: string | null
          transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_cents?: number | null
          bundle_group_id?: string | null
          buyer_id?: string
          buyer_protection_fee?: number | null
          carrier?: string | null
          charge_id?: string | null
          claim_id?: string | null
          claim_sale_id?: string | null
          created_at?: string
          delivery_confirmed_at?: string | null
          dispute_status?: string | null
          id?: string
          label_cost_cents?: number | null
          label_url?: string | null
          listing_id?: string | null
          paid_at?: string | null
          payment_intent_id?: string | null
          payment_method?: string | null
          payment_status?: string
          payout_hold_until?: string | null
          payout_released_at?: string | null
          payout_status?: string | null
          platform_fee_amount?: number | null
          platform_fee_rate?: number | null
          refund_amount?: number | null
          seller_id?: string
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_amount?: number
          shipping_charged_cents?: number | null
          shipping_margin_cents?: number | null
          shipping_name?: string | null
          shipping_status?: string | null
          shippo_rate_id?: string | null
          shippo_transaction_id?: string | null
          status?: string | null
          stripe_session_id?: string | null
          total?: number | null
          tracking_number?: string | null
          transfer_id?: string | null
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
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      original_art: {
        Row: {
          artist_name: string
          created_at: string
          date_created: string | null
          description: string | null
          dimensions: string | null
          for_sale: boolean
          id: string
          image_url: string
          medium: string | null
          owner_user_id: string | null
          price: number | null
          provenance: string | null
          tags: string[] | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          artist_name: string
          created_at?: string
          date_created?: string | null
          description?: string | null
          dimensions?: string | null
          for_sale?: boolean
          id?: string
          image_url: string
          medium?: string | null
          owner_user_id?: string | null
          price?: number | null
          provenance?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          artist_name?: string
          created_at?: string
          date_created?: string | null
          description?: string | null
          dimensions?: string | null
          for_sale?: boolean
          id?: string
          image_url?: string
          medium?: string | null
          owner_user_id?: string | null
          price?: number | null
          provenance?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      payout_requests: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seller_id: string
          status: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: []
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
          bio: string | null
          city: string | null
          completed_purchases_count: number | null
          completed_sales_count: number | null
          country: string | null
          created_at: string
          custom_fee_rate: number | null
          display_name: string | null
          favorites_total: number | null
          hide_ai_scanner_tour: boolean | null
          id: string
          is_featured_seller: boolean | null
          is_founding_seller: boolean | null
          is_verified_seller: boolean | null
          joined_at: string | null
          lat: number | null
          lng: number | null
          notify_auction_ending: boolean | null
          notify_new_posts: boolean | null
          notify_via_email: boolean | null
          onboarding_completed: boolean | null
          postal_code: string | null
          profile_image_url: string | null
          seller_tier: string | null
          shipping_address: Json | null
          state: string | null
          stripe_account_id: string | null
          stripe_account_verified: boolean | null
          stripe_onboarding_complete: boolean | null
          subscription_expires_at: string | null
          subscription_tier: string | null
          suspended_at: string | null
          terms_accepted_at: string | null
          terms_version_accepted: string | null
          trade_override_allow: boolean | null
          updated_at: string
          user_id: string
          username: string | null
          verified_artist: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          completed_purchases_count?: number | null
          completed_sales_count?: number | null
          country?: string | null
          created_at?: string
          custom_fee_rate?: number | null
          display_name?: string | null
          favorites_total?: number | null
          hide_ai_scanner_tour?: boolean | null
          id?: string
          is_featured_seller?: boolean | null
          is_founding_seller?: boolean | null
          is_verified_seller?: boolean | null
          joined_at?: string | null
          lat?: number | null
          lng?: number | null
          notify_auction_ending?: boolean | null
          notify_new_posts?: boolean | null
          notify_via_email?: boolean | null
          onboarding_completed?: boolean | null
          postal_code?: string | null
          profile_image_url?: string | null
          seller_tier?: string | null
          shipping_address?: Json | null
          state?: string | null
          stripe_account_id?: string | null
          stripe_account_verified?: boolean | null
          stripe_onboarding_complete?: boolean | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          suspended_at?: string | null
          terms_accepted_at?: string | null
          terms_version_accepted?: string | null
          trade_override_allow?: boolean | null
          updated_at?: string
          user_id: string
          username?: string | null
          verified_artist?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          completed_purchases_count?: number | null
          completed_sales_count?: number | null
          country?: string | null
          created_at?: string
          custom_fee_rate?: number | null
          display_name?: string | null
          favorites_total?: number | null
          hide_ai_scanner_tour?: boolean | null
          id?: string
          is_featured_seller?: boolean | null
          is_founding_seller?: boolean | null
          is_verified_seller?: boolean | null
          joined_at?: string | null
          lat?: number | null
          lng?: number | null
          notify_auction_ending?: boolean | null
          notify_new_posts?: boolean | null
          notify_via_email?: boolean | null
          onboarding_completed?: boolean | null
          postal_code?: string | null
          profile_image_url?: string | null
          seller_tier?: string | null
          shipping_address?: Json | null
          state?: string | null
          stripe_account_id?: string | null
          stripe_account_verified?: boolean | null
          stripe_onboarding_complete?: boolean | null
          subscription_expires_at?: string | null
          subscription_tier?: string | null
          suspended_at?: string | null
          terms_accepted_at?: string | null
          terms_version_accepted?: string | null
          trade_override_allow?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string | null
          verified_artist?: boolean | null
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string
          id: string
          name: string | null
          query: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          query: Json
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          query?: Json
          user_id?: string
        }
        Relationships: []
      }
      scan_cache: {
        Row: {
          comicvine_results: Json | null
          created_at: string
          id: string
          image_sha256: string
          ocr: string | null
          user_id: string | null
        }
        Insert: {
          comicvine_results?: Json | null
          created_at?: string
          id?: string
          image_sha256: string
          ocr?: string | null
          user_id?: string | null
        }
        Update: {
          comicvine_results?: Json | null
          created_at?: string
          id?: string
          image_sha256?: string
          ocr?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scan_corrections: {
        Row: {
          created_at: string
          id: string
          input_text: string
          normalized_input: string
          ocr_text: string | null
          original_confidence: number | null
          request_id: string | null
          selected_comicvine_id: number
          selected_cover_url: string | null
          selected_issue: string | null
          selected_publisher: string | null
          selected_title: string
          selected_volume_id: number | null
          selected_year: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          input_text: string
          normalized_input: string
          ocr_text?: string | null
          original_confidence?: number | null
          request_id?: string | null
          selected_comicvine_id: number
          selected_cover_url?: string | null
          selected_issue?: string | null
          selected_publisher?: string | null
          selected_title: string
          selected_volume_id?: number | null
          selected_year?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          input_text?: string
          normalized_input?: string
          ocr_text?: string | null
          original_confidence?: number | null
          request_id?: string | null
          selected_comicvine_id?: number
          selected_cover_url?: string | null
          selected_issue?: string | null
          selected_publisher?: string | null
          selected_title?: string
          selected_volume_id?: number | null
          selected_year?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      scan_events: {
        Row: {
          confidence: number | null
          created_at: string
          id: string
          input_source: string | null
          normalized_input: string
          raw_input: string | null
          rejected_reason: string | null
          request_id: string | null
          source: string | null
          strategy: string | null
          used_ocr: boolean | null
          user_id: string | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          id?: string
          input_source?: string | null
          normalized_input: string
          raw_input?: string | null
          rejected_reason?: string | null
          request_id?: string | null
          source?: string | null
          strategy?: string | null
          used_ocr?: boolean | null
          user_id?: string | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          id?: string
          input_source?: string | null
          normalized_input?: string
          raw_input?: string | null
          rejected_reason?: string | null
          request_id?: string | null
          source?: string | null
          strategy?: string | null
          used_ocr?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      scan_rate_limits: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          scan_count: number
          updated_at: string
          user_id: string | null
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          scan_count?: number
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          scan_count?: number
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      scan_vision_usage: {
        Row: {
          candidates_compared: number
          created_at: string
          id: string
          matched_comic_id: number | null
          matched_title: string | null
          scan_event_id: string | null
          similarity_score: number | null
          triggered_by: string
          user_id: string | null
          vision_override_applied: boolean
        }
        Insert: {
          candidates_compared?: number
          created_at?: string
          id?: string
          matched_comic_id?: number | null
          matched_title?: string | null
          scan_event_id?: string | null
          similarity_score?: number | null
          triggered_by: string
          user_id?: string | null
          vision_override_applied?: boolean
        }
        Update: {
          candidates_compared?: number
          created_at?: string
          id?: string
          matched_comic_id?: number | null
          matched_title?: string | null
          scan_event_id?: string | null
          similarity_score?: number | null
          triggered_by?: string
          user_id?: string | null
          vision_override_applied?: boolean
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
      scanner_match_logs: {
        Row: {
          candidate_count: number
          confidence: number | null
          created_at: string
          extracted_issue: string | null
          extracted_publisher: string | null
          extracted_title: string | null
          id: string
          image_resolution: string | null
          image_size_kb: number | null
          match_mode: string | null
          matched: boolean
          ocr_text: string | null
          user_id: string | null
        }
        Insert: {
          candidate_count?: number
          confidence?: number | null
          created_at?: string
          extracted_issue?: string | null
          extracted_publisher?: string | null
          extracted_title?: string | null
          id?: string
          image_resolution?: string | null
          image_size_kb?: number | null
          match_mode?: string | null
          matched?: boolean
          ocr_text?: string | null
          user_id?: string | null
        }
        Update: {
          candidate_count?: number
          confidence?: number | null
          created_at?: string
          extracted_issue?: string | null
          extracted_publisher?: string | null
          extracted_title?: string | null
          id?: string
          image_resolution?: string | null
          image_size_kb?: number | null
          match_mode?: string | null
          matched?: boolean
          ocr_text?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scanner_metrics: {
        Row: {
          action: string
          duration_ms: number | null
          flow: string
          id: string
          notes: string | null
          query: string | null
          result_count: number | null
          selected_score: number | null
          selected_source: string | null
          session_id: string | null
          ts: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          duration_ms?: number | null
          flow: string
          id?: string
          notes?: string | null
          query?: string | null
          result_count?: number | null
          selected_score?: number | null
          selected_source?: string | null
          session_id?: string | null
          ts?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          duration_ms?: number | null
          flow?: string
          id?: string
          notes?: string | null
          query?: string | null
          result_count?: number | null
          selected_score?: number | null
          selected_source?: string | null
          session_id?: string | null
          ts?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seller_balance_ledger: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          entry_type: string
          id: string
          order_id: string | null
          seller_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string | null
          entry_type: string
          id?: string
          order_id?: string | null
          seller_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          entry_type?: string
          id?: string
          order_id?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_balance_ledger_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_featured: {
        Row: {
          active: boolean
          created_at: string
          featured_from: string
          featured_to: string | null
          id: string
          rank: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          featured_from?: string
          featured_to?: string | null
          id?: string
          rank?: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          featured_from?: string
          featured_to?: string | null
          id?: string
          rank?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_policies: {
        Row: {
          created_at: string
          id: string
          return_policy: string | null
          seller_id: string
          shipping_policy: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          return_policy?: string | null
          seller_id: string
          shipping_policy?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          return_policy?: string | null
          seller_id?: string
          shipping_policy?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seller_settings: {
        Row: {
          accept_offers: boolean
          auto_decline_below_min: boolean
          created_at: string
          id: string
          min_offer_percentage: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          accept_offers?: boolean
          auto_decline_below_min?: boolean
          created_at?: string
          id?: string
          min_offer_percentage?: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          accept_offers?: boolean
          auto_decline_below_min?: boolean
          created_at?: string
          id?: string
          min_offer_percentage?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_tax_profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          business_name: string | null
          city: string | null
          country: string | null
          created_at: string
          id: string
          legal_name: string | null
          state: string | null
          tax_classification: string | null
          tax_id_encrypted: string | null
          updated_at: string
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          state?: string | null
          tax_classification?: string | null
          tax_id_encrypted?: string | null
          updated_at?: string
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          id?: string
          legal_name?: string | null
          state?: string | null
          tax_classification?: string | null
          tax_id_encrypted?: string | null
          updated_at?: string
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      seller_wallet_summary: {
        Row: {
          available_cents: number
          on_hold_cents: number
          pending_cents: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          available_cents?: number
          on_hold_cents?: number
          pending_cents?: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          available_cents?: number
          on_hold_cents?: number
          pending_cents?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shipping_tiers: {
        Row: {
          cost: number
          country: string
          created_at: string
          id: string
          max_items: number
          min_items: number
          seller_id: string
          tier_name: string
          updated_at: string
        }
        Insert: {
          cost?: number
          country?: string
          created_at?: string
          id?: string
          max_items?: number
          min_items?: number
          seller_id: string
          tier_name: string
          updated_at?: string
        }
        Update: {
          cost?: number
          country?: string
          created_at?: string
          id?: string
          max_items?: number
          min_items?: number
          seller_id?: string
          tier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      storage_containers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          qr_code_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          qr_code_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          qr_code_url?: string | null
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
      trade_fee_settings: {
        Row: {
          fees_enabled: boolean
          flat_fee: number
          id: string
          percentage_fee: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          fees_enabled?: boolean
          flat_fee?: number
          id?: string
          percentage_fee?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          fees_enabled?: boolean
          flat_fee?: number
          id?: string
          percentage_fee?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      trade_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          trade_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          trade_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          trade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_messages_trade_id_fkey"
            columns: ["trade_id"]
            isOneToOne: false
            referencedRelation: "trade_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_offer_items: {
        Row: {
          created_at: string
          id: string
          item_id: string
          side: string
          trade_offer_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          side: string
          trade_offer_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          side?: string
          trade_offer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_offer_items_trade_offer_id_fkey"
            columns: ["trade_offer_id"]
            isOneToOne: false
            referencedRelation: "inventory_trade_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_offers: {
        Row: {
          buyer_id: string
          cash_extra: number | null
          created_at: string
          id: string
          listing_id: string
          message: string | null
          seller_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          cash_extra?: number | null
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          cash_extra?: number | null
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_public"
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
      trade_requests: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          listing_id: string
          message: string | null
          offer_issue: string | null
          offer_title: string
          seller_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          listing_id: string
          message?: string | null
          offer_issue?: string | null
          offer_title: string
          seller_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          offer_issue?: string | null
          offer_title?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      trades: {
        Row: {
          agreed_value: number
          completed_at: string | null
          created_at: string
          each_user_fee: number | null
          id: string
          status: string
          total_fee: number | null
          trade_post_id: string | null
          updated_at: string
          user_a: string
          user_a_paid_at: string | null
          user_a_payment_intent: string | null
          user_b: string
          user_b_paid_at: string | null
          user_b_payment_intent: string | null
        }
        Insert: {
          agreed_value?: number
          completed_at?: string | null
          created_at?: string
          each_user_fee?: number | null
          id?: string
          status?: string
          total_fee?: number | null
          trade_post_id?: string | null
          updated_at?: string
          user_a: string
          user_a_paid_at?: string | null
          user_a_payment_intent?: string | null
          user_b: string
          user_b_paid_at?: string | null
          user_b_payment_intent?: string | null
        }
        Update: {
          agreed_value?: number
          completed_at?: string | null
          created_at?: string
          each_user_fee?: number | null
          id?: string
          status?: string
          total_fee?: number | null
          trade_post_id?: string | null
          updated_at?: string
          user_a?: string
          user_a_paid_at?: string | null
          user_a_payment_intent?: string | null
          user_b?: string
          user_b_paid_at?: string | null
          user_b_payment_intent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trades_trade_post_id_fkey"
            columns: ["trade_post_id"]
            isOneToOne: false
            referencedRelation: "trade_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_comics: {
        Row: {
          avg_sold_price: number | null
          comic_title: string
          cover_image_url: string | null
          created_at: string
          heat_score: number
          id: string
          issue_number: string | null
          last_refreshed_at: string
          price_change_30d: number | null
          price_change_7d: number | null
          publisher: string | null
          rank: number
          sell_through_rate: number | null
          sold_count: number
          year: number | null
        }
        Insert: {
          avg_sold_price?: number | null
          comic_title: string
          cover_image_url?: string | null
          created_at?: string
          heat_score?: number
          id?: string
          issue_number?: string | null
          last_refreshed_at?: string
          price_change_30d?: number | null
          price_change_7d?: number | null
          publisher?: string | null
          rank: number
          sell_through_rate?: number | null
          sold_count?: number
          year?: number | null
        }
        Update: {
          avg_sold_price?: number | null
          comic_title?: string
          cover_image_url?: string | null
          created_at?: string
          heat_score?: number
          id?: string
          issue_number?: string | null
          last_refreshed_at?: string
          price_change_30d?: number | null
          price_change_7d?: number | null
          publisher?: string | null
          rank?: number
          sell_through_rate?: number | null
          sold_count?: number
          year?: number | null
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          metadata: Json | null
          tier: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          metadata?: Json | null
          tier?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          metadata?: Json | null
          tier?: string | null
          user_id?: string | null
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
      user_blocks: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      user_collection: {
        Row: {
          comic_title: string
          cover_image_url: string | null
          created_at: string
          current_value: number | null
          date_added: string
          grade_estimate: string | null
          id: string
          inventory_item_id: string | null
          issue_number: string | null
          last_value_refresh: string | null
          notes: string | null
          publisher: string | null
          purchase_date: string | null
          purchase_price: number | null
          updated_at: string
          user_id: string
          value_30d_change: number | null
          value_7d_change: number | null
          variant: string | null
          year: number | null
        }
        Insert: {
          comic_title: string
          cover_image_url?: string | null
          created_at?: string
          current_value?: number | null
          date_added?: string
          grade_estimate?: string | null
          id?: string
          inventory_item_id?: string | null
          issue_number?: string | null
          last_value_refresh?: string | null
          notes?: string | null
          publisher?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          updated_at?: string
          user_id: string
          value_30d_change?: number | null
          value_7d_change?: number | null
          variant?: string | null
          year?: number | null
        }
        Update: {
          comic_title?: string
          cover_image_url?: string | null
          created_at?: string
          current_value?: number | null
          date_added?: string
          grade_estimate?: string | null
          id?: string
          inventory_item_id?: string | null
          issue_number?: string | null
          last_value_refresh?: string | null
          notes?: string | null
          publisher?: string | null
          purchase_date?: string | null
          purchase_price?: number | null
          updated_at?: string
          user_id?: string
          value_30d_change?: number | null
          value_7d_change?: number | null
          variant?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_collection_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_comic_images: {
        Row: {
          comic_id: string
          created_at: string
          created_by: string | null
          id: string
          is_cover: boolean
          sort_order: number
          storage_path: string
        }
        Insert: {
          comic_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_path: string
        }
        Update: {
          comic_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_cover?: boolean
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_comic_images_comic_id_fkey"
            columns: ["comic_id"]
            isOneToOne: false
            referencedRelation: "user_comics"
            referencedColumns: ["id"]
          },
        ]
      }
      user_comics: {
        Row: {
          added_at: string | null
          comicvine_id: number
          condition_notes: string | null
          cover_date: string | null
          details: string | null
          id: string
          image_url: string | null
          issue_number: string | null
          ocr_text: string | null
          photo_base64: string | null
          source: string | null
          title: string | null
          user_id: string
          volume_name: string | null
        }
        Insert: {
          added_at?: string | null
          comicvine_id: number
          condition_notes?: string | null
          cover_date?: string | null
          details?: string | null
          id?: string
          image_url?: string | null
          issue_number?: string | null
          ocr_text?: string | null
          photo_base64?: string | null
          source?: string | null
          title?: string | null
          user_id: string
          volume_name?: string | null
        }
        Update: {
          added_at?: string | null
          comicvine_id?: number
          condition_notes?: string | null
          cover_date?: string | null
          details?: string | null
          id?: string
          image_url?: string | null
          issue_number?: string | null
          ocr_text?: string | null
          photo_base64?: string | null
          source?: string | null
          title?: string | null
          user_id?: string
          volume_name?: string | null
        }
        Relationships: []
      }
      user_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          payload: Json | null
          read: boolean
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json | null
          read?: boolean
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json | null
          read?: boolean
          type?: string
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
      user_scan_history: {
        Row: {
          artist: string | null
          comicvine_cover_url: string | null
          comicvine_issue_id: number | null
          created_at: string
          id: string
          image_url: string
          issue_number: string | null
          key_notes: string | null
          publisher: string | null
          title: string
          user_id: string
          writer: string | null
          year: number | null
        }
        Insert: {
          artist?: string | null
          comicvine_cover_url?: string | null
          comicvine_issue_id?: number | null
          created_at?: string
          id?: string
          image_url: string
          issue_number?: string | null
          key_notes?: string | null
          publisher?: string | null
          title: string
          user_id: string
          writer?: string | null
          year?: number | null
        }
        Update: {
          artist?: string | null
          comicvine_cover_url?: string | null
          comicvine_issue_id?: number | null
          created_at?: string
          id?: string
          image_url?: string
          issue_number?: string | null
          key_notes?: string | null
          publisher?: string | null
          title?: string
          user_id?: string
          writer?: string | null
          year?: number | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      verified_matches: {
        Row: {
          cover_url: string | null
          created_at: string | null
          created_by: string | null
          hash: string
          id: string
          issue: string | null
          publisher: string | null
          source: string
          source_id: string | null
          title: string | null
          variant_description: string | null
          year: number | null
        }
        Insert: {
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          hash: string
          id?: string
          issue?: string | null
          publisher?: string | null
          source?: string
          source_id?: string | null
          title?: string | null
          variant_description?: string | null
          year?: number | null
        }
        Update: {
          cover_url?: string | null
          created_at?: string | null
          created_by?: string | null
          hash?: string
          id?: string
          issue?: string | null
          publisher?: string | null
          source?: string
          source_id?: string | null
          title?: string | null
          variant_description?: string | null
          year?: number | null
        }
        Relationships: []
      }
      vision_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      waitlist_handles: {
        Row: {
          created_at: string
          email: string
          handle: string
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          handle: string
          id?: string
        }
        Update: {
          created_at?: string
          email?: string
          handle?: string
          id?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlist_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "inventory_items_public"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlist_items: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlist_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_items_public: {
        Row: {
          cgc_grade: string | null
          comicvine_issue_id: string | null
          condition: string | null
          cover_date: string | null
          created_at: string | null
          grade: string | null
          id: string | null
          images: Json | null
          issue_number: string | null
          owner_id: string | null
          publisher: string | null
          series: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          cgc_grade?: string | null
          comicvine_issue_id?: string | null
          condition?: string | null
          cover_date?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string | null
          images?: Json | null
          issue_number?: string | null
          owner_id?: string | null
          publisher?: string | null
          series?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          cgc_grade?: string | null
          comicvine_issue_id?: string | null
          condition?: string | null
          cover_date?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string | null
          images?: Json | null
          issue_number?: string | null
          owner_id?: string | null
          publisher?: string | null
          series?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "inventory_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          completed_purchases_count: number | null
          completed_sales_count: number | null
          country: string | null
          display_name: string | null
          favorites_total: number | null
          is_featured_seller: boolean | null
          is_founding_seller: boolean | null
          is_verified_seller: boolean | null
          joined_at: string | null
          lat: number | null
          lng: number | null
          profile_image_url: string | null
          seller_level: string | null
          seller_tier: string | null
          state: string | null
          user_id: string | null
          username: string | null
          verified_artist: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          completed_purchases_count?: never
          completed_sales_count?: never
          country?: string | null
          display_name?: string | null
          favorites_total?: never
          is_featured_seller?: boolean | null
          is_founding_seller?: boolean | null
          is_verified_seller?: boolean | null
          joined_at?: string | null
          lat?: never
          lng?: never
          profile_image_url?: string | null
          seller_level?: never
          seller_tier?: string | null
          state?: string | null
          user_id?: string | null
          username?: string | null
          verified_artist?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          completed_purchases_count?: never
          completed_sales_count?: never
          country?: string | null
          display_name?: string | null
          favorites_total?: never
          is_featured_seller?: boolean | null
          is_founding_seller?: boolean | null
          is_verified_seller?: boolean | null
          joined_at?: string | null
          lat?: never
          lng?: never
          profile_image_url?: string | null
          seller_level?: never
          seller_tier?: string | null
          state?: string | null
          user_id?: string | null
          username?: string | null
          verified_artist?: boolean | null
        }
        Relationships: []
      }
      seller_stats: {
        Row: {
          active_listings: number | null
          gross_sales: number | null
          items_sold: number | null
          total_listed_value: number | null
          total_scans: number | null
          user_id: string | null
        }
        Relationships: []
      }
      top_scanned_titles: {
        Row: {
          listed_count: number | null
          scan_count: number | null
          series: string | null
          sold_count: number | null
          title: string | null
          user_id: string | null
        }
        Relationships: []
      }
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
      calculate_seller_favorites: {
        Args: { seller_user_id: string }
        Returns: number
      }
      get_event_listing_count: {
        Args: { target_event_id: string }
        Returns: number
      }
      get_founding_seller_count: { Args: never; Returns: number }
      get_monthly_savings: { Args: { target_user_id: string }; Returns: number }
      get_monthly_vision_usage: { Args: never; Returns: number }
      get_seller_follower_count: {
        Args: { seller_user_id: string }
        Returns: number
      }
      get_trade_eligibility: {
        Args: { target_user_id?: string }
        Returns: {
          account_age_days: number
          account_created_at: string
          completed_purchases_count: number
          completed_sales_count: number
          no_open_disputes_last_30d: boolean
          stripe_account_verified: boolean
          total_completed_tx: number
          trade_override_allow: boolean
          user_id: string
        }[]
      }
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
      increment_completed_purchases: {
        Args: { buyer_user_id: string }
        Returns: undefined
      }
      increment_completed_sales: {
        Args: { seller_user_id: string }
        Returns: undefined
      }
      is_vision_available: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_offer_status: {
        Args: { new_status_param: string; offer_id_param: string }
        Returns: Json
      }
      update_seller_favorites_total: { Args: never; Returns: undefined }
      update_trade_status: {
        Args: { new_status_param: string; trade_id_param: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "user" | "artist"
      creator_application_status: "pending" | "approved" | "rejected"
      creator_role_type: "artist" | "writer" | "both"
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
      app_role: ["admin", "user", "artist"],
      creator_application_status: ["pending", "approved", "rejected"],
      creator_role_type: ["artist", "writer", "both"],
    },
  },
} as const
