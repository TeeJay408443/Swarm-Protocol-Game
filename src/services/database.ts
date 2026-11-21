/**
 * Database Service - Seed Data Operations
 * Phase 6: Core Build - Database Integration
 * 
 * This service provides functions to fetch seed data from Supabase tables.
 * Seed data tables are public read-only and contain game entity definitions.
 */

import { supabase } from './supabase'
import {
  heroes as defaultHeroes,
  enemies as defaultEnemies,
  upgrades as defaultUpgrades,
  achievements as defaultAchievements
} from '../db/seedData'
import { AREA_TWO_BOSSES, AREA_TWO_ENEMIES } from '../config/arenas'
import { AREA_TWO_UPGRADES } from '../config/areaUpgrades'
import type { 
  HeroesRow, 
  EnemiesRow, 
  UpgradesRow, 
  AchievementsRow 
} from '../types/database'

// ============================================
// SEED DATA OPERATIONS
// These tables are public read-only with in-memory fallback
// ============================================

/**
 * Fetch all heroes from the database
 */
export const getHeroes = async (): Promise<HeroesRow[]> => {
  if (!supabase) return defaultHeroes
  try {
    const { data, error } = await supabase
      .from('heroes')
      .select('*')
      .order('name', { ascending: true })
    if (error || !data || data.length === 0) return defaultHeroes
    return data
  } catch {
    return defaultHeroes
  }
}

/**
 * Fetch a single hero by ID
 */
export const getHero = async (id: string): Promise<HeroesRow | null> => {
  if (!supabase) return defaultHeroes.find(h => h.id === id) || null
  try {
    const { data, error } = await supabase
      .from('heroes')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return defaultHeroes.find(h => h.id === id) || null
    return data
  } catch {
    return defaultHeroes.find(h => h.id === id) || null
  }
}

/**
 * Fetch all enemies from the database
 */
export const getEnemies = async (): Promise<EnemiesRow[]> => {
  const mergeWithAreaTwo = (base: EnemiesRow[]): EnemiesRow[] => {
    const seen = new Set(base.map((e) => e.id))
    const areaTwoRoster = [...AREA_TWO_ENEMIES, ...AREA_TWO_BOSSES]
    return [...base, ...areaTwoRoster.filter((e) => !seen.has(e.id))]
  }

  if (!supabase) return mergeWithAreaTwo(defaultEnemies)
  try {
    const { data, error } = await supabase
      .from('enemies')
      .select('*')
      .order('name', { ascending: true })
    if (error || !data || data.length === 0) return mergeWithAreaTwo(defaultEnemies)
    return mergeWithAreaTwo(data)
  } catch {
    return mergeWithAreaTwo(defaultEnemies)
  }
}

/**
 * Fetch a single enemy by ID
 */
export const getEnemy = async (id: string): Promise<EnemiesRow | null> => {
  if (!supabase) return defaultEnemies.find(e => e.id === id) || null
  try {
    const { data, error } = await supabase
      .from('enemies')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return defaultEnemies.find(e => e.id === id) || null
    return data
  } catch {
    return defaultEnemies.find(e => e.id === id) || null
  }
}

/**
 * Fetch all upgrades from the database
 */
export const getUpgrades = async (): Promise<UpgradesRow[]> => {
  const mergeWithAreaTwo = (base: UpgradesRow[]): UpgradesRow[] => {
    const seen = new Set(base.map((u) => u.id))
    return [...base, ...AREA_TWO_UPGRADES.filter((u) => !seen.has(u.id))]
  }

  if (!supabase) return mergeWithAreaTwo(defaultUpgrades)
  try {
    const { data, error } = await supabase
      .from('upgrades')
      .select('*')
      .order('name', { ascending: true })
    if (error || !data || data.length === 0) return mergeWithAreaTwo(defaultUpgrades)
    return mergeWithAreaTwo(data)
  } catch {
    return mergeWithAreaTwo(defaultUpgrades)
  }
}

/**
 * Fetch a single upgrade by ID
 */
export const getUpgrade = async (id: string): Promise<UpgradesRow | null> => {
  const localPool = [...defaultUpgrades, ...AREA_TWO_UPGRADES]
  if (!supabase) return localPool.find(u => u.id === id) || null
  try {
    const { data, error } = await supabase
      .from('upgrades')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return localPool.find(u => u.id === id) || null
    return data
  } catch {
    return localPool.find(u => u.id === id) || null
  }
}

/**
 * Fetch all achievements from the database
 */
export const getAchievements = async (): Promise<AchievementsRow[]> => {
  if (!supabase) return defaultAchievements
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .order('title', { ascending: true })
    if (error || !data || data.length === 0) return defaultAchievements
    return data
  } catch {
    return defaultAchievements
  }
}

/**
 * Fetch a single achievement by ID
 */
export const getAchievement = async (id: string): Promise<AchievementsRow | null> => {
  if (!supabase) return defaultAchievements.find(a => a.id === id) || null
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('id', id)
      .single()
    if (error || !data) return defaultAchievements.find(a => a.id === id) || null
    return data
  } catch {
    return defaultAchievements.find(a => a.id === id) || null
  }
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
