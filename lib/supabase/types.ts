export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type MenuSiteStatus = "draft" | "published" | "archived"
export type MenuSectionKey = "set_menu" | "main_menu" | "dessert_drink"
export type SupportedLocale = "ko" | "en" | "zh" | "ja"
export type BadgeType = "none" | "recommend" | "popular" | "best" | "discount" | "event" | "signature"
export type OrderStatus = "pending" | "paid" | "cancelled" | "refunded"
export type PaymentStatus = "ready" | "paid" | "failed" | "cancelled"
export type InquiryStatus = "open" | "answered" | "closed"

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          memo: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          memo?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          memo?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ai_account_credit_balances: {
        Row: {
          created_at: string
          granted_credits: number
          id: string
          purchased_credits: number
          updated_at: string
          used_credits: number
          used_purchased_credits: number
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_credits?: number
          id?: string
          purchased_credits?: number
          updated_at?: string
          used_credits?: number
          used_purchased_credits?: number
          user_id: string
        }
        Update: {
          created_at?: string
          granted_credits?: number
          id?: string
          purchased_credits?: number
          updated_at?: string
          used_credits?: number
          used_purchased_credits?: number
          user_id?: string
        }
        Relationships: []
      }
      ai_credit_balances: {
        Row: {
          created_at: string
          id: string
          included_credits: number
          menu_site_id: string
          purchased_credits: number
          updated_at: string
          used_credits: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          included_credits?: number
          menu_site_id: string
          purchased_credits?: number
          updated_at?: string
          used_credits?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          included_credits?: number
          menu_site_id?: string
          purchased_credits?: number
          updated_at?: string
          used_credits?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_balances_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: true
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_credit_transactions: {
        Row: {
          account_balance_after: number | null
          balance_after: number | null
          business_subscription_id: string | null
          created_at: string
          credit_amount: number
          credit_source: string | null
          feature_key: string | null
          id: string
          included_credits_used: number
          menu_balance_after: number | null
          menu_site_id: string | null
          metadata: Json | null
          order_id: string | null
          payment_id: string | null
          product_key: string | null
          purchased_credits_used: number
          transaction_type: string
          user_id: string
        }
        Insert: {
          account_balance_after?: number | null
          balance_after?: number | null
          business_subscription_id?: string | null
          created_at?: string
          credit_amount: number
          credit_source?: string | null
          feature_key?: string | null
          id?: string
          included_credits_used?: number
          menu_balance_after?: number | null
          menu_site_id?: string | null
          metadata?: Json | null
          order_id?: string | null
          payment_id?: string | null
          product_key?: string | null
          purchased_credits_used?: number
          transaction_type: string
          user_id: string
        }
        Update: {
          account_balance_after?: number | null
          balance_after?: number | null
          business_subscription_id?: string | null
          created_at?: string
          credit_amount?: number
          credit_source?: string | null
          feature_key?: string | null
          id?: string
          included_credits_used?: number
          menu_balance_after?: number | null
          menu_site_id?: string | null
          metadata?: Json | null
          order_id?: string | null
          payment_id?: string | null
          product_key?: string | null
          purchased_credits_used?: number
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_credit_transactions_business_subscription_id_fkey"
            columns: ["business_subscription_id"]
            isOneToOne: false
            referencedRelation: "business_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_credit_transactions_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_menu_credit_balances: {
        Row: {
          created_at: string
          id: string
          included_credits: number
          menu_site_id: string
          updated_at: string
          used_included_credits: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          included_credits?: number
          menu_site_id: string
          updated_at?: string
          used_included_credits?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          included_credits?: number
          menu_site_id?: string
          updated_at?: string
          used_included_credits?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_menu_credit_balances_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: true
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          business_name: string | null
          business_registration_number: string
          business_status: string | null
          created_at: string
          id: string
          last_verified_at: string | null
          opening_date: string | null
          representative_name: string
          tax_type: string | null
          updated_at: string
          user_id: string
          verification_source: string
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          business_name?: string | null
          business_registration_number: string
          business_status?: string | null
          created_at?: string
          id?: string
          last_verified_at?: string | null
          opening_date?: string | null
          representative_name: string
          tax_type?: string | null
          updated_at?: string
          user_id: string
          verification_source?: string
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          business_name?: string | null
          business_registration_number?: string
          business_status?: string | null
          created_at?: string
          id?: string
          last_verified_at?: string | null
          opening_date?: string | null
          representative_name?: string
          tax_type?: string | null
          updated_at?: string
          user_id?: string
          verification_source?: string
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      business_subscriptions: {
        Row: {
          amount: number
          billing_cycle: string
          billing_key_ref: string
          business_profile_id: string | null
          cancel_at_period_end: boolean
          cancel_requested_at: string | null
          canceled_at: string | null
          cancellation_reason: string | null
          created_at: string
          currency: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          last_paid_at: string | null
          menu_site_id: string | null
          next_billing_at: string | null
          plan_type: string
          portone_payment_id: string | null
          product_key: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_cycle: string
          billing_key_ref: string
          business_profile_id?: string | null
          cancel_at_period_end?: boolean
          cancel_requested_at?: string | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_paid_at?: string | null
          menu_site_id?: string | null
          next_billing_at?: string | null
          plan_type?: string
          portone_payment_id?: string | null
          product_key: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_cycle?: string
          billing_key_ref?: string
          business_profile_id?: string | null
          cancel_at_period_end?: boolean
          cancel_requested_at?: string | null
          canceled_at?: string | null
          cancellation_reason?: string | null
          created_at?: string
          currency?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          last_paid_at?: string | null
          menu_site_id?: string | null
          next_billing_at?: string | null
          plan_type?: string
          portone_payment_id?: string | null
          product_key?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_subscriptions_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_subscriptions_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      business_verifications: {
        Row: {
          business_profile_id: string | null
          created_at: string
          error_message: string | null
          id: string
          request_payload: Json | null
          request_type: string
          response_payload: Json | null
          result: string
          user_id: string
        }
        Insert: {
          business_profile_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          request_type: string
          response_payload?: Json | null
          result: string
          user_id: string
        }
        Update: {
          business_profile_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          request_payload?: Json | null
          request_type?: string
          response_payload?: Json | null
          result?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_verifications_business_profile_id_fkey"
            columns: ["business_profile_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          admin_reply: string | null
          category: string
          created_at: string
          id: string
          message: string
          replied_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          replied_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          replied_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_call_items: {
        Row: {
          archived_at: string | null
          created_at: string
          is_active: boolean
          item_key: string
          label: string
          menu_site_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          is_active?: boolean
          item_key: string
          label: string
          menu_site_id: string
          sort_order: number
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          is_active?: boolean
          item_key?: string
          label?: string
          menu_site_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_call_items_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          catalog_category_id: string | null
          created_at: string
          description: string | null
          description_visible: boolean
          id: string
          menu_page_id: string | null
          menu_site_id: string
          name: string
          section_key: string
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          catalog_category_id?: string | null
          created_at?: string
          description?: string | null
          description_visible?: boolean
          id?: string
          menu_page_id?: string | null
          menu_site_id: string
          name: string
          section_key?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          catalog_category_id?: string | null
          created_at?: string
          description?: string | null
          description_visible?: boolean
          id?: string
          menu_page_id?: string | null
          menu_site_id?: string
          name?: string
          section_key?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_menu_page_id_fkey"
            columns: ["menu_page_id"]
            isOneToOne: false
            referencedRelation: "menu_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_categories_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_category_price_columns: {
        Row: {
          category_id: string
          created_at: string
          id: string
          key: string
          label: string
          menu_site_id: string
          settings: Json
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          key: string
          label: string
          menu_site_id: string
          settings?: Json
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          key?: string
          label?: string
          menu_site_id?: string
          settings?: Json
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_category_price_columns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_category_price_columns_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_category_translations: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          locale: string
          name: string | null
          source_text_hash: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          locale: string
          name?: string | null
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          locale?: string
          name?: string | null
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_chef_translations: {
        Row: {
          chef_description: string | null
          chef_id: string
          chef_name: string | null
          chef_role: string | null
          created_at: string
          id: string
          locale: string
          source_text_hash: string | null
          status: string
          updated_at: string
        }
        Insert: {
          chef_description?: string | null
          chef_id: string
          chef_name?: string | null
          chef_role?: string | null
          created_at?: string
          id?: string
          locale: string
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          chef_description?: string | null
          chef_id?: string
          chef_name?: string | null
          chef_role?: string | null
          created_at?: string
          id?: string
          locale?: string
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_chef_translations_chef_id_fkey"
            columns: ["chef_id"]
            isOneToOne: false
            referencedRelation: "menu_chefs"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_chefs: {
        Row: {
          chef_description: string | null
          chef_image_path: string | null
          chef_image_url: string | null
          chef_name: string
          chef_role: string | null
          created_at: string
          id: string
          menu_site_id: string
          sort_order: number
          updated_at: string
          visible: boolean
        }
        Insert: {
          chef_description?: string | null
          chef_image_path?: string | null
          chef_image_url?: string | null
          chef_name: string
          chef_role?: string | null
          created_at?: string
          id?: string
          menu_site_id: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Update: {
          chef_description?: string | null
          chef_image_path?: string | null
          chef_image_url?: string | null
          chef_name?: string
          chef_role?: string | null
          created_at?: string
          id?: string
          menu_site_id?: string
          sort_order?: number
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_chefs_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_customer_calls: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          call_number: number
          call_type: string
          cancelled_at: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          menu_site_id: string
          menu_table_id: string
          request_key: string
          request_label: string
          status: string
          table_visit_session_id: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          call_number?: never
          call_type?: string
          cancelled_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          menu_site_id: string
          menu_table_id: string
          request_key?: string
          request_label?: string
          status?: string
          table_visit_session_id: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          call_number?: never
          call_type?: string
          cancelled_at?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          menu_site_id?: string
          menu_table_id?: string
          request_key?: string
          request_label?: string
          status?: string
          table_visit_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_customer_calls_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_customer_calls_session_fk"
            columns: ["menu_site_id", "menu_table_id", "table_visit_session_id"]
            isOneToOne: false
            referencedRelation: "table_visit_sessions"
            referencedColumns: ["menu_site_id", "menu_table_id", "id"]
          },
          {
            foreignKeyName: "menu_customer_calls_table_fk"
            columns: ["menu_site_id", "menu_table_id"]
            isOneToOne: false
            referencedRelation: "menu_tables"
            referencedColumns: ["menu_site_id", "id"]
          },
        ]
      }
      menu_customer_order_item_options: {
        Row: {
          created_at: string
          display_order: number
          group_name_snapshot: string
          id: string
          menu_site_id: string
          option_group_id: string | null
          option_value_id: string | null
          order_item_id: string
          price_delta_snapshot: number
          value_name_snapshot: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          group_name_snapshot: string
          id?: string
          menu_site_id: string
          option_group_id?: string | null
          option_value_id?: string | null
          order_item_id: string
          price_delta_snapshot?: number
          value_name_snapshot: string
        }
        Update: {
          created_at?: string
          display_order?: number
          group_name_snapshot?: string
          id?: string
          menu_site_id?: string
          option_group_id?: string | null
          option_value_id?: string | null
          order_item_id?: string
          price_delta_snapshot?: number
          value_name_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_customer_order_item_options_item_fk"
            columns: ["menu_site_id", "order_item_id"]
            isOneToOne: false
            referencedRelation: "menu_customer_order_items"
            referencedColumns: ["menu_site_id", "id"]
          },
          {
            foreignKeyName: "menu_customer_order_item_options_option_group_id_fkey"
            columns: ["option_group_id"]
            isOneToOne: false
            referencedRelation: "menu_order_option_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_customer_order_item_options_option_value_id_fkey"
            columns: ["option_value_id"]
            isOneToOne: false
            referencedRelation: "menu_order_option_values"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_customer_order_items: {
        Row: {
          base_price_snapshot: number
          created_at: string
          display_order: number
          id: string
          item_name_snapshot: string
          line_total_snapshot: number
          menu_item_id: string | null
          menu_site_id: string
          option_price_snapshot: number
          order_id: string
          quantity: number
          unit_price_snapshot: number
        }
        Insert: {
          base_price_snapshot: number
          created_at?: string
          display_order?: number
          id?: string
          item_name_snapshot: string
          line_total_snapshot: number
          menu_item_id?: string | null
          menu_site_id: string
          option_price_snapshot?: number
          order_id: string
          quantity: number
          unit_price_snapshot: number
        }
        Update: {
          base_price_snapshot?: number
          created_at?: string
          display_order?: number
          id?: string
          item_name_snapshot?: string
          line_total_snapshot?: number
          menu_item_id?: string | null
          menu_site_id?: string
          option_price_snapshot?: number
          order_id?: string
          quantity?: number
          unit_price_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_customer_order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_customer_order_items_order_fk"
            columns: ["menu_site_id", "order_id"]
            isOneToOne: false
            referencedRelation: "menu_customer_orders"
            referencedColumns: ["menu_site_id", "id"]
          },
        ]
      }
      menu_customer_orders: {
        Row: {
          accepted_at: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          client_request_id: string
          cooking_at: string | null
          created_at: string
          currency: string
          id: string
          menu_site_id: string
          menu_table_id: string
          order_number: number
          payment_completed_at: string | null
          payment_completed_by: string | null
          payment_method: string | null
          payment_status: string
          ready_at: string | null
          request_text: string | null
          served_at: string | null
          status: string
          status_updated_by: string | null
          subtotal_amount: number
          table_visit_session_id: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_request_id: string
          cooking_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          menu_site_id: string
          menu_table_id: string
          order_number?: never
          payment_completed_at?: string | null
          payment_completed_by?: string | null
          payment_method?: string | null
          payment_status?: string
          ready_at?: string | null
          request_text?: string | null
          served_at?: string | null
          status?: string
          status_updated_by?: string | null
          subtotal_amount: number
          table_visit_session_id: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          client_request_id?: string
          cooking_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          menu_site_id?: string
          menu_table_id?: string
          order_number?: never
          payment_completed_at?: string | null
          payment_completed_by?: string | null
          payment_method?: string | null
          payment_status?: string
          ready_at?: string | null
          request_text?: string | null
          served_at?: string | null
          status?: string
          status_updated_by?: string | null
          subtotal_amount?: number
          table_visit_session_id?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_customer_orders_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_customer_orders_session_fk"
            columns: ["menu_site_id", "menu_table_id", "table_visit_session_id"]
            isOneToOne: false
            referencedRelation: "table_visit_sessions"
            referencedColumns: ["menu_site_id", "menu_table_id", "id"]
          },
          {
            foreignKeyName: "menu_customer_orders_table_fk"
            columns: ["menu_site_id", "menu_table_id"]
            isOneToOne: false
            referencedRelation: "menu_tables"
            referencedColumns: ["menu_site_id", "id"]
          },
        ]
      }
      menu_event_translations: {
        Row: {
          created_at: string
          event_benefit: string | null
          event_description: string | null
          event_detail: string | null
          event_id: string
          event_period: string | null
          event_regular_price_label: string | null
          event_sale_price_label: string | null
          event_subtitle: string | null
          event_title: string | null
          id: string
          locale: string
          source_text_hash: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_benefit?: string | null
          event_description?: string | null
          event_detail?: string | null
          event_id: string
          event_period?: string | null
          event_regular_price_label?: string | null
          event_sale_price_label?: string | null
          event_subtitle?: string | null
          event_title?: string | null
          id?: string
          locale: string
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_benefit?: string | null
          event_description?: string | null
          event_detail?: string | null
          event_id?: string
          event_period?: string | null
          event_regular_price_label?: string | null
          event_sale_price_label?: string | null
          event_subtitle?: string | null
          event_title?: string | null
          id?: string
          locale?: string
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_event_translations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "menu_events"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_events: {
        Row: {
          created_at: string
          end_date: string | null
          event_benefit: string | null
          event_description: string | null
          event_detail: string | null
          event_image_path: string | null
          event_image_url: string | null
          event_period: string | null
          event_price_visible: boolean
          event_regular_price_label: string | null
          event_sale_price_label: string | null
          event_subtitle: string | null
          event_title: string | null
          id: string
          link_url: string | null
          menu_site_id: string
          sort_order: number
          start_date: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          event_benefit?: string | null
          event_description?: string | null
          event_detail?: string | null
          event_image_path?: string | null
          event_image_url?: string | null
          event_period?: string | null
          event_price_visible?: boolean
          event_regular_price_label?: string | null
          event_sale_price_label?: string | null
          event_subtitle?: string | null
          event_title?: string | null
          id?: string
          link_url?: string | null
          menu_site_id: string
          sort_order?: number
          start_date?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          end_date?: string | null
          event_benefit?: string | null
          event_description?: string | null
          event_detail?: string | null
          event_image_path?: string | null
          event_image_url?: string | null
          event_period?: string | null
          event_price_visible?: boolean
          event_regular_price_label?: string | null
          event_sale_price_label?: string | null
          event_subtitle?: string | null
          event_title?: string | null
          id?: string
          link_url?: string | null
          menu_site_id?: string
          sort_order?: number
          start_date?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_events_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_price_column_values: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          price: number | null
          price_column_id: string
          price_label: string | null
          settings: Json
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          price?: number | null
          price_column_id: string
          price_label?: string | null
          settings?: Json
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          price?: number | null
          price_column_id?: string
          price_label?: string | null
          settings?: Json
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_price_column_values_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_price_column_values_price_column_id_fkey"
            columns: ["price_column_id"]
            isOneToOne: false
            referencedRelation: "menu_category_price_columns"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_price_option_translations: {
        Row: {
          created_at: string
          id: string
          label: string | null
          locale: string
          price_label: string | null
          price_option_id: string
          source_text_hash: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          locale: string
          price_label?: string | null
          price_option_id: string
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          locale?: string
          price_label?: string | null
          price_option_id?: string
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_price_option_translations_price_option_id_fkey"
            columns: ["price_option_id"]
            isOneToOne: false
            referencedRelation: "menu_item_price_options"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_price_options: {
        Row: {
          created_at: string
          id: string
          label: string
          menu_item_id: string
          menu_site_id: string
          price: number | null
          price_label: string | null
          sort_order: number
          updated_at: string | null
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          menu_item_id: string
          menu_site_id: string
          price?: number | null
          price_label?: string | null
          sort_order?: number
          updated_at?: string | null
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          menu_item_id?: string
          menu_site_id?: string
          price?: number | null
          price_label?: string | null
          sort_order?: number
          updated_at?: string | null
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_price_options_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_price_options_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_trait_translations: {
        Row: {
          created_at: string
          id: string
          label: string | null
          locale: string
          source_text_hash: string | null
          status: string
          trait_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          locale: string
          source_text_hash?: string | null
          status?: string
          trait_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          locale?: string
          source_text_hash?: string | null
          status?: string
          trait_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_trait_translations_trait_id_fkey"
            columns: ["trait_id"]
            isOneToOne: false
            referencedRelation: "menu_item_traits"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_traits: {
        Row: {
          created_at: string
          id: string
          label: string
          max_value: number
          menu_item_id: string
          menu_site_id: string
          sort_order: number
          updated_at: string
          value: number
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          max_value?: number
          menu_item_id: string
          menu_site_id: string
          sort_order?: number
          updated_at?: string
          value?: number
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          max_value?: number
          menu_item_id?: string
          menu_site_id?: string
          sort_order?: number
          updated_at?: string
          value?: number
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_traits_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_item_traits_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_item_translations: {
        Row: {
          badge_label: string | null
          created_at: string
          description: string | null
          id: string
          item_id: string
          locale: string
          name: string | null
          origin_info: string | null
          portion_label: string | null
          price_label: string | null
          price_note: string | null
          set_name: string | null
          source_text_hash: string | null
          status: string
          updated_at: string
        }
        Insert: {
          badge_label?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_id: string
          locale: string
          name?: string | null
          origin_info?: string | null
          portion_label?: string | null
          price_label?: string | null
          price_note?: string | null
          set_name?: string | null
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          badge_label?: string | null
          created_at?: string
          description?: string | null
          id?: string
          item_id?: string
          locale?: string
          name?: string | null
          origin_info?: string | null
          portion_label?: string | null
          price_label?: string | null
          price_note?: string | null
          set_name?: string | null
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_item_translations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_items: {
        Row: {
          allergens: Json
          badge: string | null
          badge_label: string | null
          badge_type: string | null
          catalog_item_id: string | null
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          image_url: string | null
          is_best: boolean
          is_sold_out: boolean
          menu_site_id: string
          name: string
          options: Json
          orderable: boolean
          origin_info: string | null
          portion_label: string | null
          portion_visible: boolean
          price: number
          price_label: string | null
          price_note: string | null
          price_visible: boolean
          recommended: boolean
          set_name: string | null
          sort_order: number
          traits_visible: boolean
          translations: Json
          updated_at: string
          visible: boolean
        }
        Insert: {
          allergens?: Json
          badge?: string | null
          badge_label?: string | null
          badge_type?: string | null
          catalog_item_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_best?: boolean
          is_sold_out?: boolean
          menu_site_id: string
          name: string
          options?: Json
          orderable?: boolean
          origin_info?: string | null
          portion_label?: string | null
          portion_visible?: boolean
          price?: number
          price_label?: string | null
          price_note?: string | null
          price_visible?: boolean
          recommended?: boolean
          set_name?: string | null
          sort_order?: number
          traits_visible?: boolean
          translations?: Json
          updated_at?: string
          visible?: boolean
        }
        Update: {
          allergens?: Json
          badge?: string | null
          badge_label?: string | null
          badge_type?: string | null
          catalog_item_id?: string | null
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          is_best?: boolean
          is_sold_out?: boolean
          menu_site_id?: string
          name?: string
          options?: Json
          orderable?: boolean
          origin_info?: string | null
          portion_label?: string | null
          portion_visible?: boolean
          price?: number
          price_label?: string | null
          price_note?: string | null
          price_visible?: boolean
          recommended?: boolean
          set_name?: string | null
          sort_order?: number
          traits_visible?: boolean
          translations?: Json
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_items_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_order_option_groups: {
        Row: {
          archived_at: string | null
          created_at: string
          display_order: number
          id: string
          is_required: boolean
          max_selections: number
          menu_item_id: string
          menu_site_id: string
          min_selections: number
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          max_selections?: number
          menu_item_id: string
          menu_site_id: string
          min_selections?: number
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_required?: boolean
          max_selections?: number
          menu_item_id?: string
          menu_site_id?: string
          min_selections?: number
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_order_option_groups_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_order_option_groups_site_item_fk"
            columns: ["menu_site_id", "menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["menu_site_id", "id"]
          },
        ]
      }
      menu_order_option_values: {
        Row: {
          archived_at: string | null
          created_at: string
          display_order: number
          id: string
          menu_site_id: string
          name: string
          option_group_id: string
          price_delta: number
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          menu_site_id: string
          name: string
          option_group_id: string
          price_delta?: number
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          display_order?: number
          id?: string
          menu_site_id?: string
          name?: string
          option_group_id?: string
          price_delta?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_order_option_values_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_order_option_values_site_group_fk"
            columns: ["menu_site_id", "option_group_id"]
            isOneToOne: false
            referencedRelation: "menu_order_option_groups"
            referencedColumns: ["menu_site_id", "id"]
          },
        ]
      }
      menu_page_translations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          locale: string
          menu_page_id: string
          source_text_hash: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          locale: string
          menu_page_id: string
          source_text_hash?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          locale?: string
          menu_page_id?: string
          source_text_hash?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_page_translations_menu_page_id_fkey"
            columns: ["menu_page_id"]
            isOneToOne: false
            referencedRelation: "menu_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_pages: {
        Row: {
          created_at: string
          description: string | null
          description_visible: boolean
          display_settings: Json
          id: string
          legacy_section_key: string | null
          menu_site_id: string
          sort_order: number
          title: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          description_visible?: boolean
          display_settings?: Json
          id?: string
          legacy_section_key?: string | null
          menu_site_id: string
          sort_order?: number
          title: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          description_visible?: boolean
          display_settings?: Json
          id?: string
          legacy_section_key?: string | null
          menu_site_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_pages_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_promotion_items: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          price_column_id: string | null
          promotion_id: string
          sale_price: number | null
          sale_price_label: string | null
          settings: Json
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          price_column_id?: string | null
          promotion_id: string
          sale_price?: number | null
          sale_price_label?: string | null
          settings?: Json
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          price_column_id?: string | null
          promotion_id?: string
          sale_price?: number | null
          sale_price_label?: string | null
          settings?: Json
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_promotion_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_promotion_items_price_column_id_fkey"
            columns: ["price_column_id"]
            isOneToOne: false
            referencedRelation: "menu_category_price_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_promotion_items_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "menu_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_promotion_translations: {
        Row: {
          badge_text: string | null
          created_at: string
          id: string
          locale: string
          menu_promotion_id: string
          source_text_hash: string | null
          status: string
          time_display_text: string | null
          updated_at: string
        }
        Insert: {
          badge_text?: string | null
          created_at?: string
          id?: string
          locale: string
          menu_promotion_id: string
          source_text_hash?: string | null
          status?: string
          time_display_text?: string | null
          updated_at?: string
        }
        Update: {
          badge_text?: string | null
          created_at?: string
          id?: string
          locale?: string
          menu_promotion_id?: string
          source_text_hash?: string | null
          status?: string
          time_display_text?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_promotion_translations_menu_promotion_id_fkey"
            columns: ["menu_promotion_id"]
            isOneToOne: false
            referencedRelation: "menu_promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_promotions: {
        Row: {
          active: boolean
          created_at: string
          daily_end_time: string | null
          daily_start_time: string | null
          ends_at: string
          id: string
          menu_site_id: string
          name: string
          schedule_type: string
          settings: Json
          starts_at: string
          timezone: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          ends_at: string
          id?: string
          menu_site_id: string
          name: string
          schedule_type?: string
          settings?: Json
          starts_at: string
          timezone?: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_end_time?: string | null
          daily_start_time?: string | null
          ends_at?: string
          id?: string
          menu_site_id?: string
          name?: string
          schedule_type?: string
          settings?: Json
          starts_at?: string
          timezone?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_promotions_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_site_audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          menu_site_id: string
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          menu_site_id: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          menu_site_id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_site_audit_logs_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_site_content_links: {
        Row: {
          created_at: string
          id: string
          mode: string
          owner_user_id: string
          shared_fields_version: number
          source_menu_site_id: string
          status: string
          target_menu_site_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mode: string
          owner_user_id: string
          shared_fields_version?: number
          source_menu_site_id: string
          status: string
          target_menu_site_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string
          owner_user_id?: string
          shared_fields_version?: number
          source_menu_site_id?: string
          status?: string
          target_menu_site_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_site_content_links_source_menu_site_id_fkey"
            columns: ["source_menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_site_content_links_target_menu_site_id_fkey"
            columns: ["target_menu_site_id"]
            isOneToOne: true
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_site_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email_normalized: string
          expires_at: string
          id: string
          invite_batch_id: string
          invited_by: string | null
          menu_site_id: string
          revoked_at: string | null
          role: string
          status: string
          token_hash: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email_normalized: string
          expires_at: string
          id?: string
          invite_batch_id: string
          invited_by?: string | null
          menu_site_id: string
          revoked_at?: string | null
          role: string
          status?: string
          token_hash: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email_normalized?: string
          expires_at?: string
          id?: string
          invite_batch_id?: string
          invited_by?: string | null
          menu_site_id?: string
          revoked_at?: string | null
          role?: string
          status?: string
          token_hash?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_site_invitations_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_site_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          id: string
          invited_by: string | null
          menu_site_id: string
          revoked_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          menu_site_id: string
          revoked_at?: string | null
          role: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          menu_site_id?: string
          revoked_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_site_members_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_site_translations: {
        Row: {
          about_description: string | null
          brand_description: string | null
          created_at: string
          description: string | null
          id: string
          intro_description: string | null
          intro_title: string | null
          locale: string
          menu_cover_description: string | null
          menu_cover_label: string | null
          menu_cover_title: string | null
          menu_site_id: string
          opening_hours: string | null
          restaurant_address: string | null
          restaurant_category: string | null
          restaurant_name: string | null
          restaurant_phone: string | null
          source_text_hash: string | null
          status: string
          updated_at: string
        }
        Insert: {
          about_description?: string | null
          brand_description?: string | null
          created_at?: string
          description?: string | null
          id?: string
          intro_description?: string | null
          intro_title?: string | null
          locale: string
          menu_cover_description?: string | null
          menu_cover_label?: string | null
          menu_cover_title?: string | null
          menu_site_id: string
          opening_hours?: string | null
          restaurant_address?: string | null
          restaurant_category?: string | null
          restaurant_name?: string | null
          restaurant_phone?: string | null
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          about_description?: string | null
          brand_description?: string | null
          created_at?: string
          description?: string | null
          id?: string
          intro_description?: string | null
          intro_title?: string | null
          locale?: string
          menu_cover_description?: string | null
          menu_cover_label?: string | null
          menu_cover_title?: string | null
          menu_site_id?: string
          opening_hours?: string | null
          restaurant_address?: string | null
          restaurant_category?: string | null
          restaurant_name?: string | null
          restaurant_phone?: string | null
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_site_translations_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_sites: {
        Row: {
          about_description: string | null
          brand_color: string | null
          brand_description: string | null
          business_address: string | null
          business_name: string | null
          business_phone: string | null
          cover_image_path: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          design_settings: Json
          id: string
          instagram_url: string | null
          intro_description: string | null
          intro_image_path: string | null
          intro_image_url: string | null
          intro_title: string | null
          logo_path: string | null
          logo_url: string | null
          map_url: string | null
          menu_cover_description: string | null
          menu_cover_label: string | null
          menu_cover_title: string | null
          name: string
          notes: string | null
          opening_hours: string | null
          page_settings: Json
          published_at: string | null
          restaurant_address: string | null
          restaurant_category: string | null
          restaurant_name: string | null
          restaurant_phone: string | null
          restaurant_type: string | null
          settings: Json
          slug: string
          status: string
          template_category: string | null
          template_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          about_description?: string | null
          brand_color?: string | null
          brand_description?: string | null
          business_address?: string | null
          business_name?: string | null
          business_phone?: string | null
          cover_image_path?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          design_settings?: Json
          id?: string
          instagram_url?: string | null
          intro_description?: string | null
          intro_image_path?: string | null
          intro_image_url?: string | null
          intro_title?: string | null
          logo_path?: string | null
          logo_url?: string | null
          map_url?: string | null
          menu_cover_description?: string | null
          menu_cover_label?: string | null
          menu_cover_title?: string | null
          name: string
          notes?: string | null
          opening_hours?: string | null
          page_settings?: Json
          published_at?: string | null
          restaurant_address?: string | null
          restaurant_category?: string | null
          restaurant_name?: string | null
          restaurant_phone?: string | null
          restaurant_type?: string | null
          settings?: Json
          slug: string
          status?: string
          template_category?: string | null
          template_key?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          about_description?: string | null
          brand_color?: string | null
          brand_description?: string | null
          business_address?: string | null
          business_name?: string | null
          business_phone?: string | null
          cover_image_path?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          design_settings?: Json
          id?: string
          instagram_url?: string | null
          intro_description?: string | null
          intro_image_path?: string | null
          intro_image_url?: string | null
          intro_title?: string | null
          logo_path?: string | null
          logo_url?: string | null
          map_url?: string | null
          menu_cover_description?: string | null
          menu_cover_label?: string | null
          menu_cover_title?: string | null
          name?: string
          notes?: string | null
          opening_hours?: string | null
          page_settings?: Json
          published_at?: string | null
          restaurant_address?: string | null
          restaurant_category?: string | null
          restaurant_name?: string | null
          restaurant_phone?: string | null
          restaurant_type?: string | null
          settings?: Json
          slug?: string
          status?: string
          template_category?: string | null
          template_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      menu_social_link_translations: {
        Row: {
          created_at: string
          id: string
          label: string | null
          locale: string
          social_link_id: string
          source_text_hash: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          locale: string
          social_link_id: string
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          locale?: string
          social_link_id?: string
          source_text_hash?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_social_link_translations_social_link_id_fkey"
            columns: ["social_link_id"]
            isOneToOne: false
            referencedRelation: "menu_social_links"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_social_links: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          label: string | null
          menu_site_id: string
          sort_order: number
          type: string
          updated_at: string | null
          url: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          label?: string | null
          menu_site_id: string
          sort_order?: number
          type: string
          updated_at?: string | null
          url: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          label?: string | null
          menu_site_id?: string
          sort_order?: number
          type?: string
          updated_at?: string | null
          url?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_social_links_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_tables: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          label: string
          menu_site_id: string
          status: string
          token_hash: string
          token_rotated_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          label: string
          menu_site_id: string
          status?: string
          token_hash: string
          token_rotated_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          label?: string
          menu_site_id?: string
          status?: string
          token_hash?: string
          token_rotated_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_tables_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_translation_jobs: {
        Row: {
          applied_at: string | null
          completed_at: string | null
          created_at: string
          discarded_at: string | null
          draft_payload: Json | null
          error_message: string | null
          id: string
          locale_results: Json | null
          menu_site_id: string
          requested_by: string
          result_version: number
          started_at: string | null
          status: string
          target_locales: string[]
          updated_at: string
        }
        Insert: {
          applied_at?: string | null
          completed_at?: string | null
          created_at?: string
          discarded_at?: string | null
          draft_payload?: Json | null
          error_message?: string | null
          id?: string
          locale_results?: Json | null
          menu_site_id: string
          requested_by: string
          result_version?: number
          started_at?: string | null
          status?: string
          target_locales?: string[]
          updated_at?: string
        }
        Update: {
          applied_at?: string | null
          completed_at?: string | null
          created_at?: string
          discarded_at?: string | null
          draft_payload?: Json | null
          error_message?: string | null
          id?: string
          locale_results?: Json | null
          menu_site_id?: string
          requested_by?: string
          result_version?: number
          started_at?: string | null
          status?: string
          target_locales?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_translation_jobs_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_widget_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          image_url: string | null
          link_url: string | null
          price: number | null
          price_label: string | null
          settings: Json
          sort_order: number
          title: string
          updated_at: string | null
          value: string | null
          visible: boolean
          widget_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          link_url?: string | null
          price?: number | null
          price_label?: string | null
          settings?: Json
          sort_order?: number
          title: string
          updated_at?: string | null
          value?: string | null
          visible?: boolean
          widget_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          link_url?: string | null
          price?: number | null
          price_label?: string | null
          settings?: Json
          sort_order?: number
          title?: string
          updated_at?: string | null
          value?: string | null
          visible?: boolean
          widget_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_widget_items_widget_id_fkey"
            columns: ["widget_id"]
            isOneToOne: false
            referencedRelation: "menu_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_widget_translations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          locale: string
          menu_widget_id: string
          source_text_hash: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          locale: string
          menu_widget_id: string
          source_text_hash?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          locale?: string
          menu_widget_id?: string
          source_text_hash?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_widget_translations_menu_widget_id_fkey"
            columns: ["menu_widget_id"]
            isOneToOne: false
            referencedRelation: "menu_widgets"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_widgets: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_path: string | null
          image_url: string | null
          link_url: string | null
          menu_page_id: string
          menu_site_id: string
          settings: Json
          sort_order: number
          title: string | null
          updated_at: string | null
          visible: boolean
          widget_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          link_url?: string | null
          menu_page_id: string
          menu_site_id: string
          settings?: Json
          sort_order?: number
          title?: string | null
          updated_at?: string | null
          visible?: boolean
          widget_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          link_url?: string | null
          menu_page_id?: string
          menu_site_id?: string
          settings?: Json
          sort_order?: number
          title?: string | null
          updated_at?: string | null
          visible?: boolean
          widget_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_widgets_menu_page_id_fkey"
            columns: ["menu_page_id"]
            isOneToOne: false
            referencedRelation: "menu_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_widgets_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          channel: string
          created_at: string
          event_type: string
          id: string
          menu_site_id: string | null
          message: string
          metadata: Json
          read_at: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string
          subscription_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          event_type: string
          id?: string
          menu_site_id?: string | null
          message: string
          metadata?: Json
          read_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subscription_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          menu_site_id?: string | null
          message?: string
          metadata?: Json
          read_at?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          subscription_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "business_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          business_name: string | null
          business_number: string | null
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string
          customer_name: string | null
          id: string
          menu_site_id: string | null
          order_name: string | null
          payment_id: string | null
          product_key: string | null
          raw_payload: Json | null
          status: string
          template_key: string | null
          total_amount: number
          user_id: string
        }
        Insert: {
          business_name?: string | null
          business_number?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          menu_site_id?: string | null
          order_name?: string | null
          payment_id?: string | null
          product_key?: string | null
          raw_payload?: Json | null
          status?: string
          template_key?: string | null
          total_amount?: number
          user_id: string
        }
        Update: {
          business_name?: string | null
          business_number?: string | null
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          menu_site_id?: string | null
          order_name?: string | null
          payment_id?: string | null
          product_key?: string | null
          raw_payload?: Json | null
          status?: string
          template_key?: string | null
          total_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          payment_id: string | null
          portone_payment_id: string | null
          product_key: string | null
          raw_payload: Json | null
          status: string
          template_key: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          payment_id?: string | null
          portone_payment_id?: string | null
          product_key?: string | null
          raw_payload?: Json | null
          status?: string
          template_key?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          payment_id?: string | null
          portone_payment_id?: string | null
          product_key?: string | null
          raw_payload?: Json | null
          status?: string
          template_key?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          admin_note: string | null
          annual_basis_used_amount: number
          annual_price: number
          billing_cycle: string
          business_subscription_id: string | null
          calculation_version: string
          canceled_at: string | null
          confirmed_at: string | null
          created_at: string
          currency: string
          customer_reason: string | null
          discount_clawback_amount: number
          estimated_refund_amount: number
          failure_reason: string | null
          final_refund_amount: number | null
          id: string
          idempotency_key: string | null
          menu_site_id: string | null
          metadata: Json | null
          monthly_basis_used_amount: number
          monthly_list_price: number
          order_id: string | null
          paid_amount: number
          payment_id: string | null
          portone_cancel_id: string | null
          portone_payment_id: string | null
          portone_response: Json | null
          processed_at: string | null
          product_key: string
          quoted_at: string | null
          refund_basis_date: string
          request_type: string
          requested_at: string | null
          service_entitlement_id: string | null
          service_type: string | null
          status: string
          total_days: number
          updated_at: string
          used_days: number
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          annual_basis_used_amount: number
          annual_price: number
          billing_cycle: string
          business_subscription_id?: string | null
          calculation_version?: string
          canceled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_reason?: string | null
          discount_clawback_amount: number
          estimated_refund_amount: number
          failure_reason?: string | null
          final_refund_amount?: number | null
          id?: string
          idempotency_key?: string | null
          menu_site_id?: string | null
          metadata?: Json | null
          monthly_basis_used_amount: number
          monthly_list_price: number
          order_id?: string | null
          paid_amount: number
          payment_id?: string | null
          portone_cancel_id?: string | null
          portone_payment_id?: string | null
          portone_response?: Json | null
          processed_at?: string | null
          product_key: string
          quoted_at?: string | null
          refund_basis_date: string
          request_type?: string
          requested_at?: string | null
          service_entitlement_id?: string | null
          service_type?: string | null
          status?: string
          total_days: number
          updated_at?: string
          used_days: number
          user_id: string
        }
        Update: {
          admin_note?: string | null
          annual_basis_used_amount?: number
          annual_price?: number
          billing_cycle?: string
          business_subscription_id?: string | null
          calculation_version?: string
          canceled_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          currency?: string
          customer_reason?: string | null
          discount_clawback_amount?: number
          estimated_refund_amount?: number
          failure_reason?: string | null
          final_refund_amount?: number | null
          id?: string
          idempotency_key?: string | null
          menu_site_id?: string | null
          metadata?: Json | null
          monthly_basis_used_amount?: number
          monthly_list_price?: number
          order_id?: string | null
          paid_amount?: number
          payment_id?: string | null
          portone_cancel_id?: string | null
          portone_payment_id?: string | null
          portone_response?: Json | null
          processed_at?: string | null
          product_key?: string
          quoted_at?: string | null
          refund_basis_date?: string
          request_type?: string
          requested_at?: string | null
          service_entitlement_id?: string | null
          service_type?: string | null
          status?: string
          total_days?: number
          updated_at?: string
          used_days?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_business_subscription_id_fkey"
            columns: ["business_subscription_id"]
            isOneToOne: false
            referencedRelation: "business_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_service_entitlement_id_fkey"
            columns: ["service_entitlement_id"]
            isOneToOne: false
            referencedRelation: "service_entitlements"
            referencedColumns: ["id"]
          },
        ]
      }
      service_entitlements: {
        Row: {
          access_expires_at: string | null
          access_starts_at: string
          billing_cycle: string | null
          billing_type: string
          business_profile_id: string | null
          created_at: string
          data_retention_until: string | null
          deleted_scheduled_at: string | null
          expired_at: string | null
          id: string
          menu_site_id: string
          plan_key: string | null
          plan_type: string
          product_key: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_expires_at?: string | null
          access_starts_at?: string
          billing_cycle?: string | null
          billing_type: string
          business_profile_id?: string | null
          created_at?: string
          data_retention_until?: string | null
          deleted_scheduled_at?: string | null
          expired_at?: string | null
          id?: string
          menu_site_id: string
          plan_key?: string | null
          plan_type: string
          product_key?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_expires_at?: string | null
          access_starts_at?: string
          billing_cycle?: string | null
          billing_type?: string
          business_profile_id?: string | null
          created_at?: string
          data_retention_until?: string | null
          deleted_scheduled_at?: string | null
          expired_at?: string | null
          id?: string
          menu_site_id?: string
          plan_key?: string | null
          plan_type?: string
          product_key?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_entitlements_menu_site_id_fkey"
            columns: ["menu_site_id"]
            isOneToOne: false
            referencedRelation: "menu_sites"
            referencedColumns: ["id"]
          },
        ]
      }
      table_visit_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          last_seen_at: string
          menu_site_id: string
          menu_table_id: string
          revoked_at: string | null
          token_hash: string
          user_agent_hash: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          last_seen_at?: string
          menu_site_id: string
          menu_table_id: string
          revoked_at?: string | null
          token_hash: string
          user_agent_hash: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          last_seen_at?: string
          menu_site_id?: string
          menu_table_id?: string
          revoked_at?: string | null
          token_hash?: string
          user_agent_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "table_visit_sessions_table_fk"
            columns: ["menu_site_id", "menu_table_id"]
            isOneToOne: false
            referencedRelation: "menu_tables"
            referencedColumns: ["menu_site_id", "id"]
          },
        ]
      }
      user_contact_profiles: {
        Row: {
          contact_name: string
          contact_phone: string | null
          created_at: string
          notification_email: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          notification_email: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          notification_email?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_menu_site_invitation: {
        Args: { p_token_hash: string }
        Returns: {
          accepted_invite_batch_id: string
          accepted_menu_site_id: string
          member_role: string
          membership_id: string
        }[]
      }
      cancel_pending_staff_call: {
        Args: {
          p_call_id: string
          p_menu_site_id: string
          p_table_visit_session_id: string
        }
        Returns: {
          call_id: string
          call_status: string
        }[]
      }
      consume_ai_account_credits: {
        Args: {
          p_credit_cost: number
          p_feature_key: string
          p_menu_site_id: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: {
          credit_source: string
          remaining_credits: number
          used_credits: number
        }[]
      }
      consume_ai_credits: {
        Args: {
          p_credit_cost: number
          p_feature_key: string
          p_menu_site_id: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: {
          balance_id: string
          included_credits: number
          purchased_credits: number
          remaining_credits: number
          total_credits: number
          used_credits: number
        }[]
      }
      consume_ai_credits_v2: {
        Args: {
          p_credit_cost: number
          p_feature_key: string
          p_menu_site_id: string
          p_metadata?: Json
          p_user_id: string
        }
        Returns: {
          account_remaining_credits: number
          included_credits_used: number
          menu_remaining_credits: number
          purchased_credits_used: number
          total_remaining_credits: number
          total_used_credits: number
        }[]
      }
      disconnect_menu_site_content: {
        Args: { p_target_menu_site_id: string }
        Returns: boolean
      }
      expire_personal_trial_unused_grant_credits: {
        Args: { p_menu_site_id: string; p_reason?: string }
        Returns: {
          already_processed: boolean
          reclaimed_credits: number
          skipped_reason: string
        }[]
      }
      grant_ai_account_credits: {
        Args: {
          p_context_menu_site_id: string
          p_credits: number
          p_order_id: string
          p_payment_id: string
          p_product_key: string
          p_user_id: string
        }
        Returns: {
          account_remaining_credits: number
          already_processed: boolean
          purchased_credits: number
          used_purchased_credits: number
        }[]
      }
      grant_ai_first_menu_welcome_credits: {
        Args: { p_menu_site_id: string; p_user_id: string }
        Returns: {
          already_processed: boolean
          credited_amount: number
          granted_credits: number
          purchased_credits: number
          remaining_credits: number
          skipped_reason: string
          transaction_id: string
          used_credits: number
        }[]
      }
      grant_ai_menu_creation_credits: {
        Args: {
          p_credits: number
          p_menu_site_id: string
          p_plan_type: string
          p_user_id: string
        }
        Returns: {
          already_processed: boolean
          granted_credits: number
          purchased_credits: number
          remaining_credits: number
          used_credits: number
        }[]
      }
      grant_ai_subscription_included_credits: {
        Args: {
          p_business_subscription_id: string
          p_credits: number
          p_menu_site_id: string
          p_metadata?: Json
          p_payment_id: string
          p_plan_type: string
          p_product_key: string
          p_reason?: string
          p_user_id: string
        }
        Returns: {
          already_processed: boolean
          credited_amount: number
          granted_credits: number
          purchased_credits: number
          remaining_credits: number
          transaction_id: string
          used_credits: number
        }[]
      }
      import_menu_site_content: {
        Args: {
          p_mode: string
          p_source_menu_site_id: string
          p_target_menu_site_id: string
        }
        Returns: Json
      }
      is_admin: { Args: never; Returns: boolean }
      is_menu_promotion_active_now: {
        Args: {
          p_active: boolean
          p_daily_end_time: string
          p_daily_start_time: string
          p_ends_at: string
          p_now?: string
          p_schedule_type: string
          p_starts_at: string
          p_timezone: string
        }
        Returns: boolean
      }
      list_menu_call_items: {
        Args: { p_include_inactive?: boolean; p_menu_site_id: string }
        Returns: {
          is_active: boolean
          item_key: string
          label: string
          sort_order: number
        }[]
      }
      replace_menu_call_items: {
        Args: { p_items: Json; p_menu_site_id: string }
        Returns: {
          is_active: boolean
          item_key: string
          label: string
          sort_order: number
        }[]
      }
      save_menu_page_content_order: {
        Args: {
          p_blocks: Json
          p_menu_page_id: string
          p_menu_site_id: string
          p_user_id: string
        }
        Returns: Json
      }
      submit_postpay_order: {
        Args: {
          p_client_request_id: string
          p_lines: Json
          p_menu_site_id: string
          p_request_text: string
          p_table_visit_session_id: string
        }
        Returns: {
          is_duplicate: boolean
          order_id: string
          order_number: number
          order_status: string
          payment_status: string
          total_amount: number
        }[]
      }
      submit_staff_call:
        | {
            Args: { p_menu_site_id: string; p_table_visit_session_id: string }
            Returns: {
              call_id: string
              call_number: number
              call_status: string
              is_duplicate: boolean
            }[]
          }
        | {
            Args: {
              p_call_item_key: string
              p_menu_site_id: string
              p_table_visit_session_id: string
            }
            Returns: {
              call_id: string
              call_number: number
              call_status: string
              is_duplicate: boolean
              request_key: string
              request_label: string
            }[]
          }
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
