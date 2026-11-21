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

  // Outpost Ranger (hero_02) - Homing on all projectiles
  RANGER_HOMING_STRENGTH: 9.0,

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

  // Pyrotechnic Specialist (hero_06) - Ignite / Burn on every hit
  PYRO_BURN_DURATION: 3.0,
  PYRO_BURN_TICK_INTERVAL: 0.5,
  PYRO_BURN_DAMAGE_RATIO: 0.3,
  PYRO_BURN_MIN_TICK_DAMAGE: 4
} as const

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
      'Every projectile fired by Outpost Ranger locks onto the nearest hostile and curves dynamically mid-flight.',
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
  }
}

export function getHeroAbility(heroId: string): HeroAbilitySpec {
  return HERO_ABILITIES[heroId] ?? HERO_ABILITIES.hero_01
}

export function getHeroDamageReduction(heroId: string): number {
  return heroId === 'hero_05' ? HERO_ABILITY_CONSTANTS.PALADIN_DAMAGE_REDUCTION : 0
}

export function shouldApplyHomingForHero(heroId: string): boolean {
  return heroId === 'hero_02'
}

export function getArcSlashConfig(
  baseDamage: number,
  level: number,
  heroId: string
): {
  radius: number
  damage: number
  cooldownScale: number
  isMuramasa: boolean
} {
  const baseRadius = 75 + level * 22
  if (heroId === 'hero_01') {
    return {
      radius: Math.round(baseRadius * HERO_ABILITY_CONSTANTS.MURAMASA_RADIUS_MULTIPLIER),
      damage: Math.max(1, Math.round(baseDamage * HERO_ABILITY_CONSTANTS.MURAMASA_DAMAGE_MULTIPLIER)),
      cooldownScale: HERO_ABILITY_CONSTANTS.MURAMASA_COOLDOWN_MULTIPLIER,
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

export function getSummonCountForUpgrade(upgradeId: string, level: number, heroId: string): number {
  const isEngineer = heroId === 'hero_03'
  if (upgradeId === 'upg_01') {
    const base = level >= 5 ? 3 : level >= 3 ? 2 : 1
    return isEngineer ? base + HERO_ABILITY_CONSTANTS.ENGINEER_BONUS_DRONES : base
  }
  if (upgradeId === 'upg_14') {
    const base = level >= 4 ? 2 : 1
    return isEngineer ? base + HERO_ABILITY_CONSTANTS.ENGINEER_BONUS_OTHER_SUMMONS : base
  }
  if (upgradeId === 'upg_20') {
    const base = level >= 5 ? 2 : 1
    return isEngineer ? base + HERO_ABILITY_CONSTANTS.ENGINEER_BONUS_OTHER_SUMMONS : base
  }
  if (upgradeId === 'upg_a2_02') {
    const base = level >= 3 ? 2 : 1
    return isEngineer ? base + HERO_ABILITY_CONSTANTS.ENGINEER_BONUS_OTHER_SUMMONS : base
  }
  if (upgradeId === 'wpn_grim_reaper') {
    const base = level >= 5 ? 2 : 1
    return isEngineer ? base + HERO_ABILITY_CONSTANTS.ENGINEER_BONUS_OTHER_SUMMONS : base
  }
  return 0
}

export function computeHeroBurnPerTick(hitDamage: number): number {
  return Math.max(
    HERO_ABILITY_CONSTANTS.PYRO_BURN_MIN_TICK_DAMAGE,
    Math.round(hitDamage * HERO_ABILITY_CONSTANTS.PYRO_BURN_DAMAGE_RATIO)
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
  PAIRED_DAMAGE_MULTIPLIER: 1.5,
  PAIRED_COOLDOWN_MULTIPLIER: 0.78,
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
  const reaperCount = getSummonCountForUpgrade('wpn_grim_reaper', safeLv, heroId)
  const baseScythes = safeLv >= 5 ? 3 : safeLv >= 3 ? 2 : 1
  const baseSiphonTargets = safeLv >= 4 ? 3 : safeLv >= 2 ? 2 : 1
  const baseHealPerTarget = safeLv >= 5 ? 3 : 2

  if (isPairedHero) {
    return {
      damage: Math.max(
        1,
        Math.round(baseDamage * GRIM_REAPER_WEAPON_CONSTANTS.PAIRED_DAMAGE_MULTIPLIER)
      ),
      cooldownScale: GRIM_REAPER_WEAPON_CONSTANTS.PAIRED_COOLDOWN_MULTIPLIER,
      reaperCount,
      scytheCount: Math.min(3, baseScythes + (safeLv >= 2 && safeLv < 5 ? 1 : 0)),
      siphonTargets: baseSiphonTargets + 1,
      healPerTarget: baseHealPerTarget + GRIM_REAPER_WEAPON_CONSTANTS.PAIRED_BONUS_HEAL,
      isPairedHero: true
    }
  }

  return {
    damage: Math.max(1, Math.round(baseDamage)),
    cooldownScale: 1,
    reaperCount,
    scytheCount: baseScythes,
    siphonTargets: baseSiphonTargets,
    healPerTarget: baseHealPerTarget,
    isPairedHero: false
  }
}

