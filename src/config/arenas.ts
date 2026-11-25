/**
 * Arena / Area Definitions & Unlock Logic
 * Area 1 (Carbon Sector - Black Arena) is unlocked from the start.
 * Area 2 (Astral Citadel) unlocks once the player beats Wave 15.
 * Area 3 (Molten Starforge) unlocks after Astral Scourge is defeated.
 */

import type { EnemiesRow } from '../types/database'
import { enemies as seedEnemies } from '../db/seedData'
import { selectEnemyTypeIndexForWave, WAVE_CONFIG } from './gameConstants'

export type ArenaId = 'carbon_sector' | 'astral_citadel' | 'molten_starforge'

export const AREA_ONE_MAX_WAVE = WAVE_CONFIG.MAX_WAVE
export const AREA_TWO_MAX_WAVE = 20
export const AREA_THREE_MAX_WAVE = 20
export const WAVE_15_FINAL_BOSS_BASE_HP = 150000
export const MOLTEN_STARFORGE_FINAL_BOSS_ID = 'boss_a3_20'

export interface ArenaDefinition {
  id: ArenaId
  order: number
  name: string
  subtitle: string
  description: string
  maxWave: number
  unlockWaveRequirement: number | null
  unlockAreaId: ArenaId | null
  difficultyLabel: string
  coinBonusPercent: number
  enemyHpMultiplier: number
  enemySpeedMultiplier: number
  enemyDamageMultiplier: number
  enemySpawnRateMultiplier: number
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
    maxWave: AREA_ONE_MAX_WAVE,
    unlockWaveRequirement: null,
    unlockAreaId: null,
    difficultyLabel: 'Standard',
    coinBonusPercent: 0,
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    enemyDamageMultiplier: 1.0,
    enemySpawnRateMultiplier: 1.0,
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
      'High-threat sapphire sanctuary with 5 Citadel hostiles, 20 escalating waves ending with the Wave 20 Astral Scourge leviathan, Endless Mode after Wave 20, and +35% Battle Coins.',
    maxWave: AREA_TWO_MAX_WAVE,
    unlockWaveRequirement: 15,
    unlockAreaId: 'carbon_sector',
    difficultyLabel: 'Elite (+55% Threat)',
    coinBonusPercent: 35,
    enemyHpMultiplier: 1.55,
    enemySpeedMultiplier: 1.18,
    enemyDamageMultiplier: 1.25,
    enemySpawnRateMultiplier: 1.18,
    coinBonusMultiplier: 1.35,
    floorColor: '#0E1C36',
    gridColor: 'rgba(52, 211, 153, 0.14)',
    borderColor: 'rgba(250, 204, 21, 0.72)',
    accentHex: '#34D399'
  },
  {
    id: 'molten_starforge',
    order: 3,
    name: 'Molten Starforge',
    subtitle: 'Heart of the Dying Star',
    description:
      'A superheated orbital foundry with 20 escalating waves, new Starforge weapons, a final battle against Infero Champion, and +75% Battle Coins.',
    maxWave: AREA_THREE_MAX_WAVE,
    unlockWaveRequirement: AREA_TWO_MAX_WAVE,
    unlockAreaId: 'astral_citadel',
    difficultyLabel: 'Cataclysmic (+100% Threat)',
    coinBonusPercent: 75,
    enemyHpMultiplier: 2.15,
    enemySpeedMultiplier: 1.32,
    enemyDamageMultiplier: 1.72,
    enemySpawnRateMultiplier: 1.34,
    coinBonusMultiplier: 1.75,
    floorColor: '#1B0D0A',
    gridColor: 'rgba(251, 100, 36, 0.16)',
    borderColor: 'rgba(251, 146, 60, 0.82)',
    accentHex: '#FB923C'
  }
]

export function getAreaMaxWave(areaId?: ArenaId | string | null): number {
  return GAME_AREAS.find((area) => area.id === areaId)?.maxWave ?? AREA_ONE_MAX_WAVE
}

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
    hp: 95,
    speed: 0.38,
    coin_value: 2,
    description:
      'Slower, heavily plated sapphirestone swarmer built to absorb heavy sustained fire across Citadel waves.'
  },
  {
    id: 'ene_a2_02',
    name: 'Zephyr Shardling',
    category: 'Fast Flanker',
    hp: 34,
    speed: 1.30,
    coin_value: 2,
    description:
      'Fragile yet blazing-fast crystal swarmer that weaves rapidly through Citadel corridors in nimble packs.'
  },
  {
    id: 'ene_a2_03',
    name: 'Prism Bolt Weaver',
    category: 'Ranged Sniper',
    hp: 74,
    speed: 0.84,
    coin_value: 5,
    description:
      'Orbiting Citadel ranged construct that maintains mid-range spacing while firing high-velocity emerald lance bolts.'
  },
  {
    id: 'ene_a2_04',
    name: 'Astral Arcanist',
    category: 'Ranged Caster',
    hp: 90,
    speed: 0.74,
    coin_value: 6,
    description:
      'Hovering rune sentinel that fires wide 3-orb arcane projectile fans to pressure mobile operatives from afar.'
  },
  {
    id: 'ene_a2_05',
    name: 'Astral Bastion Warden',
    category: 'Mini-Boss',
    hp: 340,
    speed: 0.32,
    coin_value: 20,
    description:
      'Slow, heavily armored Citadel mini-boss that launches telegraphed AoE mortar projectiles with clear ground dodge indicators.'
  }
]

