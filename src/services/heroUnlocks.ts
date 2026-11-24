/**
 * Hero Unlocks Service
 * Persists account-specific unlocks for unlockable heroes (e.g., Storm Assassin hero_07).
 * Supports both Battle Coin recruitment and Wave-milestone auto-unlocks.
 */

import { useEffect, useState } from 'react'
import {
  getUnlockableHeroSpec,
  isUnlockableHero,
  UNLOCKABLE_HEROES,
  type UnlockableHeroSpec
} from '../config/unlockableHeroes'
import { spendShopCoins } from './shop'

export interface HeroUnlocksAccountState {
  userId: string
  unlockedHeroIds: string[]
  unlockMethods: Record<string, 'coins' | 'milestone' | 'dev'>
  updatedAt: string
}

export interface UnlockHeroResult {
  success: boolean
  state: HeroUnlocksAccountState
  heroId: string
  costPaid: number
  error?: string
}

const HERO_UNLOCKS_STORAGE_KEY = 'swarm_protocol_hero_unlocks_v1'
const memoryHeroUnlocksStorage = new Map<string, string>()
const heroUnlockListeners = new Set<() => void>()

function getHeroUnlocksStorageKey(userId?: string | null): string {
  const effective = !userId || userId === 'guest_user' ? 'guest_user' : userId
  return effective === 'guest_user'
    ? HERO_UNLOCKS_STORAGE_KEY
    : `${HERO_UNLOCKS_STORAGE_KEY}_${effective}`
}

function readRawHeroUnlocks(userId?: string | null): HeroUnlocksAccountState {
  const effectiveUserId = userId || 'guest_user'
  const key = getHeroUnlocksStorageKey(effectiveUserId)
  const fallback: HeroUnlocksAccountState = {
    userId: effectiveUserId,
    unlockedHeroIds: [],
    unlockMethods: {},
    updatedAt: new Date().toISOString()
  }

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) {
        memoryHeroUnlocksStorage.set(key, raw)
        const parsed = JSON.parse(raw) as HeroUnlocksAccountState
        return {
          ...fallback,
          ...parsed,
          userId: effectiveUserId,
          unlockedHeroIds: Array.isArray(parsed.unlockedHeroIds)
            ? Array.from(new Set(parsed.unlockedHeroIds))
            : [],
          unlockMethods: parsed.unlockMethods || {}
        }
      }
    }
    const mem = memoryHeroUnlocksStorage.get(key)
    if (mem) {
      const parsed = JSON.parse(mem) as HeroUnlocksAccountState
      return {
        ...fallback,
        ...parsed,
        userId: effectiveUserId,
        unlockedHeroIds: Array.isArray(parsed.unlockedHeroIds)
          ? Array.from(new Set(parsed.unlockedHeroIds))
          : [],
        unlockMethods: parsed.unlockMethods || {}
      }
    }
  } catch {
    // Ignore storage read issues
  }
  return fallback
}

function writeHeroUnlocks(state: HeroUnlocksAccountState): void {
  const key = getHeroUnlocksStorageKey(state.userId)
  const serialized = JSON.stringify(state)
  memoryHeroUnlocksStorage.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // Ignore storage quota issues
  }
  heroUnlockListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // Ignore subscriber errors
    }
  })
}

export function getHeroUnlocksAccountState(
  userId?: string | null
): HeroUnlocksAccountState {
  return readRawHeroUnlocks(userId)
}

export function isHeroUnlocked(
  userId: string | null | undefined,
  heroId: string,
  highestWaveOrTelemetry?: number | { highest_wave?: number } | null
): boolean {
  if (!isUnlockableHero(heroId)) return true
  const state = readRawHeroUnlocks(userId)
  if (state.unlockedHeroIds.includes(heroId)) return true

  const spec = getUnlockableHeroSpec(heroId)
  if (!spec) return true

  const highestWave =
    typeof highestWaveOrTelemetry === 'number'
      ? highestWaveOrTelemetry
      : highestWaveOrTelemetry?.highest_wave ?? 0

  return highestWave >= spec.unlockWave
}

