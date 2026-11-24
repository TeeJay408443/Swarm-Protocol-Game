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
import { useSupabase } from '../../../hooks/useSupabase'
import { GAME_CONFIG, getUpgradeOverdriveHint } from '../../../config/gameConstants'
import {
  getHeroAbility,
  getHeroSignatureTierSummary,
  MAX_HERO_SIGNATURE_LEVEL
} from '../../../config/heroAbilities'
import { getUnlockableHeroSpec, isUnlockableHero } from '../../../config/unlockableHeroes'
import { useHeroUnlocks } from '../../../services/heroUnlocks'
import { getLocalPlayerTelemetry } from '../../../services/scores'
import { formatMasteryBonusSummary, useHeroMastery } from '../../../services/heroMastery'
import { useHeroUpgrades } from '../../../services/heroUpgrades'
import {
  getHighestOwnedStar,
  getTotalStackCount,
  RARITY_META,
  SHOP_ACCESSORIES,
  SHOP_WEAPONS,
  useShopState,
  type GearRarity,
  type ShopCatalogItem
} from '../../../services/shop'
import type { HeroesRow, EnemiesRow, UpgradesRow, AchievementsRow } from '../../../types/database'

const isHero = (e: CodexEntity): e is HeroesRow => 'archetype' in e
const isEnemy = (e: CodexEntity): e is EnemiesRow => 'coin_value' in e
const isGearItem = (e: CodexEntity): e is ShopCatalogItem =>
  'kind' in e && (e.kind === 'weapon' || e.kind === 'accessory')
const isUpgrade = (e: CodexEntity): e is UpgradesRow =>
  'function_desc' in e && !isGearItem(e)
const isAchievement = (e: CodexEntity): e is AchievementsRow => 'reward_badge' in e

const CODEX_GEAR_RARITIES: GearRarity[] = [
  'mythic',
  'legendary',
  'epic',
  'rare',
  'uncommon',
  'common',
  'faulty',
  'scrap'
]

