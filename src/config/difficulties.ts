/**
 * Run Difficulty Definitions & Coin/Enemy Modifiers
 * Supports Easy (-25% Coins), Normal (Standard), Hard (+25% Coins), Expert (+150% Coins).
 */

export type DifficultyId = 'easy' | 'normal' | 'hard' | 'expert'

export interface DifficultyDefinition {
  id: DifficultyId
  order: number
  name: string
  shortLabel: string
  description: string
  coinMultiplier: number
  coinBonusPercent: number
  enemyHpMultiplier: number
  enemySpeedMultiplier: number
  enemyDamageMultiplier: number
  spawnRateMultiplier: number
  accentColor: string
}

export const GAME_DIFFICULTIES: DifficultyDefinition[] = [
  {
    id: 'easy',
    order: 1,
    name: 'Easy',
    shortLabel: 'EASY',
    description: 'Lighter swarm density, reduced enemy HP & damage, and -25% Battle Coins.',
    coinMultiplier: 0.75,
    coinBonusPercent: -25,
    enemyHpMultiplier: 0.75,
    enemySpeedMultiplier: 0.88,
    enemyDamageMultiplier: 0.7,
    spawnRateMultiplier: 0.85,
    accentColor: '#34D399'
  },
  {
    id: 'normal',
    order: 2,
    name: 'Normal',
    shortLabel: 'NORMAL',
    description: 'Baseline Swarm Protocol combat balance and standard Battle Coin rewards.',
    coinMultiplier: 1.0,
    coinBonusPercent: 0,
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    spawnRateMultiplier: 1.0,
    accentColor: '#38BDF8'
  },
  {
    id: 'hard',
    order: 3,
    name: 'Hard',
    shortLabel: 'HARD',
    description: 'Tougher, faster hostiles with higher spawn pressure for +25% Battle Coins.',
    coinMultiplier: 1.25,
    coinBonusPercent: 25,
    enemyHpMultiplier: 1.4,
    enemySpeedMultiplier: 1.12,
    enemyDamageMultiplier: 1.35,
    spawnRateMultiplier: 1.18,
    accentColor: '#FACC15'
  },
  {
    id: 'expert',
    order: 4,
    name: 'Expert',
    shortLabel: 'EXPERT',
    description: 'Brutal high-threat swarms, heavy bosses, and relentless pressure for +150% Battle Coins.',
    coinMultiplier: 2.5,
    coinBonusPercent: 150,
    enemyHpMultiplier: 2.15,
    enemySpeedMultiplier: 1.24,
    enemyDamageMultiplier: 1.85,
    spawnRateMultiplier: 1.38,
    accentColor: '#FF2E63'
  }
]

const DIFFICULTY_STORAGE_KEY = 'swarm_protocol_difficulty_v1'
let memoryDifficultyId: DifficultyId = 'normal'

export function isValidDifficultyId(id?: string | null): id is DifficultyId {
  return id === 'easy' || id === 'normal' || id === 'hard' || id === 'expert'
}

export function getDifficultyById(id?: string | null): DifficultyDefinition {
  if (isValidDifficultyId(id)) {
    return GAME_DIFFICULTIES.find((d) => d.id === id) ?? GAME_DIFFICULTIES[1]
  }
  return GAME_DIFFICULTIES[1] // normal
}

export function formatDifficultyCoinLabel(difficulty: DifficultyDefinition): string {
  if (difficulty.coinBonusPercent === 0) return 'Standard Coins'
  return difficulty.coinBonusPercent > 0
    ? `+${difficulty.coinBonusPercent}% Coins`
    : `${difficulty.coinBonusPercent}% Coins`
}

export function computeDifficultyCoinPayout(params: {
  baseCoinValue: number
  difficultyId?: DifficultyId | null
  bonusCoinChance?: number
  carry?: number
}): { coinsAwarded: number; nextCarry: number } {
  const diff = getDifficultyById(params.difficultyId)
  const base = Math.max(0, params.baseCoinValue)
  const bonusMult = 1 + Math.max(0, params.bonusCoinChance ?? 0)
  const carry = Math.max(0, params.carry ?? 0)
  const exact = base * diff.coinMultiplier * bonusMult + carry
  const coinsAwarded = Math.floor(exact + 1e-9)
  const nextCarry = Math.max(0, Number((exact - coinsAwarded).toFixed(6)))
  return { coinsAwarded, nextCarry }
}

export function getStoredDifficultyId(): DifficultyId {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(DIFFICULTY_STORAGE_KEY)
      if (isValidDifficultyId(saved)) {
        memoryDifficultyId = saved
        return saved
      }
    }
  } catch {
    // Ignore storage access failures
  }
  return memoryDifficultyId
}

export function saveDifficultyId(id: DifficultyId): void {
  memoryDifficultyId = id
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(DIFFICULTY_STORAGE_KEY, id)
    }
  } catch {
    // Ignore storage access failures
  }
}
