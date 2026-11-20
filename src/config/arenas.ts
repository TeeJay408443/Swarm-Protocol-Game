/**
 * Arena / Area Definitions & Unlock Logic
 * Area 1 (Carbon Sector - Black Arena) is unlocked from the start.
 * Area 2 (Astral Citadel) unlocks once the player beats Wave 15.
 */

import type { EnemiesRow } from '../types/database'
import { enemies as seedEnemies } from '../db/seedData'
import { selectEnemyTypeIndexForWave, WAVE_CONFIG } from './gameConstants'

export type ArenaId = 'carbon_sector' | 'astral_citadel'

export const WAVE_15_FINAL_BOSS_BASE_HP = 150000

export interface ArenaDefinition {
  id: ArenaId
  order: number
  name: string
  subtitle: string
  description: string
  unlockWaveRequirement: number | null
  difficultyLabel: string
  coinBonusPercent: number
  enemyHpMultiplier: number
  enemySpeedMultiplier: number
  coinBonusMultiplier: number
  floorColor: string
  gridColor: string
  borderColor: string
  accentHex: string
}

export const GAME_AREAS: ArenaDefinition[] = [
  {
    id: 'carbon_sector',
    order: 1,
    name: 'Carbon Sector',
    subtitle: 'Black Arena',
    description:
      'Classic obsidian cyber-grid arena. Survive 15 escalating swarm waves and defeat the 150K HP Omega Overlord.',
    unlockWaveRequirement: null,
    difficultyLabel: 'Standard',
    coinBonusPercent: 0,
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    coinBonusMultiplier: 1.0,
    floorColor: '#0B0F19',
    gridColor: 'rgba(0, 240, 255, 0.08)',
    borderColor: 'rgba(255, 0, 85, 0.5)',
    accentHex: '#38BDF8'
  },
  {
    id: 'astral_citadel',
    order: 2,
    name: 'Astral Citadel',
    subtitle: 'Emerald Crystal Spire',
    description:
      'Sunlit sapphire sanctuary with 5 Citadel hostiles, dedicated bosses every 5 waves, Endless Mode after Wave 15, and +35% Battle Coins.',
    unlockWaveRequirement: 15,
    difficultyLabel: 'Elite (+25% Threat)',
    coinBonusPercent: 35,
    enemyHpMultiplier: 1.25,
    enemySpeedMultiplier: 1.12,
    coinBonusMultiplier: 1.35,
    floorColor: '#0E1C36',
    gridColor: 'rgba(52, 211, 153, 0.14)',
    borderColor: 'rgba(250, 204, 21, 0.72)',
    accentHex: '#34D399'
  }
]

/**
 * 5 Distinct Enemies Exclusive to Area 2 (Astral Citadel):
 * 1. Citadel Golem (ene_a2_01): Slower, tankier swarmer
 * 2. Zephyr Shardling (ene_a2_02): Faster, slightly weaker swarmer
 * 3. Prism Bolt Weaver (ene_a2_03): Ranged enemy #1 firing focused emerald lance bolts
 * 4. Astral Arcanist (ene_a2_04): Ranged enemy #2 firing 3-orb fanned arcane spreads
 * 5. Astral Bastion Warden (ene_a2_05): Slow, tanky mini-boss launching dodgeable AoE mortar projectiles with ground indicators
 */
export const AREA_TWO_ENEMIES: EnemiesRow[] = [
  {
    id: 'ene_a2_01',
    name: 'Citadel Golem',
    category: 'Heavy Swarm',
    hp: 75,
    speed: 0.36,
    coin_value: 2,
    description:
      'Slower, heavily plated sapphirestone swarmer built to absorb heavy sustained fire across Citadel waves.'
  },
  {
    id: 'ene_a2_02',
    name: 'Zephyr Shardling',
    category: 'Fast Flanker',
    hp: 26,
    speed: 1.22,
    coin_value: 2,
    description:
      'Fragile yet blazing-fast crystal swarmer that weaves rapidly through Citadel corridors in nimble packs.'
  },
  {
    id: 'ene_a2_03',
    name: 'Prism Bolt Weaver',
    category: 'Ranged Sniper',
    hp: 58,
    speed: 0.78,
    coin_value: 5,
    description:
      'Orbiting Citadel ranged construct that maintains mid-range spacing while firing high-velocity emerald lance bolts.'
  },
  {
    id: 'ene_a2_04',
    name: 'Astral Arcanist',
    category: 'Ranged Caster',
    hp: 70,
    speed: 0.68,
    coin_value: 6,
    description:
      'Hovering rune sentinel that fires wide 3-orb arcane projectile fans to pressure mobile operatives from afar.'
  },
  {
    id: 'ene_a2_05',
    name: 'Astral Bastion Warden',
    category: 'Mini-Boss',
    hp: 260,
    speed: 0.30,
    coin_value: 20,
    description:
      'Slow, heavily armored Citadel mini-boss that launches telegraphed AoE mortar projectiles with clear ground dodge indicators.'
  }
]

/**
 * Dedicated Area 2 Bosses spawning every 5 waves (Wave 5, Wave 10, Wave 15 Final Boss, and Endless 20+)
 */