/** Molten Starforge enemies; the last entry is the area's recurring mini-boss. */
export const AREA_THREE_ENEMIES: EnemiesRow[] = [
  {
    id: 'ene_a3_01',
    name: 'Basalt Bulwark',
    category: 'Heavy Swarm',
    hp: 190,
    speed: 0.46,
    coin_value: 5,
    description:
      'A hulking foundry guardian plated in cooled star-metal. Slow to turn, but built to absorb sustained fire.'
  },
  {
    id: 'ene_a3_02',
    name: 'Cinder Skater',
    category: 'Fast Flanker',
    hp: 62,
    speed: 1.62,
    coin_value: 5,
    description:
      'A glassy ember-creature that darts in sudden zigzags, leaving a short-lived trail of sparks.'
  },
  {
    id: 'ene_a3_03',
    name: 'Furnace Marksman',
    category: 'Ranged Sniper',
    hp: 150,
    speed: 0.96,
    coin_value: 11,
    description:
      'A long-range forge construct that backs away before firing a thin, fast-moving molten lance.'
  },
  {
    id: 'ene_a3_04',
    name: 'Searing Runesmith',
    category: 'Ranged Caster',
    hp: 172,
    speed: 0.82,
    coin_value: 13,
    description:
      'A hovering runesmith that fans three bright slag-orbs across the arena.'
  },
  {
    id: 'ene_a3_05',
    name: 'Crucible Brute',
    category: 'Mini-Boss',
    hp: 720,
    speed: 0.42,
    coin_value: 42,
    description:
      'A towering furnace brute that lobs clearly marked magma shells and punishes players who hold still.'
  },
  {
    id: 'ene_a3_06',
    name: 'Furnace Leviathan',
    category: 'Mini-Boss',
    hp: 1450,
    speed: 0.7,
    coin_value: 88,
    description:
      'A flying forge-serpent mini-boss that sweeps the arena and showers the floor with marked cinders.'
  }
]

export const ASTRAL_SCOURGE_BOSS_ID = 'boss_a2_20'
export const ASTRAL_SCOURGE_PHASE_ONE_HP = 1_000_000
export const ASTRAL_SCOURGE_PHASE_TWO_HP = 2_500_000
export const ASTRAL_SCOURGE_PHASE_TWO_DELAY_SECONDS = 3
export const ASTRAL_SCOURGE_PHASE_TWO_CUTSCENE_SECONDS = 2.8
export const ASTRAL_SCOURGE_PHASE_TWO_RUSH_SECONDS = 1.8
export const ASTRAL_SCOURGE_PHASE_TWO_ORBIT_RADIUS = 320
export const ASTRAL_SCOURGE_PHASE_TWO_SEGMENT_COUNT = Math.ceil(
  (2 * Math.PI * ASTRAL_SCOURGE_PHASE_TWO_ORBIT_RADIUS) / 24
)

/**
 * Dedicated Area 2 Bosses spawning every 5 waves (Wave 5, Wave 10, Wave 15, Wave 20 Final Boss, and Endless 25+)
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
    speed: 0.34,
    coin_value: 250,
    description:
      'Area 2 Wave 15 Celestial Sentinel unleashing radiant solar spreads, telegraphed crossfire, and dodgeable AoE barrages.'
  },
  {
    id: ASTRAL_SCOURGE_BOSS_ID,
    name: 'Astral Scourge',
    category: 'Boss',
    hp: 240000,
    speed: 0.88,
    coin_value: 450,
    description:
      'Area 2 Wave 20 Final Boss — colossal segmented astral worm that hunts across the Citadel with laser webs, rift lunges, and splitting starlight barrages.'
  }
]

export const AREA_THREE_BOSSES: EnemiesRow[] = [
  {
    id: 'boss_a3_05',
    name: 'Cinder Crown',
    category: 'Boss',
    hp: 980,
    speed: 0.62,
    coin_value: 175,
    description:
      'Wave 5 Starforge boss: a ringed ember monarch that alternates wide radial bursts with a marked core slam.'
  },
  {
    id: 'boss_a3_10',
    name: 'Magma Artificer',
    category: 'Boss',
    hp: 1650,
    speed: 0.54,
    coin_value: 260,
    description:
      'Wave 10 Starforge boss: a walking foundry that lays down warning-marked molten lanes before firing.'
  },
  {
    id: 'boss_a3_15',
    name: 'Searing Juggernaut',
    category: 'Boss',
    hp: 225000,
    speed: 0.4,
    coin_value: 500,
    description:
      'Wave 15 apex threat: an armored furnace colossus that cycles through expanding rings and aimed volleys.'
  },
  {
    id: MOLTEN_STARFORGE_FINAL_BOSS_ID,
    name: 'Infero Champion',
    category: 'Boss',
    hp: 1000000,
    speed: 0.32,
    coin_value: 900,
    description:
      'Wave 20 final boss: a winged molten-rock champion crowned in living fire, escalating into a faster two-phase inferno.'
  }
]

export function getAreaById(areaId?: string | null): ArenaDefinition {
  return GAME_AREAS.find((a) => a.id === areaId) ?? GAME_AREAS[0]
}

export interface AreaUnlockTelemetry {
  wave_15_cleared?: boolean
  area_2_wave20_cleared?: boolean
  area_3_wave20_cleared?: boolean
}

export function isAreaUnlocked(
  areaId: ArenaId,
  telemetry?: AreaUnlockTelemetry | null
): boolean {
  const area = GAME_AREAS.find((a) => a.id === areaId)
  if (!area || area.unlockAreaId === null) return true
  if (area.id === 'astral_citadel') return Boolean(telemetry?.wave_15_cleared)
  if (area.id === 'molten_starforge') return Boolean(telemetry?.area_2_wave20_cleared)
  return false
}

export function getAreaEnemies(areaId: ArenaId): EnemiesRow[] {
  if (areaId === 'astral_citadel') return AREA_TWO_ENEMIES
  if (areaId === 'molten_starforge') return AREA_THREE_ENEMIES
  return seedEnemies
}

export function getWave15FinalBossHp(areaId: ArenaId): number {
  const area = getAreaById(areaId)
  return Math.round(WAVE_15_FINAL_BOSS_BASE_HP * area.enemyHpMultiplier)
}

export function getAreaFinalBossHp(areaId: ArenaId): number {
  if (areaId === 'astral_citadel') {
    return 240000
  }
  if (areaId === 'molten_starforge') {
    return 1000000
  }
  return getWave15FinalBossHp(areaId)
}

export interface AreaOneBossBuffProfile {
  hpMultiplier: number
  damageMultiplier: number
  speedMultiplier: number
  damageReduction: number
  shootCooldownScale: number
  specialCooldownScale: number
  coinMultiplier: number
  enableEnrage: boolean
}

export interface Wave15BossCombatProfile {
  hpMultiplier: number
  damageMultiplier: number
  damageReduction: number
  shootCooldownScale: number
  specialCooldownScale: number
  coinMultiplier: number
  totalPhases: number
}

/**
 * Buffs Area 1 (Carbon Sector) bosses so Wave 5, Wave 10, Endless, and Wave 15 Omega Overlord
 * cannot be burst down in seconds by mid/late-game player builds.
 */
