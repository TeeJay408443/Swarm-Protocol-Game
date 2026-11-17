/**
 * useLoadouts Hook - Loadout Management
 * Phase 6 / Phase 9: Full CRUD with Supabase + Local Guest Storage Fallback
 */

import { useState, useEffect, useCallback } from 'react'
import { useSupabase } from './useSupabase'
import {
  createLoadout as createLoadoutApi,
  getUserLoadoutsWithDetails,
  updateLoadout as updateLoadoutApi,
  deleteLoadout as deleteLoadoutApi,
  validateLoadoutInput
} from '../services/loadouts'
import { heroes, upgrades } from '../db/seedData'
import { shopWeaponsAsUpgrades } from '../services/shop'
import type { LoadoutsRow } from '../types/database'
import type { ExtendedLoadout, CreateLoadoutInput, UpdateLoadoutInput } from '../services/loadouts'

interface UseLoadoutsReturn {
  loadouts: ExtendedLoadout[]
  loading: boolean
  error: string | null
  isGuestMode: boolean
  createLoadout: (input: CreateLoadoutInput) => Promise<ExtendedLoadout | null>
  updateLoadout: (id: string, input: UpdateLoadoutInput) => Promise<ExtendedLoadout | null>
  deleteLoadout: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
  validate: (input: CreateLoadoutInput | UpdateLoadoutInput) => { valid: boolean; errors: string[] }
}

const enrichLoadoutDetails = (loadout: LoadoutsRow): ExtendedLoadout => {
  const heroData = heroes.find(h => h.id === loadout.hero_id)
  const upgradeData = [...upgrades, ...shopWeaponsAsUpgrades()].find(
    u => u.id === loadout.primary_upgrade_id
  )

  return {
    ...loadout,
    hero: heroData
      ? {
          id: heroData.id,
          name: heroData.name,
          archetype: heroData.archetype,
          hp: heroData.hp,
          speed: heroData.speed
        }
      : undefined,
    primary_upgrade: upgradeData
      ? {
          id: upgradeData.id,
          name: upgradeData.name,
          category: upgradeData.category,
          damage: upgradeData.damage,
          cooldown_s: upgradeData.cooldown_s
        }
      : undefined
  }
}

export const useLoadouts = (): UseLoadoutsReturn => {
  const { user, loading: authLoading } = useSupabase()
  const effectiveUserId = user?.id || 'guest_user'
  const isGuestMode = !user

  const [loadouts, setLoadouts] = useState<ExtendedLoadout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLoadouts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await getUserLoadoutsWithDetails(effectiveUserId)
      setLoadouts(data.map(item => enrichLoadoutDetails(item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch loadouts')
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId])

  useEffect(() => {
    if (!authLoading) {
      fetchLoadouts()
    }
  }, [authLoading, fetchLoadouts])

  const createLoadout = async (input: CreateLoadoutInput): Promise<ExtendedLoadout | null> => {
    const validation = validateLoadoutInput(input)
    if (!validation.valid) {
      setError(validation.errors[0] || 'Invalid loadout input')
      return null
    }

    try {
      setError(null)
      const created = await createLoadoutApi(input, effectiveUserId)
      const enriched = enrichLoadoutDetails(created)
      setLoadouts(prev => [enriched, ...prev])
      return enriched
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create loadout')
      return null
    }
  }

  const updateLoadout = async (id: string, input: UpdateLoadoutInput): Promise<ExtendedLoadout | null> => {
    const validation = validateLoadoutInput(input)
    if (!validation.valid) {
      setError(validation.errors[0] || 'Invalid loadout update')
      return null
    }

    try {
      setError(null)
      const updated = await updateLoadoutApi(id, input)
      const enriched = enrichLoadoutDetails(updated)
      setLoadouts(prev => prev.map(item => (item.id === id ? enriched : item)))
      return enriched
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update loadout')
      return null
    }
  }

  const deleteLoadout = async (id: string): Promise<boolean> => {
    try {
      setError(null)
      const success = await deleteLoadoutApi(id)
      if (success) {
        setLoadouts(prev => prev.filter(item => item.id !== id))
      }
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete loadout')
      return false
    }
  }

  const validate = (input: CreateLoadoutInput | UpdateLoadoutInput) => {
    return validateLoadoutInput(input)
  }

  return {
    loadouts,
    loading: loading || authLoading,
    error,
    isGuestMode,
    createLoadout,
    updateLoadout,
    deleteLoadout,
    refresh: fetchLoadouts,
    validate
  }
}

export default useLoadouts
