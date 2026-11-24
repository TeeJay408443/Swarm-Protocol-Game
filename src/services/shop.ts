/**
 * Shop, Supply Crates & Armory Equipment Service
 * Manages high-cost Shop gear, risky Supply Crates (Bad Gear vs Rare Better Gear),
 * Battle Coin wallet, and per-account localStorage + in-memory persistence.
 */

import { useEffect, useState } from 'react'
import { getLocalPlayerTelemetry } from './scores'
import type { UpgradesRow } from '../types/database'
import {
  ALL_CRAFTING_RECIPES,
  getBossDropSetId,
  PLAYABLE_BOSS_DROP_SETS
} from '../config/bossCrafting'

export type ShopItemCategory = 'weapon' | 'accessory'

export type GearRarity =
  | 'scrap'
  | 'faulty'
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary'
  | 'mythic'

export const RARITY_META: Record<
  GearRarity,
  { label: string; color: string; isBad: boolean; order: number }
> = {
  scrap: { label: 'Scrap (Bad)', color: '#9CA3AF', isBad: true, order: 0 },
  faulty: { label: 'Faulty (Bad)', color: '#F87171', isBad: true, order: 1 },
  common: { label: 'Common', color: '#E2E8F0', isBad: false, order: 2 },
  uncommon: { label: 'Uncommon', color: '#34D399', isBad: false, order: 3 },
  rare: { label: 'Rare', color: '#38BDF8', isBad: false, order: 4 },
  epic: { label: 'Epic', color: '#C084FC', isBad: false, order: 5 },
  legendary: { label: 'Legendary', color: '#FFD700', isBad: false, order: 6 },
  mythic: { label: 'Mythic', color: '#FF2E63', isBad: false, order: 7 }
}

export interface ShopWeaponItem {
  id: string
  kind: 'weapon'
  name: string
  category: string
  rarity: GearRarity
  tierLabel: string
  price: number
  salvageValue: number
  crateOnly?: boolean
  pairedHeroId?: string
  pairedHeroLabel?: string
  damage: number
  cooldown_s: number
  special: string
  function_desc: string
  accentColor: string
}

export interface AccessoryBonuses {
  bonusHp?: number
  damageReduction?: number
  speedMultiplier?: number
  magnetRangeMultiplier?: number
  bonusCoinChance?: number
  cooldownReduction?: number
  damageMultiplier?: number
  hpRegenPerSec?: number
  xpMultiplier?: number
  critChance?: number
  critDamageMultiplier?: number
}

export interface ShopAccessoryItem {
  id: string
  kind: 'accessory'
  name: string
  slotLabel: string
  rarity: GearRarity
  price: number
  salvageValue: number
  crateOnly?: boolean
  statSummary: string
  function_desc: string
  accentColor: string
  bonuses: AccessoryBonuses
}

export type ShopCatalogItem = ShopWeaponItem | ShopAccessoryItem

export interface SupplyCrateTier {
  id: string
  name: string
  tagline: string
  price: number
  accentColor: string
  description: string
  rarityWeights: Partial<Record<GearRarity, number>>
}

export const MAX_GEAR_STARS = 5
export const FUSION_COPIES_REQUIRED = 2

export interface GearStackEntry {
  itemId: string
  stars: number
  count: number
  item: ShopCatalogItem
}

export interface ShopAccountState {
  userId: string
  balance: number
  totalEarned: number
  totalSpent: number
  cratesOpened: number
  ownedIds: string[]
  gearStacks: Record<string, number[]>
  bossMaterials: Record<string, number>
  equippedWeaponId: string | null
  equippedWeaponStars: number
  equippedAccessoryIds: string[]
  equippedAccessoryStars: Record<string, number>
  updatedAt: string
}

export interface ComputedAccessoryBonuses {
  bonusHp: number
  damageReduction: number
  speedMultiplier: number
  magnetRangeMultiplier: number
  bonusCoinChance: number
  cooldownRateMultiplier: number
  damageMultiplier: number
  hpRegenPerSec: number
  xpMultiplier: number
  critChance: number
  critDamageBonus: number
}

export const MAX_EQUIPPED_ACCESSORIES = 3

const SHOP_STORAGE_KEY = 'swarm_protocol_shop_state_v1'

export const SHOP_WEAPONS: ShopWeaponItem[] = [
  // Bad / Crate-Only Weapons (high chance in cheap crates)
  {
    id: 'wpn_rusty_pistol',
    kind: 'weapon',
    name: 'Rusty Scrap Blaster',
    category: 'Projectile',
    rarity: 'scrap',
    tierLabel: 'Scrap',
    price: 50,
    salvageValue: 18,
    crateOnly: true,
    damage: 6,
    cooldown_s: 1.55,
    special: 'Corroded sluggish barrel',
    function_desc: 'Salvaged sidearm with weak muzzle velocity and slow cycling.',
    accentColor: '#9CA3AF'
  },
  {
    id: 'wpn_misfire_coil',
    kind: 'weapon',
    name: 'Faulty Spark Coil',
    category: 'Ranged',
    rarity: 'faulty',
    tierLabel: 'Faulty',
    price: 65,
    salvageValue: 22,
    crateOnly: true,
    damage: 9,
    cooldown_s: 1.9,
    special: 'Short 150px misfire arc',
    function_desc: 'Unstable capacitor sputters weak sparks over short distances.',
    accentColor: '#F87171'
  },
  {
    id: 'wpn_bent_launcher',
    kind: 'weapon',
    name: 'Dented Pea Mortar',
    category: 'AoE Weapon',
    rarity: 'faulty',
    tierLabel: 'Faulty',
    price: 70,
    salvageValue: 24,
    crateOnly: true,
    damage: 14,
    cooldown_s: 2.8,
    special: 'Tiny 38px dud blast',
    function_desc: 'Warped launcher fires sluggish shells with minimal blast radius.',
    accentColor: '#F87171'
  },

  // Common Standard Crate / Budget Weapon
  {
    id: 'wpn_pulse_carbine',
    kind: 'weapon',
    name: 'MK-1 Pulse Carbine',
    category: 'Projectile',
    rarity: 'common',
    tierLabel: 'Common',
    price: 140,
    salvageValue: 45,
    damage: 13,
    cooldown_s: 0.72,
    special: 'Twin standard bolts',
    function_desc: 'Mass-produced militia rifle firing steady dual kinetic bolts.',
    accentColor: '#E2E8F0'
  },

  // Uncommon -> Legendary Direct-Buy & Rare Crate Weapons (Higher Shop Prices)
  {
    id: 'wpn_plasma_lance',
    kind: 'weapon',
    name: 'Plasma Lance Mk.II',
    category: 'Beam Weapon',
    rarity: 'uncommon',
    tierLabel: 'Uncommon',
    price: 240,
    salvageValue: 75,
    damage: 28,
    cooldown_s: 0.75,
    special: '4-target pierce',
    function_desc: 'Fires high-velocity superheated plasma lances that punch through 4 targets.',
    accentColor: '#34D399'
  },
  {
    id: 'wpn_nova_hammer',
    kind: 'weapon',
    name: 'Nova Shock Hammer',
    category: 'Heavy AoE',
    rarity: 'uncommon',
    tierLabel: 'Uncommon',
    price: 380,
    salvageValue: 115,
    damage: 58,
    cooldown_s: 1.85,
    special: '115px shockwave',
    function_desc: 'Slams twin seismic shockwaves onto nearby swarms, blasting back enemies.',
    accentColor: '#34D399'
  },
  {
    id: 'wpn_storm_glaive',
    kind: 'weapon',
    name: 'Storm Boomerang Glaive',
    category: 'Projectile',
    rarity: 'rare',
    tierLabel: 'Rare',
    price: 620,
    salvageValue: 185,
    damage: 34,
    cooldown_s: 1.45,
    special: '9 bounces + pierce',
    function_desc: 'Launches electrified ricochet glaives that slice through dense waves.',
    accentColor: '#38BDF8'
  },
  {
    id: 'wpn_chrono_gatling',
    kind: 'weapon',
    name: 'Chrono Hyper-Gatling',
    category: 'Ranged',
    rarity: 'rare',
    tierLabel: 'Rare',
    price: 850,
    salvageValue: 255,
    damage: 19,
    cooldown_s: 0.34,
    special: '3-round hyper burst',
    function_desc: 'Rapid-cycles a 3-round kinetic burst at the closest threat in range.',
    accentColor: '#38BDF8'
  },
  {
    id: 'wpn_abyss_beam',
    kind: 'weapon',
    name: 'Abyssal Prism Beam',
    category: 'Beam Weapon',
    rarity: 'legendary',
    tierLabel: 'Legendary',
    price: 2150,
    salvageValue: 645,
    damage: 54,
    cooldown_s: 2.5,
    special: 'Dual 280px sweep',
    function_desc: 'Projects dual opposing disintegration beams sweeping 360° around you.',
    accentColor: '#FFD700'
  },
  {
    id: 'wpn_celestial_swarm',
    kind: 'weapon',
    name: 'Celestial Seeker Swarm',
    category: 'Heavy AoE',
    rarity: 'epic',
    tierLabel: 'Epic',
    price: 1450,
    salvageValue: 435,
    damage: 38,
    cooldown_s: 1.5,
    special: '4x homing warheads',
    function_desc: 'Launches 4 lock-on plasma missiles that track and detonate on packs.',
    accentColor: '#C084FC'
  },
  {
    id: 'wpn_cryo_railgun',
    kind: 'weapon',
    name: 'Cryo Railcannon',
    category: 'Beam Weapon',
    rarity: 'rare',
    tierLabel: 'Rare',
    price: 780,
    salvageValue: 235,
    damage: 44,
    cooldown_s: 1.05,
    special: 'Piercing frostburst rail',
    function_desc: 'Fires hypersonic sub-zero rail slugs that pierce dense lines and shatter on impact.',
    accentColor: '#38BDF8'
  },
  {
    id: 'wpn_solar_flail',
    kind: 'weapon',
    name: 'Solar Flare Flail',
    category: 'Heavy AoE',
    rarity: 'legendary',
    tierLabel: 'Legendary',
    price: 2250,
    salvageValue: 675,
    damage: 78,
    cooldown_s: 1.25,
    special: 'Boomerang spinning solar mace · Full-extension fire area',
    function_desc:
      'Launches a blazing spiked solar mace on a molten chain toward enemies, erupting into a scorching magma fire area at full extension before whipping back.',
    accentColor: '#FFD700'
  },
  {
    id: 'wpn_void_reaper',
    kind: 'weapon',
    name: 'Void Singularity Scythe',
    category: 'Melee Weapon',
    rarity: 'legendary',
    tierLabel: 'Legendary',
    price: 2450,
    salvageValue: 735,
    damage: 86,
    cooldown_s: 1.15,
    special: 'Gravity cleave + vortex',
    function_desc: 'Carves wide abyssal scythe arcs and tears open gravity vortices that crush swarms inward.',
    accentColor: '#FFD700'
  },
  {
    id: 'wpn_muramasa',
    kind: 'weapon',
    name: 'Muramasa: Calamity Blade',
    category: 'Melee Weapon',
    rarity: 'mythic',
    tierLabel: 'Mythic',
    price: 5000,
    salvageValue: 1500,
    crateOnly: true,
    pairedHeroId: 'hero_01',
    pairedHeroLabel: 'Pairs with Vanguard Blade (+55% DMG · +25% Reach & Speed · Extra Wave)',
    damage: 138,
    cooldown_s: 0.9,
    special: 'Mythic Bloodmoon Wave · Vanguard Synergy',
    function_desc:
      'High-frequency Calamity katana unleashing devastating crimson crescent waves. Pairs with Vanguard Blade for +55% damage, faster swings, wider cleave, and extra slash waves.',
    accentColor: '#FF2E63'
  },
  {
    id: 'wpn_permafrost_spire',
    kind: 'weapon',
    name: 'Glacier Permafrost Spire',
    category: 'Ranged',
    rarity: 'epic',
    tierLabel: 'Epic',
    price: 1380,
    salvageValue: 415,
    damage: 46,
    cooldown_s: 1.2,
    special: '1.5s solid freeze · Cryo burst',
    function_desc:
      'Launches piercing sub-zero frost lances that shatter into icy bursts and freeze enemies solid.',
    accentColor: '#C084FC'
  },
  {
    id: 'wpn_grim_reaper',
    kind: 'weapon',
    name: 'Grim Reaper: Soul Harvester',
    category: 'Summon',
    rarity: 'mythic',
    tierLabel: 'Mythic',
    price: 5200,
    salvageValue: 1560,
    crateOnly: true,
    pairedHeroId: 'hero_03',
    pairedHeroLabel: 'Pairs with Tech Engineer (+60% DMG · +28% Attack Speed · +1 Scythe · +2 Siphon & Heal)',
    damage: 88,
    cooldown_s: 1.05,
    special: 'Mythic Towering Grim Reaper · +20% Crit · Scythes & Life Siphon · Engineer Synergy',
    function_desc:
      'Summons a towering spectral Grim Reaper that throws giant piercing scythes (+20% Crit Chance) and siphons enemy life force back to heal you. Upgrades empower scythe count, size, siphon targets, and attack speed. Pairs with Tech Engineer for massive attack buffs.',
    accentColor: '#FF2E63'
  },
  {
    id: 'wpn_crimson_railblade',
    kind: 'weapon',
    name: 'Crimson Precision Edge',
    category: 'Melee Weapon',
    rarity: 'rare',
    tierLabel: 'Rare',
    price: 890,
    salvageValue: 265,
    damage: 54,
    cooldown_s: 0.92,
    special: '+22% Crit Chance · +30% Crit DMG · Piercing Slash',
    function_desc:
      'Surgical mono-edge crimson blade engineered for lethal weak-point strikes with elevated critical hit rate and crit damage.',
    accentColor: '#38BDF8'
  },
  {
    id: 'wpn_phantom_sniper',
    kind: 'weapon',
    name: 'Deadeye Phantom Railrifle',
    category: 'Ranged',
    rarity: 'epic',
    tierLabel: 'Epic',
    price: 1580,
    salvageValue: 475,
    damage: 74,
    cooldown_s: 1.15,
    special: '+34% Crit Chance · +50% Crit DMG · High-Velocity Pierce',
    function_desc:
      'Fires hyper-accelerated armor-piercing precision bolts that lock onto targets with devastating critical strike accuracy.',
    accentColor: '#C084FC'
  },
  {
    id: 'wpn_tempest_sphere',
    kind: 'weapon',
    name: 'Tempest Sphere: Skyfall',
    category: 'Heavy AoE',
    rarity: 'mythic',
    tierLabel: 'Mythic',
    price: 5300,
    salvageValue: 1590,
    crateOnly: true,
    pairedHeroId: 'hero_07',
    pairedHeroLabel:
      'Pairs with Storm Assassin (+60% DMG · +1 Falling Sphere · +35% Giant Pulse Wave · 22% Faster CD)',
    damage: 118,
    cooldown_s: 1.15,
    special: 'Mythic Sky-Drop Lightning Orb · +25% Crit · Shock Pulse Wave · Storm Synergy',
    function_desc:
      'Calls down a colossal high-voltage lightning sphere from the sky that crashes onto the ground, detonating a crackling pulse wave outward (+25% Crit Chance). Pairs with Storm Assassin for extra spheres, faster drops, and massive pulse waves.',
    accentColor: '#FF2E63'
  }
]

