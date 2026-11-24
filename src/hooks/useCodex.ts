/**
 * useCodex Hook - Codex Data Management
 * Phase 6 / Phase 9: Data Explorer with Multi-Field Search, Filtering & Sorting
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getHeroes,
  getEnemies,
  getUpgrades,
  getAchievements,
  sortEntities
} from '../services/database'
import {
  RARITY_META,
  SHOP_CATALOG,
  type ShopCatalogItem
} from '../services/shop'
import type { HeroesRow, EnemiesRow, UpgradesRow, AchievementsRow } from '../types/database'

export type CodexEntityType = 'heroes' | 'enemies' | 'upgrades' | 'gear' | 'achievements'
export type CodexEntity = HeroesRow | EnemiesRow | UpgradesRow | ShopCatalogItem | AchievementsRow

const isShopCatalogItem = (entity: CodexEntity): entity is ShopCatalogItem =>
  'kind' in entity && (entity.kind === 'weapon' || entity.kind === 'accessory')

interface UseCodexReturn {
  heroes: HeroesRow[]
  enemies: EnemiesRow[]
  upgrades: UpgradesRow[]
  gearItems: ShopCatalogItem[]
  achievements: AchievementsRow[]
  loading: boolean
  error: string | null
  activeTab: CodexEntityType
  setActiveTab: (tab: CodexEntityType) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  filterCategory: string
  setFilterCategory: (category: string) => void
  availableCategories: string[]
  sortBy: string
  setSortBy: (property: string) => void
  sortDirection: 'asc' | 'desc'
  setSortDirection: (direction: 'asc' | 'desc') => void
  filteredData: CodexEntity[]
  clearFilters: () => void
  refresh: () => Promise<void>
}

export const useCodex = (): UseCodexReturn => {
  const [heroes, setHeroes] = useState<HeroesRow[]>([])
  const [enemies, setEnemies] = useState<EnemiesRow[]>([])
  const [upgrades, setUpgrades] = useState<UpgradesRow[]>([])
  const [achievements, setAchievements] = useState<AchievementsRow[]>([])
  const gearItems = SHOP_CATALOG

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTabState] = useState<CodexEntityType>('heroes')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const setActiveTab = useCallback((tab: CodexEntityType) => {
    setActiveTabState(tab)
    setSearchQuery('')
    setFilterCategory('all')
    if (tab === 'gear') {
      setSortBy('rarity')
      setSortDirection('desc')
    } else if (tab === 'achievements') {
      setSortBy('title')
      setSortDirection('asc')
    } else {
      setSortBy('name')
      setSortDirection('asc')
    }
  }, [])

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setFilterCategory('all')
    if (activeTab === 'gear') {
      setSortBy('rarity')
      setSortDirection('desc')
    } else if (activeTab === 'achievements') {
      setSortBy('title')
      setSortDirection('asc')
    } else {
      setSortBy('name')
      setSortDirection('asc')
    }
  }, [activeTab])

  const getActiveTabData = useCallback((): CodexEntity[] => {
    switch (activeTab) {
      case 'heroes':
        return heroes
      case 'enemies':
        return enemies
      case 'upgrades':
        return upgrades
      case 'gear':
        return gearItems
      case 'achievements':
        return achievements
      default:
        return []
    }
  }, [activeTab, heroes, enemies, upgrades, gearItems, achievements])

  const availableCategories = useMemo(() => {
    if (activeTab === 'gear') {
      return [
        'all',
        'Weapons',
        'Accessories',
        'Mythic',
        'Legendary',
        'Epic',
        'Rare',
        'Uncommon',
        'Common',
        'Faulty',
        'Scrap'
      ]
    }

    const data = getActiveTabData()
    const categories = new Set<string>()

    data.forEach(entity => {
      if ('archetype' in entity) categories.add(entity.archetype)
      if ('category' in entity) categories.add(entity.category)
      if ('reward_badge' in entity) categories.add(entity.reward_badge)
    })

    return ['all', ...Array.from(categories)]
  }, [activeTab, getActiveTabData])

  const filteredData = useMemo(() => {
    let data = getActiveTabData()

    // Search across name/title, lore, description, function_desc, rarity, pairing, special
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      data = data.filter(entity => {
        const fields: string[] = [entity.id]
        if ('name' in entity) fields.push(entity.name)
        if ('title' in entity) fields.push(entity.title)
        if ('archetype' in entity) fields.push(entity.archetype)
        if ('lore' in entity) fields.push(entity.lore)
        if ('category' in entity) fields.push(entity.category)
        if ('description' in entity) fields.push(entity.description)
        if ('function_desc' in entity) fields.push(entity.function_desc)
        if ('special' in entity && entity.special) fields.push(entity.special)
        if ('requirement' in entity) fields.push(entity.requirement)
        if ('reward_badge' in entity) fields.push(entity.reward_badge)
        if (isShopCatalogItem(entity)) {
          fields.push(entity.kind, entity.rarity, RARITY_META[entity.rarity].label)
          if (entity.kind === 'weapon') {
            fields.push(entity.tierLabel)
            if (entity.pairedHeroLabel) fields.push(entity.pairedHeroLabel)
          } else {
            fields.push(entity.slotLabel, entity.statSummary)
          }
        }
        return fields.some(f => f.toLowerCase().includes(q))
      })
    }

    // Filter across archetype, category, gear kind/rarity, or reward_badge
    if (filterCategory !== 'all') {
      data = data.filter(entity => {
        if (isShopCatalogItem(entity)) {
          if (filterCategory === 'Weapons') return entity.kind === 'weapon'
          if (filterCategory === 'Accessories') return entity.kind === 'accessory'
          return entity.rarity === filterCategory.toLowerCase()
        }
        if ('archetype' in entity) return entity.archetype === filterCategory
        if ('category' in entity) return entity.category === filterCategory
        if ('reward_badge' in entity) return entity.reward_badge === filterCategory
        return true
      })
    }

    // Sort
    if (sortBy) {
      if (activeTab === 'gear') {
        data = [...data].sort((a, b) => {
          if (!isShopCatalogItem(a) || !isShopCatalogItem(b)) return 0
          let cmp = 0
          if (sortBy === 'rarity') {
            cmp = RARITY_META[a.rarity].order - RARITY_META[b.rarity].order
            if (cmp === 0) cmp = a.name.localeCompare(b.name)
          } else if (sortBy === 'price') {
            cmp = a.price - b.price
          } else if (sortBy === 'salvageValue') {
            cmp = a.salvageValue - b.salvageValue
          } else if (sortBy === 'damage') {
            const aDmg = a.kind === 'weapon' ? a.damage : 0
            const bDmg = b.kind === 'weapon' ? b.damage : 0
            cmp = aDmg - bDmg
          } else {
            cmp = a.name.localeCompare(b.name)
          }
          return sortDirection === 'asc' ? cmp : -cmp
        })
      } else {
        data = sortEntities(data, sortBy as keyof CodexEntity, sortDirection) as CodexEntity[]
      }
    }

    return data
  }, [activeTab, getActiveTabData, searchQuery, filterCategory, sortBy, sortDirection])

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
      setError(err instanceof Error ? err.message : 'Failed to fetch Codex data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    heroes,
    enemies,
    upgrades,
    gearItems,
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
    clearFilters,
    refresh: fetchData
  }
}

export default useCodex
