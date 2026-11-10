/**
 * useCodex Hook - Codex Data Management
 * Phase 6: Core Build - Data Explorer
 * 
 * This hook provides access to Codex data with search, filter, and sort capabilities.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  getHeroes, 
  getEnemies, 
  getUpgrades, 
  getAchievements,
  searchByName,
  filterByCategory,
  sortEntities
} from '../services/database'
import type { HeroesRow, EnemiesRow, UpgradesRow, AchievementsRow } from '../types/database'

// Entity types for the Codex
type CodexEntityType = 'heroes' | 'enemies' | 'upgrades' | 'achievements'

// Union type for all Codex entities
type CodexEntity = HeroesRow | EnemiesRow | UpgradesRow | AchievementsRow

interface UseCodexReturn {
  // Data
  heroes: HeroesRow[]
  enemies: EnemiesRow[]
  upgrades: UpgradesRow[]
  achievements: AchievementsRow[]
  
  // Loading and error states
  loading: boolean
  error: string | null
  
  // Active tab
  activeTab: CodexEntityType
  setActiveTab: (tab: CodexEntityType) => void
  
  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void
  
  // Filter
  filterCategory: string
  setFilterCategory: (category: string) => void
  availableCategories: string[]
  
  // Sort
  sortBy: string
  setSortBy: (property: string) => void
  sortDirection: 'asc' | 'desc'
  setSortDirection: (direction: 'asc' | 'desc') => void
  
  // Filtered and sorted data for active tab
  filteredData: CodexEntity[]
  
  // Refresh function
  refresh: () => Promise<void>
}

export const useCodex = (): UseCodexReturn => {
  // Data state
  const [heroes, setHeroes] = useState<HeroesRow[]>([])
  const [enemies, setEnemies] = useState<EnemiesRow[]>([])
  const [upgrades, setUpgrades] = useState<UpgradesRow[]>([])
  const [achievements, setAchievements] = useState<AchievementsRow[]>([])
  
  // Loading and error states
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Active tab
  const [activeTab, setActiveTab] = useState<CodexEntityType>('heroes')
  
  // Search
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter
  const [filterCategory, setFilterCategory] = useState('all')
  
  // Sort
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  
  // Get data for active tab
  const getActiveTabData = useCallback((): CodexEntity[] => {
    switch (activeTab) {
      case 'heroes':
        return heroes
      case 'enemies':
        return enemies
      case 'upgrades':
        return upgrades
      case 'achievements':
        return achievements
      default:
        return []
    }
  }, [activeTab, heroes, enemies, upgrades, achievements])
  
  // Get available categories for active tab
  const availableCategories = useMemo(() => {
    const data = getActiveTabData()
    const categories = new Set<string>()
    
    data.forEach(entity => {
      if ('archetype' in entity) categories.add(entity.archetype)
      if ('category' in entity) categories.add(entity.category)
      if ('reward_badge' in entity) categories.add(entity.reward_badge)
    })
    
    return ['all', ...Array.from(categories)]
  }, [getActiveTabData])
  
  // Apply search, filter, and sort to active tab data
  const filteredData = useMemo(() => {
    let data = getActiveTabData()
    
    // Search
    if (searchQuery) {
      data = searchByName(data as any, searchQuery) as CodexEntity[]
    }
    
    // Filter by category
    if (filterCategory !== 'all') {
      data = filterByCategory(data as any, filterCategory) as CodexEntity[]
    }
    
    // Sort
    if (sortBy) {
      data = sortEntities(data, sortBy as any, sortDirection) as CodexEntity[]
    }
    
    return data
  }, [getActiveTabData, searchQuery, filterCategory, sortBy, sortDirection])
  
  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [heroesData, enemiesData, upgradesData, achievementsData] = await Promise.all([
        getHeroes(),
        getEnemies(),
        getUpgrades(),
        getAchievements()
      ])
      
      setHeroes(heroesData || [])
      setEnemies(enemiesData || [])
      setUpgrades(upgradesData || [])
      setAchievements(achievementsData || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [])
  
  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  // Reset filter and search when tab changes
  useEffect(() => {
    setSearchQuery('')
    setFilterCategory('all')
    setSortBy('name')
    setSortDirection('asc')
  }, [activeTab])
  
  return {
    heroes,
    enemies,
    upgrades,
    achievements,
    loading,
    error,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterCategory,
    setFilterCategory,
    availableCategories,
    sortBy,
    setSortBy,
    sortDirection,
    setSortDirection,
    filteredData,
    refresh: fetchData
  }
}

export default useCodex
