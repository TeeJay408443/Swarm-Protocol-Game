/**
 * Supabase Client Configuration
 * Phase 6: Core Build - Database Integration
 */

import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

// Vite exposes browser environment variables through import.meta.env.
const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
const supabaseUrl =
  viteEnv?.VITE_SUPABASE_URL ??
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL : undefined)
const supabaseKey =
  viteEnv?.VITE_SUPABASE_ANON_KEY ??
  (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY : undefined)

/**
 * Validates that Supabase credentials are real configuration values and not template placeholders.
 */
export function isConfiguredSupabase(url?: string, key?: string): boolean {
  if (!url || !key) return false
  const trimmedUrl = url.trim()
  const trimmedKey = key.trim()
  if (!trimmedUrl || !trimmedKey || trimmedKey.length < 20) return false

  const lowerUrl = trimmedUrl.toLowerCase()
  const lowerKey = trimmedKey.toLowerCase()
  const placeholderTokens = [
    'your-project-id',
    'your-supabase',
    'your-anon-key',
    'placeholder',
    'example.com',
    '<your'
  ]
  if (placeholderTokens.some((token) => lowerUrl.includes(token) || lowerKey.includes(token))) {
    return false
  }

  try {
    const parsed = new URL(trimmedUrl)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

// The game can still run without Supabase; local account and telemetry stores handle persistence.
export const supabase: SupabaseClient | null = isConfiguredSupabase(supabaseUrl, supabaseKey)
  ? createClient(supabaseUrl as string, supabaseKey as string)
  : null

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
