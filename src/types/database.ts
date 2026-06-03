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
      parties: {
        Row: {
          created_at: string | null
          creator_id: string
          id: string
          invite_token: string | null
          location: string | null
          name: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          id?: string
          invite_token?: string | null
          location?: string | null
          name?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          id?: string
          invite_token?: string | null
          location?: string | null
          name?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "parties_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      party_members: {
        Row: {
          expires_at: string | null
          guest_token: string | null
          id: string
          joined_at: string | null
          party_id: string
          phone_number: string | null
          preferences_submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          expires_at?: string | null
          guest_token?: string | null
          id?: string
          joined_at?: string | null
          party_id: string
          phone_number?: string | null
          preferences_submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          expires_at?: string | null
          guest_token?: string | null
          id?: string
          joined_at?: string | null
          party_id?: string
          phone_number?: string | null
          preferences_submitted_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_members_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      preferences: {
        Row: {
          budget_tier: number | null
          created_at: string | null
          cuisine_preferences: string[] | null
          dietary_restrictions: string[] | null
          guest_token: string | null
          id: string
          party_id: string
          user_id: string | null
          vibe: string | null
        }
        Insert: {
          budget_tier?: number | null
          created_at?: string | null
          cuisine_preferences?: string[] | null
          dietary_restrictions?: string[] | null
          guest_token?: string | null
          id?: string
          party_id: string
          user_id?: string | null
          vibe?: string | null
        }
        Update: {
          budget_tier?: number | null
          created_at?: string | null
          cuisine_preferences?: string[] | null
          dietary_restrictions?: string[] | null
          guest_token?: string | null
          id?: string
          party_id?: string
          user_id?: string | null
          vibe?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "preferences_guest_token_fkey"
            columns: ["guest_token"]
            isOneToOne: false
            referencedRelation: "party_members"
            referencedColumns: ["guest_token"]
          },
          {
            foreignKeyName: "preferences_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          created_at: string | null
          id: string
          party_id: string
          rating: number | null
          restaurant_id: string
          user_id: string
          visited: boolean | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          party_id: string
          rating?: number | null
          restaurant_id: string
          user_id: string
          visited?: boolean | null
        }
        Update: {
          created_at?: string | null
          id?: string
          party_id?: string
          rating?: number | null
          restaurant_id?: string
          user_id?: string
          visited?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "ratings_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          created_at: string | null
          id: string
          party_id: string
          ranked_alternatives: Json
          reason: string
          restaurant_data: Json
          restaurant_id: string
          restaurant_name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          party_id: string
          ranked_alternatives?: Json
          reason: string
          restaurant_data?: Json
          restaurant_id: string
          restaurant_name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          party_id?: string
          ranked_alternatives?: Json
          reason?: string
          restaurant_data?: Json
          restaurant_id?: string
          restaurant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: true
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          dietary_restrictions: string[] | null
          display_name: string | null
          email: string
          id: string
          location: string | null
          push_token: string | null
        }
        Insert: {
          created_at?: string | null
          dietary_restrictions?: string[] | null
          display_name?: string | null
          email: string
          id: string
          location?: string | null
          push_token?: string | null
        }
        Update: {
          created_at?: string | null
          dietary_restrictions?: string[] | null
          display_name?: string | null
          email?: string
          id?: string
          location?: string | null
          push_token?: string | null
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
