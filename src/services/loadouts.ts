/**
 * Loadouts Service - CRUD Operations
 * Phase 6: Core Build - Loadout Management
 * 
 * This service provides CRUD operations for user loadouts.
 * Loadouts are user-specific and require authentication.
 */

import { supabase } from './supabase'
import { heroes, upgrades } from '../db/seedData'
import { shopWeaponsAsUpgrades } from './shop'
import { AREA_TWO_UPGRADES } from '../config/areaUpgrades'
import type { LoadoutsRow } from '../types/database'

// Local in-memory / localStorage fallback storage
const localLoadoutsKey = 'swarm_protocol_local_loadouts'
const DEFAULT_LOCAL_LOADOUTS: LoadoutsRow[] = [
  {
    id: 'loadout_default_1',
    user_id: 'guest_user',
    loadout_name: 'Vanguard Assault',
    hero_id: 'hero_01',
    primary_upgrade_id: 'upg_01',
    created_at: new Date().toISOString()
  }
]
let memoryLoadoutsStore: LoadoutsRow[] | null = null

const getLocalLoadouts = (): LoadoutsRow[] => {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(localLoadoutsKey)
      if (raw) {
        const parsed = JSON.parse(raw) as LoadoutsRow[]
        memoryLoadoutsStore = parsed
        return parsed
      }
    }
  } catch {
    // Fall back to in-memory store
  }
  if (!memoryLoadoutsStore) {
    memoryLoadoutsStore = [...DEFAULT_LOCAL_LOADOUTS]
  }
  return [...memoryLoadoutsStore]
}

const saveLocalLoadouts = (list: LoadoutsRow[]) => {
  memoryLoadoutsStore = [...list]
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(localLoadoutsKey, JSON.stringify(list))
    }
  } catch {
    // Ignore storage quota errors in constrained environments
  }
}

// ============================================
// LOADOUT TYPE EXTENSIONS
// ============================================

/**
 * Extended Loadout type with joined hero and upgrade data
 */
export interface ExtendedLoadout extends LoadoutsRow {
  hero?: {
    id: string
    name: string
    archetype: string
    hp: number
    speed: number
  }
  primary_upgrade?: {
    id: string
    name: string
    category: string
    damage: number
    cooldown_s: number
  }
}

/**
 * Loadout creation input (without auto-generated fields)
 */
export interface CreateLoadoutInput {
  loadout_name: string
  hero_id: string
  primary_upgrade_id: string
}

/**
 * Loadout update input
 */
export interface UpdateLoadoutInput {
  loadout_name?: string
  hero_id?: string
  primary_upgrade_id?: string
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new loadout
 */
export const createLoadout = async (
  input: CreateLoadoutInput,
  userId: string
): Promise<LoadoutsRow> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loadouts')
        .insert({
          ...input,
          user_id: userId
        })
        .select()
        .single()
      
      if (!error && data) return data
    } catch (err) {
      console.warn('Database offline, using local loadout store', err)
    }
  }

  const list = getLocalLoadouts()
  const newRow: LoadoutsRow = {
    id: `loadout_${Date.now()}`,
    user_id: userId || 'guest_user',
    loadout_name: input.loadout_name,
    hero_id: input.hero_id,
    primary_upgrade_id: input.primary_upgrade_id,
    created_at: new Date().toISOString()
  }
  list.unshift(newRow)
  saveLocalLoadouts(list)
  return newRow
}

/**
 * Get all loadouts for a specific user
 */
export const getLoadouts = async (userId: string): Promise<LoadoutsRow[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loadouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (!error && data) return data
    } catch (err) {
      console.warn('Database offline, using local loadout store', err)
    }
  }

  const list = getLocalLoadouts()
  if (!userId || userId === 'guest_user') {
    return list.filter(l => l.user_id === 'guest_user')
  }
  return list.filter(l => l.user_id === userId)
}

/**
 * Get a single loadout by ID
 */
export const getLoadout = async (id: string): Promise<LoadoutsRow | null> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loadouts')
        .select('*')
        .eq('id', id)
        .single()
      
      if (!error && data) return data
    } catch (err) {
      console.warn('Database offline, using local loadout store', err)
    }
  }

  const list = getLocalLoadouts()
  return list.find(l => l.id === id) || null
}

