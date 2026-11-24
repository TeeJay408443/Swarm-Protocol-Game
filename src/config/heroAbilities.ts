/**
 * Reworked Hero Signature Abilities & Combat Constants
 * Source of truth shared by GameContainer, ArmoryView, CodexView, HUD, and tests.
 */

export interface HeroAbilitySpec {
  heroId: string
  abilityName: string
  shortTag: string
  description: string
  accentColor: string
}

export const HERO_ABILITY_CONSTANTS = {
  // Vanguard Blade (hero_01) - Muramasa Buffed Arc Slash
  MURAMASA_RADIUS_MULTIPLIER: 1.45,
  MURAMASA_DAMAGE_MULTIPLIER: 1.4,
  MURAMASA_COOLDOWN_MULTIPLIER: 0.85,

  // Outpost Ranger (hero_02) - Homing on all projectiles (base homing starts subtle; scales up via Coin Upgrades)
  RANGER_HOMING_STRENGTH: 2.4,
  RANGER_HOMING_RANGE: 680,

  // Tech Engineer (hero_03) - Extra Minions
  ENGINEER_BONUS_DRONES: 2,
  ENGINEER_BONUS_OTHER_SUMMONS: 1,
  ENGINEER_SUMMON_FIRE_RATE_BONUS: 1.15,

  // Chrono Operative (hero_04) - 3s Clones copying attacks at 50% damage
  CHRONO_CLONE_DURATION: 3.0,
  CHRONO_CLONE_SPAWN_INTERVAL: 4.8,
  CHRONO_CLONE_FIRST_SPAWN_DELAY: 1.2,
  CHRONO_CLONE_DAMAGE_RATIO: 0.5,

  // Shield Paladin (hero_05) - 25% Damage Reduction + 10s Spacebar Dash
  PALADIN_DAMAGE_REDUCTION: 0.25,
  PALADIN_DASH_COOLDOWN: 10.0,
  PALADIN_DASH_DURATION: 0.18,
  PALADIN_DASH_SPEED: 1150,
  PALADIN_DASH_IFRAMES: 0.28,
  PALADIN_BASH_DAMAGE_RATIO: 0.14,

  // Pyrotechnic Specialist (hero_06) - Ignite / Burn on every hit
  PYRO_BURN_DURATION: 3.0,
  PYRO_BURN_TICK_INTERVAL: 0.5,
  PYRO_BURN_DAMAGE_RATIO: 0.3,
  PYRO_BURN_MIN_TICK_DAMAGE: 4,

  // Storm Assassin (hero_07) - Innate Crit, Haste & Storm Overload Arcs + Thunderstrikes on Critical Hits
  STORM_BASE_CRIT_CHANCE: 0.22,
  STORM_BASE_CRIT_DAMAGE: 0.5,
  STORM_ARC_RADIUS: 310,
  STORM_ARC_TARGETS: 3,
  STORM_ARC_DAMAGE_RATIO: 0.8,
  STORM_SHOCKWAVE_RADIUS: 120,
  STORM_SHOCKWAVE_RATIO: 0.45,
  STORM_BOSS_STRIKE_RATIO: 0.55
} as const

export const MAX_HERO_UPGRADE_LEVEL = 5

export const HERO_UPGRADE_COSTS = [250, 500, 900, 1450, 2200] as const

export interface HeroUpgradeSpec {
  heroId: string
  upgradeTitle: string
  summary: string
}

export const HERO_UPGRADE_SPECS: Record<string, HeroUpgradeSpec> = {
  hero_01: {
    heroId: 'hero_01',
    upgradeTitle: 'Muramasa Edge Calibration',
    summary: 'Boosts Muramasa cleave radius, slash damage multiplier, and swing cooldown speed.'
  },
  hero_02: {
    heroId: 'hero_02',
    upgradeTitle: 'Ballistic Guidance Servo',
    summary: 'Strengthens mid-flight projectile homing curve and extends target lock-on range.'
  },
  hero_03: {
    heroId: 'hero_03',
    upgradeTitle: 'Swarm Bus Overclock',
    summary: 'Accelerates summon fire rate, empowers summon damage, and expands drone bay capacity.'
  },
  hero_04: {
    heroId: 'hero_04',
    upgradeTitle: 'Temporal Projection Core',
    summary: 'Increases Chrono Clone damage ratio, active duration, and reduces spawn interval.'
  },
  hero_05: {
    heroId: 'hero_05',
    upgradeTitle: 'Aegis Capacitor',
    summary: 'Raises passive armor damage reduction, trims Dash cooldown, and empowers Shield Bash.'
  },
  hero_06: {
    heroId: 'hero_06',
    upgradeTitle: 'Thermite Accelerant',
    summary: 'Amplifies Hellfire burn damage ratio per tick and extends ignition duration.'
  },
  hero_07: {
    heroId: 'hero_07',
    upgradeTitle: 'Arc-Crit Overdrive Core',
    summary:
      'Boosts innate Critical Strike Chance, Critical Damage multiplier, and Storm Overload arc targets/damage.'
  }
}

