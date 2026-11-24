/**
 * Critical Strike System, Crit Upgrades & Floating Crit Text Helpers
 * Shared across combat loop, Shop gear, Codex, LevelUpModal, and unit tests.
 */

import type { UpgradesRow } from '../types/database'

export const CRIT_CONFIG = {
  BASE_CRIT_CHANCE: 0.01,
  BASE_CRIT_MULTIPLIER: 2.0,
  MAX_CRIT_CHANCE: 0.9,
  CRIT_TEXT_COLOR: '#FF2E43',
  CRIT_TEXT_DURATION: 1.25,
  NORMAL_TEXT_DURATION: 0.45,
  CRIT_TEXT_SWAY_SPEED: 9.5,
  CRIT_TEXT_SWAY_AMPLITUDE: 0.24
} as const

export const UNIVERSAL_CRIT_UPGRADES: UpgradesRow[] = [
  {
    id: 'upg_crit_01',
    name: 'Precision Optics Matrix',
    category: 'Passive',
    damage: 0,
    cooldown_s: 0,
    special: '+8%..+30% Crit Chance',
    function_desc:
      'Calibrates neural targeting optics across all weapons, sharply increasing Critical Hit Chance and Critical Damage.'
  },
  {
    id: 'upg_crit_02',
    name: 'Executioner Overclock',
    category: 'Passive',
    damage: 0,
    cooldown_s: 0,
    special: '+5%..+18% Crit · +Weapon DMG',
    function_desc:
      'Amplifies weak-point lethality across all attacks, boosting Critical Hit Chance and total Weapon Damage.'
  }
]

export const UNIVERSAL_CRIT_UPGRADE_IDS = new Set<string>(
  UNIVERSAL_CRIT_UPGRADES.map((u) => u.id)
)

export interface WeaponCritProfile {
  critChanceBonus: number
  critDamageBonus: number
}

const WEAPON_CRIT_PROFILES: Record<string, WeaponCritProfile> = {
  wpn_crimson_railblade: { critChanceBonus: 0.22, critDamageBonus: 0.3 },
  wpn_phantom_sniper: { critChanceBonus: 0.34, critDamageBonus: 0.5 },
  wpn_muramasa: { critChanceBonus: 0.18, critDamageBonus: 0.4 },
  wpn_grim_reaper: { critChanceBonus: 0.2, critDamageBonus: 0.3 },
  wpn_tempest_sphere: { critChanceBonus: 0.25, critDamageBonus: 0.45 },
  wpn_cryo_railgun: { critChanceBonus: 0.12, critDamageBonus: 0.15 },
  wpn_abyss_beam: { critChanceBonus: 0.1, critDamageBonus: 0.15 },
  wpn_void_reaper: { critChanceBonus: 0.14, critDamageBonus: 0.2 },
  upg_a2_03: { critChanceBonus: 0.12, critDamageBonus: 0.2 },
  upg_12: { critChanceBonus: 0.08, critDamageBonus: 0.1 },
  upg_06: { critChanceBonus: 0.08, critDamageBonus: 0.15 }
}

export function getWeaponCritProfile(weaponId?: string | null): WeaponCritProfile {
  if (!weaponId) return { critChanceBonus: 0, critDamageBonus: 0 }
  return WEAPON_CRIT_PROFILES[weaponId] ?? { critChanceBonus: 0, critDamageBonus: 0 }
}

export interface PassiveCritUpgradeTotals {
  critChanceBonus: number
  critDamageBonus: number
  weaponDamageMultiplierBonus: number
}

