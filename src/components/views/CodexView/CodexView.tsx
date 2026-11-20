/**
 * CodexView - Enhanced with Full Entity Stats, DPS Calculator, Detail Modal & Empty State
 * Phase 6 / Phase 9: Data Explorer
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../ui/Card'
import { Button } from '../../ui/Button'
import { Input } from '../../ui/Input'
import { Select } from '../../ui/Select'
import { Badge } from '../../ui/Badge'
import { Modal } from '../../ui/Modal'
import { CodexEmptyState } from '../../ui/EmptyState'
import { useCodex, type CodexEntityType, type CodexEntity } from '../../../hooks/useCodex'
import { GAME_CONFIG } from '../../../config/gameConstants'
import { getHeroAbility } from '../../../config/heroAbilities'
import type { HeroesRow, EnemiesRow, UpgradesRow, AchievementsRow } from '../../../types/database'

const isHero = (e: CodexEntity): e is HeroesRow => 'archetype' in e
const isEnemy = (e: CodexEntity): e is EnemiesRow => 'coin_value' in e
const isUpgrade = (e: CodexEntity): e is UpgradesRow => 'function_desc' in e
const isAchievement = (e: CodexEntity): e is AchievementsRow => 'reward_badge' in e

export function CodexView() {
  const navigate = useNavigate()
  const [selectedEntity, setSelectedEntity] = useState<CodexEntity | null>(null)

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
    clearFilters,
    refresh
  } = useCodex()

  const getTabTotalCount = () => {
    switch (activeTab) {
      case 'heroes':
        return heroes.length
      case 'enemies':
        return enemies.length
      case 'upgrades':
        return upgrades.length
      case 'achievements':
        return achievements.length
    }
  }

  const getEntityName = (entity: CodexEntity): string =>
    'name' in entity ? entity.name : entity.title

  const getEntityCategory = (entity: CodexEntity): string => {
    if (isHero(entity)) return entity.archetype
    if (isEnemy(entity) || isUpgrade(entity)) return entity.category
    return entity.reward_badge
  }

  const getUpgradeName = (upgradeId: string) =>
    upgrades.find(u => u.id === upgradeId)?.name || upgradeId

  const computeDPS = (upgrade: UpgradesRow): string => {
    if (upgrade.damage <= 0) return 'Utility / Support'
    if (upgrade.cooldown_s <= 0) return `${upgrade.damage}/tick (Continuous)`
    return `${(upgrade.damage / upgrade.cooldown_s).toFixed(1)} DPS`
  }

  const tabs: Array<{ id: CodexEntityType; label: string; count: number }> = [
    { id: 'heroes', label: 'Heroes', count: heroes.length },
    { id: 'enemies', label: 'Enemies', count: enemies.length },
    { id: 'upgrades', label: 'Upgrades', count: upgrades.length },
    { id: 'achievements', label: 'Achievements', count: achievements.length }
  ]

  const getSortOptions = () => {
    switch (activeTab) {
      case 'heroes':
        return [
          { value: 'name', label: 'Name' },
          { value: 'hp', label: 'HP' },
          { value: 'speed', label: 'Speed' }
        ]
      case 'enemies':
        return [
          { value: 'name', label: 'Name' },
          { value: 'hp', label: 'HP' },
          { value: 'speed', label: 'Speed' },
          { value: 'coin_value', label: 'Coin Value' }
        ]
      case 'upgrades':
        return [
          { value: 'name', label: 'Name' },
          { value: 'damage', label: 'Damage' },
          { value: 'cooldown_s', label: 'Cooldown' },
          { value: 'category', label: 'Category' }
        ]
      case 'achievements':
        return [
          { value: 'title', label: 'Title' },
          { value: 'reward_badge', label: 'Badge' }
        ]
    }
  }

  const totalCatalog = heroes.length + enemies.length + upgrades.length + achievements.length

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="max-w-7xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-cyan-accent">CODEX</h1>
        <p className="text-gray-400 mt-2">
          Tactical Entity Database — {totalCatalog} Total Entities Cataloged ({getTabTotalCount()} in {activeTab})
        </p>
      </header>

      <main className="max-w-7xl mx-auto">
        {loading && !error && (
          <Card className="bg-gray-900 text-center py-12">
            <div className="text-6xl mb-4 animate-pulse">🔍</div>
            <p className="text-gray-400">Loading Codex data...</p>
          </Card>
        )}

        {error && (
          <Card className="bg-gray-900 text-center py-12">
            <div className="text-6xl mb-4 text-alert-red">⚠️</div>
            <p className="text-gray-400 mb-4">Error loading data: {error}</p>
            <Button variant="primary" onClick={refresh}>
              Retry
            </Button>
          </Card>
        )}

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
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${activeTab} by name, lore, or stats...`}
                label="Search"
              />

              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                options={availableCategories.map(cat => ({
                  value: cat,
                  label: cat === 'all' ? 'All Categories' : cat
                }))}
                label="Filter by Category"
                placeholder="All Categories"
              />

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
                    aria-label="Toggle sort direction"
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-gray-400 mb-4">
              Showing {filteredData.length} of {getTabTotalCount()} entities
            </p>

            {/* Entity Grid */}
            {filteredData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredData.map(entity => {
                  const entityName = getEntityName(entity)
                  const category = getEntityCategory(entity)

                  return (
                    <Card
                      key={entity.id}
                      onClick={() => setSelectedEntity(entity)}
                      className="bg-gray-900 cursor-pointer hover:bg-gray-800 hover:border-cyan-accent/60 border border-gray-800 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg text-white">{entityName}</h3>
                            <Badge variant="primary" size="sm">
                              {category}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">ID: {entity.id}</p>
                        </div>
                        <span className="text-xs text-cyan-accent whitespace-nowrap">Details →</span>
                      </div>

                      {isHero(entity) && (
                        <div className="space-y-2 text-sm">
                          <p className="text-xs font-semibold text-amber-300">
                            {getHeroAbility(entity.id).abilityName} ({getHeroAbility(entity.id).shortTag})
                          </p>
                          <p className="text-gray-300">{entity.lore}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-400 pt-1">
                            <span>HP: <strong className="text-white">{entity.hp}</strong></span>
                            <span>
                              Speed: <strong className="text-cyan-accent">{entity.speed.toFixed(2)}x</strong>{' '}
                              ({Math.round(entity.speed * GAME_CONFIG.BASE_PLAYER_SPEED)} px/s)
                            </span>
                            <span>
                              Starter: <strong className="text-hazard-gold">{getUpgradeName(entity.starting_upgrade_id)}</strong>
                            </span>
                          </div>
                        </div>
                      )}

                      {isEnemy(entity) && (
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-300">{entity.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-400 pt-1">
                            <span>HP: <strong className="text-alert-red">{entity.hp}</strong></span>
                            <span>
                              Speed: <strong className="text-white">{entity.speed.toFixed(2)}x</strong>{' '}
                              ({Math.round(entity.speed * GAME_CONFIG.BASE_PLAYER_SPEED)} px/s)
                            </span>
                            <span>Coins: <strong className="text-hazard-gold">{entity.coin_value}</strong></span>
                          </div>
                        </div>
                      )}

                      {isUpgrade(entity) && (
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-300">{entity.function_desc}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-gray-400 pt-1">
                            <span>Damage: <strong className="text-white">{entity.damage}</strong></span>
                            <span>Cooldown: <strong className="text-white">{entity.cooldown_s}s</strong></span>
                            <span>Output: <strong className="text-cyan-accent">{computeDPS(entity)}</strong></span>
                            {entity.special && (
                              <span>Special: <strong className="text-hazard-gold">{entity.special}</strong></span>
                            )}
                          </div>
                        </div>
                      )}

                      {isAchievement(entity) && (
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-300">{entity.requirement}</p>
                          <div className="text-xs text-hazard-gold pt-1">
                            Reward Badge: {entity.reward_badge}
                          </div>
                        </div>
                      )}
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="bg-gray-900">
                <CodexEmptyState onClearFilters={clearFilters} />
              </Card>
            )}
          </>
        )}
      </main>

      {/* Entity Detail Modal */}
      <Modal
        isOpen={!!selectedEntity}
        onClose={() => setSelectedEntity(null)}
        title={selectedEntity ? getEntityName(selectedEntity) : ''}
        size="lg"
      >
        {selectedEntity && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="primary" size="sm">
                {getEntityCategory(selectedEntity)}
              </Badge>
              <span className="text-xs text-gray-400 font-mono">{selectedEntity.id}</span>
            </div>

            {isHero(selectedEntity) && (
              <>
                <div className="bg-gray-900/90 border border-amber-400/30 rounded p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                    Signature Ability: {getHeroAbility(selectedEntity.id).abilityName}
                  </p>
                  <p className="text-sm text-gray-200 mt-1">
                    {getHeroAbility(selectedEntity.id).description}
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-900 p-3 rounded">
                    <p className="text-xs text-gray-400">Max Health</p>
                    <p className="text-xl font-bold text-white">{selectedEntity.hp} HP</p>
                  </div>
                  <div className="bg-gray-900 p-3 rounded">
                    <p className="text-xs text-gray-400">Move Speed</p>
                    <p className="text-xl font-bold text-cyan-accent">
                      {Math.round(selectedEntity.speed * GAME_CONFIG.BASE_PLAYER_SPEED)} px/s
                    </p>
                  </div>
                  <div className="bg-gray-900 p-3 rounded col-span-2 sm:col-span-1">
                    <p className="text-xs text-gray-400">Starting Weapon</p>
                    <p className="text-sm font-bold text-hazard-gold">
                      {getUpgradeName(selectedEntity.starting_upgrade_id)}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const heroId = selectedEntity.id
                      setSelectedEntity(null)
                      navigate(`/armory?heroId=${heroId}`)
                    }}
                  >
                    Build Loadout
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      const heroId = selectedEntity.id
                      setSelectedEntity(null)
                      navigate(`/play?heroId=${heroId}`)
                    }}
                  >
                    Deploy Now
                  </Button>
                </div>
              </>
            )}

            {isEnemy(selectedEntity) && (
              <>
                <p className="text-gray-200">{selectedEntity.description}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-900 p-3 rounded">
                    <p className="text-xs text-gray-400">Base HP</p>
                    <p className="text-xl font-bold text-alert-red">{selectedEntity.hp}</p>
                  </div>
                  <div className="bg-gray-900 p-3 rounded">
                    <p className="text-xs text-gray-400">Speed</p>
                    <p className="text-xl font-bold text-white">
                      {Math.round(selectedEntity.speed * GAME_CONFIG.BASE_PLAYER_SPEED)} px/s
                    </p>
                  </div>
                  <div className="bg-gray-900 p-3 rounded">
                    <p className="text-xs text-gray-400">Coin Value</p>
                    <p className="text-xl font-bold text-hazard-gold">{selectedEntity.coin_value}</p>
                  </div>
                </div>
              </>
            )}

            {isUpgrade(selectedEntity) && (
              <>
                <p className="text-gray-200">{selectedEntity.function_desc}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-900 p-3 rounded">
                    <p className="text-xs text-gray-400">Damage</p>
                    <p className="text-xl font-bold text-white">{selectedEntity.damage}</p>
                  </div>
                  <div className="bg-gray-900 p-3 rounded">
                    <p className="text-xs text-gray-400">Cooldown</p>
                    <p className="text-xl font-bold text-white">{selectedEntity.cooldown_s}s</p>
                  </div>
                  <div className="bg-gray-900 p-3 rounded col-span-2 sm:col-span-1">
                    <p className="text-xs text-gray-400">Effective Output</p>
                    <p className="text-base font-bold text-cyan-accent">{computeDPS(selectedEntity)}</p>
                  </div>
                </div>
                {selectedEntity.special && (
                  <div className="bg-gray-900 p-3 rounded text-sm text-hazard-gold">
                    Special Trait: {selectedEntity.special}
                  </div>
                )}
              </>
            )}

            {isAchievement(selectedEntity) && (
              <>
                <p className="text-gray-200">{selectedEntity.requirement}</p>
                <div className="bg-gray-900 p-3 rounded text-sm text-hazard-gold">
                  Unlocks Badge: <strong>{selectedEntity.reward_badge}</strong>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CodexView