export function clampHeroUpgradeLevel(level?: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.max(0, Math.min(MAX_HERO_UPGRADE_LEVEL, Math.floor(level as number)))
}

export function getHeroUpgradeCost(currentLevel: number): number | null {
  const lv = clampHeroUpgradeLevel(currentLevel)
  if (lv >= MAX_HERO_UPGRADE_LEVEL) return null
  return HERO_UPGRADE_COSTS[lv] ?? null
}

export function getHeroUpgradeSpec(heroId: string): HeroUpgradeSpec {
  return HERO_UPGRADE_SPECS[heroId] ?? HERO_UPGRADE_SPECS.hero_01
}

export const HERO_ABILITIES: Record<string, HeroAbilitySpec> = {
  hero_01: {
    heroId: 'hero_01',
    abilityName: 'Muramasa Bloodmoon Slash',
    shortTag: 'Muramasa Arc Slash',
    description:
      'Buffs Arc Slash with +45% cleave radius, +40% damage, faster swings, and triple crimson Muramasa crescent waves.',
    accentColor: '#FF0055'
  },
  hero_02: {
    heroId: 'hero_02',
    abilityName: 'Locked-On Guidance',
    shortTag: 'All Projectiles Home',
    description:
      'Projectiles fired by Outpost Ranger gently curve toward nearby hostiles; upgrade with Battle Coins for tighter tracking.',
    accentColor: '#34D399'
  },
  hero_03: {
    heroId: 'hero_03',
    abilityName: 'Expanded Drone Bay',
    shortTag: '+2 Drones / +1 Summons',
    description:
      'Deploys +2 extra Companion Robots (3 at Lv.1, 5 at Lv.5), +1 extra unit on other summon upgrades, and +15% minion fire rate.',
    accentColor: '#38BDF8'
  },
  hero_04: {
    heroId: 'hero_04',
    abilityName: 'Chrono Mimic Clones',
    shortTag: '3s Attack Clones (50%)',
    description:
      'Spawns a holographic Chrono Clone for 3 seconds every 4.8s that mirrors all of your attacks at 50% damage.',
    accentColor: '#C084FC'
  },
  hero_05: {
    heroId: 'hero_05',
    abilityName: 'Aegis Armor & Space Dash',
    shortTag: '25% DR · [SPACE] Dash',
    description:
      'Reduces all incoming damage by 25% and unlocks an invulnerable Shield Dash on [SPACE] (10s cooldown) that bashes enemies.',
    accentColor: '#FACC15'
  },
  hero_06: {
    heroId: 'hero_06',
    abilityName: 'Hellfire Ignition',
    shortTag: 'Burn on Every Hit',
    description:
      'Every weapon hit ignites enemies for 3s, dealing scorching burn damage every 0.5s equal to 30% of hit damage.',
    accentColor: '#FB923C'
  },
  hero_07: {
    heroId: 'hero_07',
    abilityName: 'Overcharge Execution',
    shortTag: '+22%..56% Crit · Storm Bolts & Haste',
    description:
      'Grants +22%..+56% Crit Chance, +50%..+160% Crit Damage & +15%..+35% Fire Rate; every Critical Hit triggers Storm Overload lightning arcs, a crit shockwave, and bonus boss Thunderstrikes.',
    accentColor: '#A855F7'
  }
}

export function getHeroAbility(heroId: string): HeroAbilitySpec {
  return HERO_ABILITIES[heroId] ?? HERO_ABILITIES.hero_01
}

