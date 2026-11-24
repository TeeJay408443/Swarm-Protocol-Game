/**
 * Hero Signature Upgrades Service
 * Persists coin-purchased hero signature ability upgrade ranks (Lv.0..5) per user account.
 */

import { useEffect, useState } from 'react'
import { ALL_HEROES, getUnlockableHeroSpec } from '../config/unlockableHeroes'
import {
  clampHeroUpgradeLevel,
  formatHeroUpgradeStats,
  getHeroAbility,
  getHeroUpgradeCost,
  getHeroUpgradeSpec,
  MAX_HERO_UPGRADE_LEVEL
} from '../config/heroAbilities'
import { isHeroUnlocked } from './heroUnlocks'
import { getLocalPlayerTelemetry } from './scores'
import { spendShopCoins } from './shop'

export interface HeroUpgradesAccountState {
  userId: string
  levelsByHero: Record<string, number>
  updatedAt: string
}

export interface PurchaseHeroUpgradeResult {
  success: boolean
  state: HeroUpgradesAccountState
  heroId: string
  previousLevel: number
  newLevel: number
  costPaid: number
  error?: string
}

const HERO_UPGRADES_STORAGE_KEY = 'swarm_protocol_hero_upgrades_v1'
const memoryHeroUpgradesStorage = new Map<string, string>()
const heroUpgradeListeners = new Set<() => void>()

function getHeroUpgradesStorageKey(userId?: string | null): string {
  const effective = !userId || userId === 'guest_user' ? 'guest_user' : userId
  return effective === 'guest_user'
    ? HERO_UPGRADES_STORAGE_KEY
    : `${HERO_UPGRADES_STORAGE_KEY}_${effective}`
}

function normalizeLevels(raw?: Record<string, number>): Record<string, number> {
  const normalized: Record<string, number> = {}
  if (!raw || typeof raw !== 'object') return normalized
  for (const [heroId, lv] of Object.entries(raw)) {
    const clamped = clampHeroUpgradeLevel(lv)
    if (clamped > 0) {
      normalized[heroId] = clamped
    }
  }
  return normalized
}

function readRawHeroUpgrades(userId?: string | null): HeroUpgradesAccountState {
  const effectiveUserId = userId || 'guest_user'
  const key = getHeroUpgradesStorageKey(effectiveUserId)
  const fallback: HeroUpgradesAccountState = {
    userId: effectiveUserId,
    levelsByHero: {},
    updatedAt: new Date().toISOString()
  }

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) {
        memoryHeroUpgradesStorage.set(key, raw)
        const parsed = JSON.parse(raw) as HeroUpgradesAccountState
        return {
          ...fallback,
          ...parsed,
          userId: effectiveUserId,
          levelsByHero: normalizeLevels(parsed.levelsByHero)
        }
      }
    }
    const mem = memoryHeroUpgradesStorage.get(key)
    if (mem) {
      const parsed = JSON.parse(mem) as HeroUpgradesAccountState
      return {
        ...fallback,
        ...parsed,
        userId: effectiveUserId,
        levelsByHero: normalizeLevels(parsed.levelsByHero)
      }
    }
  } catch {
    // Ignore storage read issues
  }
  return fallback
}

function writeHeroUpgrades(state: HeroUpgradesAccountState): void {
  const key = getHeroUpgradesStorageKey(state.userId)
  const serialized = JSON.stringify(state)
  memoryHeroUpgradesStorage.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // Ignore storage quota issues
  }
  heroUpgradeListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // Ignore subscriber errors
    }
  })
}

export function getHeroUpgradesAccountState(
  userId?: string | null
): HeroUpgradesAccountState {
  return readRawHeroUpgrades(userId)
}

export function getHeroUpgradeLevel(
  userId: string | null | undefined,
  heroId: string
): number {
  const state = readRawHeroUpgrades(userId)
  return clampHeroUpgradeLevel(state.levelsByHero[heroId] || 0)
}

export function getAllHeroUpgradeLevels(
  userId?: string | null
): Record<string, number> {
  const state = readRawHeroUpgrades(userId)
  const result: Record<string, number> = {}
  for (const h of ALL_HEROES) {
    result[h.id] = clampHeroUpgradeLevel(state.levelsByHero[h.id] || 0)
  }
  return result
}