export function CodexView() {
  const navigate = useNavigate()
  const { user } = useSupabase()
  const effectiveUserId = user?.id || 'guest_user'
  const highestWave = getLocalPlayerTelemetry(effectiveUserId).highest_wave || 0
  const { isUnlocked: isHeroAvailable } = useHeroUnlocks(user?.id, highestWave)
  const { getProgress: getMasteryProgress } = useHeroMastery(user?.id)
  const { getSignatureLevel } = useHeroUpgrades(user?.id)
  const { shopState } = useShopState(user?.id)
  const [selectedEntity, setSelectedEntity] = useState<CodexEntity | null>(null)

  const {
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
      case 'gear':
        return gearItems.length
      case 'achievements':
        return achievements.length
    }
  }

  const getEntityName = (entity: CodexEntity): string =>
    'name' in entity ? entity.name : entity.title

  const getEntityCategory = (entity: CodexEntity): string => {
    if (isHero(entity)) return entity.archetype
    if (isGearItem(entity)) {
      return `${RARITY_META[entity.rarity].label} · ${entity.kind === 'weapon' ? entity.category : entity.slotLabel}`
    }
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

  const computeWeaponDps = (damage: number, cooldown: number): string => {
    if (damage <= 0) return 'Utility'
    if (cooldown <= 0) return `${damage}/tick`
    return `${(damage / cooldown).toFixed(1)} DPS`
  }

  const tabs: Array<{ id: CodexEntityType; label: string; count: number }> = [
    { id: 'heroes', label: 'Heroes', count: heroes.length },
    { id: 'enemies', label: 'Enemies', count: enemies.length },
    { id: 'upgrades', label: 'Upgrades', count: upgrades.length },
    { id: 'gear', label: 'Weapons & Gear', count: gearItems.length },
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
      case 'gear':
        return [
          { value: 'rarity', label: 'Rarity Tier' },
          { value: 'name', label: 'Name' },
          { value: 'damage', label: 'Damage' },
          { value: 'price', label: 'Value / Price' },
          { value: 'salvageValue', label: 'Salvage Value' }
        ]
      case 'achievements':
        return [
          { value: 'title', label: 'Title' },
          { value: 'reward_badge', label: 'Badge' }
        ]
    }
  }

  const totalCatalog =
    heroes.length + enemies.length + upgrades.length + gearItems.length + achievements.length

  return (
    <div className="min-h-screen bg-slate-carbon text-white p-6">
      <header className="max-w-7xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-cyan-accent">CODEX</h1>
        <p className="text-gray-400 mt-2">
          Tactical Entity & Gear Index — {totalCatalog} Total Entries ({getTabTotalCount()} in{' '}
          {activeTab === 'gear' ? 'weapons & gear' : activeTab})
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
                placeholder={
                  activeTab === 'gear'
                    ? 'Search weapons & accessories by name, rarity, trait, or hero...'
                    : `Search ${activeTab} by name, lore, or stats...`
                }
                label="Search"
              />

              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                options={availableCategories.map(cat => ({
                  value: cat,
                  label: cat === 'all' ? 'All Categories' : cat
                }))}
                label={activeTab === 'gear' ? 'Filter by Type / Rarity' : 'Filter by Category'}
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

            {/* Weapons & Accessories Index Quick Filter Bar */}
            {activeTab === 'gear' && (
              <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-4 mb-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-3 text-gray-300 tabular-nums">
                    <span>
                      Weapons: <strong className="text-cyan-accent">{SHOP_WEAPONS.length}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Accessories: <strong className="text-emerald-300">{SHOP_ACCESSORIES.length}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Unlocked:{' '}
                      <strong className="text-hazard-gold">
                        {shopState.ownedIds.length}/{gearItems.length}
                      </strong>
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(['all', 'Weapons', 'Accessories'] as const).map(kindFilter => (
                      <button
                        key={kindFilter}
                        type="button"
                        onClick={() => setFilterCategory(kindFilter)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors ${
                          filterCategory === kindFilter
                            ? 'bg-cyan-accent/20 border-cyan-accent text-cyan-accent'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {kindFilter === 'all' ? 'All Gear' : kindFilter}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-800">
                  {CODEX_GEAR_RARITIES.map(rarity => {
                    const count = gearItems.filter(g => g.rarity === rarity).length
                    const meta = RARITY_META[rarity]
                    const labelCapitalized = rarity.charAt(0).toUpperCase() + rarity.slice(1)
                    const active = filterCategory === labelCapitalized
                    return (
                      <button
                        key={rarity}
                        type="button"
                        onClick={() => setFilterCategory(active ? 'all' : labelCapitalized)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors tabular-nums ${
                          active
                            ? 'bg-gray-800 border-white text-white'
                            : 'bg-gray-950/70 border-gray-800 text-gray-300 hover:border-gray-600'
                        }`}
                        style={active ? { borderColor: meta.color, color: meta.color } : undefined}
                      >
                        <span style={{ color: meta.color }}>{labelCapitalized}</span> ({count})
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="text-gray-400 mb-4">
              Showing {filteredData.length} of {getTabTotalCount()}{' '}
              {activeTab === 'gear' ? 'weapons & accessories' : 'entities'}
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

                      {isHero(entity) && (() => {
                        const mastery = getMasteryProgress(entity.id)
                        const sigLv = getSignatureLevel(entity.id)
                        const sigSummary = getHeroSignatureTierSummary(entity.id, sigLv)
                        const unlockable = isUnlockableHero(entity.id)
                        const unlockSpec = getUnlockableHeroSpec(entity.id)
                        const unlocked = isHeroAvailable(entity.id)
                        return (
                          <div className="space-y-2 text-sm">
                            {unlockable && unlockSpec && (
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span
                                  className={`font-bold uppercase tracking-wide ${
                                    unlocked ? 'text-emerald-300' : 'text-purple-300'
                                  }`}
                                >
                                  {unlocked ? '✓ Unlocked Operative' : `Locked · ${unlockSpec.unlockSummary}`}
                                </span>
                              </div>
                            )}
                            <p className="text-xs font-semibold text-amber-300 tabular-nums">
                              {getHeroAbility(entity.id).abilityName} · Lv.{sigLv}/{MAX_HERO_SIGNATURE_LEVEL} ({sigSummary.hudTag})
                            </p>
                            <p className="text-xs text-cyan-200 tabular-nums">
                              {sigSummary.currentSummary}
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
                            <div className="text-xs text-emerald-300 pt-1 tabular-nums">
                              Mastery Rank {mastery.currentTier}/{mastery.maxTier} ({mastery.roundsCompleted} rds) ·{' '}
                              {formatMasteryBonusSummary(mastery.totalBonuses)}
                            </div>
                          </div>
                        )
                      })()}

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

                      {isGearItem(entity) && (() => {
                        const rarityMeta = RARITY_META[entity.rarity]
                        const ownedCount = getTotalStackCount(shopState, entity.id)
                        const highestStar = getHighestOwnedStar(shopState, entity.id)
                        return (
                          <div className="space-y-2 text-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                              <span
                                className="font-bold uppercase tracking-wide"
                                style={{ color: rarityMeta.color }}
                              >
                                {rarityMeta.label} · {entity.kind === 'weapon' ? 'Weapon' : 'Accessory'}
                              </span>
                              <span
                                className={`font-semibold tabular-nums ${
                                  ownedCount > 0 ? 'text-emerald-400' : 'text-gray-400'
                                }`}
                              >
                                {ownedCount > 0
                                  ? `Owned ×${ownedCount}${highestStar !== null ? ` (${highestStar}★ best)` : ''}`
                                  : RARITY_META[entity.rarity].isBad
                                    ? 'Supply Crate Only'
                                    : 'Crates / 10m Shop Sale'}
                              </span>
                            </div>

                            <p className="text-gray-300">{entity.function_desc}</p>

                            {entity.kind === 'weapon' ? (
                              <>
                                {entity.pairedHeroLabel && (
                                  <p className="text-xs font-semibold text-rose-400">
                                    ★ {entity.pairedHeroLabel}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-3 text-xs text-gray-400 pt-1 tabular-nums">
                                  <span>Damage: <strong className="text-white">{entity.damage}</strong></span>
                                  <span>Cooldown: <strong className="text-white">{entity.cooldown_s}s</strong></span>
                                  <span>Output: <strong className="text-cyan-accent">{computeWeaponDps(entity.damage, entity.cooldown_s)}</strong></span>
                                  <span>Salvage: <strong className="text-hazard-gold">{entity.salvageValue}c</strong></span>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-wrap gap-3 text-xs text-gray-400 pt-1 tabular-nums">
                                <span>Effects: <strong className="text-cyan-accent">{entity.statSummary}</strong></span>
                                <span>
                                  Source:{' '}
                                  <strong className="text-white">
                                    {RARITY_META[entity.rarity].isBad ? 'Crate-Only' : 'Crates / 10m Sale'}
                                  </strong>
                                </span>
                                <span>Salvage: <strong className="text-hazard-gold">{entity.salvageValue}c</strong></span>
                              </div>
                            )}
                          </div>
                        )
                      })()}

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

            {isHero(selectedEntity) && (() => {
              const mastery = getMasteryProgress(selectedEntity.id)
              const sigLv = getSignatureLevel(selectedEntity.id)
              const sigSummary = getHeroSignatureTierSummary(selectedEntity.id, sigLv)
              const unlockable = isUnlockableHero(selectedEntity.id)
              const unlockSpec = getUnlockableHeroSpec(selectedEntity.id)
              const unlocked = isHeroAvailable(selectedEntity.id)
              return (
                <>
                  {unlockable && unlockSpec && (
                    <div
                      className={`rounded p-3 border text-xs ${
                        unlocked
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                          : 'bg-purple-950/50 border-purple-500/50 text-purple-200'
                      }`}
                    >
                      <span className="font-bold uppercase tracking-wider">
                        {unlocked ? 'Operative Unlocked' : 'Unlock Requirement:'}
                      </span>{' '}
                      {unlocked
                        ? `${selectedEntity.name} is active in your roster.`
                        : `${unlockSpec.unlockSummary} (Current Best Wave: ${highestWave}/${unlockSpec.unlockWave}).`}
                    </div>
                  )}
                  <div className="bg-gray-900/90 border border-amber-400/30 rounded p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-300 tabular-nums">
                      Signature Ability: {getHeroAbility(selectedEntity.id).abilityName} · Lv.{sigLv}/{MAX_HERO_SIGNATURE_LEVEL}
                    </p>
                    <p className="text-sm text-gray-200 mt-1">
                      {getHeroAbility(selectedEntity.id).description}
                    </p>
                    <p className="text-xs text-cyan-300 font-semibold mt-1.5 tabular-nums">
                      Active Tier: {sigSummary.currentSummary}
                    </p>
                    {sigSummary.nextSummary && (
                      <p className="text-xs text-gray-400 mt-0.5 tabular-nums">
                        Next Tier (Lv.{sigLv + 1}): {sigSummary.nextSummary}
                      </p>
                    )}
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

                  {/* Hero Mastery 5-Tier Track */}
                  <div className="bg-gray-900/90 border border-gray-700 rounded-lg p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-cyan-accent">
                        Hero Mastery Track · Rank {mastery.currentTier}/{mastery.maxTier}
                      </p>
                      <span className="text-xs text-gray-300 tabular-nums">
                        {mastery.roundsCompleted} rounds completed
                      </span>
                    </div>
                    <p className="text-xs text-emerald-300">
                      Active Passives: {formatMasteryBonusSummary(mastery.totalBonuses)}
                    </p>
                    <div className="space-y-1.5">
                      {mastery.tiers.map(tier => (
                        <div
                          key={tier.tier}
                          className={`flex items-center justify-between gap-3 rounded px-3 py-2 text-xs border ${
                            tier.unlocked
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                              : 'bg-gray-800/70 border-gray-700/60 text-gray-400'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="font-bold text-white">
                              Tier {tier.tier}: {tier.title}
                            </span>
                            <span className="ml-2 text-emerald-300">{tier.summary}</span>
                          </div>
                          <Badge variant={tier.unlocked ? 'success' : 'secondary'} size="sm">
                            {tier.unlocked ? 'Unlocked' : `${tier.requiredRounds} rds`}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {unlocked ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSelectedEntity(null)
                            navigate('/play')
                          }}
                        >
                          Play Arena (Reach Wave {unlockSpec?.unlockWave ?? 8})
                        </Button>
                        <Button
                          variant="primary"
                          onClick={() => {
                            setSelectedEntity(null)
                            navigate('/shop')
                          }}
                        >
                          Recruit in Shop ({(unlockSpec?.unlockCoinCost ?? 1500).toLocaleString()} Coins)
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )
            })()}

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

            {isGearItem(selectedEntity) && (() => {
              const rarityMeta = RARITY_META[selectedEntity.rarity]
              const ownedCount = getTotalStackCount(shopState, selectedEntity.id)
              const highestStar = getHighestOwnedStar(shopState, selectedEntity.id)
              return (
                <>
                  <p className="text-gray-200">{selectedEntity.function_desc}</p>

                  {selectedEntity.kind === 'weapon' && selectedEntity.pairedHeroLabel && (
                    <div className="bg-rose-950/40 border border-rose-500/40 rounded p-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-rose-300">
                        Hero Pairing Synergy
                      </p>
                      <p className="text-sm text-rose-100 mt-1">{selectedEntity.pairedHeroLabel}</p>
                    </div>
                  )}

                  {selectedEntity.kind === 'weapon' ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-gray-900 p-3 rounded">
                          <p className="text-xs text-gray-400">Base Damage</p>
                          <p className="text-xl font-bold text-white">{selectedEntity.damage}</p>
                        </div>
                        <div className="bg-gray-900 p-3 rounded">
                          <p className="text-xs text-gray-400">Cooldown</p>
                          <p className="text-xl font-bold text-white">{selectedEntity.cooldown_s}s</p>
                        </div>
                        <div className="bg-gray-900 p-3 rounded">
                          <p className="text-xs text-gray-400">Base Output</p>
                          <p className="text-lg font-bold text-cyan-accent">
                            {computeWeaponDps(selectedEntity.damage, selectedEntity.cooldown_s)}
                          </p>
                        </div>
                        <div className="bg-gray-900 p-3 rounded">
                          <p className="text-xs text-gray-400">Salvage</p>
                          <p className="text-lg font-bold text-hazard-gold">
                            {selectedEntity.salvageValue} Coins
                          </p>
                        </div>
                      </div>
                      <div className="bg-gray-900 p-3 rounded text-sm space-y-1">
                        <p className="text-hazard-gold">
                          Special Trait: <strong>{selectedEntity.special}</strong>
                        </p>
                        <p className="text-cyan-accent text-xs">
                          {getUpgradeOverdriveHint(selectedEntity.id)}
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="bg-gray-900 p-3 rounded col-span-2 sm:col-span-1">
                          <p className="text-xs text-gray-400">Stat Modifiers (0★)</p>
                          <p className="text-sm font-bold text-cyan-accent">{selectedEntity.statSummary}</p>
                        </div>
                        <div className="bg-gray-900 p-3 rounded">
                          <p className="text-xs text-gray-400">Acquire Source</p>
                          <p className="text-sm font-bold text-white">
                            {RARITY_META[selectedEntity.rarity].isBad
                              ? 'Supply Crate Only'
                              : 'Supply Crates & 10m Shop Rotation'}
                          </p>
                        </div>
                        <div className="bg-gray-900 p-3 rounded">
                          <p className="text-xs text-gray-400">Salvage Value</p>
                          <p className="text-sm font-bold text-hazard-gold">
                            {selectedEntity.salvageValue} Coins
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="bg-gray-900 p-3 rounded flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span style={{ color: rarityMeta.color }} className="font-bold">
                      Rarity: {rarityMeta.label} ·{' '}
                      {selectedEntity.kind === 'weapon' ? 'Rotating Sale / Crate Weapon' : 'Tactical Accessory'}
                    </span>
                    <span className={ownedCount > 0 ? 'text-emerald-400 font-semibold' : 'text-gray-400'}>
                      {ownedCount > 0
                        ? `In Armory: ×${ownedCount} copies${highestStar !== null ? ` · Best ${highestStar}★` : ''}`
                        : 'Not yet owned (fuse duplicates up to 5★ in Armory)'}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedEntity(null)
                        navigate('/shop')
                      }}
                    >
                      Visit Shop &amp; Crates
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => {
                        setSelectedEntity(null)
                        navigate('/armory?tab=inventory')
                      }}
                    >
                      View in Armory
                    </Button>
                  </div>
                </>
              )
            })()}

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