const VANGUARD_RADIUS_SCALE = [1.45, 1.54, 1.63, 1.72, 1.82, 1.95] as const
const VANGUARD_DAMAGE_SCALE = [1.4, 1.52, 1.65, 1.78, 1.92, 2.1] as const
const VANGUARD_COOLDOWN_SCALE = [0.85, 0.81, 0.77, 0.73, 0.69, 0.64] as const

export function getVanguardConfig(upgradeLevel: number = 0): {
  radiusMultiplier: number
  damageMultiplier: number
  cooldownMultiplier: number
} {
  const lv = clampHeroUpgradeLevel(upgradeLevel)
  return {
    radiusMultiplier: VANGUARD_RADIUS_SCALE[lv],
    damageMultiplier: VANGUARD_DAMAGE_SCALE[lv],
    cooldownMultiplier: VANGUARD_COOLDOWN_SCALE[lv]
  }
}

const RANGER_HOMING_TABLE = [2.4, 4.2, 6.0, 8.0, 10.5, 13.5] as const
const RANGER_RANGE_TABLE = [680, 760, 840, 920, 1020, 1150] as const

export function getRangerHomingConfig(upgradeLevel: number = 0): {
  homingStrength: number
  lockRange: number
} {
  const lv = clampHeroUpgradeLevel(upgradeLevel)
  return {
    homingStrength: RANGER_HOMING_TABLE[lv],
    lockRange: RANGER_RANGE_TABLE[lv]
  }
}

const ENGINEER_FIRE_RATE_TABLE = [1.15, 1.24, 1.34, 1.45, 1.57, 1.7] as const
const ENGINEER_SUMMON_DMG_TABLE = [1.0, 1.12, 1.25, 1.38, 1.54, 1.72] as const
const ENGINEER_BONUS_DRONES_TABLE = [2, 2, 3, 3, 4, 4] as const
const ENGINEER_BONUS_OTHER_TABLE = [1, 1, 1, 2, 2, 2] as const

export function getEngineerSummonBonuses(upgradeLevel: number = 0): {
  fireRateMultiplier: number
  damageMultiplier: number
  bonusDrones: number
  bonusOtherSummons: number
} {
  const lv = clampHeroUpgradeLevel(upgradeLevel)
  return {
    fireRateMultiplier: ENGINEER_FIRE_RATE_TABLE[lv],
    damageMultiplier: ENGINEER_SUMMON_DMG_TABLE[lv],
    bonusDrones: ENGINEER_BONUS_DRONES_TABLE[lv],
    bonusOtherSummons: ENGINEER_BONUS_OTHER_TABLE[lv]
  }
}

const CHRONO_DURATION_TABLE = [3.0, 3.3, 3.6, 4.0, 4.4, 5.0] as const
const CHRONO_INTERVAL_TABLE = [4.8, 4.5, 4.2, 3.9, 3.6, 3.2] as const
const CHRONO_DAMAGE_RATIO_TABLE = [0.5, 0.58, 0.66, 0.75, 0.85, 1.0] as const

export function getChronoCloneConfig(upgradeLevel: number = 0): {
  duration: number
  spawnInterval: number
  damageRatio: number
} {
  const lv = clampHeroUpgradeLevel(upgradeLevel)
  return {
    duration: CHRONO_DURATION_TABLE[lv],
    spawnInterval: CHRONO_INTERVAL_TABLE[lv],
    damageRatio: CHRONO_DAMAGE_RATIO_TABLE[lv]
  }
}

const PALADIN_DR_TABLE = [0.25, 0.28, 0.31, 0.34, 0.38, 0.42] as const
const PALADIN_DASH_CD_TABLE = [10.0, 8.8, 7.8, 6.8, 5.9, 5.0] as const
const PALADIN_BASH_RATIO_TABLE = [0.14, 0.18, 0.23, 0.28, 0.34, 0.4] as const

export function getPaladinConfig(upgradeLevel: number = 0): {
  damageReduction: number
  dashCooldown: number
  bashDamageRatio: number
} {
  const lv = clampHeroUpgradeLevel(upgradeLevel)
  return {
    damageReduction: PALADIN_DR_TABLE[lv],
    dashCooldown: PALADIN_DASH_CD_TABLE[lv],
    bashDamageRatio: PALADIN_BASH_RATIO_TABLE[lv]
  }
}

