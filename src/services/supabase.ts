/**
 * Supabase Client Configuration
 * Phase 6: Core Build - Database Integration
 */

import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

// Validate configuration
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase configuration error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

// Create and export Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey)

// Re-export types for convenience
export type { SupabaseClient } from '@supabase/supabase-js'
export type { Session, User } from '@supabase/supabase-js'

export default supabase