export const SHOP_ACCESSORIES: ShopAccessoryItem[] = [
  // Bad / Crate-Only Accessories
  {
    id: 'acc_cracked_plating',
    kind: 'accessory',
    name: 'Cracked Scrap Plating',
    slotLabel: 'Scrap Armor',
    rarity: 'scrap',
    price: 45,
    salvageValue: 15,
    crateOnly: true,
    statSummary: '+5 Max HP • -4% Move Speed',
    function_desc: 'Bent alloy sheet that barely cushions hits while weighing you down.',
    accentColor: '#9CA3AF',
    bonuses: {
      bonusHp: 5,
      speedMultiplier: -0.04
    }
  },
  {
    id: 'acc_lead_boots',
    kind: 'accessory',
    name: 'Rusted Lead Ballast',
    slotLabel: 'Faulty Rig',
    rarity: 'faulty',
    price: 55,
    salvageValue: 18,
    crateOnly: true,
    statSummary: '-10% Move Speed • +3% Damage',
    function_desc: 'Heavy corroded weights that hamper dodging in exchange for trace punch.',
    accentColor: '#F87171',
    bonuses: {
      speedMultiplier: -0.1,
      damageMultiplier: 0.03
    }
  },
  {
    id: 'acc_shorted_capacitor',
    kind: 'accessory',
    name: 'Shorted Fuse Relay',
    slotLabel: 'Faulty Module',
    rarity: 'faulty',
    price: 60,
    salvageValue: 20,
    crateOnly: true,
    statSummary: '-8% Fire Rate • +12 Max HP',
    function_desc: 'Malfunctioning power splitter that slows weapon cycling.',
    accentColor: '#F87171',
    bonuses: {
      cooldownReduction: -0.08,
      bonusHp: 12
    }
  },

  // Common Accessory
  {
    id: 'acc_alloy_vest',
    kind: 'accessory',
    name: 'Standard Alloy Vest',
    slotLabel: 'Light Armor',
    rarity: 'common',
    price: 110,
    salvageValue: 35,
    statSummary: '+15 Max HP',
    function_desc: 'Standard-issue kinetic mesh adding modest hull durability.',
    accentColor: '#E2E8F0',
    bonuses: {
      bonusHp: 15
    }
  },

  // Uncommon -> Legendary Direct-Buy & Rare Crate Accessories (Higher Prices)
  {
    id: 'acc_titanium_core',
    kind: 'accessory',
    name: 'Titanium Reactor Core',
    slotLabel: 'Armor Core',
    rarity: 'uncommon',
    price: 180,
    salvageValue: 55,
    statSummary: '+40 Max HP • -10% Damage Taken',
    function_desc: 'Reinforces chassis plating with a hardened alloy hull and impact dampening.',
    accentColor: '#34D399',
    bonuses: {
      bonusHp: 40,
      damageReduction: 0.1
    }
  },
  {
    id: 'acc_flux_thrusters',
    kind: 'accessory',
    name: 'Flux Thruster Boots',
    slotLabel: 'Mobility Rig',
    rarity: 'uncommon',
    price: 260,
    salvageValue: 80,
    statSummary: '+18% Move Speed',
    function_desc: 'Micro-vector thrusters raise base movement speed for dodging boss strikes.',
    accentColor: '#34D399',
    bonuses: {
      speedMultiplier: 0.18
    }
  },
  {
    id: 'acc_magnet_array',
    kind: 'accessory',
    name: 'Quantum Coin Magnet',
    slotLabel: 'Collector Array',
    rarity: 'rare',
    price: 420,
    salvageValue: 130,
    statSummary: '+90% Pickup Range • +25% Coins',
    function_desc: 'Expands coin magnetism radius and synthesizes extra Battle Coins per pickup.',
    accentColor: '#38BDF8',
    bonuses: {
      magnetRangeMultiplier: 0.9,
      bonusCoinChance: 0.25
    }
  },
  {
    id: 'acc_overclock_coil',
    kind: 'accessory',
    name: 'Overclock Capacitor',
    slotLabel: 'Cooldown Module',
    rarity: 'rare',
    price: 560,
    salvageValue: 170,
    statSummary: '+15% Fire Rate',
    function_desc: 'Accelerates weapon and autonomous summon cycling speed by 15%.',
    accentColor: '#38BDF8',
    bonuses: {
      cooldownReduction: 0.15
    }
  },
  {
    id: 'acc_crimson_amp',
    kind: 'accessory',
    name: 'Crimson Damage Amplifier',
    slotLabel: 'Power Amplifier',
    rarity: 'epic',
    price: 920,
    salvageValue: 275,
    statSummary: '+22% Weapon Damage',
    function_desc: 'Supercharges all equipped weapons, beams, AoE blasts, and summons by 22%.',
    accentColor: '#C084FC',
    bonuses: {
      damageMultiplier: 0.22
    }
  },
  {
    id: 'acc_regen_matrix',
    kind: 'accessory',
    name: 'Nanite Regeneration Matrix',
    slotLabel: 'Bio-Synth',
    rarity: 'legendary',
    price: 1450,
    salvageValue: 435,
    statSummary: '+2 HP/sec • +15% XP Gain',
    function_desc: 'Continuously repairs hull integrity during waves and boosts combat XP intake.',
    accentColor: '#FFD700',
    bonuses: {
      hpRegenPerSec: 2,
      xpMultiplier: 0.15
    }
  },
  {
    id: 'acc_aegis_plating',
    kind: 'accessory',
    name: 'Aegis Reactive Plating',
    slotLabel: 'Heavy Armor',
    rarity: 'rare',
    price: 490,
    salvageValue: 145,
    statSummary: '+75 Max HP • -14% Damage Taken • +8% Move Speed',
    function_desc: 'Layered ceramic-titanium plating absorbing heavy boss strikes without bogging mobility.',
    accentColor: '#38BDF8',
    bonuses: {
      bonusHp: 75,
      damageReduction: 0.14,
      speedMultiplier: 0.08
    }
  },
  {
    id: 'acc_chrono_accelerator',
    kind: 'accessory',
    name: 'Chrono Surge Core',
    slotLabel: 'Tempo Core',
    rarity: 'epic',
    price: 1080,
    salvageValue: 320,
    statSummary: '+24% Fire Rate • +12% Move Speed • +15% XP Gain',
    function_desc: 'Temporal accelerator compressing weapon cooldowns and amplifying battlefield reflexes.',
    accentColor: '#C084FC',
    bonuses: {
      cooldownReduction: 0.24,
      speedMultiplier: 0.12,
      xpMultiplier: 0.15
    }
  },
  {
    id: 'acc_berserker_crest',
    kind: 'accessory',
    name: 'Bloodforged War Crest',
    slotLabel: 'War Sigil',
    rarity: 'legendary',
    price: 1650,
    salvageValue: 495,
    statSummary: '+35% Weapon Damage • +15% Fire Rate • +1.5 HP/sec',
    function_desc: 'Siphons battlefield fury into relentless attack output and continuous combat sustain.',
    accentColor: '#FFD700',
    bonuses: {
      damageMultiplier: 0.35,
      cooldownReduction: 0.15,
      hpRegenPerSec: 1.5
    }
  },
  {
    id: 'acc_calamity_heart',
    kind: 'accessory',
    name: 'Heart of Calamity',
    slotLabel: 'Mythic Relic',
    rarity: 'mythic',
    price: 4200,
    salvageValue: 1260,
    crateOnly: true,
    statSummary: '+120 Max HP • +48% Weapon Damage • +20% Fire Rate • +15% Crit Chance • -15% Damage Taken • +4 HP/sec',
    function_desc:
      'Apex Calamity reactor core overflowing with crimson energy, elevating every offensive, critical, and defensive stat simultaneously.',
    accentColor: '#FF2E63',
    bonuses: {
      bonusHp: 120,
      damageMultiplier: 0.48,
      cooldownReduction: 0.2,
      damageReduction: 0.15,
      hpRegenPerSec: 4,
      critChance: 0.15
    }
  },
  {
    id: 'acc_targeting_visor',
    kind: 'accessory',
    name: 'Crimson Telemetry Visor',
    slotLabel: 'Optics Unit',
    rarity: 'rare',
    price: 720,
    salvageValue: 215,
    statSummary: '+14% Crit Chance • +10% Weapon Damage',
    function_desc:
      'Locks neural crosshairs onto structural weak points, substantially increasing critical strike frequency across all equipped weapons.',
    accentColor: '#38BDF8',
    bonuses: {
      critChance: 0.14,
      damageMultiplier: 0.1
    }
  },
  {
    id: 'acc_assassin_core',
    kind: 'accessory',
    name: 'Apex Assassin Gyro-Core',
    slotLabel: 'Strike Core',
    rarity: 'epic',
    price: 1390,
    salvageValue: 415,
    statSummary: '+22% Crit Chance • +45% Crit DMG • +8% Move Speed',
    function_desc:
      'Overclocks kinetic reflexes for razor-sharp critical execution and amplified critical strike damage multipliers.',
    accentColor: '#C084FC',
    bonuses: {
      critChance: 0.22,
      critDamageMultiplier: 0.45,
      speedMultiplier: 0.08
    }
  }
]