const PYRO_BURN_RATIO_TABLE = [0.3, 0.38, 0.47, 0.56, 0.66, 0.78] as const
const PYRO_BURN_DURATION_TABLE = [3.0, 3.3, 3.7, 4.1, 4.6, 5.2] as const

export function getPyroBurnConfig(upgradeLevel: number = 0): {
  damageRatio: number
  duration: number
} {
  const lv = clampHeroUpgradeLevel(upgradeLevel)
  return {
    damageRatio: PYRO_BURN_RATIO_TABLE[lv],
    duration: PYRO_BURN_DURATION_TABLE[lv]
  }
}

const STORM_CRIT_CHANCE_TABLE = [0.22, 0.28, 0.34, 0.4, 0.48, 0.56] as const
const STORM_CRIT_DMG_TABLE = [0.5, 0.65, 0.85, 1.05, 1.3, 1.6] as const
const STORM_ARC_DAMAGE_TABLE = [0.8, 0.92, 1.05, 1.2, 1.35, 1.55] as const
const STORM_ARC_TARGETS_TABLE = [3, 4, 5, 6, 7, 8] as const
const STORM_FIRE_RATE_TABLE = [0.15, 0.19, 0.23, 0.27, 0.31, 0.35] as const
const STORM_BOSS_STRIKE_TABLE = [0.55, 0.64, 0.74, 0.84, 0.96, 1.1] as const

export function getStormAssassinConfig(upgradeLevel: number = 0): {
  critChanceBonus: number
  critDamageBonus: number
  stormArcDamageRatio: number
  stormArcTargets: number
  arcRadius: number
  fireRateBonus: number
  shockwaveRadius: number
  shockwaveDamageRatio: number
  bossStrikeRatio: number
} {
  const lv = clampHeroUpgradeLevel(upgradeLevel)
  return {
    critChanceBonus: STORM_CRIT_CHANCE_TABLE[lv],
    critDamageBonus: STORM_CRIT_DMG_TABLE[lv],
    stormArcDamageRatio: STORM_ARC_DAMAGE_TABLE[lv],
    stormArcTargets: STORM_ARC_TARGETS_TABLE[lv],
    arcRadius: HERO_ABILITY_CONSTANTS.STORM_ARC_RADIUS,
    fireRateBonus: STORM_FIRE_RATE_TABLE[lv],
    shockwaveRadius: HERO_ABILITY_CONSTANTS.STORM_SHOCKWAVE_RADIUS,
    shockwaveDamageRatio: HERO_ABILITY_CONSTANTS.STORM_SHOCKWAVE_RATIO,
    bossStrikeRatio: STORM_BOSS_STRIKE_TABLE[lv]
  }
}

export function getHeroFireRateBonus(heroId: string, upgradeLevel: number = 0): number {
  return heroId === 'hero_07' ? getStormAssassinConfig(upgradeLevel).fireRateBonus : 0
}

export function getHeroCritBonuses(
  heroId: string,
  upgradeLevel: number = 0
): {
  critChanceBonus: number
  critDamageBonus: number
} {
  if (heroId === 'hero_07') {
    const cfg = getStormAssassinConfig(upgradeLevel)
    return {
      critChanceBonus: cfg.critChanceBonus,
      critDamageBonus: cfg.critDamageBonus
    }
  }
  return { critChanceBonus: 0, critDamageBonus: 0 }
}

