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
  return 0
}

export function computeHeroBurnPerTick(hitDamage: number): number {
  return Math.max(
    HERO_ABILITY_CONSTANTS.PYRO_BURN_MIN_TICK_DAMAGE,
    Math.round(hitDamage * HERO_ABILITY_CONSTANTS.PYRO_BURN_DAMAGE_RATIO)
  )
}