/**
 * Crafted gear is available only through boss recipes. Keep it out of
 * SHOP_CATALOG so it never enters direct-buy rotations or crate pools.
 */
export const CRAFTED_WEAPONS: ShopWeaponItem[] = [
  {
    id: 'wpn_crafted_aegis_commander',
    kind: 'weapon',
    name: 'Aegis Redline Carbine',
    category: 'Projectile',
    rarity: 'epic',
    tierLabel: 'Aegis Forged',
    price: 0,
    salvageValue: 360,
    damage: 44,
    cooldown_s: 0.62,
    special: 'Aegis command burst',
    function_desc: 'A rapid-fire carbine built around the Aegis drone’s command core.',
    accentColor: '#F87171'
  },
  {
    id: 'wpn_crafted_emerald_prism_monarch',
    kind: 'weapon',
    name: 'Monarch Prism Glaive',
    category: 'Beam Weapon',
    rarity: 'legendary',
    tierLabel: 'Monarch Forged',
    price: 0,
    salvageValue: 530,
    damage: 62,
    cooldown_s: 0.9,
    special: 'Emerald piercing prism',
    function_desc: 'A refracting glaive that carries the Emerald Prism Monarch’s focused beam.',
    accentColor: '#10B981'
  },
  {
    id: 'wpn_crafted_astral_vortex_colossus',
    kind: 'weapon',
    name: 'Vortex Singularity Driver',
    category: 'Heavy AoE',
    rarity: 'legendary',
    tierLabel: 'Colossus Forged',
    price: 0,
    salvageValue: 620,
    damage: 78,
    cooldown_s: 1.45,
    special: 'Gravity-pulse impact',
    function_desc: 'A heavy driver that releases a compact gravity pulse on impact.',
    accentColor: '#38BDF8'
  },
  {
    id: 'wpn_crafted_astral_scourge',
    kind: 'weapon',
    name: 'Astral Riftspike',
    category: 'Heavy AoE',
    rarity: 'mythic',
    tierLabel: 'Scourge Forged',
    price: 0,
    salvageValue: 900,
    damage: 104,
    cooldown_s: 1.35,
    special: 'Rift-charged starburst',
    function_desc: 'A mythic lance forged from the Astral Scourge’s starheart and riftborne hide.',
    accentColor: '#34D399'
  },
  {
    id: 'wpn_crafted_solar_void_reaper',
    kind: 'weapon',
    name: 'Solar Void Reaper',
    category: 'Melee Weapon',
    rarity: 'mythic',
    tierLabel: 'Eclipse Forged',
    price: 0,
    salvageValue: 1120,
    damage: 128,
    cooldown_s: 1.3,
    special: 'Solar cleave + gravity vortex',
    function_desc:
      'Fuses the Void Singularity Scythe and Solar Flare Flail into a burning crescent that opens a crushing starheart vortex.',
    accentColor: '#F97316'
  }
]

export const CRAFTED_ACCESSORIES: ShopAccessoryItem[] = [
  {
    id: 'acc_crafted_omega_overlord',
    kind: 'accessory',
    name: 'Omega Overlord Reactor',
    slotLabel: 'Overlord Core',
    rarity: 'mythic',
    price: 0,
    salvageValue: 820,
    statSummary: '+75 Max HP • +24% Damage • +12% Fire Rate',
    function_desc: 'A battle reactor rebuilt from Omega Overlord’s final-phase armor.',
    accentColor: '#FF2E63',
    bonuses: { bonusHp: 75, damageMultiplier: 0.24, cooldownReduction: 0.12 }
  },
  {
    id: 'acc_crafted_astral_bastion_warden',
    kind: 'accessory',
    name: 'Bastion Mortar Guard',
    slotLabel: 'Warden Plating',
    rarity: 'epic',
    price: 0,
    salvageValue: 420,
    statSummary: '+55 Max HP • -10% Damage Taken',
    function_desc: 'Armor reinforced with a Warden mortar lens and Citadel anchor stone.',
    accentColor: '#F59E0B',
    bonuses: { bonusHp: 55, damageReduction: 0.1 }
  },
  {
    id: 'acc_crafted_solar_archon_seraph',
    kind: 'accessory',
    name: 'Seraph Sunlattice',
    slotLabel: 'Solar Sigil',
    rarity: 'legendary',
    price: 0,
    salvageValue: 680,
    statSummary: '+18% Damage • +12% Crit Chance • +8% Move Speed',
    function_desc: 'A solar lattice that focuses the Seraph’s radiant power into each strike.',
    accentColor: '#FACC15',
    bonuses: { damageMultiplier: 0.18, critChance: 0.12, speedMultiplier: 0.08 }
  },
  {
    id: 'acc_crafted_eclipse_aegis',
    kind: 'accessory',
    name: 'Eclipse Aegis',
    slotLabel: 'Eclipse Core',
    rarity: 'mythic',
    price: 0,
    salvageValue: 1040,
    statSummary: '+85 Max HP • +18% Damage • +10% Crit Chance',
    function_desc:
      'A fused reactor shield powered by the Overlord and Seraph, stabilized with an Astral Scourge starheart.',
    accentColor: '#FB923C',
    bonuses: { bonusHp: 85, damageMultiplier: 0.18, critChance: 0.1 }
  },
  {
    id: 'acc_crafted_vortex_harness',
    kind: 'accessory',
    name: 'Vortex Harness',
    slotLabel: 'Gravity Harness',
    rarity: 'legendary',
    price: 0,
    salvageValue: 840,
    statSummary: '+70 Max HP • -12% Damage Taken • +8% Fire Rate',
    function_desc:
      'A Warden-plated harness powered by the Colossus singularity drive for durable, rapid strikes.',
    accentColor: '#38BDF8',
    bonuses: { bonusHp: 70, damageReduction: 0.12, cooldownReduction: 0.08 }
  }
]

const CRAFTED_GEAR: ShopCatalogItem[] = [...CRAFTED_WEAPONS, ...CRAFTED_ACCESSORIES]
const CRAFTED_GEAR_BY_ID = new Map(CRAFTED_GEAR.map((item) => [item.id, item]))