export function formatHeroUpgradeStats(heroId: string, level: number): string {
  const lv = clampHeroUpgradeLevel(level)
  switch (heroId) {
    case 'hero_01': {
      const cfg = getVanguardConfig(lv)
      return `+${Math.round((cfg.radiusMultiplier - 1) * 100)}% Radius · +${Math.round((cfg.damageMultiplier - 1) * 100)}% Dmg · ${Math.round(cfg.cooldownMultiplier * 100)}% CD`
    }
    case 'hero_02': {
      const cfg = getRangerHomingConfig(lv)
      return `Homing ${cfg.homingStrength.toFixed(1)} · Range ${cfg.lockRange}px`
    }
    case 'hero_03': {
      const cfg = getEngineerSummonBonuses(lv)
      return `+${cfg.bonusDrones} Bots/+${cfg.bonusOtherSummons} Summons · ${Math.round(cfg.fireRateMultiplier * 100)}% Rate · ${Math.round(cfg.damageMultiplier * 100)}% Dmg`
    }
    case 'hero_04': {
      const cfg = getChronoCloneConfig(lv)
      return `${Math.round(cfg.damageRatio * 100)}% Clone Dmg · ${cfg.duration.toFixed(1)}s Active · Every ${cfg.spawnInterval.toFixed(1)}s`
    }
    case 'hero_05': {
      const cfg = getPaladinConfig(lv)
      return `${Math.round(cfg.damageReduction * 100)}% DR · ${cfg.dashCooldown.toFixed(1)}s Dash · ${Math.round(cfg.bashDamageRatio * 100)}% HP Bash`
    }
    case 'hero_06': {
      const cfg = getPyroBurnConfig(lv)
      return `${Math.round(cfg.damageRatio * 100)}% Burn/tick · ${cfg.duration.toFixed(1)}s Duration`
    }
    case 'hero_07': {
      const cfg = getStormAssassinConfig(lv)
      return `+${Math.round(cfg.critChanceBonus * 100)}% Crit · +${Math.round(cfg.critDamageBonus * 100)}% Crit DMG · +${Math.round(cfg.fireRateBonus * 100)}% Haste · ${cfg.stormArcTargets} Arcs (${Math.round(cfg.stormArcDamageRatio * 100)}%)`
    }
    default:
      return ''
  }
}

export const MAX_HERO_SIGNATURE_LEVEL = MAX_HERO_UPGRADE_LEVEL

export function getHeroSignatureTierSummary(
  heroId: string,
  level: number
): {
  hudTag: string
  currentSummary: string
  nextSummary: string | null
} {
  const lv = clampHeroUpgradeLevel(level)
  const ability = getHeroAbility(heroId)
  return {
    hudTag: ability.shortTag,
    currentSummary: formatHeroUpgradeStats(heroId, lv),
    nextSummary: lv < MAX_HERO_UPGRADE_LEVEL ? formatHeroUpgradeStats(heroId, lv + 1) : null
  }
}

export function getHeroDamageReduction(heroId: string, upgradeLevel: number = 0): number {
  return heroId === 'hero_05' ? getPaladinConfig(upgradeLevel).damageReduction : 0
}

export function shouldApplyHomingForHero(heroId: string): boolean {
  return heroId === 'hero_02'
}

export function getArcSlashConfig(
  baseDamage: number,
  level: number,
  heroId: string,
  heroUpgradeLevel: number = 0
): {
  radius: number
  damage: number
  cooldownScale: number
  isMuramasa: boolean
} {
  const baseRadius = 75 + level * 22
  if (heroId === 'hero_01') {
    const vanguardCfg = getVanguardConfig(heroUpgradeLevel)
    return {
      radius: Math.round(baseRadius * vanguardCfg.radiusMultiplier),
      damage: Math.max(1, Math.round(baseDamage * vanguardCfg.damageMultiplier)),
      cooldownScale: vanguardCfg.cooldownMultiplier,
      isMuramasa: true
    }
  }
  return {
    radius: baseRadius,
    damage: baseDamage,
    cooldownScale: 1,
    isMuramasa: false
  }
}

export function getSummonCountForUpgrade(
  upgradeId: string,
  level: number,
  heroId: string,
  heroUpgradeLevel: number = 0
): number {
  const isEngineer = heroId === 'hero_03'
  const engineerBonuses = isEngineer ? getEngineerSummonBonuses(heroUpgradeLevel) : null
  if (upgradeId === 'upg_01') {
    const base = level >= 5 ? 3 : level >= 3 ? 2 : 1
    return engineerBonuses ? base + engineerBonuses.bonusDrones : base
  }
  if (upgradeId === 'upg_14') {
    const base = level >= 4 ? 2 : 1
    return engineerBonuses ? base + engineerBonuses.bonusOtherSummons : base
  }
  if (upgradeId === 'upg_20') {
    const base = level >= 5 ? 2 : 1
    return engineerBonuses ? base + engineerBonuses.bonusOtherSummons : base
  }
  if (upgradeId === 'upg_a2_02') {
    const base = level >= 3 ? 2 : 1
    return engineerBonuses ? base + engineerBonuses.bonusOtherSummons : base
  }
  if (upgradeId === 'wpn_grim_reaper') {
    // Grim Reaper keeps 1 giant reaper; upgrades and Tech Engineer buff its attacks instead of adding more reapers
    return 1
  }
  return 0
}