export function getAreaOneBossBuff(
  waveNumber: number,
  isWave15FinalBoss: boolean = false
): AreaOneBossBuffProfile {
  if (isWave15FinalBoss) {
    return {
      hpMultiplier: 3.2, // Raises Area 1 Omega Overlord to 480,000 raw HP (~827k effective HP with 42% Armor DR)
      damageMultiplier: 1.38,
      speedMultiplier: 1.0,
      damageReduction: 0.42,
      shootCooldownScale: 0.76,
      specialCooldownScale: 0.78,
      coinMultiplier: 1.35,
      enableEnrage: true
    }
  }

  const tier = Math.max(1, Math.floor(waveNumber / WAVE_CONFIG.BOSS_WAVE_INTERVAL))
  if (tier === 1) {
    // Wave 5 Aegis Commander
    return {
      hpMultiplier: 4.5,
      damageMultiplier: 1.3,
      speedMultiplier: 1.12,
      damageReduction: 0.22,
      shootCooldownScale: 0.82,
      specialCooldownScale: 0.82,
      coinMultiplier: 1.5,
      enableEnrage: true
    }
  }
  if (tier === 2) {
    // Wave 10 Crimson Vanguard
    return {
      hpMultiplier: 6.2,
      damageMultiplier: 1.45,
      speedMultiplier: 1.18,
      damageReduction: 0.3,
      shootCooldownScale: 0.75,
      specialCooldownScale: 0.78,
      coinMultiplier: 1.75,
      enableEnrage: true
    }
  }

  // Wave 20+ Endless Area 1 Bosses
  return {
    hpMultiplier: 7.5,
    damageMultiplier: 1.55,
    speedMultiplier: 1.22,
    damageReduction: 0.35,
    shootCooldownScale: 0.72,
    specialCooldownScale: 0.74,
    coinMultiplier: 2.0,
    enableEnrage: true
  }
}

/**
 * Dedicated boss scaling profile for Area 2 (Astral Citadel) Wave 5, Wave 10, Wave 15, and Endless 25+ bosses
 * so Citadel encounters provide a sharper challenge than Area 1 even for upgraded post-W15 builds.
 */
export function getAreaTwoBossBuff(waveNumber: number): AreaOneBossBuffProfile {
  const tier = Math.max(1, Math.floor(waveNumber / WAVE_CONFIG.BOSS_WAVE_INTERVAL))
  if (tier === 1) {
    // Wave 5 Emerald Prism Monarch
    return {
      hpMultiplier: 3.4,
      damageMultiplier: 1.25,
      speedMultiplier: 1.12,
      damageReduction: 0.25,
      shootCooldownScale: 0.78,
      specialCooldownScale: 0.8,
      coinMultiplier: 1.45,
      enableEnrage: true
    }
  }
  if (tier === 2) {
    // Wave 10 Astral Vortex Colossus
    return {
      hpMultiplier: 4.6,
      damageMultiplier: 1.4,
      speedMultiplier: 1.16,
      damageReduction: 0.34,
      shootCooldownScale: 0.72,
      specialCooldownScale: 0.75,
      coinMultiplier: 1.75,
      enableEnrage: true
    }
  }
  if (tier === 3) {
    // Wave 15 Solar Archon Seraph (mid-run Citadel Boss)
    return {
      hpMultiplier: 0.14, // Scales 150k base template (~160k-210k raw HP in Wave 15) cleanly below Wave 20 Astral Scourge
      damageMultiplier: 1.48,
      speedMultiplier: 1.18,
      damageReduction: 0.38,
      shootCooldownScale: 0.72,
      specialCooldownScale: 0.74,
      coinMultiplier: 1.35,
      enableEnrage: true
    }
  }

  // Wave 25+ Endless Area 2 Bosses
  return {
    hpMultiplier: 6.4,
    damageMultiplier: 1.6,
    speedMultiplier: 1.24,
    damageReduction: 0.4,
    shootCooldownScale: 0.66,
    specialCooldownScale: 0.68,
    coinMultiplier: 2.1,
    enableEnrage: true
  }
}