export const SUPPLY_CRATES: SupplyCrateTier[] = [
  {
    id: 'crate_salvage',
    name: 'Scavenger Salvage Crate',
    tagline: 'High Risk • Low Cost',
    price: 95,
    accentColor: '#9CA3AF',
    description:
      'Recovered from battlefield debris. High chance of Scrap or Faulty gear, with a slim shot at Rare drops.',
    rarityWeights: {
      scrap: 0.28,
      faulty: 0.24,
      common: 0.28,
      uncommon: 0.14,
      rare: 0.05,
      epic: 0.009,
      legendary: 0.001
    }
  },
  {
    id: 'crate_tactical',
    name: 'Tactical Armory Crate',
    tagline: 'Balanced • Standard Issue',
    price: 260,
    accentColor: '#38BDF8',
    description:
      'Military supply drop. Lower defective item risk with better odds for Uncommon & Rare gear.',
    rarityWeights: {
      scrap: 0.12,
      faulty: 0.16,
      common: 0.30,
      uncommon: 0.26,
      rare: 0.12,
      epic: 0.032,
      legendary: 0.008
    }
  },
  {
    id: 'crate_apex',
    name: 'Apex Prototype Crate',
    tagline: 'Premium • High Rare Odds • 1% Mythic',
    price: 650,
    accentColor: '#FFD700',
    description:
      'Experimental vault cache. Minimal faulty risk with elevated Epic & Legendary odds plus a 1% Mythic drop chance.',
    rarityWeights: {
      scrap: 0.04,
      faulty: 0.08,
      common: 0.16,
      uncommon: 0.34,
      rare: 0.24,
      epic: 0.095,
      legendary: 0.035,
      mythic: 0.01
    }
  },
  {
    id: 'crate_mythic',
    name: 'Calamity Mythic Vault',
    tagline: 'No Common/Scrap • 4% Mythic',
    price: 2000,
    accentColor: '#FF2E63',
    description:
      'Zero Scrap, Faulty, or Common drops. Guarantees Uncommon+ gear with 10% Legendary and 4% Mythic odds.',
    rarityWeights: {
      uncommon: 0.21,
      rare: 0.40,
      epic: 0.25,
      legendary: 0.10,
      mythic: 0.04
    }
  }
]

export const SHOP_CATALOG: ShopCatalogItem[] = [...SHOP_WEAPONS, ...SHOP_ACCESSORIES]

export function getShopItemById(itemId: string): ShopCatalogItem | undefined {
  return SHOP_CATALOG.find((item) => item.id === itemId) || CRAFTED_GEAR_BY_ID.get(itemId)
}

export function getShopWeaponById(weaponId: string): ShopWeaponItem | undefined {
  return SHOP_WEAPONS.find((w) => w.id === weaponId) || CRAFTED_WEAPONS.find((w) => w.id === weaponId)
}

export function getShopAccessoryById(accessoryId: string): ShopAccessoryItem | undefined {
  return SHOP_ACCESSORIES.find((a) => a.id === accessoryId) || CRAFTED_ACCESSORIES.find((a) => a.id === accessoryId)
}

export function getSupplyCrateById(crateId: string): SupplyCrateTier | undefined {
  return SUPPLY_CRATES.find((c) => c.id === crateId)
}

export function isBadGearRarity(rarity: GearRarity): boolean {
  return RARITY_META[rarity].isBad
}

export function clampGearStars(stars: number | undefined): number {
  if (typeof stars !== 'number' || !Number.isFinite(stars)) return 0
  return Math.max(0, Math.min(MAX_GEAR_STARS, Math.floor(stars)))
}

export function getStarScaledWeaponStats(
  weapon: ShopWeaponItem,
  stars: number = 0
): { damage: number; cooldown_s: number; salvageValue: number } {
  const s = clampGearStars(stars)
  const damage = Math.max(1, Math.round(weapon.damage * (1 + s * 0.22)))
  const cooldown_s = Math.max(0.15, Number((weapon.cooldown_s * (1 - s * 0.04)).toFixed(2)))
  const salvageValue = Math.max(1, Math.round(weapon.salvageValue * Math.pow(1.7, s)))
  return { damage, cooldown_s, salvageValue }
}

export function getStarScaledAccessoryBonuses(
  acc: ShopAccessoryItem,
  stars: number = 0
): AccessoryBonuses {
  const s = clampGearStars(stars)
  const posScale = 1 + s * 0.2
  const negScale = Math.max(0.2, 1 - s * 0.16)
  const scaleVal = (val: number | undefined, roundInt = false): number | undefined => {
    if (val === undefined) return undefined
    const scaled = val >= 0 ? val * posScale : val * negScale
    return roundInt ? Math.round(scaled) : Number(scaled.toFixed(3))
  }

  return {
    bonusHp: scaleVal(acc.bonuses.bonusHp, true),
    damageReduction: scaleVal(acc.bonuses.damageReduction),
    speedMultiplier: scaleVal(acc.bonuses.speedMultiplier),
    magnetRangeMultiplier: scaleVal(acc.bonuses.magnetRangeMultiplier),
    bonusCoinChance: scaleVal(acc.bonuses.bonusCoinChance),
    cooldownReduction: scaleVal(acc.bonuses.cooldownReduction),
    damageMultiplier: scaleVal(acc.bonuses.damageMultiplier),
    hpRegenPerSec: scaleVal(acc.bonuses.hpRegenPerSec),
    xpMultiplier: scaleVal(acc.bonuses.xpMultiplier),
    critChance: scaleVal(acc.bonuses.critChance),
    critDamageMultiplier: scaleVal(acc.bonuses.critDamageMultiplier)
  }
}

export function formatAccessoryStatSummary(acc: ShopAccessoryItem, stars: number = 0): string {
  const b = getStarScaledAccessoryBonuses(acc, stars)
  const parts: string[] = []
  if (b.bonusHp) parts.push(`${b.bonusHp >= 0 ? '+' : ''}${b.bonusHp} Max HP`)
  if (b.damageReduction) parts.push(`-${Math.round(b.damageReduction * 100)}% Damage Taken`)
  if (b.speedMultiplier) {
    const pct = Math.round(b.speedMultiplier * 100)
    parts.push(`${pct >= 0 ? '+' : ''}${pct}% Move Speed`)
  }
  if (b.magnetRangeMultiplier) parts.push(`+${Math.round(b.magnetRangeMultiplier * 100)}% Pickup Range`)
  if (b.bonusCoinChance) parts.push(`+${Math.round(b.bonusCoinChance * 100)}% Coins`)
  if (b.cooldownReduction) {
    const pct = Math.round(b.cooldownReduction * 100)
    parts.push(`${pct >= 0 ? '+' : ''}${pct}% Fire Rate`)
  }
  if (b.damageMultiplier) {
    const pct = Math.round(b.damageMultiplier * 100)
    parts.push(`${pct >= 0 ? '+' : ''}${pct}% Damage`)
  }
  if (b.critChance) parts.push(`+${Math.round(b.critChance * 100)}% Crit Chance`)
  if (b.critDamageMultiplier) parts.push(`+${Math.round(b.critDamageMultiplier * 100)}% Crit DMG`)
  if (b.hpRegenPerSec) parts.push(`+${Number(b.hpRegenPerSec.toFixed(1))} HP/sec`)
  if (b.xpMultiplier) parts.push(`+${Math.round(b.xpMultiplier * 100)}% XP Gain`)
  return parts.length > 0 ? parts.join(' · ') : acc.statSummary
}

export function getItemSalvageValue(item: ShopCatalogItem, stars: number = 0): number {
  const s = clampGearStars(stars)
  return Math.max(1, Math.round(item.salvageValue * Math.pow(1.7, s)))
}

export function shopWeaponToUpgradeRow(item: ShopWeaponItem, stars: number = 0): UpgradesRow {
  const scaled = getStarScaledWeaponStats(item, stars)
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    function_desc: item.function_desc,
    damage: scaled.damage,
    cooldown_s: scaled.cooldown_s,
    special: item.special
  }
}

export function shopWeaponsAsUpgrades(starOverrides?: Record<string, number>): UpgradesRow[] {
  return [...SHOP_WEAPONS, ...CRAFTED_WEAPONS].map((w) =>
    shopWeaponToUpgradeRow(w, starOverrides?.[w.id] ?? 0)
  )
}

export function computeEquippedAccessoryBonuses(
  equippedAccessoryIds: ReadonlyArray<string>,
  equippedAccessoryStars?: Record<string, number>
): ComputedAccessoryBonuses {
  let bonusHp = 0
  let damageReduction = 0
  let speedBonus = 0
  let magnetBonus = 0
  let bonusCoinChance = 0
  let cooldownBonus = 0
  let damageBonus = 0
  let hpRegenPerSec = 0
  let xpBonus = 0
  let critChance = 0
  let critDamageBonus = 0

  for (const id of equippedAccessoryIds) {
    const item = getShopAccessoryById(id)
    if (!item) continue
    const stars = equippedAccessoryStars?.[id] ?? 0
    const b = getStarScaledAccessoryBonuses(item, stars)
    if (b.bonusHp) bonusHp += b.bonusHp
    if (b.damageReduction) damageReduction += b.damageReduction
    if (b.speedMultiplier) speedBonus += b.speedMultiplier
    if (b.magnetRangeMultiplier) magnetBonus += b.magnetRangeMultiplier
    if (b.bonusCoinChance) bonusCoinChance += b.bonusCoinChance
    if (b.cooldownReduction) cooldownBonus += b.cooldownReduction
    if (b.damageMultiplier) damageBonus += b.damageMultiplier
    if (b.hpRegenPerSec) hpRegenPerSec += b.hpRegenPerSec
    if (b.xpMultiplier) xpBonus += b.xpMultiplier
    if (b.critChance) critChance += b.critChance
    if (b.critDamageMultiplier) critDamageBonus += b.critDamageMultiplier
  }

  return {
    bonusHp,
    damageReduction: Math.max(0, Math.min(0.6, Number(damageReduction.toFixed(2)))),
    speedMultiplier: Math.max(0.45, Number((1 + speedBonus).toFixed(2))),
    magnetRangeMultiplier: Math.max(0.5, Number((1 + magnetBonus).toFixed(2))),
    bonusCoinChance: Math.max(0, Number(bonusCoinChance.toFixed(2))),
    cooldownRateMultiplier: Math.max(0.45, Number((1 + cooldownBonus).toFixed(2))),
    damageMultiplier: Math.max(0.5, Number((1 + damageBonus).toFixed(2))),
    hpRegenPerSec: Math.max(0, Number(hpRegenPerSec.toFixed(2))),
    xpMultiplier: Math.max(0.5, Number((1 + xpBonus).toFixed(2))),
    critChance: Math.max(0, Math.min(0.75, Number(critChance.toFixed(3)))),
    critDamageBonus: Math.max(0, Number(critDamageBonus.toFixed(2)))
  }
}

const memoryShopStorage = new Map<string, string>()
const shopListeners = new Set<() => void>()

function getShopStorageKey(userId?: string | null): string {
  const effective = !userId || userId === 'guest_user' ? 'guest_user' : userId
  return effective === 'guest_user' ? SHOP_STORAGE_KEY : `${SHOP_STORAGE_KEY}_${effective}`
}

function readRawShopState(userId?: string | null): ShopAccountState | null {
  const key = getShopStorageKey(userId)
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as ShopAccountState
        memoryShopStorage.set(key, raw)
        return parsed
      }
    }
    const mem = memoryShopStorage.get(key)
    return mem ? (JSON.parse(mem) as ShopAccountState) : null
  } catch {
    const mem = memoryShopStorage.get(key)
    if (mem) {
      try {
        return JSON.parse(mem) as ShopAccountState
      } catch {
        return null
      }
    }
    return null
  }
}

