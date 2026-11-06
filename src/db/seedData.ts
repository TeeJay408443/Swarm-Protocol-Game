// Seed Data for Swarm Protocol: Survivor
// 29 Entities: 6 Heroes + 4 Enemies + 15 Upgrades + 4 Achievements

import type { UpgradesRow, EnemiesRow, AchievementsRow, HeroesRow } from '../types/database'

// ============================================
// UPGRADES (15 Entries) - Must be seeded first
// ============================================
export const upgrades: UpgradesRow[] = [
  {
    id: 'upg_01',
    name: 'Companion Robot',
    category: 'Summon',
    function_desc: 'Autonomous drone following player & firing',
    damage: 15,
    cooldown_s: 0.8,
    special: null,
  },
  {
    id: 'upg_02',
    name: 'Rocket Barrage',
    category: 'AoE Weapon',
    function_desc: 'Fires explosive rockets into dense crowds',
    damage: 45,
    cooldown_s: 2.5,
    special: null,
  },
  {
    id: 'upg_03',
    name: 'Orbital Laser',
    category: 'Beam Weapon',
    function_desc: 'Sweeps continuous energy beam around player',
    damage: 30,
    cooldown_s: 4.0,
    special: null,
  },
  {
    id: 'upg_04',
    name: 'Magnet Pulse',
    category: 'Utility',
    function_desc: 'Pulls all map coins directly to player',
    damage: 0,
    cooldown_s: 10.0,
    special: null,
  },
  {
    id: 'upg_05',
    name: 'Bouncing Sawblade',
    category: 'Projectile',
    function_desc: 'Heavy sawblade bouncing off canvas edges',
    damage: 25,
    cooldown_s: 3.0,
    special: '5 bounces',
  },
  {
    id: 'upg_06',
    name: 'Chain Tesla',
    category: 'Ranged',
    function_desc: 'Arcs electric lightning across up to 5 foes',
    damage: 20,
    cooldown_s: 1.5,
    special: null,
  },
  {
    id: 'upg_07',
    name: 'Orbital Strike Beacon',
    category: 'Heavy AoE',
    function_desc: 'Drops massive satellite blast on target area',
    damage: 100,
    cooldown_s: 6.0,
    special: null,
  },
  {
    id: 'upg_08',
    name: 'Cryo-Aura Field',
    category: 'Passive',
    function_desc: 'Emits freezing cold aura slowing foes by 40%',
    damage: 0,
    cooldown_s: 0,
    special: '160px radius',
  },
  {
    id: 'upg_09',
    name: 'Emergency Nanites',
    category: 'Passive',
    function_desc: 'Regenerates 1% max player HP continuously',
    damage: 0,
    cooldown_s: 5.0,
    special: '+1% HP / 5.0s',
  },
  {
    id: 'upg_10',
    name: 'Flamethrower Pulse',
    category: 'Cone Weapon',
    function_desc: 'Spray cone of fire dealing damage over time',
    damage: 12,
    cooldown_s: 0,
    special: '120px cone',
  },
  {
    id: 'upg_11',
    name: 'Plasma Shield Matrix',
    category: 'Defensive',
    function_desc: 'Blocks incoming hit and fires shockwave',
    damage: 0,
    cooldown_s: 12.0,
    special: '1 shield',
  },
  {
    id: 'upg_12',
    name: 'Arc Slash',
    category: 'Melee Weapon',
    function_desc: 'Sweeping melee arc damaging all foes in front',
    damage: 35,
    cooldown_s: 0.9,
    special: '90px arc',
  },
  {
    id: 'upg_13',
    name: 'Dual Kinetic Pistols',
    category: 'Projectile',
    function_desc: 'Twin pistols auto-firing at nearest targets',
    damage: 10,
    cooldown_s: 0.4,
    special: 'per pistol',
  },
  {
    id: 'upg_14',
    name: 'Temporal Echo',
    category: 'Summon',
    function_desc: 'Spawns a phase shadow that mimics player attacks',
    damage: 18,
    cooldown_s: 2.0,
    special: null,
  },
  {
    id: 'upg_15',
    name: 'Plasma Barrier',
    category: 'Defensive',
    function_desc: 'Absorbs one hit and knocks back nearby foes',
    damage: 0,
    cooldown_s: 8.0,
    special: '1 charge',
  },
]