export function unlockHeroWithCoins(
  userId: string | null | undefined,
  heroId: string
): UnlockHeroResult {
  const current = readRawHeroUnlocks(userId)
  const spec = getUnlockableHeroSpec(heroId)

  if (!spec) {
    return {
      success: false,
      state: current,
      heroId,
      costPaid: 0,
      error: 'Hero does not require unlocking or was not found.'
    }
  }

  if (current.unlockedHeroIds.includes(heroId)) {
    return {
      success: false,
      state: current,
      heroId,
      costPaid: 0,
      error: `${spec.name} is already unlocked!`
    }
  }

  const spendResult = spendShopCoins(userId, spec.unlockCoinCost)
  if (!spendResult.success) {
    return {
      success: false,
      state: current,
      heroId,
      costPaid: 0,
      error: spendResult.error
        ? `${spendResult.error} Required to recruit ${spec.name}.`
        : 'Insufficient Battle Coins.'
    }
  }

  const nextState: HeroUnlocksAccountState = {
    userId: current.userId,
    unlockedHeroIds: [...current.unlockedHeroIds, heroId],
    unlockMethods: {
      ...current.unlockMethods,
      [heroId]: 'coins'
    },
    updatedAt: new Date().toISOString()
  }
  writeHeroUnlocks(nextState)

  return {
    success: true,
    state: nextState,
    heroId,
    costPaid: spec.unlockCoinCost
  }
}

export function checkAndSyncMilestoneHeroUnlocks(
  userId: string | null | undefined,
  highestWave: number
): UnlockableHeroSpec[] {
  const safeWave = Math.max(0, Math.floor(highestWave || 0))
  if (safeWave <= 0) return []

  const current = readRawHeroUnlocks(userId)
  const newlyUnlocked: UnlockableHeroSpec[] = []

  for (const spec of UNLOCKABLE_HEROES) {
    if (!current.unlockedHeroIds.includes(spec.id) && safeWave >= spec.unlockWave) {
      newlyUnlocked.push(spec)
    }
  }

  if (newlyUnlocked.length === 0) return []

  const nextMethods = { ...current.unlockMethods }
  for (const spec of newlyUnlocked) {
    nextMethods[spec.id] = 'milestone'
  }

  const nextState: HeroUnlocksAccountState = {
    userId: current.userId,
    unlockedHeroIds: [
      ...current.unlockedHeroIds,
      ...newlyUnlocked.map((spec) => spec.id)
    ],
    unlockMethods: nextMethods,
    updatedAt: new Date().toISOString()
  }
  writeHeroUnlocks(nextState)
  return newlyUnlocked
}

export function setHeroUnlockedForDev(
  userId: string | null | undefined,
  heroId: string,
  unlocked: boolean
): HeroUnlocksAccountState {
  const current = readRawHeroUnlocks(userId)
  if (!isUnlockableHero(heroId)) return current

  const nextIds = unlocked
    ? Array.from(new Set([...current.unlockedHeroIds, heroId]))
    : current.unlockedHeroIds.filter((id) => id !== heroId)

  const nextMethods = { ...current.unlockMethods }
  if (unlocked) {
    nextMethods[heroId] = 'dev'
  } else {
    delete nextMethods[heroId]
  }

  const nextState: HeroUnlocksAccountState = {
    userId: current.userId,
    unlockedHeroIds: nextIds,
    unlockMethods: nextMethods,
    updatedAt: new Date().toISOString()
  }
  writeHeroUnlocks(nextState)
  return nextState
}

export function subscribeHeroUnlocks(listener: () => void): () => void {
  heroUnlockListeners.add(listener)
  return () => {
    heroUnlockListeners.delete(listener)
  }
}

export function useHeroUnlocks(userId?: string | null, highestWave?: number) {
  const effectiveUserId = userId || 'guest_user'
  const [unlockState, setUnlockState] = useState<HeroUnlocksAccountState>(() =>
    getHeroUnlocksAccountState(effectiveUserId)
  )

  useEffect(() => {
    setUnlockState(getHeroUnlocksAccountState(effectiveUserId))
    const unsubscribe = subscribeHeroUnlocks(() => {
      setUnlockState(getHeroUnlocksAccountState(effectiveUserId))
    })
    return unsubscribe
  }, [effectiveUserId])

  useEffect(() => {
    if (highestWave && highestWave > 0) {
      checkAndSyncMilestoneHeroUnlocks(effectiveUserId, highestWave)
    }
  }, [effectiveUserId, highestWave])

  return {
    unlockState,
    isUnlocked: (heroId: string) => isHeroUnlocked(effectiveUserId, heroId, highestWave),
    unlockWithCoins: (heroId: string) => unlockHeroWithCoins(effectiveUserId, heroId)
  }
}
