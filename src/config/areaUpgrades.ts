/**
 * Area 2 Exclusive Upgrades (Unlocked upon reaching Area 2: Astral Citadel / clearing Wave 15)
 * Kept separate from src/db/seedData.ts so canonical 35-entity seed validation remains intact.
 */

import type { UpgradesRow } from '../types/database'
import { upgrades as seedUpgrades } from '../db/seedData'
import { UNIVERSAL_CRIT_UPGRADES } from './critSystem'

export const AREA_TWO_UPGRADES: UpgradesRow[] = [
  {
    id: 'upg_a2_01',
    name: 'Cyclone Tempest',
    category: 'AoE Weapon',
    damage: 34,
    cooldown_s: 3.0,
    special: 'Area 2 · Bouncing tornadoes',
    function_desc:
      'Unleashes howling plasma tornadoes that bounce across the arena, pulling and shredding swarms in their path.'
  },
  {
    id: 'upg_a2_02',
    name: 'Vanguard Laser Strider',
    category: 'Summon',
    damage: 34,
    cooldown_s: 0.9,
    special: 'Area 2 · Walking aimed laser beam helper',
    function_desc:
      'Deploys an autonomous walking strider near you that projects aimed disintegration laser beams toward enemies without orbiting.'
  },
  {
    id: 'upg_a2_03',
    name: 'Astral Javelin',
    category: 'Projectile',
    damage: 58,
    cooldown_s: 1.45,
    special: 'Area 2 · Piercing spears + AoE end burst',
    function_desc:
      'Hurls luminous crystal spears that pierce through lines of enemies before bursting into a shattering AoE shockwave at the end.'
  },
  {
    id: 'upg_a2_04',
    name: 'Starfall Meteor',
    category: 'Heavy AoE',
    damage: 94,
    cooldown_s: 2.35,
    special: 'Area 2 · Orbital starfall craters',
    function_desc:
      'Calls down blazing emerald-gold meteors onto enemy clusters, crushing targets and erupting into wide starlight shockwaves.'
  },
  {
    id: 'upg_a2_05',
    name: 'Prism Satellite Blades',
    category: 'Melee Weapon',
    damage: 36,
    cooldown_s: 0.4,
    special: 'Area 2 · Orbiting prism shields',
    function_desc:
      'Spins orbiting emerald-gold prism chakrams continuously around you, slicing through advancing waves on contact.'
  },
  {
    id: 'upg_a2_06',
    name: 'Permafrost Cryo-Nova',
    category: 'AoE Weapon',
    damage: 42,
    cooldown_s: 2.1,
    special: 'Area 2 · Shatters & freezes enemies solid',
    function_desc:
      'Launches crystalline frost orbs that detonate in freezing cryo-novas, encasing caught enemies in solid ice and halting their movement.'
  }
]

export const AREA_THREE_UPGRADES: UpgradesRow[] = [
  {
    id: 'upg_a3_01',
    name: 'Cinderrail Lance',
    category: 'Projectile',
    damage: 82,
    cooldown_s: 1.35,
    special: 'Area 3 · Piercing burn rounds',
    function_desc:
      'Fires a blazing rail slug through enemy lines, then scorches the final target with a compact cinder burst.'
  },
  {
    id: 'upg_a3_02',
    name: 'Magma Orbitals',
    category: 'Melee Weapon',
    damage: 58,
    cooldown_s: 0.38,
    special: 'Area 3 · Orbiting molten blades',
    function_desc:
      'Summons a growing ring of molten blades that cuts through nearby enemies and ignites survivors.'
  },
  {
    id: 'upg_a3_03',
    name: 'Crucible Starfall',
    category: 'Heavy AoE',
    damage: 126,
    cooldown_s: 2.6,
    special: 'Area 3 · Burning impact fields',
    function_desc:
      'Calls staggered star-metal meteors down onto enemy clusters, leaving short-lived burning impact zones.'
  },
  {
    id: 'upg_a3_04',
    name: 'Forgeheart Aegis',
    category: 'Defense',
    damage: 0,
    cooldown_s: 0,
    special: 'Area 3 · Armor and max health',
    function_desc:
      'A reinforced core adds bonus maximum health and reduces incoming damage while equipped.'
  },
  {
    id: 'upg_a3_05',
    name: 'Heartfire Reactor',
    category: 'Support',
    damage: 0,
    cooldown_s: 0,
    special: 'Area 3 · Continuous health recovery',
    function_desc:
      'A self-regulating reactor restores health over time, with stronger recovery at higher levels.'
  },
  {
    id: 'upg_a3_06',
    name: 'Ember Relay',
    category: 'Summon',
    damage: 48,
    cooldown_s: 0.62,
    special: 'Area 3 · Companion forge turret',
    function_desc:
      'Deploys autonomous forge turrets that fire piercing ember rounds at the nearest enemy.'
  }
]

export const AREA_TWO_UPGRADE_IDS = new Set<string>(AREA_TWO_UPGRADES.map((u) => u.id))
export const AREA_THREE_UPGRADE_IDS = new Set<string>(AREA_THREE_UPGRADES.map((u) => u.id))

export function isAreaTwoUpgrade(upgradeId: string): boolean {
  return AREA_TWO_UPGRADE_IDS.has(upgradeId)
}

export function isAreaThreeUpgrade(upgradeId: string): boolean {
  return AREA_THREE_UPGRADE_IDS.has(upgradeId)
}

export function isAreaTwoUpgradesUnlocked(options: {
  areaId?: string | null
  wave15Cleared?: boolean | null
}): boolean {
  return (
    options.areaId === 'astral_citadel' ||
    options.areaId === 'molten_starforge' ||
    Boolean(options.wave15Cleared)
  )
}

export function getAvailableRunUpgrades(options: {
  areaId?: string | null
  wave15Cleared?: boolean | null
}): UpgradesRow[] {
  if (isAreaTwoUpgradesUnlocked(options)) {
    return [
      ...seedUpgrades,
      ...UNIVERSAL_CRIT_UPGRADES,
      ...AREA_TWO_UPGRADES,
      ...(options.areaId === 'molten_starforge' ? AREA_THREE_UPGRADES : [])
    ]
  }
  return [...seedUpgrades, ...UNIVERSAL_CRIT_UPGRADES]
}
