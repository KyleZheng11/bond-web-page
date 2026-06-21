export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Views: Record<string, never>
    Functions: Record<string, never>
    Tables: {
      users: {
        Row: {
          id: string
          display_name: string | null
          email: string
          dietary_restrictions: string[] | null
          location: string | null
          push_token: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          display_name?: string | null
          email: string
          dietary_restrictions?: string[] | null
          location?: string | null
          push_token?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          display_name?: string | null
          email?: string
          dietary_restrictions?: string[] | null
          location?: string | null
          push_token?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      parties: {
        Row: {
          id: string
          creator_id: string
          name: string | null
          status: 'open' | 'searching' | 'voting' | 'resolved'
          invite_token: string | null
          location: string | null
          created_at: string | null
          resolved_at: string | null
        }
        Insert: {
          id?: string
          creator_id: string
          name?: string | null
          status?: 'open' | 'searching' | 'voting' | 'resolved'
          invite_token?: string | null
          location?: string | null
          created_at?: string | null
          resolved_at?: string | null
        }
        Update: {
          id?: string
          creator_id?: string
          name?: string | null
          status?: 'open' | 'searching' | 'voting' | 'resolved'
          invite_token?: string | null
          location?: string | null
          created_at?: string | null
          resolved_at?: string | null
        }
        Relationships: []
      }
      party_members: {
        Row: {
          id: string
          party_id: string
          user_id: string | null
          guest_token: string | null
          guest_name: string | null
          phone_number: string | null
          joined_at: string | null
          preferences_submitted_at: string | null
          expires_at: string | null
        }
        Insert: {
          id?: string
          party_id: string
          user_id?: string | null
          guest_token?: string | null
          guest_name?: string | null
          phone_number?: string | null
          joined_at?: string | null
          preferences_submitted_at?: string | null
          expires_at?: string | null
        }
        Update: {
          id?: string
          party_id?: string
          user_id?: string | null
          guest_token?: string | null
          guest_name?: string | null
          phone_number?: string | null
          joined_at?: string | null
          preferences_submitted_at?: string | null
          expires_at?: string | null
        }
        Relationships: []
      }
      preferences: {
        Row: {
          id: string
          party_id: string
          user_id: string | null
          guest_token: string | null
          cuisine_preferences: string[] | null
          budget_tier: number | null
          vibe: string | null
          dietary_restrictions: string[] | null
          created_at: string | null
        }
        Insert: {
          id?: string
          party_id: string
          user_id?: string | null
          guest_token?: string | null
          cuisine_preferences?: string[] | null
          budget_tier?: number | null
          vibe?: string | null
          dietary_restrictions?: string[] | null
          created_at?: string | null
        }
        Update: {
          id?: string
          party_id?: string
          user_id?: string | null
          guest_token?: string | null
          cuisine_preferences?: string[] | null
          budget_tier?: number | null
          vibe?: string | null
          dietary_restrictions?: string[] | null
          created_at?: string | null
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          id: string
          party_id: string
          restaurant_id: string
          restaurant_name: string
          restaurant_data: Json
          reason: string
          ranked_alternatives: Json
          created_at: string | null
        }
        Insert: {
          id?: string
          party_id: string
          restaurant_id: string
          restaurant_name: string
          restaurant_data?: Json
          reason: string
          ranked_alternatives?: Json
          created_at?: string | null
        }
        Update: {
          id?: string
          party_id?: string
          restaurant_id?: string
          restaurant_name?: string
          restaurant_data?: Json
          reason?: string
          ranked_alternatives?: Json
          created_at?: string | null
        }
        Relationships: []
      }
      friendships: {
        Row: {
          id: string
          requester_id: string
          addressee_id: string
          status: 'pending' | 'accepted' | 'declined'
          created_at: string | null
        }
        Insert: {
          id?: string
          requester_id: string
          addressee_id: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string | null
        }
        Update: {
          id?: string
          requester_id?: string
          addressee_id?: string
          status?: 'pending' | 'accepted' | 'declined'
          created_at?: string | null
        }
        Relationships: []
      }
      friend_invites: {
        Row: {
          id: string
          inviter_id: string
          token: string
          created_at: string | null
          expires_at: string
        }
        Insert: {
          id?: string
          inviter_id: string
          token?: string
          created_at?: string | null
          expires_at?: string
        }
        Update: {
          id?: string
          inviter_id?: string
          token?: string
          created_at?: string | null
          expires_at?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          profession: string
          city: string
          state: string
          created_at: string | null
        }
        Insert: {
          id?: string
          first_name: string
          last_name: string
          email: string
          profession: string
          city: string
          state: string
          created_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          profession?: string
          city?: string
          state?: string
          created_at?: string | null
        }
        Relationships: []
      }
      votes: {
        Row: {
          id: string
          party_id: string
          voter_id: string
          restaurant_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          party_id: string
          voter_id: string
          restaurant_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          party_id?: string
          voter_id?: string
          restaurant_id?: string
          created_at?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          id: string
          user_id: string
          party_id: string
          restaurant_id: string
          rating: number | null
          visited: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          party_id: string
          restaurant_id: string
          rating?: number | null
          visited?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          party_id?: string
          restaurant_id?: string
          rating?: number | null
          visited?: boolean | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