function writeShopState(state: ShopAccountState): void {
  const key = getShopStorageKey(state.userId)
  const serialized = JSON.stringify(state)
  memoryShopStorage.set(key, serialized)
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, serialized)
    }
  } catch {
    // Ignore storage quota errors
  }
  shopListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // Ignore subscriber errors
    }
  })
}

function emptyStarArray(): number[] {
  return [0, 0, 0, 0, 0, 0]
}

function normalizeStarArray(raw?: unknown): number[] {
  const out = emptyStarArray()
  if (!Array.isArray(raw)) return out
  for (let s = 0; s <= MAX_GEAR_STARS; s++) {
    const n = Number(raw[s] ?? 0)
    out[s] = Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  }
  return out
}

function deriveOwnedIdsFromStacks(gearStacks: Record<string, number[]>): string[] {
  const owned: string[] = []
  for (const [id, arr] of Object.entries(gearStacks)) {
    if (arr.some((count) => count > 0)) {
      owned.push(id)
    }
  }
  return owned
}

export function getStackCount(state: ShopAccountState, itemId: string, stars: number): number {
  const s = clampGearStars(stars)
  return state.gearStacks?.[itemId]?.[s] ?? 0
}

export function getTotalStackCount(state: ShopAccountState, itemId: string): number {
  const arr = state.gearStacks?.[itemId]
  if (!arr) return 0
  return arr.reduce((sum, n) => sum + (n > 0 ? n : 0), 0)
}

export function getHighestOwnedStar(state: ShopAccountState, itemId: string): number | null {
  const arr = state.gearStacks?.[itemId]
  if (!arr) return null
  for (let s = MAX_GEAR_STARS; s >= 0; s--) {
    if ((arr[s] ?? 0) > 0) return s
  }
  return null
}

export function getInventoryStacks(state: ShopAccountState): GearStackEntry[] {
  const entries: GearStackEntry[] = []
  const equippedAccessorySet = new Set(state.equippedAccessoryIds)

  for (const [itemId, arr] of Object.entries(state.gearStacks || {})) {
    const item = getShopItemById(itemId)
    if (!item) continue
    for (let s = MAX_GEAR_STARS; s >= 0; s--) {
      const count = arr[s] ?? 0
      if (count > 0) {
        entries.push({ itemId, stars: s, count, item })
      }
    }
  }

  entries.sort((a, b) => {
    const aEquipped =
      (state.equippedWeaponId === a.itemId && state.equippedWeaponStars === a.stars) ||
      (equippedAccessorySet.has(a.itemId) && (state.equippedAccessoryStars[a.itemId] ?? 0) === a.stars)
    const bEquipped =
      (state.equippedWeaponId === b.itemId && state.equippedWeaponStars === b.stars) ||
      (equippedAccessorySet.has(b.itemId) && (state.equippedAccessoryStars[b.itemId] ?? 0) === b.stars)
    if (aEquipped !== bEquipped) return aEquipped ? -1 : 1
    if (b.stars !== a.stars) return b.stars - a.stars
    const rarityDiff = RARITY_META[b.item.rarity].order - RARITY_META[a.item.rarity].order
    if (rarityDiff !== 0) return rarityDiff
    return a.item.name.localeCompare(b.item.name)
  })

  return entries
}

export type ArmorySortOption =
  | 'equipped'
  | 'rarity_desc'
  | 'rarity_asc'
  | 'stars_desc'
  | 'count_desc'
  | 'name_asc'
  | 'power_desc'

export function sortGearStacks(
  entries: ReadonlyArray<GearStackEntry>,
  sortBy: ArmorySortOption,
  state?: Pick<
    ShopAccountState,
    'equippedWeaponId' | 'equippedWeaponStars' | 'equippedAccessoryIds' | 'equippedAccessoryStars'
  >
): GearStackEntry[] {
  const list = [...entries]
  const equippedAccSet = new Set(state?.equippedAccessoryIds || [])

  const isEquippedEntry = (e: GearStackEntry): boolean =>
    Boolean(
      (state?.equippedWeaponId === e.itemId && state?.equippedWeaponStars === e.stars) ||
        (equippedAccSet.has(e.itemId) && (state?.equippedAccessoryStars?.[e.itemId] ?? 0) === e.stars)
    )

  const getPowerScore = (e: GearStackEntry): number => {
    if (e.item.kind === 'weapon') {
      const scaled = getStarScaledWeaponStats(e.item, e.stars)
      return scaled.cooldown_s > 0 ? scaled.damage / scaled.cooldown_s : scaled.damage
    }
    return getItemSalvageValue(e.item, e.stars)
  }

  list.sort((a, b) => {
    if (sortBy === 'equipped') {
      const aEq = isEquippedEntry(a)
      const bEq = isEquippedEntry(b)
      if (aEq !== bEq) return aEq ? -1 : 1
      if (b.stars !== a.stars) return b.stars - a.stars
      const rarityDiff = RARITY_META[b.item.rarity].order - RARITY_META[a.item.rarity].order
      if (rarityDiff !== 0) return rarityDiff
      return a.item.name.localeCompare(b.item.name)
    }

    if (sortBy === 'rarity_desc') {
      const rarityDiff = RARITY_META[b.item.rarity].order - RARITY_META[a.item.rarity].order
      if (rarityDiff !== 0) return rarityDiff
      if (b.stars !== a.stars) return b.stars - a.stars
      return a.item.name.localeCompare(b.item.name)
    }

    if (sortBy === 'rarity_asc') {
      const rarityDiff = RARITY_META[a.item.rarity].order - RARITY_META[b.item.rarity].order
      if (rarityDiff !== 0) return rarityDiff
      if (b.stars !== a.stars) return b.stars - a.stars
      return a.item.name.localeCompare(b.item.name)
    }

    if (sortBy === 'stars_desc') {
      if (b.stars !== a.stars) return b.stars - a.stars
      const rarityDiff = RARITY_META[b.item.rarity].order - RARITY_META[a.item.rarity].order
      if (rarityDiff !== 0) return rarityDiff
      return a.item.name.localeCompare(b.item.name)
    }

    if (sortBy === 'count_desc') {
      if (b.count !== a.count) return b.count - a.count
      const rarityDiff = RARITY_META[b.item.rarity].order - RARITY_META[a.item.rarity].order
      if (rarityDiff !== 0) return rarityDiff
      return a.item.name.localeCompare(b.item.name)
    }

    if (sortBy === 'power_desc') {
      const diff = getPowerScore(b) - getPowerScore(a)
      if (Math.abs(diff) > 0.001) return diff
      return a.item.name.localeCompare(b.item.name)
    }

    // 'name_asc'
    const nameDiff = a.item.name.localeCompare(b.item.name)
    if (nameDiff !== 0) return nameDiff
    return b.stars - a.stars
  })

  return list
}

function addItemStackToRecord(
  gearStacks: Record<string, number[]>,
  itemId: string,
  stars: number = 0,
  amount: number = 1
): Record<string, number[]> {
  const s = clampGearStars(stars)
  const prevArr = normalizeStarArray(gearStacks[itemId])
  const nextArr = [...prevArr]
  nextArr[s] = Math.max(0, nextArr[s] + amount)
  return {
    ...gearStacks,
    [itemId]: nextArr
  }
}

function consumeItemStackFromRecord(
  gearStacks: Record<string, number[]>,
  itemId: string,
  amount: number
): Record<string, number[]> {
  const nextStacks = normalizeStarArray(gearStacks[itemId])
  let remaining = Math.max(0, Math.floor(amount))

  for (let stars = 0; stars <= MAX_GEAR_STARS && remaining > 0; stars++) {
    const available = nextStacks[stars] || 0
    const consumed = Math.min(available, remaining)
    nextStacks[stars] = available - consumed
    remaining -= consumed
  }

  const next = { ...gearStacks }
  if (nextStacks.some((count) => count > 0)) next[itemId] = nextStacks
  else delete next[itemId]
  return next
}

function normalizeAccountState(raw: ShopAccountState, effectiveUserId: string): ShopAccountState {
  const normalizedStacks: Record<string, number[]> = {}
  if (raw.gearStacks && typeof raw.gearStacks === 'object') {
    for (const [id, arr] of Object.entries(raw.gearStacks)) {
      const norm = normalizeStarArray(arr)
      if (norm.some((n) => n > 0)) {
        normalizedStacks[id] = norm
      }
    }
  }

  // Migrate legacy ownedIds without gearStacks into 0-star stacks
  if (Array.isArray(raw.ownedIds)) {
    for (const id of raw.ownedIds) {
      if (!normalizedStacks[id]) {
        normalizedStacks[id] = [1, 0, 0, 0, 0, 0]
      }
    }
  }

  const ownedIds = deriveOwnedIdsFromStacks(normalizedStacks)
  const ownedSet = new Set(ownedIds)

  let equippedWeaponId = raw.equippedWeaponId && ownedSet.has(raw.equippedWeaponId) ? raw.equippedWeaponId : null
  let equippedWeaponStars = clampGearStars(raw.equippedWeaponStars)
  if (equippedWeaponId) {
    const arr = normalizedStacks[equippedWeaponId]
    if (!arr || (arr[equippedWeaponStars] ?? 0) <= 0) {
      let best = 0
      for (let s = MAX_GEAR_STARS; s >= 0; s--) {
        if ((arr?.[s] ?? 0) > 0) {
          best = s
          break
        }
      }
      equippedWeaponStars = best
    }
  } else {
    equippedWeaponStars = 0
  }

  const equippedAccessoryIds = Array.isArray(raw.equippedAccessoryIds)
    ? raw.equippedAccessoryIds.filter((id) => ownedSet.has(id)).slice(0, MAX_EQUIPPED_ACCESSORIES)
    : []
  const equippedAccessoryStars: Record<string, number> = {}
  for (const id of equippedAccessoryIds) {
    const arr = normalizedStacks[id]
    const requested = clampGearStars(raw.equippedAccessoryStars?.[id])
    if (arr && (arr[requested] ?? 0) > 0) {
      equippedAccessoryStars[id] = requested
    } else {
      let best = 0
      for (let s = MAX_GEAR_STARS; s >= 0; s--) {
        if ((arr?.[s] ?? 0) > 0) {
          best = s
          break
        }
      }
      equippedAccessoryStars[id] = best
    }
  }

  const bossMaterials: Record<string, number> = {}
  if (raw.bossMaterials && typeof raw.bossMaterials === 'object') {
    for (const [materialId, value] of Object.entries(raw.bossMaterials)) {
      const count = Number(value)
      if (Number.isFinite(count) && count > 0) {
        bossMaterials[materialId] = Math.floor(count)
      }
    }
  }

  return {
    ...raw,
    userId: effectiveUserId,
    cratesOpened: raw.cratesOpened || 0,
    ownedIds,
    gearStacks: normalizedStacks,
    bossMaterials,
    equippedWeaponId,
    equippedWeaponStars,
    equippedAccessoryIds,
    equippedAccessoryStars
  }
}

