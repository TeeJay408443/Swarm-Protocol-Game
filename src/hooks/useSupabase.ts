/**
 * useSupabase Hook - Authentication State Management
 * Phase 6: Core Build - Auth Integration
 * 
 * This hook provides access to the Supabase client and manages authentication state.
 */

import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import type { Session, User } from '@supabase/supabase-js'

interface UseSupabaseReturn {
  supabase: typeof supabase
  session: Session | null
  user: User | null
  loading: boolean
  error: Error | null
}

export const useSupabase = (): UseSupabaseReturn => {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const initialize = async () => {
      try {
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          setError(sessionError)
          setLoading(false)
          return
        }
        
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (err) {
        setError(err as Error)
        setLoading(false)
      }
    }

    initialize()

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    supabase,
    session,
    user,
    loading,
    error
  }
}

export default useSupabase