export function purchaseHeroSignatureUpgrade(
  userId: string | null | undefined,
  heroId: string
): PurchaseHeroUpgradeResult {
  const current = readRawHeroUpgrades(userId)
  const hero = ALL_HEROES.find((h) => h.id === heroId)
  const previousLevel = clampHeroUpgradeLevel(current.levelsByHero[heroId] || 0)

  if (!hero) {
    return {
      success: false,
      state: current,
      heroId,
      previousLevel,
      newLevel: previousLevel,
      costPaid: 0,
      error: 'Hero unit not found.'
    }
  }

  const telemetry = getLocalPlayerTelemetry(current.userId)
  if (!isHeroUnlocked(userId, heroId, telemetry)) {
    const unlockSpec = getUnlockableHeroSpec(heroId)
    return {
      success: false,
      state: current,
      heroId,
      previousLevel,
      newLevel: previousLevel,
      costPaid: 0,
      error: unlockSpec
        ? `Unlock ${hero.name} first (${unlockSpec.unlockSummary}).`
        : `${hero.name} is currently locked.`
    }
  }

  if (previousLevel >= MAX_HERO_UPGRADE_LEVEL) {
    return {
      success: false,
      state: current,
      heroId,
      previousLevel,
      newLevel: previousLevel,
      costPaid: 0,
      error: `${hero.name}'s ${getHeroAbility(heroId).abilityName} is already at Max Lv.${MAX_HERO_UPGRADE_LEVEL}.`
    }
  }

  const cost = getHeroUpgradeCost(previousLevel)
  if (cost === null || cost <= 0) {
    return {
      success: false,
      state: current,
      heroId,
      previousLevel,
      newLevel: previousLevel,
      costPaid: 0,
      error: `${hero.name}'s signature upgrade cannot advance further.`
    }
  }

  const spendResult = spendShopCoins(userId, cost)
  if (!spendResult.success) {
    const spec = getHeroUpgradeSpec(heroId)
    return {
      success: false,
      state: current,
      heroId,
      previousLevel,
      newLevel: previousLevel,
      costPaid: 0,
      error: spendResult.error
        ? `${spendResult.error} Required for ${hero.name} (${spec.upgradeTitle}).`
        : 'Insufficient Battle Coins.'
    }
  }

  const newLevel = previousLevel + 1
  const nextState: HeroUpgradesAccountState = {
    userId: current.userId,
    levelsByHero: {
      ...current.levelsByHero,
      [heroId]: newLevel
    },
    updatedAt: new Date().toISOString()
  }
  writeHeroUpgrades(nextState)

  return {
    success: true,
    state: nextState,
    heroId,
    previousLevel,
    newLevel,
    costPaid: cost
  }
}

export function subscribeHeroUpgrades(listener: () => void): () => void {
  heroUpgradeListeners.add(listener)
  return () => {
    heroUpgradeListeners.delete(listener)
  }
}

export function useHeroUpgrades(userId?: string | null) {
  const effectiveUserId = userId || 'guest_user'
  const [upgradeState, setUpgradeState] = useState<HeroUpgradesAccountState>(() =>
    getHeroUpgradesAccountState(effectiveUserId)
  )

  useEffect(() => {
    setUpgradeState(getHeroUpgradesAccountState(effectiveUserId))
    const unsubscribe = subscribeHeroUpgrades(() => {
      setUpgradeState(getHeroUpgradesAccountState(effectiveUserId))
    })
    return unsubscribe
  }, [effectiveUserId])

  const getLevel = (heroId: string) =>
    clampHeroUpgradeLevel(upgradeState.levelsByHero[heroId] || 0)

  return {
    upgradeState,
    getLevel,
    getSignatureLevel: getLevel,
    getNextCost: (heroId: string) => getHeroUpgradeCost(getLevel(heroId)),
    getStatsText: (heroId: string) => formatHeroUpgradeStats(heroId, getLevel(heroId)),
    getNextStatsText: (heroId: string) => {
      const lv = getLevel(heroId)
      return lv < MAX_HERO_UPGRADE_LEVEL ? formatHeroUpgradeStats(heroId, lv + 1) : null
    },
    upgradeHero: (heroId: string) => purchaseHeroSignatureUpgrade(effectiveUserId, heroId)
  }
}