export function computeHeroBurnPerTick(hitDamage: number, upgradeLevel: number = 0): number {
  const cfg = getPyroBurnConfig(upgradeLevel)
  return Math.max(
    HERO_ABILITY_CONSTANTS.PYRO_BURN_MIN_TICK_DAMAGE,
    Math.round(hitDamage * cfg.damageRatio)
  )
}

/**
 * Resolve all starting upgrade/weapon IDs for a run.
 * Always keeps the hero's signature starting weapon (e.g., Arc Slash on Vanguard Blade)
 * even when an Armory weapon or Loadout weapon is also equipped.
 */
export function resolveStartingUpgradeIds(params: {
  heroStartingUpgradeId: string
  equippedWeaponId?: string | null
  loadoutUpgradeId?: string | null
}): string[] {
  const ordered: string[] = []
  const pushUnique = (id?: string | null) => {
    if (id && !ordered.includes(id)) {
      ordered.push(id)
    }
  }
  pushUnique(params.heroStartingUpgradeId)
  pushUnique(params.loadoutUpgradeId)
  pushUnique(params.equippedWeaponId)
  return ordered
}

export const MURAMASA_WEAPON_CONSTANTS = {
  PAIRED_HERO_ID: 'hero_01',
  PAIRED_DAMAGE_MULTIPLIER: 1.55,
  PAIRED_RADIUS_MULTIPLIER: 1.25,
  PAIRED_COOLDOWN_MULTIPLIER: 0.75,
  PAIRED_ARC_SLASH_RESONANCE: 1.25
} as const

export function getMuramasaWeaponConfig(
  baseDamage: number,
  level: number,
  heroId: string
): {
  radius: number
  damage: number
  cooldownScale: number
  waveCount: number
  isPairedHero: boolean
} {
  const safeLv = Math.max(1, Math.min(5, Math.floor(level)))
  const baseRadius = 150 + safeLv * 26
  const isPairedHero = heroId === MURAMASA_WEAPON_CONSTANTS.PAIRED_HERO_ID

  if (isPairedHero) {
    return {
      radius: Math.round(baseRadius * MURAMASA_WEAPON_CONSTANTS.PAIRED_RADIUS_MULTIPLIER),
      damage: Math.max(
        1,
        Math.round(baseDamage * MURAMASA_WEAPON_CONSTANTS.PAIRED_DAMAGE_MULTIPLIER)
      ),
      cooldownScale: MURAMASA_WEAPON_CONSTANTS.PAIRED_COOLDOWN_MULTIPLIER,
      waveCount: safeLv >= 5 ? 3 : 2,
      isPairedHero: true
    }
  }

  return {
    radius: baseRadius,
    damage: Math.max(1, Math.round(baseDamage)),
    cooldownScale: 1,
    waveCount: safeLv >= 5 ? 2 : 1,
    isPairedHero: false
  }
}

export function getPairedHeroArcSlashBonus(
  heroId: string,
  activeUpgradeIds: ReadonlyArray<string>
): number {
  if (
    heroId === MURAMASA_WEAPON_CONSTANTS.PAIRED_HERO_ID &&
    activeUpgradeIds.includes('wpn_muramasa')
  ) {
    return MURAMASA_WEAPON_CONSTANTS.PAIRED_ARC_SLASH_RESONANCE
  }
  return 1
}

export const GRIM_REAPER_WEAPON_CONSTANTS = {
  PAIRED_HERO_ID: 'hero_03',
  PAIRED_DAMAGE_MULTIPLIER: 1.6,
  PAIRED_COOLDOWN_MULTIPLIER: 0.72,
  PAIRED_BONUS_HEAL: 2
} as const