// ============================================
// ENEMIES (4 Entries)
// ============================================
export const enemies: EnemiesRow[] = [
  {
    id: 'ene_01',
    name: 'Spore Zombie',
    category: 'Swarm',
    hp: 40,
    speed: 0.50,
    coin_value: 1,
    description: 'Bioluminescent infected corpse swarming in dense waves.',
  },
  {
    id: 'ene_02',
    name: 'Acidic Chitin Bug',
    category: 'Fast Flanker',
    hp: 15,
    speed: 1.10,
    coin_value: 2,
    description: 'Mutated chitin insect that moves in quick zig-zag bursts.',
  },
  {
    id: 'ene_03',
    name: 'Aegis Tech Drone',
    category: 'Ranged Sniper',
    hp: 65,
    speed: 0.75,
    coin_value: 5,
    description: 'Hovering rogue drone that fires red laser bolts at the player.',
  },
  {
    id: 'ene_04',
    name: 'Aegis Commander Drone',
    category: 'Mini-Boss',
    hp: 240,
    speed: 0.60,
    coin_value: 50,
    description: 'Armored command unit spawning every 5th wave; alternates radial bullet bursts with aimed laser volleys. 6x Spore Zombie HP and a 5x coin drop multiplier.',
  },
]

// ============================================
// ACHIEVEMENTS (4 Entries)
// ============================================
export const achievements: AchievementsRow[] = [
  {
    id: 'ach_01',
    title: 'First Contact',
    requirement: 'Defeat 100 total swarm enemies',
    reward_badge: 'Bronze Bug Hunter',
  },
  {
    id: 'ach_02',
    title: 'Gold Hoarder',
    requirement: 'Gather 500 coins in a single run',
    reward_badge: 'Coin Master',
  },
  {
    id: 'ach_03',
    title: 'Swarmslayer',
    requirement: 'Defeat 1,000 total enemies across all runs',
    reward_badge: 'Silver Vanquisher',
  },
  {
    id: 'ach_04',
    title: 'Untouchable',
    requirement: 'Survive 3 consecutive waves without taking damage',
    reward_badge: 'Gold Aegis',
  },
]

// ============================================
// HEROES (6 Entries) - Must be seeded after upgrades
// ============================================
export const heroes: HeroesRow[] = [
  {
    id: 'hero_01',
    name: 'Vanguard Blade',
    archetype: 'Melee Tank',
    hp: 150,
    speed: 1.0,
    starting_upgrade_id: 'upg_12',
    lore: 'Heavy frontline unit built for close-range crowd clearing.',
  },
  {
    id: 'hero_02',
    name: 'Outpost Ranger',
    archetype: 'Marksman',
    hp: 90,
    speed: 1.3,
    starting_upgrade_id: 'upg_13',
    lore: 'High-speed scout designed for long-range kiting tactics.',
  },
  {
    id: 'hero_03',
    name: 'Tech Engineer',
    archetype: 'Specialist',
    hp: 110,
    speed: 1.0,
    starting_upgrade_id: 'upg_01',
    lore: 'Drone operator who lets autonomous units handle the swarm.',
  },
  {
    id: 'hero_04',
    name: 'Chrono Operative',
    archetype: 'Speedster',
    hp: 85,
    speed: 1.4,
    starting_upgrade_id: 'upg_14',
    lore: 'Time-warping agent who leaves damaging phase shadows.',
  },
  {
    id: 'hero_05',
    name: 'Shield Paladin',
    archetype: 'Defender',
    hp: 175,
    speed: 0.85,
    starting_upgrade_id: 'upg_15',
    lore: 'Heavily armored fortress who knocks back enemies on collision.',
  },
  {
    id: 'hero_06',
    name: 'Pyrotechnic Specialist',
    archetype: 'Area Control',
    hp: 100,
    speed: 1.1,
    starting_upgrade_id: 'upg_10',
    lore: 'Combat engineer who incinerates chokepoints and entrenched swarm nests.',
  },
]
