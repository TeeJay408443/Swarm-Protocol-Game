/**
 * Hero Mastery Service
 * Tracks cumulative rounds completed per hero and unlocks passive stat bonuses.
 */

import { useEffect, useState } from 'react'

export interface HeroMasteryBonuses {
  damageMultiplier: number // additive bonus e.g. 0.12 = +12%
  fireRateMultiplier: number // additive bonus e.g. 0.10 = +10%
  bonusHp: number
  damageReduction: number // additive e.g. 0.08 = -8% damage taken
  speedMultiplier: number // additive bonus e.g. 0.08 = +8% move speed
  magnetRangeMultiplier: number // additive bonus e.g. 0.25 = +25% pickup range
  bonusCoinChance: number // additive bonus e.g. 0.12 = +12% coins
  hpRegenPerSec: number
  xpMultiplier: number // additive bonus e.g. 0.15 = +15% XP gain
}

export interface HeroMasteryTier {
  tier: number // 1..5
  requiredRounds: number
  title: string
  summary: string
  bonuses: Partial<HeroMasteryBonuses>
}

export interface HeroMasteryProgress {
  heroId: string
  roundsCompleted: number
  currentTier: number // 0..5
  maxTier: number
  nextTier: HeroMasteryTier | null
  roundsToNextTier: number
  progressPercent: number
  tiers: Array<HeroMasteryTier & { unlocked: boolean }>
  totalBonuses: HeroMasteryBonuses
}

export interface HeroMasteryAccountState {
  userId: string
  roundsByHero: Record<string, number>
  updatedAt: string
}