const enrichLoadout = (loadout: LoadoutsRow): ExtendedLoadout => {
  const heroData = heroes.find(h => h.id === loadout.hero_id)
  const upgradeData = [...upgrades, ...AREA_TWO_UPGRADES, ...shopWeaponsAsUpgrades()].find(
    u => u.id === loadout.primary_upgrade_id
  )
  return {
    ...loadout,
    hero: heroData ? {
      id: heroData.id,
      name: heroData.name,
      archetype: heroData.archetype,
      hp: heroData.hp,
      speed: heroData.speed
    } : undefined,
    primary_upgrade: upgradeData ? {
      id: upgradeData.id,
      name: upgradeData.name,
      category: upgradeData.category,
      damage: upgradeData.damage,
      cooldown_s: upgradeData.cooldown_s
    } : undefined
  }
}

/**
 * Get loadout with joined hero and upgrade data
 */
export const getExtendedLoadout = async (id: string): Promise<ExtendedLoadout | null> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loadouts')
        .select(`*, heroes(id, name, archetype, hp, speed), upgrades(id, name, category, damage, cooldown_s)`)
        .eq('id', id)
        .single()
      
      if (!error && data) {
        return {
          ...data,
          hero: data.heroes || undefined,
          primary_upgrade: data.upgrades || undefined
        }
      }
    } catch (err) {
      console.warn('Database offline, using local loadout store', err)
    }
  }

  const loadout = await getLoadout(id)
  if (!loadout) return null
  return enrichLoadout(loadout)
}

/**
 * Update an existing loadout
 */
export const updateLoadout = async (
  id: string,
  updates: UpdateLoadoutInput
): Promise<LoadoutsRow> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loadouts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (!error && data) return data
    } catch (err) {
      console.warn('Database offline, using local loadout store', err)
    }
  }

  const list = getLocalLoadouts()
  const index = list.findIndex(l => l.id === id)
  if (index === -1) throw new Error('Loadout not found')
  const updated: LoadoutsRow = {
    ...list[index],
    ...updates
  }
  list[index] = updated
  saveLocalLoadouts(list)
  return updated
}

/**
 * Delete a loadout
 */
export const deleteLoadout = async (id: string): Promise<boolean> => {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('loadouts')
        .delete()
        .eq('id', id)
      
      if (!error) return true
    } catch (err) {
      console.warn('Database offline, using local loadout store', err)
    }
  }

  const list = getLocalLoadouts()
  const filtered = list.filter(l => l.id !== id)
  saveLocalLoadouts(filtered)
  return true
}

/**
 * Check if a loadout belongs to a user
 */
export const isLoadoutOwner = async (
  loadoutId: string,
  userId: string
): Promise<boolean> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loadouts')
        .select('user_id')
        .eq('id', loadoutId)
        .single()
      
      if (!error && data) return data.user_id === userId
    } catch (err) {
      console.warn('Database offline, using local loadout store', err)
    }
  }

  const loadout = await getLoadout(loadoutId)
  return loadout?.user_id === userId || loadout?.user_id === 'guest_user'
}

// ============================================
// BATCH OPERATIONS
// ============================================

/**
 * Get all loadouts with joined data for a user
 */
export const getUserLoadoutsWithDetails = async (
  userId: string
): Promise<ExtendedLoadout[]> => {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('loadouts')
        .select(`*, heroes(id, name, archetype, hp, speed), upgrades(id, name, category, damage, cooldown_s)`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      
      if (!error && data) {
        return data.map(loadout => ({
          ...loadout,
          hero: loadout.heroes || undefined,
          primary_upgrade: loadout.upgrades || undefined
        }))
      }
    } catch (err) {
      console.warn('Database offline, using local loadout store', err)
    }
  }

  const list = await getLoadouts(userId)
  return list.map(enrichLoadout)
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate loadout input
 */
export const validateLoadoutInput = (input: CreateLoadoutInput | UpdateLoadoutInput): { valid: boolean, errors: string[] } => {
  const errors: string[] = []
  
  if ('loadout_name' in input) {
    if (!input.loadout_name || input.loadout_name.trim().length === 0) {
      errors.push('Loadout name is required')
    }
    if (input.loadout_name && input.loadout_name.length > 100) {
      errors.push('Loadout name must be less than 100 characters')
    }
  }
  
  if ('hero_id' in input) {
    if (!input.hero_id) {
      errors.push('Hero ID is required')
    }
  }
  
  if ('primary_upgrade_id' in input) {
    if (!input.primary_upgrade_id) {
      errors.push('Primary upgrade ID is required')
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export default {
  createLoadout,
  getLoadouts,
  getLoadout,
  getExtendedLoadout,
  updateLoadout,
  deleteLoadout,
  isLoadoutOwner,
  getUserLoadoutsWithDetails,
  validateLoadoutInput
}
