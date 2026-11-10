/**
 * useLoadouts Hook - Loadout Management
 * Phase 6: Core Build - CRUD Operations
 * 
 * This hook provides CRUD operations for user loadouts.
 */

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import { 
  createLoadout as createLoadoutApi,
  getLoadouts as getLoadoutsApi,
  updateLoadout as updateLoadoutApi,
  deleteLoadout as deleteLoadoutApi,
  validateLoadoutInput
} from '../services/loadouts'
import type { LoadoutsRow } from '../types/database'
import type { ExtendedLoadout, CreateLoadoutInput, UpdateLoadoutInput } from '../services/loadouts'

interface UseLoadoutsReturn {
  // Loadouts data
  loadouts: ExtendedLoadout[]
  
  // Loading and error states
  loading: boolean
  error: string | null
  
  // CRUD operations
  createLoadout: (input: CreateLoadoutInput) => Promise<LoadoutsRow | null>
  updateLoadout: (id: string, input: UpdateLoadoutInput) => Promise<LoadoutsRow | null>
  deleteLoadout: (id: string) => Promise<boolean>
  
  // Refresh function
  refresh: () => Promise<void>
  
  // Validation
  validate: (input: CreateLoadoutInput | UpdateLoadoutInput) => { valid: boolean, errors: string[] }
}

export const useLoadouts = (): UseLoadoutsReturn => {
  const { user, loading: authLoading } = useSupabase()
  
  // Loadouts state
  const [loadouts, setLoadouts] = useState<ExtendedLoadout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch loadouts for the current user
  const fetchLoadouts = useCallback(async () => {
    if (!user) {
      setLoadouts([])
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const data = await getLoadoutsApi(user.id)
      
      // For now, use the basic loadouts - we'll enhance with details later
      // In production, you'd want to fetch with joined data
      setLoadouts(data.map(loadout => ({
        ...loadout,
        hero: undefined,
        primary_upgrade: undefined
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch loadouts')
    } finally {
      setLoading(false)
    }
  }, [user])
  
  // Initial fetch and when user changes
  useEffect(() => {
    fetchLoadouts()
  }, [fetchLoadouts])
  
  // Create a new loadout
  const createLoadout = async (input: CreateLoadoutInput): Promise<LoadoutsRow | null> => {
    if (!user) {
      setError('User not authenticated')
      return null
    }
    
    try {
      setLoading(true)
      setError(null)
      
      const newLoadout = await createLoadoutApi(input, user.id)
      
      // Add to local state
      setLoadouts(prev => [
        { ...newLoadout, hero: undefined, primary_upgrade: undefined },
        ...prev
      ])
      
      return newLoadout
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create loadout')
      return null
    } finally {
      setLoading(false)
    }
  }
  
  // Update an existing loadout
  const updateLoadout = async (id: string, input: UpdateLoadoutInput): Promise<LoadoutsRow | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const updatedLoadout = await updateLoadoutApi(id, input)
      
      // Update in local state
      setLoadouts(prev => prev.map(loadout =>
        loadout.id === id ? { ...updatedLoadout, hero: undefined, primary_upgrade: undefined } : loadout
      ))
      
      return updatedLoadout
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update loadout')
      return null
    } finally {
      setLoading(false)
    }
  }
  
  // Delete a loadout
  const deleteLoadout = async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      
      const success = await deleteLoadoutApi(id)
      
      if (success) {
        // Remove from local state
        setLoadouts(prev => prev.filter(loadout => loadout.id !== id))
      }
      
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete loadout')
      return false
    } finally {
      setLoading(false)
    }
  }
  
  // Validation helper
  const validate = (input: CreateLoadoutInput | UpdateLoadoutInput) => {
    return validateLoadoutInput(input)
  }
  
  return {
    loadouts,
    loading: loading || authLoading,
    error,
    createLoadout,
    updateLoadout,
    deleteLoadout,
    refresh: fetchLoadouts,
    validate
  }
}

export default useLoadouts