/**
 * Retrieve (or lazily seed from prior lifetime coins) the Shop wallet & Armory gear for an account.
 */
export function getShopAccountState(userId?: string | null): ShopAccountState {
  const effectiveUserId = userId || 'guest_user'
  const existing = readRawShopState(effectiveUserId)
  if (existing) {
    return normalizeAccountState(existing, effectiveUserId)
  }

  const telemetry = getLocalPlayerTelemetry(effectiveUserId)
  const initialCoins = Math.max(0, Math.floor(telemetry.total_coins_collected || 0))
  const seeded: ShopAccountState = {
    userId: effectiveUserId,
    balance: initialCoins,
    totalEarned: initialCoins,
    totalSpent: 0,
    cratesOpened: 0,
    ownedIds: [],
    gearStacks: {},
    bossMaterials: {},
    equippedWeaponId: null,
    equippedWeaponStars: 0,
    equippedAccessoryIds: [],
    equippedAccessoryStars: {},
    updatedAt: new Date().toISOString()
  }
  writeShopState(seeded)
  return seeded
}

export interface BossLootResult {
  success: boolean
  state: ShopAccountState
  materials?: string[]
  item?: ShopCatalogItem
  error?: string
}

/**
 * Grant the three materials tied to a defeated playable boss.
 */
export function awardBossDrops(
  userId: string | null | undefined,
  bossSetId: string
): BossLootResult {
  const current = getShopAccountState(userId)
  const bossSet = PLAYABLE_BOSS_DROP_SETS.find((boss) => boss.id === bossSetId)
  if (!bossSet) {
    return { success: false, state: current, error: 'Boss drop set not found.' }
  }

  const bossMaterials = { ...current.bossMaterials }
  for (const material of bossSet.materials) {
    bossMaterials[material.id] = (bossMaterials[material.id] || 0) + 1
  }
  const next: ShopAccountState = {
    ...current,
    bossMaterials,
    updatedAt: new Date().toISOString()
  }
  writeShopState(next)
  return { success: true, state: next, materials: bossSet.materials.map((material) => material.id) }
}

/**
 * Resolve the defeated enemy identity and grant its set, if it is a playable
 * boss or mini-boss. The developer-only secret boss intentionally has no set.
 */
export function awardBossDropsForEnemy(
  userId: string | null | undefined,
  enemyId: string,
  isFinalBoss = false
): BossLootResult {
  const bossSetId = getBossDropSetId(enemyId, isFinalBoss)
  if (!bossSetId) {
    return {
      success: false,
      state: getShopAccountState(userId),
      error: 'This enemy has no playable boss drop set.'
    }
  }
  return awardBossDrops(userId, bossSetId)
}

/**
 * Atomically consume a recipe's boss materials and gear ingredients, then add its result.
 */
export function craftBossRecipe(
  userId: string | null | undefined,
  recipeId: string
): BossLootResult {
  const current = getShopAccountState(userId)
  const recipe = ALL_CRAFTING_RECIPES.find((entry) => entry.id === recipeId)
  if (!recipe) {
    return { success: false, state: current, error: 'Crafting recipe not found.' }
  }
  const item = getShopItemById(recipe.itemId)
  if (!item || !CRAFTED_GEAR_BY_ID.has(item.id)) {
    return { success: false, state: current, error: 'Crafting result is unavailable.' }
  }

  const missing = recipe.materials.find(
    ({ materialId, quantity }) => (current.bossMaterials[materialId] || 0) < quantity
  )
  if (missing) {
    const materialName =
      PLAYABLE_BOSS_DROP_SETS.flatMap((boss) => boss.materials).find(
        (material) => material.id === missing.materialId
      )?.name || 'required material'
    return {
      success: false,
      state: current,
      item,
      error: `Not enough ${materialName}.`
    }
  }

  const missingGear = recipe.gearIngredients?.find(
    ({ itemId, quantity }) => getTotalStackCount(current, itemId) < quantity
  )
  if (missingGear) {
    const gearName = getShopItemById(missingGear.itemId)?.name || 'required gear'
    return {
      success: false,
      state: current,
      item,
      error: `Not enough ${gearName}.`
    }
  }

  const bossMaterials = { ...current.bossMaterials }
  for (const { materialId, quantity } of recipe.materials) {
    const remaining = bossMaterials[materialId] - quantity
    if (remaining > 0) bossMaterials[materialId] = remaining
    else delete bossMaterials[materialId]
  }
  let gearStacks = { ...current.gearStacks }
  for (const ingredient of recipe.gearIngredients || []) {
    gearStacks = consumeItemStackFromRecord(
      gearStacks,
      ingredient.itemId,
      ingredient.quantity
    )
  }
  gearStacks = addItemStackToRecord(gearStacks, item.id, 0, 1)
  const next = normalizeAccountState(
    {
      ...current,
      bossMaterials,
      gearStacks,
      ownedIds: deriveOwnedIdsFromStacks(gearStacks),
      updatedAt: new Date().toISOString()
    },
    current.userId
  )
  writeShopState(next)
  return { success: true, state: next, materials: recipe.materials.map((entry) => entry.materialId), item }
}

/**
 * Credit battle coins earned in combat directly to the operative's Shop balance.
 */
export function creditShopCoins(userId: string | null | undefined, amount: number): ShopAccountState {
  const safeAmount = Math.max(0, Math.floor(amount))
  const current = getShopAccountState(userId)
  if (safeAmount <= 0) return current

  const next: ShopAccountState = {
    ...current,
    balance: current.balance + safeAmount,
    totalEarned: current.totalEarned + safeAmount,
    updatedAt: new Date().toISOString()
  }
  writeShopState(next)
  return next
}

/**
 * Atomically deduct Battle Coins from an operative's wallet if balance is sufficient.
 */
export function spendShopCoins(
  userId: string | null | undefined,
  amount: number
): {
  success: boolean
  state: ShopAccountState
  spent: number
  error?: string
} {
  const safeAmount = Math.max(0, Math.floor(amount))
  const current = getShopAccountState(userId)
  if (safeAmount <= 0) {
    return { success: true, state: current, spent: 0 }
  }
  if (current.balance < safeAmount) {
    const needed = safeAmount - current.balance
    return {
      success: false,
      state: current,
      spent: 0,
      error: `Need ${needed.toLocaleString()} more Battle Coins.`
    }
  }

  const next: ShopAccountState = {
    ...current,
    balance: current.balance - safeAmount,
    totalSpent: current.totalSpent + safeAmount,
    updatedAt: new Date().toISOString()
  }
  writeShopState(next)
  return {
    success: true,
    state: next,
    spent: safeAmount
  }
}

export interface ShopActionResult {
  success: boolean
  state: ShopAccountState
  error?: string
  item?: ShopCatalogItem
  stars?: number
  newCount?: number
  refundCoins?: number
  pricePaid?: number
  discountPercent?: number
}

export interface CrateOpenResult {
  success: boolean
  state: ShopAccountState
  crate?: SupplyCrateTier
  item?: ShopCatalogItem
  rarity?: GearRarity
  stars?: number
  newCount?: number
  totalOwnedCount?: number
  isNewUnlock?: boolean
  isBadGear?: boolean
  isDuplicate?: boolean
  refundCoins?: number
  error?: string
}

export interface GearFusionResult {
  success: boolean
  state: ShopAccountState
  item?: ShopCatalogItem
  fromStars?: number
  toStars?: number
  remainingSourceCount?: number
  targetCount?: number
  error?: string
}

export const SHOP_ROTATION_INTERVAL_MS = 10 * 60 * 1000 // 10 minutes
export const SHOP_ROTATION_WEAPON_SLOTS = 3
export const SHOP_ROTATION_ACCESSORY_SLOTS = 3
const ROTATION_DISCOUNT_CHOICES = [15, 20, 25, 30, 35] as const

export interface ShopRotationEntry {
  slotIndex: number
  item: ShopCatalogItem
  originalPrice: number
  salePrice: number
  discountPercent: number
}

export interface ShopRotationSnapshot {
  windowIndex: number
  startsAtMs: number
  endsAtMs: number
  remainingMs: number
  entries: ShopRotationEntry[]
}

function createRotationPrng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function getRotationWeightForRarity(rarity: GearRarity): number {
  switch (rarity) {
    case 'common':
      return 4
    case 'uncommon':
      return 7
    case 'rare':
      return 8
    case 'epic':
      return 5
    case 'legendary':
      return 2.5
    case 'mythic':
      return 0.75
    default:
      return 0
  }
}

function pickWeightedUniqueRotationItems<T extends ShopCatalogItem>(
  pool: ReadonlyArray<T>,
  count: number,
  rng: () => number
): T[] {
  const candidates = pool.filter((item) => !isBadGearRarity(item.rarity))
  const chosen: T[] = []
  const remaining = [...candidates]

  while (chosen.length < count && remaining.length > 0) {
    const totalWeight = remaining.reduce(
      (sum, item) => sum + Math.max(0.1, getRotationWeightForRarity(item.rarity)),
      0
    )
    let cursor = rng() * totalWeight
    let pickedIdx = remaining.length - 1
    for (let i = 0; i < remaining.length; i++) {
      cursor -= Math.max(0.1, getRotationWeightForRarity(remaining[i].rarity))
      if (cursor <= 0) {
        pickedIdx = i
        break
      }
    }
    chosen.push(remaining[pickedIdx])
    remaining.splice(pickedIdx, 1)
  }

  return chosen
}

