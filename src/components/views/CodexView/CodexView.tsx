/**
 * CodexView - Enhanced with useCodex Hook
 * Phase 6: Core Build - Data Explorer
 */

import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { Badge } from '../../ui/Badge'
import { useCodex } from '../../../hooks/useCodex'
import type { HeroesRow, EnemiesRow, UpgradesRow, AchievementsRow } from '../../../types/database'

type EntityType = 'heroes' | 'enemies' | 'upgrades' | 'achievements'

export function CodexView() {
  // Use the useCodex hook for data management
  const {
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
    refresh,
  } = useCodex()

  // Get data for active tab (already filtered, searched, and sorted)
  const getData = (): (HeroesRow | EnemiesRow | UpgradesRow | AchievementsRow)[] => {
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
  }

  // Get entity name (handles both name and title)
  const getEntityName = (entity: HeroesRow | EnemiesRow | UpgradesRow | AchievementsRow): string => {
    return 'name' in entity ? entity.name : entity.title
  }

  // Get entity category/type
  const getEntityCategory = (entity: HeroesRow | EnemiesRow | UpgradesRow | AchievementsRow): string => {
    if ('archetype' in entity) return entity.archetype
    if ('category' in entity) return entity.category
    return entity.reward_badge || 'General'
  }

  // Tab configuration
  const tabs = [
    { id: 'heroes' as EntityType, label: 'Heroes', count: heroes.length },
    { id: 'enemies' as EntityType, label: 'Enemies', count: enemies.length },
    { id: 'upgrades' as EntityType, label: 'Upgrades', count: upgrades.length },
    { id: 'achievements' as EntityType, label: 'Achievements', count: achievements.length },
  ]

  // Sort options for each tab
  const getSortOptions = () => {
    switch (activeTab) {
      case 'heroes':
        return [
          { value: 'name', label: 'Name' },
          { value: 'hp', label: 'HP' },
          { value: 'speed', label: 'Speed' },
        ]
      case 'enemies':
        return [
          { value: 'name', label: 'Name' },
          { value: 'hp', label: 'HP' },
          { value: 'speed', label: 'Speed' },
          { value: 'coin_value', label: 'Coin Value' },
        ]
      case 'upgrades':
        return [
          { value: 'name', label: 'Name' },
          { value: 'damage', label: 'Damage' },
          { value: 'cooldown_s', label: 'Cooldown' },
          { value: 'category', label: 'Category' },
        ]
      case 'achievements':
        return [
          { value: 'title', label: 'Title' },
        ]
      default:
        return [{ value: 'name', label: 'Name' }]
    }
  }

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-cyan-accent">CODEX</h1>
        <p className="text-gray-400 mt-2">
          Game Entity Database - {getData().length} Entities Cataloged
        </p>
      </header>

      <main className="max-w-7xl mx-auto">
        {/* Loading State */}
        {loading && !error && (
          <Card className="bg-gray-900 text-center py-12">
            <div className="text-6xl mb-4 animate-pulse">🔍</div>
            <p className="text-gray-400">Loading Codex data...</p>
          </Card>
        )}

        {/* Error State */}
        {error && (
          <Card className="bg-gray-900 text-center py-12">
            <div className="text-6xl mb-4 text-alert-red">⚠️</div>
            <p className="text-gray-400 mb-4">Error loading data: {error}</p>
            <Button variant="primary" onClick={refresh}>
              Retry
            </Button>
          </Card>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <>
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
              {tabs.map(tab => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'primary' : 'secondary'}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label} ({tab.count})
                </Button>
              ))}
            </div>

            {/* Search and Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Search */}
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab}...`}
                label="Search"
              />

              {/* Filter */}
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                options={availableCategories.map(cat => ({
                  value: cat,
                  label: cat.charAt(0).toUpperCase() + cat.slice(1)
                }))}
                label="Filter by Category"
                placeholder="All Categories"
              />

              {/* Sort */}
              <div className="flex flex-col gap-2">
                <label className="block text-sm text-gray-400">Sort By</label>
                <div className="flex gap-2">
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    options={getSortOptions()}
                    placeholder="Select property"
                    className="flex-grow"
                  />
                  <Button
                    variant={sortDirection === 'asc' ? 'primary' : 'secondary'}
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2"
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <p className="text-gray-400 mb-4">
              Showing {filteredData.length} of {getData().length} entities
            </p>

            {/* Entity List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredData.length > 0 ? (
                filteredData.map(entity => {
                  const entityName = getEntityName(entity)
                  const category = getEntityCategory(entity)

                  return (
                    <Card
                      key={entity.id}
                      className="bg-gray-900 cursor-pointer hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white truncate">{entityName}</h3>
                            <Badge variant="secondary" size="sm">
                              {category}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            ID: {entity.id}
                          </p>
                        </div>
                      </div>
                    </Card>
                  )
                })
              ) : (
                <Card className="bg-gray-900 text-center py-12 md:col-span-2">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No entities found</h3>
                  <p className="text-gray-400">Try adjusting your search or filter criteria</p>
                </Card>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default CodexView
