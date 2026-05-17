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
    PostgrestVersion: "14.5"
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
      inquiries: {
        Row: {
          admin_reply: string | null
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
      menu_categories: {
        Row: {
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
          origin_info: string | null
          portion_label: string | null
          portion_visible: boolean
          price: number
          price_label: string | null
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
          origin_info?: string | null
          portion_label?: string | null
          portion_visible?: boolean
          price?: number
          price_label?: string | null
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
          origin_info?: string | null
          portion_label?: string | null
          portion_visible?: boolean
          price?: number
          price_label?: string | null
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
      menu_translation_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          menu_site_id: string
          requested_by: string
          started_at: string | null
          status: string
          target_locales: string[]
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          menu_site_id: string
          requested_by: string
          started_at?: string | null
          status?: string
          target_locales?: string[]
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          menu_site_id?: string
          requested_by?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_admin: { Args: never; Returns: boolean }
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