export function getAreaThreeBossBuff(waveNumber: number): AreaOneBossBuffProfile {
  const tier = Math.max(1, Math.floor(waveNumber / WAVE_CONFIG.BOSS_WAVE_INTERVAL))
  if (tier === 1) {
    return {
      hpMultiplier: 4.4,
      damageMultiplier: 1.52,
      speedMultiplier: 1.22,
      damageReduction: 0.3,
      shootCooldownScale: 0.72,
      specialCooldownScale: 0.72,
      coinMultiplier: 1.7,
      enableEnrage: true
    }
  }
  if (tier === 2) {
    return {
      hpMultiplier: 5.8,
      damageMultiplier: 1.72,
      speedMultiplier: 1.26,
      damageReduction: 0.38,
      shootCooldownScale: 0.66,
      specialCooldownScale: 0.68,
      coinMultiplier: 1.9,
      enableEnrage: true
    }
  }
  if (tier === 3) {
    return {
      hpMultiplier: 0.18,
      damageMultiplier: 1.82,
      speedMultiplier: 1.3,
      damageReduction: 0.42,
      shootCooldownScale: 0.62,
      specialCooldownScale: 0.64,
      coinMultiplier: 2,
      enableEnrage: true
    }
  }
  return {
    hpMultiplier: 7.4,
    damageMultiplier: 2,
    speedMultiplier: 1.34,
    damageReduction: 0.46,
    shootCooldownScale: 0.58,
    specialCooldownScale: 0.6,
    coinMultiplier: 2.2,
    enableEnrage: true
  }
}

/**
 * Unified Area Final Boss combat profile (Wave 15 Omega Overlord for Carbon Sector,
 * Wave 20 Astral Scourge for Astral Citadel) ensuring high durability across 3 phases.
 */
export function getWave15BossCombatProfile(areaId: ArenaId): Wave15BossCombatProfile {
  if (areaId === 'astral_citadel') {
    return {
      hpMultiplier: 3.6, // 240,000 * 3.6 = 864,000 raw HP (~1.57M effective HP with 45% Armor DR)
      damageMultiplier: 1.45,
      damageReduction: 0.45,
      shootCooldownScale: 0.72,
      specialCooldownScale: 0.74,
      coinMultiplier: 1.5,
      totalPhases: 3
    }
  }
  if (areaId === 'molten_starforge') {
    return {
      hpMultiplier: 3,
      damageMultiplier: 1.82,
      damageReduction: 0.22,
      shootCooldownScale: 0.62,
      specialCooldownScale: 0.64,
      coinMultiplier: 2.4,
      totalPhases: 2
    }
  }

  const a1 = getAreaOneBossBuff(WAVE_CONFIG.MAX_WAVE, true)
  return {
    hpMultiplier: a1.hpMultiplier,
    damageMultiplier: a1.damageMultiplier,
    damageReduction: a1.damageReduction,
    shootCooldownScale: a1.shootCooldownScale,
    specialCooldownScale: a1.specialCooldownScale,
    coinMultiplier: a1.coinMultiplier,
    totalPhases: 3
  }
}

export function getAreaFinalBossCombatProfile(areaId: ArenaId): Wave15BossCombatProfile {
  return getWave15BossCombatProfile(areaId)
}

export function shouldSpawnRegularEnemiesInWave(
  waveNumber: number,
  isEndlessMode: boolean = false,
  isDevourerActive: boolean = false,
  areaId: ArenaId = 'carbon_sector'
): boolean {
  if (isDevourerActive) {
    return false
  }
  if (
    (areaId === 'astral_citadel' || areaId === 'molten_starforge') &&
    waveNumber === 15
  ) {
    return false
  }
  if (waveNumber === getAreaMaxWave(areaId) && !isEndlessMode) {
    return false
  }
  return true
}

export function getAreaBossTemplateForWave(
  areaId: ArenaId,
  waveNumber: number
): EnemiesRow {
  if (areaId === 'molten_starforge') {
    if (waveNumber === AREA_THREE_MAX_WAVE) {
      return AREA_THREE_BOSSES[3]
    }
    if (waveNumber === 15) return AREA_THREE_BOSSES[2]
    if (waveNumber === 10) return AREA_THREE_BOSSES[1]
    if (waveNumber === 5) return AREA_THREE_BOSSES[0]
    return (Math.floor(waveNumber / WAVE_CONFIG.BOSS_WAVE_INTERVAL) % 2 === 1)
      ? AREA_THREE_BOSSES[0]
      : AREA_THREE_BOSSES[1]
  }
  if (areaId !== 'astral_citadel') {
    return seedEnemies.find((e) => e.id === 'ene_04') || seedEnemies[3]
  }
  if (waveNumber === AREA_TWO_MAX_WAVE) {
    return AREA_TWO_BOSSES[3] // Astral Scourge (Area 2 Wave 20 Final Boss)
  }
  if (waveNumber === 15) {
    return AREA_TWO_BOSSES[2] // Solar Archon Seraph (Area 2 Wave 15 Boss)
  }
  if (waveNumber === 5) {
    return AREA_TWO_BOSSES[0] // Emerald Prism Monarch
  }
  if (waveNumber === 10) {
    return AREA_TWO_BOSSES[1] // Astral Vortex Colossus
  }
  // Endless waves 25, 30, 35... alternate Monarch & Colossus
  return (Math.floor(waveNumber / WAVE_CONFIG.BOSS_WAVE_INTERVAL) % 2 === 1)
    ? AREA_TWO_BOSSES[0]
    : AREA_TWO_BOSSES[1]
}