export const HERO_MASTERY_TIERS: Record<string, HeroMasteryTier[]> = {
  hero_01: [
    {
      tier: 1,
      requiredRounds: 3,
      title: 'Blade Discipline',
      summary: '+12% Weapon Damage',
      bonuses: { damageMultiplier: 0.12 }
    },
    {
      tier: 2,
      requiredRounds: 8,
      title: 'Tempered Chassis',
      summary: '+25 Max HP',
      bonuses: { bonusHp: 25 }
    },
    {
      tier: 3,
      requiredRounds: 15,
      title: 'Swift Katana',
      summary: '+10% Fire Rate',
      bonuses: { fireRateMultiplier: 0.1 }
    },
    {
      tier: 4,
      requiredRounds: 25,
      title: 'Steel Guard',
      summary: '-8% Damage Taken · +8% Move Speed',
      bonuses: { damageReduction: 0.08, speedMultiplier: 0.08 }
    },
    {
      tier: 5,
      requiredRounds: 40,
      title: 'Vanguard Master',
      summary: '+20% Weapon Damage · +35 Max HP',
      bonuses: { damageMultiplier: 0.2, bonusHp: 35 }
    }
  ],
  hero_02: [
    {
      tier: 1,
      requiredRounds: 3,
      title: 'Quickstep',
      summary: '+10% Move Speed',
      bonuses: { speedMultiplier: 0.1 }
    },
    {
      tier: 2,
      requiredRounds: 8,
      title: 'Hair Trigger',
      summary: '+12% Fire Rate',
      bonuses: { fireRateMultiplier: 0.12 }
    },
    {
      tier: 3,
      requiredRounds: 15,
      title: 'Hollow-Point Rounds',
      summary: '+15% Weapon Damage',
      bonuses: { damageMultiplier: 0.15 }
    },
    {
      tier: 4,
      requiredRounds: 25,
      title: 'Scavenger Optics',
      summary: '+25% Pickup Range · +15% XP Gain',
      bonuses: { magnetRangeMultiplier: 0.25, xpMultiplier: 0.15 }
    },
    {
      tier: 5,
      requiredRounds: 40,
      title: 'Ranger Master',
      summary: '+18% Weapon Damage · +14% Fire Rate',
      bonuses: { damageMultiplier: 0.18, fireRateMultiplier: 0.14 }
    }
  ],
  hero_03: [
    {
      tier: 1,
      requiredRounds: 3,
      title: 'Overclocked Bus',
      summary: '+12% Fire Rate',
      bonuses: { fireRateMultiplier: 0.12 }
    },
    {
      tier: 2,
      requiredRounds: 8,
      title: 'Magnetic Array',
      summary: '+35% Pickup Range · +12% Bonus Coins',
      bonuses: { magnetRangeMultiplier: 0.35, bonusCoinChance: 0.12 }
    },
    {
      tier: 3,
      requiredRounds: 15,
      title: 'Alloy Frame',
      summary: '+30 Max HP · +15% XP Gain',
      bonuses: { bonusHp: 30, xpMultiplier: 0.15 }
    },
    {
      tier: 4,
      requiredRounds: 25,
      title: 'High-Output Cells',
      summary: '+16% Weapon Damage',
      bonuses: { damageMultiplier: 0.16 }
    },
    {
      tier: 5,
      requiredRounds: 40,
      title: 'Engineer Master',
      summary: '+18% Fire Rate · +18% Weapon Damage',
      bonuses: { fireRateMultiplier: 0.18, damageMultiplier: 0.18 }
    }
  ],
  hero_04: [
    {
      tier: 1,
      requiredRounds: 3,
      title: 'Phase Step',
      summary: '+12% Move Speed',
      bonuses: { speedMultiplier: 0.12 }
    },
    {
      tier: 2,
      requiredRounds: 8,
      title: 'Temporal Compression',
      summary: '+14% Fire Rate',
      bonuses: { fireRateMultiplier: 0.14 }
    },
    {
      tier: 3,
      requiredRounds: 15,
      title: 'Paradox Edge',
      summary: '+16% Weapon Damage',
      bonuses: { damageMultiplier: 0.16 }
    },
    {
      tier: 4,
      requiredRounds: 25,
      title: 'Time Dilation',
      summary: '+20% XP Gain · -8% Damage Taken',
      bonuses: { xpMultiplier: 0.2, damageReduction: 0.08 }
    },
    {
      tier: 5,
      requiredRounds: 40,
      title: 'Chrono Master',
      summary: '+18% Fire Rate · +18% Weapon Damage',
      bonuses: { fireRateMultiplier: 0.18, damageMultiplier: 0.18 }
    }
  ],
  hero_05: [
    {
      tier: 1,
      requiredRounds: 3,
      title: 'Bastion Plating',
      summary: '+35 Max HP',
      bonuses: { bonusHp: 35 }
    },
    {
      tier: 2,
      requiredRounds: 8,
      title: 'Aegis Ward',
      summary: '-8% Damage Taken',
      bonuses: { damageReduction: 0.08 }
    },
    {
      tier: 3,
      requiredRounds: 15,
      title: 'Nanite Bulwark',
      summary: '+1.5 HP/sec Regen',
      bonuses: { hpRegenPerSec: 1.5 }
    },
    {
      tier: 4,
      requiredRounds: 25,
      title: 'Retribution Strike',
      summary: '+18% Weapon Damage',
      bonuses: { damageMultiplier: 0.18 }
    },
    {
      tier: 5,
      requiredRounds: 40,
      title: 'Paladin Master',
      summary: '+65 Max HP · -10% Damage Taken · +1.5 HP/sec',
      bonuses: { bonusHp: 65, damageReduction: 0.1, hpRegenPerSec: 1.5 }
    }
  ],
  hero_06: [
    {
      tier: 1,
      requiredRounds: 3,
      title: 'Volatile Fuel',
      summary: '+14% Weapon Damage',
      bonuses: { damageMultiplier: 0.14 }
    },
    {
      tier: 2,
      requiredRounds: 8,
      title: 'Rapid Ignition',
      summary: '+12% Fire Rate',
      bonuses: { fireRateMultiplier: 0.12 }
    },
    {
      tier: 3,
      requiredRounds: 15,
      title: 'Thermal Jacket',
      summary: '+30 Max HP · -6% Damage Taken',
      bonuses: { bonusHp: 30, damageReduction: 0.06 }
    },
    {
      tier: 4,
      requiredRounds: 25,
      title: 'Bounty Blaze',
      summary: '+18% Bonus Coins · +10% Move Speed',
      bonuses: { bonusCoinChance: 0.18, speedMultiplier: 0.1 }
    },
    {
      tier: 5,
      requiredRounds: 40,
      title: 'Pyromancer Master',
      summary: '+24% Weapon Damage · +12% Fire Rate',
      bonuses: { damageMultiplier: 0.24, fireRateMultiplier: 0.12 }
    }
  ]
}

export function getHeroMasteryTiers(heroId: string): HeroMasteryTier[] {
  return HERO_MASTERY_TIERS[heroId] || HERO_MASTERY_TIERS.hero_01
}