export function getPassiveCritUpgradeBonuses(
  upgradeLevels: Record<string, number>
): PassiveCritUpgradeTotals {
  let critChanceBonus = 0
  let critDamageBonus = 0
  let weaponDamageMultiplierBonus = 0

  const opticsLv = Math.max(0, Math.min(5, Math.floor(upgradeLevels['upg_crit_01'] || 0)))
  if (opticsLv > 0) {
    const chanceByLv = [0, 0.08, 0.13, 0.18, 0.24, 0.3]
    const dmgByLv = [0, 0, 0.2, 0.4, 0.6, 0.85]
    critChanceBonus += chanceByLv[opticsLv] ?? 0.3
    critDamageBonus += dmgByLv[opticsLv] ?? 0.85
  }

  const execLv = Math.max(0, Math.min(5, Math.floor(upgradeLevels['upg_crit_02'] || 0)))
  if (execLv > 0) {
    const chanceByLv = [0, 0.05, 0.08, 0.11, 0.14, 0.18]
    const dmgMultByLv = [0, 0.08, 0.14, 0.2, 0.26, 0.34]
    critChanceBonus += chanceByLv[execLv] ?? 0.18
    weaponDamageMultiplierBonus += dmgMultByLv[execLv] ?? 0.34
  }

  return {
    critChanceBonus: Number(critChanceBonus.toFixed(3)),
    critDamageBonus: Number(critDamageBonus.toFixed(3)),
    weaponDamageMultiplierBonus: Number(weaponDamageMultiplierBonus.toFixed(3))
  }
}

export interface CriticalRollResult {
  damage: number
  isCrit: boolean
  critChance: number
  critMultiplier: number
}

export function rollCriticalHit(params: {
  baseDamage: number
  baseCritChance?: number
  heroCritChance?: number
  accessoryCritChance?: number
  upgradeCritChance?: number
  weaponCritChance?: number
  heroCritDamageBonus?: number
  accessoryCritDamageBonus?: number
  upgradeCritDamageBonus?: number
  weaponCritDamageBonus?: number
  canCrit?: boolean
  rng?: () => number
}): CriticalRollResult {
  const safeBaseDmg = Math.max(1, params.baseDamage)
  const totalChance = Math.max(
    0,
    Math.min(
      CRIT_CONFIG.MAX_CRIT_CHANCE,
      (params.baseCritChance ?? CRIT_CONFIG.BASE_CRIT_CHANCE) +
        (params.heroCritChance ?? 0) +
        (params.accessoryCritChance ?? 0) +
        (params.upgradeCritChance ?? 0) +
        (params.weaponCritChance ?? 0)
    )
  )
  const critMultiplier = Math.max(
    1.25,
    CRIT_CONFIG.BASE_CRIT_MULTIPLIER +
      (params.heroCritDamageBonus ?? 0) +
      (params.accessoryCritDamageBonus ?? 0) +
      (params.upgradeCritDamageBonus ?? 0) +
      (params.weaponCritDamageBonus ?? 0)
  )

  if (params.canCrit === false) {
    return {
      damage: Math.max(1, Math.round(safeBaseDmg)),
      isCrit: false,
      critChance: totalChance,
      critMultiplier
    }
  }

  const rngFn = params.rng ?? Math.random
  const isCrit = rngFn() < totalChance
  const finalDamage = isCrit
    ? Math.max(1, Math.round(safeBaseDmg * critMultiplier))
    : Math.max(1, Math.round(safeBaseDmg))

  return {
    damage: finalDamage,
    isCrit,
    critChance: Number(totalChance.toFixed(4)),
    critMultiplier: Number(critMultiplier.toFixed(2))
  }
}

export function formatDamageFloatingText(damage: number, isCrit: boolean): string {
  const val = Math.max(1, Math.round(damage))
  return isCrit ? `${val}!` : `${val}`
}

export function computeCritTextSwayAngle(
  elapsedSeconds: number,
  phaseOffset: number = 0
): number {
  return (
    Math.sin(elapsedSeconds * CRIT_CONFIG.CRIT_TEXT_SWAY_SPEED + phaseOffset) *
    CRIT_CONFIG.CRIT_TEXT_SWAY_AMPLITUDE
  )
}
