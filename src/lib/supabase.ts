import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          role: 'admin' | 'user'
          first_name: string | null
          last_name: string | null
          email_verified: boolean
          is_active: boolean
          failed_login_attempts: number
          locked_until: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          role?: 'admin' | 'user'
          first_name?: string | null
          last_name?: string | null
          email_verified?: boolean
          is_active?: boolean
          failed_login_attempts?: number
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          role?: 'admin' | 'user'
          first_name?: string | null
          last_name?: string | null
          email_verified?: boolean
          is_active?: boolean
          failed_login_attempts?: number
          locked_until?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      agents: {
        Row: {
          id: string
          elevenlabs_agent_id: string
          name: string
          description: string | null
          voice_settings: any | null
          configuration: any | null
          is_active: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          elevenlabs_agent_id: string
          name: string
          description?: string | null
          voice_settings?: any | null
          configuration?: any | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          elevenlabs_agent_id?: string
          name?: string
          description?: string | null
          voice_settings?: any | null
          configuration?: any | null
          is_active?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_agents: {
        Row: {
          id: string
          user_id: string
          agent_id: string
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_id: string
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_id?: string
          is_default?: boolean
          created_at?: string
        }
      }
      conversations: {
        Row: {
          id: string
          user_id: string | null
          agent_id: string | null
          title: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          agent_id?: string | null
          title: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          agent_id?: string | null
          title?: string
          created_at?: string
          updated_at?: string
        }
      }
      messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant'
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          conversation_id?: string
          role?: 'user' | 'assistant'
          content?: string
          created_at?: string
        }
      }
      agent_usage: {
        Row: {
          id: string
          user_id: string | null
          agent_id: string | null
          conversation_id: string | null
          message_count: number
          voice_time_seconds: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          agent_id?: string | null
          conversation_id?: string | null
          message_count?: number
          voice_time_seconds?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          agent_id?: string | null
          conversation_id?: string | null
          message_count?: number
          voice_time_seconds?: number
          created_at?: string
        }
      }
      password_reset_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          used: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          expires_at: string
          used?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          expires_at?: string
          used?: boolean
          created_at?: string
        }
      }
      email_verification_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          expires_at?: string
          created_at?: string
        }
      }
      user_auth_sessions: {
        Row: {
          id: string
          user_id: string
          session_token: string
          access_token: string | null
          expires: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_token: string
          access_token?: string | null
          expires: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          session_token?: string
          access_token?: string | null
          expires?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_accounts: {
        Row: {
          id: string
          user_id: string
          type: string
          provider: string
          provider_account_id: string
          refresh_token: string | null
          access_token: string | null
          expires_at: number | null
          token_type: string | null
          scope: string | null
          id_token: string | null
          session_state: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          provider: string
          provider_account_id: string
          refresh_token?: string | null
          access_token?: string | null
          expires_at?: number | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          provider?: string
          provider_account_id?: string
          refresh_token?: string | null
          access_token?: string | null
          expires_at?: number | null
          token_type?: string | null
          scope?: string | null
          id_token?: string | null
          session_state?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      // Legacy tables (will be phased out)
      user_sessions: {
        Row: {
          id: string
          device_id: string
          user_agent: string
          last_active: string
          created_at: string
        }
        Insert: {
          id?: string
          device_id: string
          user_agent: string
          last_active?: string
          created_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          user_agent?: string
          last_active?: string
          created_at?: string
        }
      }
      mcp_auth_sessions: {
        Row: {
          id: string
          device_id: string
          service_name: string
          access_token: string
          refresh_token: string | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          device_id: string
          service_name: string
          access_token: string
          refresh_token?: string | null
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          device_id?: string
          service_name?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
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
  }
}