export function getShopRotation(nowMs: number = Date.now()): ShopRotationSnapshot {
  const safeNow = Number.isFinite(nowMs) ? Math.max(0, nowMs) : Date.now()
  const windowIndex = Math.floor(safeNow / SHOP_ROTATION_INTERVAL_MS)
  const startsAtMs = windowIndex * SHOP_ROTATION_INTERVAL_MS
  const endsAtMs = startsAtMs + SHOP_ROTATION_INTERVAL_MS
  const remainingMs = Math.max(0, endsAtMs - safeNow)

  const rng = createRotationPrng(windowIndex * 2654435761 + 1013904223)
  const weapons = pickWeightedUniqueRotationItems(
    SHOP_WEAPONS,
    SHOP_ROTATION_WEAPON_SLOTS,
    rng
  )
  const accessories = pickWeightedUniqueRotationItems(
    SHOP_ACCESSORIES,
    SHOP_ROTATION_ACCESSORY_SLOTS,
    rng
  )

  const combined: ShopCatalogItem[] = []
  const maxLen = Math.max(weapons.length, accessories.length)
  for (let i = 0; i < maxLen; i++) {
    if (weapons[i]) combined.push(weapons[i])
    if (accessories[i]) combined.push(accessories[i])
  }

  const entries: ShopRotationEntry[] = combined.map((item, idx) => {
    const discountIndex = Math.floor(rng() * ROTATION_DISCOUNT_CHOICES.length)
    const discountPercent = ROTATION_DISCOUNT_CHOICES[discountIndex] ?? 20
    const originalPrice = Math.max(25, item.price)
    const rawSale = originalPrice * (1 - discountPercent / 100)
    const salePrice = Math.max(25, Math.round(rawSale / 5) * 5)
    return {
      slotIndex: idx,
      item,
      originalPrice,
      salePrice,
      discountPercent
    }
  })

  return {
    windowIndex,
    startsAtMs,
    endsAtMs,
    remainingMs,
    entries
  }
}

export function getShopRotationEntry(
  itemId: string,
  nowMs: number = Date.now()
): ShopRotationEntry | undefined {
  return getShopRotation(nowMs).entries.find((entry) => entry.item.id === itemId)
}

export function formatRotationCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

/**
 * Purchase an item currently featured in the active 10-minute Rotating Shop (Weapons & Accessories).
 * Adds +1 stack at 0★ using Battle Coins at its active discounted sale price.
 */
export function purchaseShopItem(
  userId: string | null | undefined,
  itemId: string,
  nowMs: number = Date.now()
): ShopActionResult {
  const current = getShopAccountState(userId)
  const item = getShopItemById(itemId)
  if (!item) {
    return { success: false, state: current, error: 'Shop item not found.' }
  }

  const rotationEntry = getShopRotationEntry(itemId, nowMs)
  if (!rotationEntry) {
    return {
      success: false,
      state: current,
      error: `${item.name} is not currently on sale in the 10-minute Shop Rotation. Wait for the next rotation or open Supply Crates.`,
      item
    }
  }

  const price = rotationEntry.salePrice
  if (current.balance < price) {
    const needed = price - current.balance
    return {
      success: false,
      state: current,
      error: `Need ${needed.toLocaleString()} more Battle Coins to buy ${item.name} on sale.`,
      item
    }
  }

  const nextStacks = addItemStackToRecord(current.gearStacks, item.id, 0, 1)
  const next: ShopAccountState = normalizeAccountState(
    {
      ...current,
      balance: current.balance - price,
      totalSpent: current.totalSpent + price,
      gearStacks: nextStacks,
      ownedIds: deriveOwnedIdsFromStacks(nextStacks),
      updatedAt: new Date().toISOString()
    },
    current.userId
  )
  writeShopState(next)
  return {
    success: true,
    state: next,
    item,
    stars: 0,
    newCount: getStackCount(next, item.id, 0),
    pricePaid: price,
    discountPercent: rotationEntry.discountPercent
  }
}

export function pickRarityFromCrate(
  crate: SupplyCrateTier,
  roll: number = Math.random()
): GearRarity {
  const entries = (Object.entries(crate.rarityWeights) as Array<[GearRarity, number]>).filter(
    ([, weight]) => typeof weight === 'number' && weight > 0
  )
  const totalWeight = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (entries.length === 0 || totalWeight <= 0) return 'common'

  let cursor = Math.max(0, Math.min(0.999999, roll)) * totalWeight
  for (const [rarity, weight] of entries) {
    cursor -= weight
    if (cursor <= 0) return rarity
  }
  return entries[entries.length - 1][0]
}

/**
 * Open a Supply Crate for a random chance at Scrap/Faulty gear vs Rare/Epic/Legendary gear.
 * All dropped items start at 0★ and stack in the Armory Inventory for Fusion!
 */
export function openSupplyCrate(
  userId: string | null | undefined,
  crateId: string,
  rng: () => number = Math.random
): CrateOpenResult {
  const current = getShopAccountState(userId)
  const crate = getSupplyCrateById(crateId)
  if (!crate) {
    return { success: false, state: current, error: 'Supply crate not found.' }
  }
  if (current.balance < crate.price) {
    const needed = crate.price - current.balance
    return {
      success: false,
      state: current,
      crate,
      error: `Need ${needed} more Battle Coins to open ${crate.name}.`
    }
  }

  const rolledRarity = pickRarityFromCrate(crate, rng())
  const matchingPool = SHOP_CATALOG.filter((item) => item.rarity === rolledRarity)
  const pool = matchingPool.length > 0 ? matchingPool : SHOP_CATALOG
  const pickIndex = Math.min(pool.length - 1, Math.floor(Math.max(0, Math.min(0.999999, rng())) * pool.length))
  const droppedItem = pool[pickIndex]

  const hadBefore = getTotalStackCount(current, droppedItem.id) > 0
  const nextStacks = addItemStackToRecord(current.gearStacks, droppedItem.id, 0, 1)

  const next: ShopAccountState = normalizeAccountState(
    {
      ...current,
      balance: current.balance - crate.price,
      totalSpent: current.totalSpent + crate.price,
      cratesOpened: (current.cratesOpened || 0) + 1,
      gearStacks: nextStacks,
      ownedIds: deriveOwnedIdsFromStacks(nextStacks),
      updatedAt: new Date().toISOString()
    },
    current.userId
  )
  writeShopState(next)

  return {
    success: true,
    state: next,
    crate,
    item: droppedItem,
    rarity: droppedItem.rarity,
    stars: 0,
    newCount: getStackCount(next, droppedItem.id, 0),
    totalOwnedCount: getTotalStackCount(next, droppedItem.id),
    isNewUnlock: !hadBefore,
    isBadGear: isBadGearRarity(droppedItem.rarity),
    isDuplicate: hadBefore,
    refundCoins: 0
  }
}

export interface CrateDropEntry {
  item: ShopCatalogItem
  rarity: GearRarity
  stars: number
  isNewUnlock: boolean
  isBadGear: boolean
  isDuplicate: boolean
  newCount: number
  totalOwnedCount: number
}

export interface BatchCrateOpenResult {
  success: boolean
  state: ShopAccountState
  crate?: SupplyCrateTier
  countRequested: number
  drops: CrateDropEntry[]
  highestRarity?: GearRarity
  hasMythic: boolean
  hasLegendary: boolean
  totalCost: number
  error?: string
}

/**
 * Open multiple Supply Crates (e.g., 10 at once) in a single atomic transaction.
 */
export function openMultipleSupplyCrates(
  userId: string | null | undefined,
  crateId: string,
  count: number = 10,
  rng: () => number = Math.random
): BatchCrateOpenResult {
  const safeCount = Math.max(1, Math.min(10, Math.floor(count)))
  const current = getShopAccountState(userId)
  const crate = getSupplyCrateById(crateId)
  if (!crate) {
    return {
      success: false,
      state: current,
      countRequested: safeCount,
      drops: [],
      hasMythic: false,
      hasLegendary: false,
      totalCost: 0,
      error: 'Supply crate not found.'
    }
  }

  const totalCost = crate.price * safeCount
  if (current.balance < totalCost) {
    const needed = totalCost - current.balance
    return {
      success: false,
      state: current,
      crate,
      countRequested: safeCount,
      drops: [],
      hasMythic: false,
      hasLegendary: false,
      totalCost,
      error: `Need ${needed.toLocaleString()} more Battle Coins to open ${safeCount}× ${crate.name}.`
    }
  }

  let runningStacks = { ...current.gearStacks }
  const rawDrops: Array<{
    item: ShopCatalogItem
    rarity: GearRarity
    isNewUnlock: boolean
    isBadGear: boolean
    isDuplicate: boolean
  }> = []

  let highestRarity: GearRarity = 'scrap'
  let highestOrder = -1

  for (let i = 0; i < safeCount; i++) {
    const rolledRarity = pickRarityFromCrate(crate, rng())
    const matchingPool = SHOP_CATALOG.filter((item) => item.rarity === rolledRarity)
    const pool = matchingPool.length > 0 ? matchingPool : SHOP_CATALOG
    const pickIndex = Math.min(
      pool.length - 1,
      Math.floor(Math.max(0, Math.min(0.999999, rng())) * pool.length)
    )
    const droppedItem = pool[pickIndex]

    const prevCountForItem = (runningStacks[droppedItem.id] || []).reduce(
      (sum, n) => sum + (n > 0 ? n : 0),
      0
    )
    const hadBefore = prevCountForItem > 0
    runningStacks = addItemStackToRecord(runningStacks, droppedItem.id, 0, 1)

    if (RARITY_META[droppedItem.rarity].order > highestOrder) {
      highestOrder = RARITY_META[droppedItem.rarity].order
      highestRarity = droppedItem.rarity
    }

    rawDrops.push({
      item: droppedItem,
      rarity: droppedItem.rarity,
      isNewUnlock: !hadBefore,
      isBadGear: isBadGearRarity(droppedItem.rarity),
      isDuplicate: hadBefore
    })
  }

  const next: ShopAccountState = normalizeAccountState(
    {
      ...current,
      balance: current.balance - totalCost,
      totalSpent: current.totalSpent + totalCost,
      cratesOpened: (current.cratesOpened || 0) + safeCount,
      gearStacks: runningStacks,
      ownedIds: deriveOwnedIdsFromStacks(runningStacks),
      updatedAt: new Date().toISOString()
    },
    current.userId
  )
  writeShopState(next)

  const drops: CrateDropEntry[] = rawDrops.map((entry) => ({
    ...entry,
    stars: 0,
    newCount: getStackCount(next, entry.item.id, 0),
    totalOwnedCount: getTotalStackCount(next, entry.item.id)
  }))

  return {
    success: true,
    state: next,
    crate,
    countRequested: safeCount,
    drops,
    highestRarity,
    hasMythic: drops.some((d) => d.rarity === 'mythic'),
    hasLegendary: drops.some((d) => d.rarity === 'legendary'),
    totalCost
  }
}

/**
 * Fuse 2 copies of the same gear at `sourceStars` (0..4) into 1 copy at `sourceStars + 1` (1..5).
 */
