/**
 * Supabase Client Configuration
 * Phase 6: Core Build - Database Integration
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Vite exposes browser environment variables through import.meta.env.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// The game can still run without Supabase; database-backed features report a
// clear configuration error when they are used.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable database features.'
    )
  }

  return supabase
}

// Re-export types for convenience
export type { SupabaseClient } from '@supabase/supabase-js'
export type { Session, User } from '@supabase/supabase-js'

export default supabase
