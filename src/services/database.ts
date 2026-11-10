/**
 * Database Service - Seed Data Operations
 * Phase 6: Core Build - Database Integration
 * 
 * This service provides functions to fetch seed data from Supabase tables.
 * Seed data tables are public read-only and contain game entity definitions.
 */

import { getSupabaseClient } from './supabase'
import type { 
  HeroesRow, 
  EnemiesRow, 
  UpgradesRow, 
  AchievementsRow 
} from '../types/database'

// ============================================
// SEED DATA OPERATIONS
// These tables are public read-only
// ============================================

/**
 * Fetch all heroes from the database
 */
export const getHeroes = async (): Promise<HeroesRow[]> => {
  const { data, error } = await getSupabaseClient()
    .from('heroes')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching heroes:', error)
    throw error
  }
  
  return data || []
}

/**
 * Fetch a single hero by ID
 */
export const getHero = async (id: string): Promise<HeroesRow | null> => {
  const { data, error } = await getSupabaseClient()
    .from('heroes')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching hero:', error)
    throw error
  }
  
  return data || null
}

/**
 * Fetch all enemies from the database
 */
export const getEnemies = async (): Promise<EnemiesRow[]> => {
  const { data, error } = await getSupabaseClient()
    .from('enemies')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching enemies:', error)
    throw error
  }
  
  return data || []
}

/**
 * Fetch a single enemy by ID
 */
export const getEnemy = async (id: string): Promise<EnemiesRow | null> => {
  const { data, error } = await getSupabaseClient()
    .from('enemies')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching enemy:', error)
    throw error
  }
  
  return data || null
}

/**
 * Fetch all upgrades from the database
 */
export const getUpgrades = async (): Promise<UpgradesRow[]> => {
  const { data, error } = await getSupabaseClient()
    .from('upgrades')
    .select('*')
    .order('name', { ascending: true })
  
  if (error) {
    console.error('Error fetching upgrades:', error)
    throw error
  }
  
  return data || []
}

/**
 * Fetch a single upgrade by ID
 */
export const getUpgrade = async (id: string): Promise<UpgradesRow | null> => {
  const { data, error } = await getSupabaseClient()
    .from('upgrades')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching upgrade:', error)
    throw error
  }
  
  return data || null
}

/**
 * Fetch all achievements from the database
 */
export const getAchievements = async (): Promise<AchievementsRow[]> => {
  const { data, error } = await getSupabaseClient()
    .from('achievements')
    .select('*')
    .order('title', { ascending: true })
  
  if (error) {
    console.error('Error fetching achievements:', error)
    throw error
  }
  
  return data || []
}

/**
 * Fetch a single achievement by ID
 */
export const getAchievement = async (id: string): Promise<AchievementsRow | null> => {
  const { data, error } = await getSupabaseClient()
    .from('achievements')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) {
    console.error('Error fetching achievement:', error)
    throw error
  }
  
  return data || null
}

// ============================================
// BATCH OPERATIONS
// Fetch all seed data at once
// ============================================

/**
 * Fetch all seed data in a single request
 */
export const getAllSeedData = async () => {
  const [heroes, enemies, upgrades, achievements] = await Promise.all([
    getHeroes(),
    getEnemies(),
    getUpgrades(),
    getAchievements()
  ])
  
  return {
    heroes,
    enemies,
    upgrades,
    achievements
  }
}

// ============================================
// SEARCH, FILTER, AND SORT UTILITIES
// ============================================

/**
 * Search entities by name
 */
export const searchByName = <T extends { name: string }>(entities: T[], query: string): T[] => {
  const lowerQuery = query.toLowerCase()
  return entities.filter(entity => 
    entity.name.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Filter entities by category
 */
export const filterByCategory = <T extends { category?: string }>(entities: T[], category: string): T[] => {
  if (category === 'all') return entities
  return entities.filter(entity => entity.category === category)
}

/**
 * Sort entities by a property
 */
export const sortEntities = <T, K extends keyof T>(
  entities: T[],
  property: K,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...entities].sort((a, b) => {
    const aVal = a[property]
    const bVal = b[property]
    
    if (aVal === undefined || bVal === undefined) return 0
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return direction === 'asc' ? aVal - bVal : bVal - aVal
    }
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return direction === 'asc' 
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal)
    }
    
    return 0
  })
}

export default {
  getHeroes,
  getHero,
  getEnemies,
  getEnemy,
  getUpgrades,
  getUpgrade,
  getAchievements,
  getAchievement,
  getAllSeedData,
  searchByName,
  filterByCategory,
  sortEntities
}