export function fuseGearStacks(
  userId: string | null | undefined,
  itemId: string,
  sourceStars: number
): GearFusionResult {
  const current = getShopAccountState(userId)
  const item = getShopItemById(itemId)
  if (!item) {
    return { success: false, state: current, error: 'Gear item not found.' }
  }

  const fromStars = clampGearStars(sourceStars)
  if (fromStars >= MAX_GEAR_STARS) {
    return {
      success: false,
      state: current,
      item,
      error: `${item.name} is already at maximum ${MAX_GEAR_STARS}★.`
    }
  }

  const available = getStackCount(current, item.id, fromStars)
  if (available < FUSION_COPIES_REQUIRED) {
    return {
      success: false,
      state: current,
      item,
      error: `Need ${FUSION_COPIES_REQUIRED} copies of ${item.name} (${fromStars}★) to fuse (have ${available}).`
    }
  }

  const toStars = fromStars + 1
  const prevArr = normalizeStarArray(current.gearStacks[item.id])
  const nextArr = [...prevArr]
  nextArr[fromStars] = prevArr[fromStars] - FUSION_COPIES_REQUIRED
  nextArr[toStars] = prevArr[toStars] + 1

  const nextStacks = {
    ...current.gearStacks,
    [item.id]: nextArr
  }

  let nextEquippedWeaponStars = current.equippedWeaponStars
  if (current.equippedWeaponId === item.id) {
    if (toStars > current.equippedWeaponStars || (nextArr[current.equippedWeaponStars] ?? 0) <= 0) {
      nextEquippedWeaponStars = toStars
    }
  }

  const nextEquippedAccStars = { ...current.equippedAccessoryStars }
  if (current.equippedAccessoryIds.includes(item.id)) {
    const curAccStar = current.equippedAccessoryStars[item.id] ?? 0
    if (toStars > curAccStar || (nextArr[curAccStar] ?? 0) <= 0) {
      nextEquippedAccStars[item.id] = toStars
    }
  }

  const next: ShopAccountState = normalizeAccountState(
    {
      ...current,
      gearStacks: nextStacks,
      ownedIds: deriveOwnedIdsFromStacks(nextStacks),
      equippedWeaponStars: nextEquippedWeaponStars,
      equippedAccessoryStars: nextEquippedAccStars,
      updatedAt: new Date().toISOString()
    },
    current.userId
  )
  writeShopState(next)

  return {
    success: true,
    state: next,
    item,
    fromStars,
    toStars,
    remainingSourceCount: nextArr[fromStars],
    targetCount: nextArr[toStars]
  }
}

/**
 * Salvage 1 copy of an owned item stack (defaults to lowest star stack if stars omitted) for Battle Coins.
 */
export function salvageShopItem(
  userId: string | null | undefined,
  itemId: string,
  stars?: number
): ShopActionResult {
  const current = getShopAccountState(userId)
  const item = getShopItemById(itemId)
  if (!item) {
    return { success: false, state: current, error: 'Item not found.' }
  }

  const arr = normalizeStarArray(current.gearStacks[item.id])
  let targetStars = stars !== undefined ? clampGearStars(stars) : -1
  if (targetStars >= 0) {
    if ((arr[targetStars] ?? 0) <= 0) {
      return {
        success: false,
        state: current,
        error: `No ${targetStars}★ copies of ${item.name} left to salvage.`,
        item
      }
    }
  } else {
    for (let s = 0; s <= MAX_GEAR_STARS; s++) {
      if (arr[s] > 0) {
        targetStars = s
        break
      }
    }
    if (targetStars < 0) {
      return { success: false, state: current, error: `You do not own ${item.name}.`, item }
    }
  }

  const nextArr = [...arr]
  nextArr[targetStars] = Math.max(0, nextArr[targetStars] - 1)
  const nextStacks = { ...current.gearStacks }
  if (nextArr.some((n) => n > 0)) {
    nextStacks[item.id] = nextArr
  } else {
    delete nextStacks[item.id]
  }

  const refundCoins = getItemSalvageValue(item, targetStars)
  const next: ShopAccountState = normalizeAccountState(
    {
      ...current,
      balance: current.balance + refundCoins,
      gearStacks: nextStacks,
      ownedIds: deriveOwnedIdsFromStacks(nextStacks),
      updatedAt: new Date().toISOString()
    },
    current.userId
  )
  writeShopState(next)
  return {
    success: true,
    state: next,
    item,
    stars: targetStars,
    newCount: nextArr[targetStars] ?? 0,
    refundCoins
  }
}

/**
 * Equip or unequip an owned Weapon in the Armory (defaults to highest star copy owned).
 */
export function equipShopWeapon(
  userId: string | null | undefined,
  weaponId: string | null,
  stars?: number
): ShopActionResult {
  const current = getShopAccountState(userId)
  if (weaponId === null) {
    const next: ShopAccountState = {
      ...current,
      equippedWeaponId: null,
      equippedWeaponStars: 0,
      updatedAt: new Date().toISOString()
    }
    writeShopState(next)
    return { success: true, state: next }
  }

  const weapon = getShopWeaponById(weaponId)
  if (!weapon) {
    return { success: false, state: current, error: 'Weapon not found.' }
  }

  const highest = getHighestOwnedStar(current, weapon.id)
  if (highest === null) {
    return {
      success: false,
      state: current,
      error: `Unlock ${weapon.name} in Supply Crates before equipping.`,
      item: weapon
    }
  }

  const chosenStars =
    stars !== undefined && getStackCount(current, weapon.id, clampGearStars(stars)) > 0
      ? clampGearStars(stars)
      : highest

  const next: ShopAccountState = {
    ...current,
    equippedWeaponId: weapon.id,
    equippedWeaponStars: chosenStars,
    updatedAt: new Date().toISOString()
  }
  writeShopState(next)
  return { success: true, state: next, item: weapon, stars: chosenStars }
}

/**
 * Toggle equipping/unequipping an owned Accessory in the Armory (up to 3 slots).
 */
export function toggleEquipAccessory(
  userId: string | null | undefined,
  accessoryId: string,
  stars?: number
): ShopActionResult {
  const current = getShopAccountState(userId)
  const accessory = getShopAccessoryById(accessoryId)
  if (!accessory) {
    return { success: false, state: current, error: 'Accessory not found.' }
  }

  const highest = getHighestOwnedStar(current, accessory.id)
  if (highest === null) {
    return {
      success: false,
      state: current,
      error: `Unlock ${accessory.name} in the Shop or Crates before equipping.`,
      item: accessory
    }
  }

  const chosenStars =
    stars !== undefined && getStackCount(current, accessory.id, clampGearStars(stars)) > 0
      ? clampGearStars(stars)
      : highest

  const alreadyEquipped = current.equippedAccessoryIds.includes(accessory.id)
  const currentlyEquippedStars = current.equippedAccessoryStars?.[accessory.id] ?? 0

  // If already equipped at a DIFFERENT star rating and user clicked Equip on a specific star stack, switch star rating cleanly
  if (alreadyEquipped && stars !== undefined && currentlyEquippedStars !== chosenStars) {
    const next: ShopAccountState = {
      ...current,
      equippedAccessoryStars: {
        ...current.equippedAccessoryStars,
        [accessory.id]: chosenStars
      },
      updatedAt: new Date().toISOString()
    }
    writeShopState(next)
    return { success: true, state: next, item: accessory, stars: chosenStars }
  }

  if (alreadyEquipped) {
    const nextAccStars = { ...current.equippedAccessoryStars }
    delete nextAccStars[accessory.id]
    const next: ShopAccountState = {
      ...current,
      equippedAccessoryIds: current.equippedAccessoryIds.filter((id) => id !== accessory.id),
      equippedAccessoryStars: nextAccStars,
      updatedAt: new Date().toISOString()
    }
    writeShopState(next)
    return { success: true, state: next, item: accessory, stars: currentlyEquippedStars }
  }

  if (current.equippedAccessoryIds.length >= MAX_EQUIPPED_ACCESSORIES) {
    return {
      success: false,
      state: current,
      error: `All ${MAX_EQUIPPED_ACCESSORIES} accessory slots are full. Unequip one first.`,
      item: accessory
    }
  }

  const next: ShopAccountState = {
    ...current,
    equippedAccessoryIds: [...current.equippedAccessoryIds, accessory.id],
    equippedAccessoryStars: {
      ...current.equippedAccessoryStars,
      [accessory.id]: chosenStars
    },
    updatedAt: new Date().toISOString()
  }
  writeShopState(next)
  return { success: true, state: next, item: accessory, stars: chosenStars }
}

export function subscribeShopState(listener: () => void): () => void {
  shopListeners.add(listener)
  return () => {
    shopListeners.delete(listener)
  }
}

export function useShopState(userId?: string | null) {
  const effectiveUserId = userId || 'guest_user'
  const [state, setState] = useState<ShopAccountState>(() => getShopAccountState(effectiveUserId))
  const [rotationNowMs, setRotationNowMs] = useState<number>(() => Date.now())

  useEffect(() => {
    setState(getShopAccountState(effectiveUserId))
    const unsubscribe = subscribeShopState(() => {
      setState(getShopAccountState(effectiveUserId))
    })
    return unsubscribe
  }, [effectiveUserId])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setRotationNowMs(Date.now())
    }, 1000)
    return () => clearInterval(intervalId)
  }, [])

  const rotation = getShopRotation(rotationNowMs)

  return {
    shopState: state,
    rotation,
    inventoryStacks: getInventoryStacks(state),
    bonuses: computeEquippedAccessoryBonuses(state.equippedAccessoryIds, state.equippedAccessoryStars),
    equippedWeapon: state.equippedWeaponId ? getShopWeaponById(state.equippedWeaponId) || null : null,
    equippedWeaponStars: state.equippedWeaponStars || 0,
    equippedAccessories: state.equippedAccessoryIds
      .map((id) => getShopAccessoryById(id))
      .filter((a): a is ShopAccessoryItem => Boolean(a)),
    buyItem: (itemId: string) => purchaseShopItem(effectiveUserId, itemId),
    openCrate: (crateId: string) => openSupplyCrate(effectiveUserId, crateId),
    openCrates: (crateId: string, count: number) =>
      openMultipleSupplyCrates(effectiveUserId, crateId, count),
    salvageItem: (itemId: string, stars?: number) => salvageShopItem(effectiveUserId, itemId, stars),
    fuseItem: (itemId: string, sourceStars: number) => fuseGearStacks(effectiveUserId, itemId, sourceStars),
    setEquippedWeapon: (weaponId: string | null, stars?: number) =>
      equipShopWeapon(effectiveUserId, weaponId, stars),
    toggleAccessory: (accessoryId: string, stars?: number) =>
      toggleEquipAccessory(effectiveUserId, accessoryId, stars)
  }
}