export function computeHeroMasteryBonuses(
  heroId: string,
  roundsCompleted: number
): HeroMasteryBonuses {
  const safeRounds = Math.max(0, Math.floor(roundsCompleted))
  const tiers = getHeroMasteryTiers(heroId)
  const totals: HeroMasteryBonuses = {
    damageMultiplier: 0,
    fireRateMultiplier: 0,
    bonusHp: 0,
    damageReduction: 0,
    speedMultiplier: 0,
    magnetRangeMultiplier: 0,
    bonusCoinChance: 0,
    hpRegenPerSec: 0,
    xpMultiplier: 0
  }

  for (const tier of tiers) {
    if (safeRounds < tier.requiredRounds) continue
    const b = tier.bonuses
    if (b.damageMultiplier) totals.damageMultiplier += b.damageMultiplier
    if (b.fireRateMultiplier) totals.fireRateMultiplier += b.fireRateMultiplier
    if (b.bonusHp) totals.bonusHp += b.bonusHp
    if (b.damageReduction) totals.damageReduction += b.damageReduction
    if (b.speedMultiplier) totals.speedMultiplier += b.speedMultiplier
    if (b.magnetRangeMultiplier) totals.magnetRangeMultiplier += b.magnetRangeMultiplier
    if (b.bonusCoinChance) totals.bonusCoinChance += b.bonusCoinChance
    if (b.hpRegenPerSec) totals.hpRegenPerSec += b.hpRegenPerSec
    if (b.xpMultiplier) totals.xpMultiplier += b.xpMultiplier
  }

  return {
    damageMultiplier: Number(totals.damageMultiplier.toFixed(3)),
    fireRateMultiplier: Number(totals.fireRateMultiplier.toFixed(3)),
    bonusHp: Math.round(totals.bonusHp),
    damageReduction: Number(totals.damageReduction.toFixed(3)),
    speedMultiplier: Number(totals.speedMultiplier.toFixed(3)),
    magnetRangeMultiplier: Number(totals.magnetRangeMultiplier.toFixed(3)),
    bonusCoinChance: Number(totals.bonusCoinChance.toFixed(3)),
    hpRegenPerSec: Number(totals.hpRegenPerSec.toFixed(2)),
    xpMultiplier: Number(totals.xpMultiplier.toFixed(3))
  }
}

export function formatMasteryBonusSummary(bonuses: HeroMasteryBonuses): string {
  const parts: string[] = []
  if (bonuses.damageMultiplier > 0) parts.push(`+${Math.round(bonuses.damageMultiplier * 100)}% Dmg`)
  if (bonuses.fireRateMultiplier > 0)
    parts.push(`+${Math.round(bonuses.fireRateMultiplier * 100)}% Fire Rate`)
  if (bonuses.bonusHp > 0) parts.push(`+${bonuses.bonusHp} HP`)
  if (bonuses.damageReduction > 0)
    parts.push(`-${Math.round(bonuses.damageReduction * 100)}% Dmg Taken`)
  if (bonuses.speedMultiplier > 0)
    parts.push(`+${Math.round(bonuses.speedMultiplier * 100)}% Speed`)
  if (bonuses.magnetRangeMultiplier > 0)
    parts.push(`+${Math.round(bonuses.magnetRangeMultiplier * 100)}% Pickup`)
  if (bonuses.bonusCoinChance > 0)
    parts.push(`+${Math.round(bonuses.bonusCoinChance * 100)}% Coins`)
  if (bonuses.hpRegenPerSec > 0) parts.push(`+${bonuses.hpRegenPerSec} HP/s`)
  if (bonuses.xpMultiplier > 0) parts.push(`+${Math.round(bonuses.xpMultiplier * 100)}% XP`)
  return parts.length > 0 ? parts.join(' · ') : 'No bonuses unlocked yet (clear 3 rounds)'
}

export function evaluateHeroMasteryProgress(
  heroId: string,
  roundsCompleted: number
): HeroMasteryProgress {
  const safeRounds = Math.max(0, Math.floor(roundsCompleted))
  const rawTiers = getHeroMasteryTiers(heroId)
  const tiers = rawTiers.map((t) => ({
    ...t,
    unlocked: safeRounds >= t.requiredRounds
  }))

  let currentTier = 0
  let prevThreshold = 0
  let nextTier: HeroMasteryTier | null = null

  for (const t of tiers) {
    if (t.unlocked) {
      currentTier = t.tier
      prevThreshold = t.requiredRounds
    } else if (!nextTier) {
      nextTier = t
    }
  }

  const roundsToNextTier = nextTier ? Math.max(0, nextTier.requiredRounds - safeRounds) : 0
  const span = nextTier ? Math.max(1, nextTier.requiredRounds - prevThreshold) : 1
  const progressPercent = nextTier
    ? Math.min(100, Math.max(0, Math.round(((safeRounds - prevThreshold) / span) * 100)))
    : 100

  return {
    heroId,
    roundsCompleted: safeRounds,
    currentTier,
    maxTier: tiers.length,
    nextTier,
    roundsToNextTier,
    progressPercent,
    tiers,
    totalBonuses: computeHeroMasteryBonuses(heroId, safeRounds)
  }
}