export function getGrimReaperWeaponConfig(
  baseDamage: number,
  level: number,
  heroId: string
): {
  damage: number
  cooldownScale: number
  reaperCount: number
  scytheCount: number
  siphonTargets: number
  healPerTarget: number
  isPairedHero: boolean
} {
  const safeLv = Math.max(1, Math.min(5, Math.floor(level)))
  const isPairedHero = heroId === GRIM_REAPER_WEAPON_CONSTANTS.PAIRED_HERO_ID
  // Upgrades & pairing empower the single giant Reaper's attacks rather than spawning extra Reapers
  const reaperCount = 1
  const levelDamageScale = 1 + (safeLv - 1) * 0.14
  const levelCooldownScale = Math.max(0.7, 1 - (safeLv - 1) * 0.06)
  const baseScythes = safeLv // 1 -> 2 -> 3 -> 4 -> 5 scythes per throw
  const baseSiphonTargets = 1 + safeLv // 2 -> 3 -> 4 -> 5 -> 6 targets
  const baseHealPerTarget = safeLv >= 4 ? 4 : safeLv >= 2 ? 3 : 2

  if (isPairedHero) {
    return {
      damage: Math.max(
        1,
        Math.round(
          baseDamage * levelDamageScale * GRIM_REAPER_WEAPON_CONSTANTS.PAIRED_DAMAGE_MULTIPLIER
        )
      ),
      cooldownScale: Number(
        (levelCooldownScale * GRIM_REAPER_WEAPON_CONSTANTS.PAIRED_COOLDOWN_MULTIPLIER).toFixed(3)
      ),
      reaperCount,
      scytheCount: baseScythes + 1,
      siphonTargets: baseSiphonTargets + 2,
      healPerTarget: baseHealPerTarget + GRIM_REAPER_WEAPON_CONSTANTS.PAIRED_BONUS_HEAL,
      isPairedHero: true
    }
  }

  return {
    damage: Math.max(1, Math.round(baseDamage * levelDamageScale)),
    cooldownScale: Number(levelCooldownScale.toFixed(3)),
    reaperCount,
    scytheCount: baseScythes,
    siphonTargets: baseSiphonTargets,
    healPerTarget: baseHealPerTarget,
    isPairedHero: false
  }
}

export const TEMPEST_SPHERE_CONSTANTS = {
  PAIRED_HERO_ID: 'hero_07',
  PAIRED_DAMAGE_MULTIPLIER: 1.6,
  PAIRED_COOLDOWN_MULTIPLIER: 0.78,
  PAIRED_PULSE_RADIUS_MULTIPLIER: 1.35,
  PAIRED_IMPACT_RADIUS_MULTIPLIER: 1.25
} as const

export function getTempestSphereWeaponConfig(
  baseDamage: number,
  level: number,
  heroId: string
): {
  impactDamage: number
  pulseDamage: number
  impactRadius: number
  pulseRadius: number
  sphereCount: number
  cooldownScale: number
  isPairedHero: boolean
} {
  const safeLv = Math.max(1, Math.min(5, Math.floor(level)))
  const isPairedHero = heroId === TEMPEST_SPHERE_CONSTANTS.PAIRED_HERO_ID
  const baseSpheres = safeLv >= 5 ? 3 : safeLv >= 3 ? 2 : 1
  const baseImpactRadius = 110 + safeLv * 22
  const basePulseRadius = Math.round(baseImpactRadius * 1.55)
  const levelDmgScale = 1 + (safeLv - 1) * 0.16

  if (isPairedHero) {
    const impactDamage = Math.max(
      1,
      Math.round(baseDamage * levelDmgScale * TEMPEST_SPHERE_CONSTANTS.PAIRED_DAMAGE_MULTIPLIER)
    )
    return {
      impactDamage,
      pulseDamage: Math.max(1, Math.round(impactDamage * 0.9)),
      impactRadius: Math.round(
        baseImpactRadius * TEMPEST_SPHERE_CONSTANTS.PAIRED_IMPACT_RADIUS_MULTIPLIER
      ),
      pulseRadius: Math.round(
        basePulseRadius * TEMPEST_SPHERE_CONSTANTS.PAIRED_PULSE_RADIUS_MULTIPLIER
      ),
      sphereCount: baseSpheres + 1,
      cooldownScale: TEMPEST_SPHERE_CONSTANTS.PAIRED_COOLDOWN_MULTIPLIER,
      isPairedHero: true
    }
  }

  const impactDamage = Math.max(1, Math.round(baseDamage * levelDmgScale))
  return {
    impactDamage,
    pulseDamage: Math.max(1, Math.round(impactDamage * 0.7)),
    impactRadius: baseImpactRadius,
    pulseRadius: basePulseRadius,
    sphereCount: baseSpheres,
    cooldownScale: 1,
    isPairedHero: false
  }
}


