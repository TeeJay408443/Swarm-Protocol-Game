export interface RunUpgradeSummaryItem {
  id: string
  name: string
  category: string
  level: number
  isMaxLevel: boolean
  isEquippedWeapon?: boolean
}

export interface GameOverStats {
  survivalSeconds: number
  coinsCollected: number
  enemiesDefeated: number
  totalDamageDealt?: number
  totalDamageTaken?: number
  damageBlocked?: number
  bossesDefeated?: number
  totalHits?: number
  criticalHits?: number
  highestHit?: number
  levelReached?: number
  damageFreeWaveStreak?: number
  heroName?: string
  areaName?: string
  upgrades?: RunUpgradeSummaryItem[]
}

export interface ComputedPostGameMetrics {
  survivalSeconds: number
  formattedTime: string
  coinsCollected: number
  enemiesDefeated: number
  bossesDefeated: number
  totalDamageDealt: number
  totalDamageTaken: number
  damageBlocked: number
  averageDps: number
  killsPerMinute: number
  totalHits: number
  criticalHits: number
  critRatePercent: number
  highestHit: number
  levelReached: number
  damageFreeWaveStreak: number
  calculatedScore: number
  sortedUpgrades: RunUpgradeSummaryItem[]
}

export function formatSurvivalClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safe / 3600)
  const mins = Math.floor((safe % 3600) / 60)
  const secs = safe % 60
  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function computePostGameMetrics(stats: GameOverStats): ComputedPostGameMetrics {
  const survivalSeconds = Math.max(0, Math.floor(stats.survivalSeconds || 0))
  const coinsCollected = Math.max(0, Math.floor(stats.coinsCollected || 0))
  const enemiesDefeated = Math.max(0, Math.floor(stats.enemiesDefeated || 0))
  const bossesDefeated = Math.max(0, Math.floor(stats.bossesDefeated || 0))
  const totalDamageDealt = Math.max(0, Math.round(stats.totalDamageDealt || 0))
  const totalDamageTaken = Math.max(0, Math.round(stats.totalDamageTaken || 0))
  const damageBlocked = Math.max(0, Math.round(stats.damageBlocked || 0))
  const totalHits = Math.max(0, Math.floor(stats.totalHits || 0))
  const criticalHits = Math.max(0, Math.min(totalHits || Math.floor(stats.criticalHits || 0), Math.floor(stats.criticalHits || 0)))
  const highestHit = Math.max(0, Math.round(stats.highestHit || 0))
  const levelReached = Math.max(1, Math.floor(stats.levelReached || 1))
  const damageFreeWaveStreak = Math.max(0, Math.floor(stats.damageFreeWaveStreak || 0))

  const divisorSeconds = Math.max(1, survivalSeconds)
  const averageDps = totalDamageDealt > 0 ? Math.round(totalDamageDealt / divisorSeconds) : 0
  const killsPerMinute =
    survivalSeconds > 0 ? Number(((enemiesDefeated / survivalSeconds) * 60).toFixed(1)) : 0
  const critRatePercent =
    totalHits > 0 ? Number(((criticalHits / totalHits) * 100).toFixed(1)) : 0
  const calculatedScore = Math.floor(10 * survivalSeconds + 25 * coinsCollected)

  const sortedUpgrades = [...(stats.upgrades || [])].sort((a, b) => {
    if (Boolean(a.isEquippedWeapon) !== Boolean(b.isEquippedWeapon)) {
      return a.isEquippedWeapon ? -1 : 1
    }
    if (b.level !== a.level) return b.level - a.level
    return a.name.localeCompare(b.name)
  })

  return {
    survivalSeconds,
    formattedTime: formatSurvivalClock(survivalSeconds),
    coinsCollected,
    enemiesDefeated,
    bossesDefeated,
    totalDamageDealt,
    totalDamageTaken,
    damageBlocked,
    averageDps,
    killsPerMinute,
    totalHits,
    criticalHits,
    critRatePercent,
    highestHit,
    levelReached,
    damageFreeWaveStreak,
    calculatedScore,
    sortedUpgrades
  }
}
