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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      channel_secrets: {
        Row: {
          channel_id: string
          created_at: string
          oauth_access_token: string | null
          oauth_expires_at: string | null
          oauth_refresh_token: string
          oauth_scope: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          oauth_access_token?: string | null
          oauth_expires_at?: string | null
          oauth_refresh_token: string
          oauth_scope?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          oauth_access_token?: string | null
          oauth_expires_at?: string | null
          oauth_refresh_token?: string
          oauth_scope?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_secrets_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      channels: {
        Row: {
          channel_id: string | null
          channel_name: string | null
          connected_at: string | null
          created_at: string
          external_id: string | null
          id: string
          name: string | null
          provider: string
          status: string
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          channel_name?: string | null
          connected_at?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          name?: string | null
          provider?: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          channel_name?: string | null
          connected_at?: string | null
          created_at?: string
          external_id?: string | null
          id?: string
          name?: string | null
          provider?: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_items: {
        Row: {
          channel_id: string | null
          created_at: string
          id: string
          published_at: string | null
          scheduled_at: string | null
          status: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_items_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          reason: string
          user_id: string
          video_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reason: string
          user_id: string
          video_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reason?: string
          user_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_quality_tier: string | null
          display_name: string | null
          email: string | null
          id: string
          niche: string | null
          onboarded: boolean
          posting_days: string[]
          posting_time: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_quality_tier?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          niche?: string | null
          onboarded?: boolean
          posting_days?: string[]
          posting_time?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_quality_tier?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          niche?: string | null
          onboarded?: boolean
          posting_days?: string[]
          posting_time?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          brand_voice_notes: string | null
          caption_style: string | null
          created_at: string
          niche: string | null
          niche_custom: string | null
          posting_days: string[]
          posting_time: string | null
          quality_tier: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_voice_notes?: string | null
          caption_style?: string | null
          created_at?: string
          niche?: string | null
          niche_custom?: string | null
          posting_days?: string[]
          posting_time?: string | null
          quality_tier?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_voice_notes?: string | null
          caption_style?: string | null
          created_at?: string
          niche?: string | null
          niche_custom?: string | null
          posting_days?: string[]
          posting_time?: string | null
          quality_tier?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      videos: {
        Row: {
          caption_style: string | null
          captions_json: Json | null
          channel_id: string | null
          cost_credits: number
          created_at: string
          duration_seconds: number | null
          error_message: string | null
          id: string
          language: string
          niche: string | null
          posted_at: string | null
          publish_error: string | null
          published_at: string | null
          quality_tier: string | null
          scheduled_for: string | null
          script_text: string | null
          shotstack_render_id: string | null
          srt_text: string | null
          status: string
          stock_clips: Json | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
          video_style: string
          video_url: string | null
          voiceover_url: string | null
          youtube_video_id: string | null
        }
        Insert: {
          caption_style?: string | null
          captions_json?: Json | null
          channel_id?: string | null
          cost_credits?: number
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          language?: string
          niche?: string | null
          posted_at?: string | null
          publish_error?: string | null
          published_at?: string | null
          quality_tier?: string | null
          scheduled_for?: string | null
          script_text?: string | null
          shotstack_render_id?: string | null
          srt_text?: string | null
          status?: string
          stock_clips?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          video_style?: string
          video_url?: string | null
          voiceover_url?: string | null
          youtube_video_id?: string | null
        }
        Update: {
          caption_style?: string | null
          captions_json?: Json | null
          channel_id?: string | null
          cost_credits?: number
          created_at?: string
          duration_seconds?: number | null
          error_message?: string | null
          id?: string
          language?: string
          niche?: string | null
          posted_at?: string | null
          publish_error?: string | null
          published_at?: string | null
          quality_tier?: string | null
          scheduled_for?: string | null
          script_text?: string | null
          shotstack_render_id?: string | null
          srt_text?: string | null
          status?: string
          stock_clips?: Json | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          video_style?: string
          video_url?: string | null
          voiceover_url?: string | null
          youtube_video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "videos_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
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
  public: {
    Enums: {},
  },
} as const
