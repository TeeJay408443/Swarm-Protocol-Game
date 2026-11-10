/**
 * Loadouts Service - CRUD Operations
 * Phase 6: Core Build - Loadout Management
 * 
 * This service provides CRUD operations for user loadouts.
 * Loadouts are user-specific and require authentication.
 */

import { supabase } from './supabase'
import type { LoadoutsRow } from '../types/database'

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
  const { data, error } = await supabase
    .from('loadouts')
    .insert({
      ...input,
      user_id: userId
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating loadout:', error)
    throw error
  }
  
  return data
}

/**
 * Get all loadouts for a specific user
 */
export const getLoadouts = async (userId: string): Promise<LoadoutsRow[]> => {
  const { data, error } = await supabase
    .from('loadouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching loadouts:', error)
    throw error
  }
  
  return data || []
}

/**
 * Get a single loadout by ID
 */
export const getLoadout = async (id: string): Promise<LoadoutsRow | null> => {
  const { data, error } = await supabase
    .from('loadouts')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching loadout:', error)
    throw error
  }
  
  return data || null
}

/**
 * Get loadout with joined hero and upgrade data
 */
export const getExtendedLoadout = async (id: string): Promise<ExtendedLoadout | null> => {
  const { data, error } = await supabase
    .from('loadouts')
    .select(`*, heroes(id, name, archetype, hp, speed), upgrades(id, name, category, damage, cooldown_s)`)
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching extended loadout:', error)
    throw error
  }
  
  if (!data) return null
  
  // Transform the data to match our interface
  return {
    ...data,
    hero: data.heroes || undefined,
    primary_upgrade: data.upgrades || undefined
  }
}

/**
 * Update an existing loadout
 */
export const updateLoadout = async (
  id: string,
  updates: UpdateLoadoutInput
): Promise<LoadoutsRow> => {
  const { data, error } = await supabase
    .from('loadouts')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating loadout:', error)
    throw error
  }
  
  return data
}

/**
 * Delete a loadout
 */
export const deleteLoadout = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from('loadouts')
    .delete()
    .eq('id', id)
  
  if (error) {
    console.error('Error deleting loadout:', error)
    throw error
  }
  
  return true
}

/**
 * Check if a loadout belongs to a user
 */
export const isLoadoutOwner = async (
  loadoutId: string,
  userId: string
): Promise<boolean> => {
  const { data, error } = await supabase
    .from('loadouts')
    .select('user_id')
    .eq('id', loadoutId)
    .single()
  
  if (error) {
    console.error('Error checking loadout ownership:', error)
    return false
  }
  
  return data?.user_id === userId
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
  const { data, error } = await supabase
    .from('loadouts')
    .select(`*, heroes(id, name, archetype, hp, speed), upgrades(id, name, category, damage, cooldown_s)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Error fetching user loadouts with details:', error)
    throw error
  }
  
  if (!data) return []
  
  // Transform the data
  return data.map(loadout => ({
    ...loadout,
    hero: loadout.heroes || undefined,
    primary_upgrade: loadout.upgrades || undefined
  }))
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
    if (input.loadout_name.length > 100) {
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