export function getAreaMiniBossCap(waveNumber: number): number {
  const safeWave = Math.max(1, Math.floor(waveNumber))
  if (safeWave < 3) return 0
  if (safeWave >= 12) return 3
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

  if (areaId === 'molten_starforge') {
    const [bulwark, skater, marksman, runesmith, brute, leviathan] = AREA_THREE_ENEMIES
    if (waveNumber < 2) {
      return {
        template: roll < 0.54 ? bulwark : skater,
        isRanged: false,
        isMiniBoss: false
      }
    }
    if (waveNumber >= 3 && canSpawnMiniBoss && roll >= 0.88) {
      return {
        template: subRoll < 0.5 ? brute : leviathan || brute,
        isRanged: false,
        isMiniBoss: true
      }
    }
    if (canSpawnRanged && roll >= 0.68) {
      return {
        template: subRoll < 0.52 ? marksman : runesmith,
        isRanged: true,
        isMiniBoss: false
      }
    }
    return {
      template: roll < 0.48 ? bulwark : skater,
      isRanged: false,
      isMiniBoss: false
    }
  }

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
  if (waveNumber >= 3 && canSpawnMiniBoss && roll >= 0.89) {
    return {
      template: bastionWarden,
      isRanged: false,
      isMiniBoss: true
    }
  }

  // Wave 2+: Blend swarmers + 2 distinct ranged enemies (within per-wave ranged quota)
  if (canSpawnRanged && roll >= 0.72) {
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

/**
 * Secret Calamity-inspired Boss: Devourer of Gods
 * Strictly excluded from seedData, wave tables, and normal Area 1/2 spawns —
 * summonable ONLY through the authorized Developer Panel.
 */
export const SECRET_DEVOURER_OF_GODS_ID = 'boss_secret_dog'

export const SECRET_DEVOURER_OF_GODS_CUTSCENE_LINES = {
  line1: 'YOU ARE NO GOD',
  line2: 'BUT I SHALL FEAST UPON YOUR ESSENCE REGARDLESS'
} as const

export const SECRET_DEVOURER_OF_GODS_TEMPLATE: EnemiesRow = {
  id: SECRET_DEVOURER_OF_GODS_ID,
  name: 'Devourer of Gods',
  category: 'Boss',
  hp: 1250000,
  speed: 0.92,
  coin_value: 1000,
  description:
    'Secret cosmic serpent summoned exclusively via Developer Console; tears through dimensional rifts with cosmilite armor segments, laser grids, and cosmic fireballs.'
}

export function isSecretDevOnlyBossId(enemyId?: string | null): boolean {
  return enemyId === SECRET_DEVOURER_OF_GODS_ID
}

export interface DevSpawnableEnemyOption {
  id: string
  name: string
  group: 'Area 1' | 'Area 2' | 'Area 3' | 'Bosses' | 'Secret Boss'
  category: string
  isBoss: boolean
  isSecretDevOnly?: boolean
  template: EnemiesRow
}

export const DEV_SPAWNABLE_ENEMIES: DevSpawnableEnemyOption[] = [
  ...seedEnemies
    .filter((e) => e.id !== 'ene_04')
    .map((template) => ({
      id: template.id,
      name: template.name,
      group: 'Area 1' as const,
      category: template.category,
      isBoss: false,
      template
    })),
  ...AREA_TWO_ENEMIES.map((template) => ({
    id: template.id,
    name: template.name,
    group: 'Area 2' as const,
    category: template.category,
    isBoss: false,
    template
  })),
  ...AREA_THREE_ENEMIES.map((template) => ({
    id: template.id,
    name: template.name,
    group: 'Area 3' as const,
    category: template.category,
    isBoss: false,
    template
  })),
  {
    id: 'ene_04',
    name: 'Aegis Commander Drone',
    group: 'Bosses',
    category: 'Boss (Area 1)',
    isBoss: true,
    template: seedEnemies.find((e) => e.id === 'ene_04') || seedEnemies[3]
  },
  ...AREA_TWO_BOSSES.map((template) => ({
    id: template.id,
    name: template.name,
    group: 'Bosses' as const,
    category: 'Boss (Area 2)',
    isBoss: true,
    template
  })),
  ...AREA_THREE_BOSSES.map((template) => ({
    id: template.id,
    name: template.name,
    group: 'Bosses' as const,
    category: 'Boss (Area 3)',
    isBoss: true,
    template
  })),
  {
    id: SECRET_DEVOURER_OF_GODS_ID,
    name: SECRET_DEVOURER_OF_GODS_TEMPLATE.name,
    group: 'Secret Boss',
    category: 'Secret Calamity Boss',
    isBoss: true,
    isSecretDevOnly: true,
    template: SECRET_DEVOURER_OF_GODS_TEMPLATE
  }
]

export function getDevSpawnableEnemyById(enemyId: string): DevSpawnableEnemyOption | undefined {
  return DEV_SPAWNABLE_ENEMIES.find((entry) => entry.id === enemyId)
}

export const DEVOURER_CUTSCENE_DURATION_SECONDS = 11.6

export interface CutsceneCameraFrame {
  focusX: number
  focusY: number
  zoom: number
}

const easeInOutCubic = (t: number): number => {
  const c = Math.max(0, Math.min(1, t))
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

/**
 * Computes smooth camera focus & zoom-in framing centered on the Devourer of Gods
 * synced to the Universal Collapse intro buildup (zooms onto portal/boss -> creeps closer -> snaps out on beat drop).
 */
export function computeDevourerCutsceneCameraFrame(params: {
  elapsed: number
  duration: number
  playerCenter: { x: number; y: number }
  bossFocus: { x: number; y: number }
}): CutsceneCameraFrame {
  const dur = Math.max(0.5, params.duration)
  const t = Math.max(0, Math.min(dur, params.elapsed))

  const zoomInEnd = dur * 0.22
  const holdEnd = dur * 0.80

  let focusWeight = 1
  let zoom = 1

  if (t < zoomInEnd) {
    const f = easeInOutCubic(t / zoomInEnd)
    focusWeight = f
    zoom = 1 + 0.74 * f
  } else if (t < holdEnd) {
    const f = (t - zoomInEnd) / Math.max(0.01, holdEnd - zoomInEnd)
    focusWeight = 1
    zoom = 1.74 + 0.14 * f
  } else {
    const f = easeInOutCubic((t - holdEnd) / Math.max(0.01, dur - holdEnd))
    focusWeight = 1 - f
    zoom = 1 + 0.88 * (1 - f)
  }

  return {
    focusX: params.playerCenter.x + (params.bossFocus.x - params.playerCenter.x) * focusWeight,
    focusY: params.playerCenter.y + (params.bossFocus.y - params.playerCenter.y) * focusWeight,
    zoom
  }
}

export const WAVE_15_CUTSCENE_DURATION_SECONDS = 4.6

export type BossCutsceneKind =
  | 'dog'
  | 'w15_omega'
  | 'w15_seraph'
  | 'w15_starforge'
  | 'w20_area2'
  | 'w20_area3'

export type BossCutscenePresentation = 'dialogue' | 'warning'

export type BossCutsceneParticleStyle = 'cosmic_rift' | 'carbon_inferno' | 'astral_solar_fire'

export interface BossCutsceneTheme {
  kind: BossCutsceneKind
  durationSeconds?: number
  revealDelaySeconds?: number
  presentation: BossCutscenePresentation
  particleStyle: BossCutsceneParticleStyle
  speaker: string
  line1: string
  line2: string
  warningTitle: string
  warningSubtitle: string
  warningCriticalText: string
  primaryColor: string
  secondaryColor: string
  coreColor: string
  palette: string[]
  stripeHex: string
  flashBuildColor: string
  flashDropColor: string
  vignetteInnerRgba: string
  vignetteOuterRgba: string
  borderClass: string
  speakerClass: string
  line1Class: string
  line2Class: string
}

export const DEVOURER_CUTSCENE_THEME: BossCutsceneTheme = {
  kind: 'dog',
  presentation: 'dialogue',
  particleStyle: 'cosmic_rift',
  speaker: 'Devourer of Gods',
  line1: SECRET_DEVOURER_OF_GODS_CUTSCENE_LINES.line1,
  line2: SECRET_DEVOURER_OF_GODS_CUTSCENE_LINES.line2,
  warningTitle: '',
  warningSubtitle: '',
  warningCriticalText: '',
  primaryColor: '#22D3EE',
  secondaryColor: '#E879F9',
  coreColor: '#F0ABFC',
  palette: ['#22D3EE', '#E879F9', '#A855F7', '#F0ABFC', '#67E8F9'],
  stripeHex: '#22D3EE',
  flashBuildColor: '#F5D0FE',
  flashDropColor: '#E0F2FE',
  vignetteInnerRgba: 'rgba(107, 33, 168, 1)',
  vignetteOuterRgba: 'rgba(34, 211, 238, 1)',
  borderClass: 'border-cyan-400/75 shadow-[0_0_36px_rgba(34,211,238,0.35)]',
  speakerClass: 'text-fuchsia-300',
  line1Class: 'text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.65)]',
  line2Class: 'text-fuchsia-200 drop-shadow-[0_0_10px_rgba(232,121,249,0.6)]'
}

export function getWave15CutsceneTheme(areaId: ArenaId): BossCutsceneTheme {
  if (areaId === 'astral_citadel') {
    return {
      kind: 'w15_seraph',
      durationSeconds: 6.2,
      revealDelaySeconds: 2.2,
      presentation: 'warning',
      particleStyle: 'astral_solar_fire',
      speaker: 'Solar Archon Seraph',
      line1: '',
      line2: '',
      warningTitle: 'BOSS WARNING // SOLAR ARCHON SERAPH',
      warningSubtitle: 'ASTRAL CITADEL WAVE 15 APEX THREAT DETECTED',
      warningCriticalText: 'SOLAR INFERNO BREACH IMMINENT',
      primaryColor: '#FACC15',
      secondaryColor: '#34D399',
      coreColor: '#FEF9C3',
      palette: ['#FEF08A', '#FACC15', '#FB923C', '#34D399', '#F59E0B'],
      stripeHex: '#FACC15',
      flashBuildColor: '#FEF08A',
      flashDropColor: '#FEF9C3',
      vignetteInnerRgba: 'rgba(180, 83, 9, 1)',
      vignetteOuterRgba: 'rgba(52, 211, 153, 1)',
      borderClass: 'border-amber-400/90 shadow-[0_0_34px_rgba(250,204,21,0.45)]',
      speakerClass: 'text-emerald-300',
      line1Class: 'text-amber-300 drop-shadow-[0_0_14px_rgba(250,204,21,0.75)]',
      line2Class: 'text-emerald-200 drop-shadow-[0_0_10px_rgba(52,211,153,0.65)]'
    }
  }
  if (areaId === 'molten_starforge') {
    return {
      kind: 'w15_starforge',
      durationSeconds: 5.8,
      revealDelaySeconds: 2.1,
      presentation: 'warning',
      particleStyle: 'carbon_inferno',
      speaker: 'Searing Juggernaut',
      line1: '',
      line2: '',
      warningTitle: 'BOSS WARNING // SEARING JUGGERNAUT',
      warningSubtitle: 'MOLTEN STARFORGE WAVE 15 APEX THREAT DETECTED',
      warningCriticalText: 'CRUCIBLE CONTAINMENT FAILURE IMMINENT',
      primaryColor: '#F97316',
      secondaryColor: '#FACC15',
      coreColor: '#FFF7ED',
      palette: ['#F97316', '#FB923C', '#FACC15', '#EF4444', '#FDBA74'],
      stripeHex: '#F97316',
      flashBuildColor: '#FED7AA',
      flashDropColor: '#FFF7ED',
      vignetteInnerRgba: 'rgba(124, 45, 18, 1)',
      vignetteOuterRgba: 'rgba(249, 115, 22, 1)',
      borderClass: 'border-orange-400/90 shadow-[0_0_34px_rgba(249,115,22,0.48)]',
      speakerClass: 'text-amber-300',
      line1Class: 'text-orange-200 drop-shadow-[0_0_14px_rgba(249,115,22,0.8)]',
      line2Class: 'text-yellow-100 drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]'
    }
  }

  return {
    kind: 'w15_omega',
    durationSeconds: 5.4,
    revealDelaySeconds: 1.8,
    presentation: 'warning',
    particleStyle: 'carbon_inferno',
    speaker: 'Omega Overlord',
    line1: '',
    line2: '',
    warningTitle: 'BOSS WARNING // OMEGA OVERLORD',
    warningSubtitle: 'CARBON SECTOR WAVE 15 APEX THREAT DETECTED',
    warningCriticalText: 'CORE MELTDOWN IGNITION IMMINENT',
    primaryColor: '#FF0055',
    secondaryColor: '#FB923C',
    coreColor: '#FDE047',
    palette: ['#FF0055', '#F97316', '#EF4444', '#FDE047', '#FB7185'],
    stripeHex: '#FF0055',
    flashBuildColor: '#FECDD3',
    flashDropColor: '#FFEDD5',
    vignetteInnerRgba: 'rgba(153, 27, 27, 1)',
    vignetteOuterRgba: 'rgba(249, 115, 22, 1)',
    borderClass: 'border-rose-500/90 shadow-[0_0_34px_rgba(255,0,85,0.48)]',
    speakerClass: 'text-orange-300',
    line1Class: 'text-rose-400 drop-shadow-[0_0_14px_rgba(255,0,85,0.8)]',
    line2Class: 'text-amber-200 drop-shadow-[0_0_10px_rgba(251,146,60,0.7)]'
  }
}

export function getAreaFinalBossCutsceneTheme(areaId: ArenaId): BossCutsceneTheme {
  if (areaId === 'astral_citadel') {
    return {
      kind: 'w20_area2',
      presentation: 'warning',
      particleStyle: 'astral_solar_fire',
      speaker: 'Astral Scourge',
      line1: '',
      line2: '',
      warningTitle: 'BOSS WARNING // ASTRAL SCOURGE',
      warningSubtitle: 'ASTRAL CITADEL WAVE 20 FINAL BOSS DETECTED',
      warningCriticalText: 'LEVIATHAN BREACH IMMINENT',
      primaryColor: '#34D399',
      secondaryColor: '#FACC15',
      coreColor: '#FEF9C3',
      palette: ['#34D399', '#FACC15', '#38BDF8', '#FEF08A', '#10B981'],
      stripeHex: '#34D399',
      flashBuildColor: '#A7F3D0',
      flashDropColor: '#FEF9C3',
      vignetteInnerRgba: 'rgba(6, 78, 59, 1)',
      vignetteOuterRgba: 'rgba(250, 204, 21, 1)',
      borderClass: 'border-emerald-400/90 shadow-[0_0_34px_rgba(52,211,153,0.48)]',
      speakerClass: 'text-amber-300',
      line1Class: 'text-emerald-300 drop-shadow-[0_0_14px_rgba(52,211,153,0.8)]',
      line2Class: 'text-amber-200 drop-shadow-[0_0_10px_rgba(250,204,21,0.7)]'
    }
  }
  if (areaId === 'molten_starforge') {
    return {
      kind: 'w20_area3',
      durationSeconds: 8.2,
      revealDelaySeconds: 3.1,
      presentation: 'warning',
      particleStyle: 'carbon_inferno',
      speaker: 'Infero Champion',
      line1: '',
      line2: '',
      warningTitle: 'INFERO CHAMPION // THE WINGED ASCENDANT',
      warningSubtitle: 'MOLTEN STARFORGE WAVE 20 — AERIAL ENGAGEMENT',
      warningCriticalText: 'THE FIRST FIRE TAKES FLIGHT',
      primaryColor: '#FB923C',
      secondaryColor: '#FDE047',
      coreColor: '#FFF7ED',
      palette: ['#FB923C', '#F97316', '#FDE047', '#EF4444', '#FFF7ED'],
      stripeHex: '#FB923C',
      flashBuildColor: '#FED7AA',
      flashDropColor: '#FFF7ED',
      vignetteInnerRgba: 'rgba(124, 45, 18, 1)',
      vignetteOuterRgba: 'rgba(251, 146, 60, 1)',
      borderClass: 'border-orange-300/90 shadow-[0_0_42px_rgba(251,146,60,0.55)]',
      speakerClass: 'text-yellow-200',
      line1Class: 'text-orange-200 drop-shadow-[0_0_16px_rgba(251,146,60,0.85)]',
      line2Class: 'text-yellow-100 drop-shadow-[0_0_12px_rgba(253,224,71,0.75)]'
    }
  }
  return getWave15CutsceneTheme('carbon_sector')
}

export function getAstralScourgePhaseTwoCutsceneTheme(): BossCutsceneTheme {
  const theme = getAreaFinalBossCutsceneTheme('astral_citadel')
  return {
    ...theme,
    presentation: 'dialogue',
    speaker: 'ASTRAL SCOURGE',
    line1: "IT'S NOT OVER YET",
    line2: '',
    borderClass: 'border-emerald-300/90 shadow-[0_0_42px_rgba(52,211,153,0.65)]',
    speakerClass: 'text-amber-300',
    line1Class: 'text-emerald-200 drop-shadow-[0_0_18px_rgba(52,211,153,0.9)]',
    line2Class: 'text-amber-100 drop-shadow-[0_0_12px_rgba(250,204,21,0.75)]'
  }
}

export interface CutsceneShakeFrame {
  offsetX: number
  offsetY: number
  intensity: number
  flashAlpha: number
}

/**
 * Computes screen-shake trauma offsets, intensity curve, and flash pulses
 * across boss entrance cutscenes (Devourer of Gods & Wave 15 Area 1/2 Final Bosses).
 */
export function computeBossCutsceneShake(params: {
  elapsed: number
  duration: number
  sampleTime?: number
  line2Time?: number
}): CutsceneShakeFrame {
  const dur = Math.max(1, params.duration)
  const t = Math.max(0, params.elapsed)
  const sample = params.sampleTime ?? t
  const line2T = Math.max(0.6, Math.min(dur * 0.65, params.line2Time ?? dur * 0.34))

  if (t > dur + 0.95) {
    return { offsetX: 0, offsetY: 0, intensity: 0, flashAlpha: 0 }
  }

  let intensity = 0
  let flashAlpha = 0

  if (t <= dur) {
    // 1. Initial dimensional / orbital lockdown tear impulse
    const tearPulse = t < 0.7 ? Math.pow(1 - t / 0.7, 1.5) * 8.5 : 0
    // 2. Ominous sub-rumble while portal/core charges
    const lowRumble =
      t >= 0.35 && t < line2T ? 1.8 + ((t - 0.35) / Math.max(0.2, line2T - 0.35)) * 2.4 : 0
    // 3. Second dialogue line / emergence surge
    const line2Span = Math.min(1.7, Math.max(0.9, dur * 0.25))
    const line2Burst =
      t >= line2T && t < line2T + line2Span
        ? Math.pow(1 - (t - line2T) / line2Span, 1.4) * 10.5
        : 0
    // 4. Escalating pre-drop crescendo leading into boss awakening
    const rampStart = Math.max(line2T + 0.6, dur - Math.min(4.2, dur * 0.52))
    const preDropRamp =
      t >= rampStart
        ? 3.2 + Math.pow((t - rampStart) / Math.max(0.4, dur - rampStart), 1.85) * 13.5
        : 0

    intensity = Math.max(tearPulse, lowRumble, line2Burst, preDropRamp)

    if (t < 0.28) {
      flashAlpha = Math.max(flashAlpha, (1 - t / 0.28) * 0.24)
    }
    if (t >= line2T && t < line2T + 0.45) {
      flashAlpha = Math.max(flashAlpha, (1 - (t - line2T) / 0.45) * 0.28)
    }
    if (t >= dur - 0.35) {
      flashAlpha = Math.max(flashAlpha, ((t - (dur - 0.35)) / 0.35) * 0.32)
    }
  } else {
    // Post-drop explosive impact trauma decaying over 0.95s
    const after = t - dur
    const decay = Math.pow(Math.max(0, 1 - after / 0.95), 2)
    intensity = 20 * decay
    flashAlpha = after < 0.42 ? Math.pow(1 - after / 0.42, 1.6) * 0.62 : 0
  }

  const offsetX =
    intensity *
    (Math.sin(sample * 73.1) * 0.55 +
      Math.cos(sample * 131.7) * 0.3 +
      Math.sin(sample * 211.3) * 0.15)
  const offsetY =
    intensity *
    (Math.cos(sample * 67.9) * 0.55 +
      Math.sin(sample * 119.3) * 0.3 +
      Math.cos(sample * 197.1) * 0.15)

  return {
    offsetX,
    offsetY,
    intensity: Number(intensity.toFixed(3)),
    flashAlpha: Number(Math.max(0, Math.min(0.75, flashAlpha)).toFixed(3))
  }
}

export function computeDevourerCutsceneShake(params: {
  elapsed: number
  duration: number
  sampleTime?: number
}): CutsceneShakeFrame {
  return computeBossCutsceneShake({
    ...params,
    line2Time: 3.4
  })
}