const MASTERY_STORAGE_KEY = 'swarm_protocol_hero_mastery_v1'
const memoryMasteryStorage = new Map<string, string>()
const masteryListeners = new Set<() => void>()

function getMasteryStorageKey(userId?: string | null): string {
  const effective = !userId || userId === 'guest_user' ? 'guest_user' : userId
  return effective === 'guest_user' ? MASTERY_STORAGE_KEY : `${MASTERY_STORAGE_KEY}_${effective}`
}

function readRawMastery(userId?: string | null): HeroMasteryAccountState {
  const effectiveUserId = userId || 'guest_user'
  const key = getMasteryStorageKey(effectiveUserId)
  const fallback: HeroMasteryAccountState = {
    userId: effectiveUserId,
    roundsByHero: {},
    updatedAt: new Date().toISOString()
  }

  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) {
        memoryMasteryStorage.set(key, raw)
        const parsed = JSON.parse(raw) as HeroMasteryAccountState
        return {
          ...fallback,
          ...parsed,
          userId: effectiveUserId,
          roundsByHero: parsed.roundsByHero || {}
        }
      }
    }
    const mem = memoryMasteryStorage.get(key)
    if (mem) {
      const parsed = JSON.parse(mem) as HeroMasteryAccountState
      return {
        ...fallback,
        ...parsed,
        userId: effectiveUserId,
        roundsByHero: parsed.roundsByHero || {}
      }
    }
  } catch {
    // Ignore storage read issues
  }
  return fallback
}

function writeMastery(state: HeroMasteryAccountState): void {
  const key = getMasteryStorageKey(state.userId)
  const serialized = JSON.stringify(state)
  memoryMasteryStorage.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // Ignore storage quota issues
  }
  masteryListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // Ignore subscriber errors
    }
  })
}

export function getHeroMasteryAccountState(
  userId?: string | null
): HeroMasteryAccountState {
  return readRawMastery(userId)
}

export function getHeroMasteryProgress(
  userId: string | null | undefined,
  heroId: string
): HeroMasteryProgress {
  const state = readRawMastery(userId)
  return evaluateHeroMasteryProgress(heroId, state.roundsByHero[heroId] || 0)
}

export function recordHeroRoundsCompleted(
  userId: string | null | undefined,
  heroId: string,
  roundsDelta: number = 1
): {
  state: HeroMasteryAccountState
  progress: HeroMasteryProgress
  previousTier: number
  unlockedNewTier: HeroMasteryTier | null
} {
  const safeDelta = Math.max(0, Math.floor(roundsDelta))
  const current = readRawMastery(userId)
  const prevRounds = current.roundsByHero[heroId] || 0
  const prevProgress = evaluateHeroMasteryProgress(heroId, prevRounds)

  if (safeDelta <= 0) {
    return {
      state: current,
      progress: prevProgress,
      previousTier: prevProgress.currentTier,
      unlockedNewTier: null
    }
  }

  const nextRounds = prevRounds + safeDelta
  const nextState: HeroMasteryAccountState = {
    userId: current.userId,
    roundsByHero: {
      ...current.roundsByHero,
      [heroId]: nextRounds
    },
    updatedAt: new Date().toISOString()
  }
  writeMastery(nextState)

  const nextProgress = evaluateHeroMasteryProgress(heroId, nextRounds)
  const unlockedNewTier =
    nextProgress.currentTier > prevProgress.currentTier
      ? nextProgress.tiers.find((t) => t.tier === nextProgress.currentTier) || null
      : null

  return {
    state: nextState,
    progress: nextProgress,
    previousTier: prevProgress.currentTier,
    unlockedNewTier
  }
}

export function useHeroMastery(userId?: string | null) {
  const effectiveUserId = userId || 'guest_user'
  const [masteryState, setMasteryState] = useState<HeroMasteryAccountState>(() =>
    getHeroMasteryAccountState(effectiveUserId)
  )

  useEffect(() => {
    setMasteryState(getHeroMasteryAccountState(effectiveUserId))
    const unsubscribe = () => {
      setMasteryState(getHeroMasteryAccountState(effectiveUserId))
    }
    masteryListeners.add(unsubscribe)
    return () => {
      masteryListeners.delete(unsubscribe)
    }
  }, [effectiveUserId])

  return {
    masteryState,
    getProgress: (heroId: string) =>
      evaluateHeroMasteryProgress(heroId, masteryState.roundsByHero[heroId] || 0)
  }
}