export const AREA_TWO_BOSSES: EnemiesRow[] = [
  {
    id: 'boss_a2_05',
    name: 'Emerald Prism Monarch',
    category: 'Boss',
    hp: 420,
    speed: 0.56,
    coin_value: 75,
    description:
      'Area 2 Wave 5 Citadel Sovereign surrounded by crystal prism shields, sweeping mega-lasers, and orbital rings.'
  },
  {
    id: 'boss_a2_10',
    name: 'Astral Vortex Colossus',
    category: 'Boss',
    hp: 640,
    speed: 0.48,
    coin_value: 110,
    description:
      'Area 2 Wave 10 & Endless dreadnought combining radial laser volleys, telegraphed slams, and arcing AoE mortar salvos.'
  },
  {
    id: 'boss_a2_15',
    name: 'Solar Archon Seraph',
    category: 'Boss',
    hp: 150000,
    speed: 0.25,
    coin_value: 250,
    description:
      'Area 2 Wave 15 Final Boss anchored in the upper Citadel; commands half-arena solar sweeps and dodgeable AoE barrages.'
  }
]

export function getAreaById(areaId?: string | null): ArenaDefinition {
  return GAME_AREAS.find((a) => a.id === areaId) ?? GAME_AREAS[0]
}

export function isAreaUnlocked(
  areaId: ArenaId,
  telemetry?: { wave_15_cleared?: boolean } | null
): boolean {
  const area = GAME_AREAS.find((a) => a.id === areaId)
  if (!area || area.unlockWaveRequirement === null) return true
  return Boolean(telemetry?.wave_15_cleared)
}

export function getAreaEnemies(areaId: ArenaId): EnemiesRow[] {
  return areaId === 'astral_citadel' ? AREA_TWO_ENEMIES : seedEnemies
}

export function getWave15FinalBossHp(areaId: ArenaId): number {
  const area = getAreaById(areaId)
  return Math.round(WAVE_15_FINAL_BOSS_BASE_HP * area.enemyHpMultiplier)
}

export function shouldSpawnRegularEnemiesInWave(
  waveNumber: number,
  isEndlessMode: boolean = false
): boolean {
  if (waveNumber === WAVE_CONFIG.MAX_WAVE && !isEndlessMode) {
    return false
  }
  return true
}

export function getAreaBossTemplateForWave(
  areaId: ArenaId,
  waveNumber: number
): EnemiesRow {
  if (areaId !== 'astral_citadel') {
    return seedEnemies.find((e) => e.id === 'ene_04') || seedEnemies[3]
  }
  if (waveNumber === WAVE_CONFIG.MAX_WAVE) {
    return AREA_TWO_BOSSES[2] // Solar Archon Seraph
  }
  if (waveNumber === 5) {
    return AREA_TWO_BOSSES[0] // Emerald Prism Monarch
  }
  if (waveNumber === 10) {
    return AREA_TWO_BOSSES[1] // Astral Vortex Colossus
  }
  // Endless waves 20, 25, 30... alternate Monarch & Colossus
  return (Math.floor(waveNumber / WAVE_CONFIG.BOSS_WAVE_INTERVAL) % 2 === 1)
    ? AREA_TWO_BOSSES[0]
    : AREA_TWO_BOSSES[1]
}

export function getAreaMiniBossCap(waveNumber: number): number {
  const safeWave = Math.max(1, Math.floor(waveNumber))
  if (safeWave < 3) return 0
  return safeWave >= 8 ? 2 : 1
}

export interface AreaEnemySelectOptions {
  roll?: number
  subRoll?: number
  canSpawnRanged?: boolean
  canSpawnMiniBoss?: boolean
}

export function selectAreaEnemyTemplateForWave(
  areaId: ArenaId,
  waveNumber: number,
  options: AreaEnemySelectOptions = {}
): { template: EnemiesRow; isRanged: boolean; isMiniBoss: boolean } {
  const roll = options.roll ?? Math.random()
  const subRoll = options.subRoll ?? Math.random()
  const canSpawnRanged = options.canSpawnRanged ?? true
  const canSpawnMiniBoss = options.canSpawnMiniBoss ?? false

  if (areaId !== 'astral_citadel') {
    const idx = selectEnemyTypeIndexForWave(waveNumber, roll, canSpawnRanged)
    const template = seedEnemies[idx] || seedEnemies[0]
    return {
      template,
      isRanged: idx === 2,
      isMiniBoss: false
    }
  }

  // Area 2: Astral Citadel (5 enemy types)
  const heavySwarmer = AREA_TWO_ENEMIES[0]
  const fastSwarmer = AREA_TWO_ENEMIES[1]
  const rangedWeaver = AREA_TWO_ENEMIES[2]
  const rangedArcanist = AREA_TWO_ENEMIES[3]
  const bastionWarden = AREA_TWO_ENEMIES[4]

  // Wave 1: Contrast between slow tanky swarmer and fast weaker swarmer
  if (waveNumber < 2) {
    return {
      template: roll < 0.56 ? heavySwarmer : fastSwarmer,
      isRanged: false,
      isMiniBoss: false
    }
  }

  // Wave 3+: Chance to spawn the slow tanky AoE Mini-Boss when under active cap
  if (waveNumber >= 3 && canSpawnMiniBoss && roll >= 0.91) {
    return {
      template: bastionWarden,
      isRanged: false,
      isMiniBoss: true
    }
  }

  // Wave 2+: Blend swarmers + 2 distinct ranged enemies (within per-wave ranged quota)
  if (canSpawnRanged && roll >= 0.77) {
    const rangedPick = subRoll < 0.5 ? rangedWeaver : rangedArcanist
    return {
      template: rangedPick,
      isRanged: true,
      isMiniBoss: false
    }
  }

  // Default Melee Swarm roll: ~56% Citadel Golem (slow tanky), ~44% Zephyr Shardling (fast weaker)
  const meleeRoll = subRoll
  return {
    template: meleeRoll < 0.56 ? heavySwarmer : fastSwarmer,
    isRanged: false,
    isMiniBoss: false
  }
}

