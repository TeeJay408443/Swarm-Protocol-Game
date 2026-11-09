/**
 * Enhanced Seed Data for Swarm Protocol: Survivor
 * Phase 2: Game Content - Complete entity catalog with extended attributes
 * 
 * This file contains the enhanced version of seed data with:
 * - Visual properties (colors, sprites)
 * - Audio properties (sound effects)
 * - Balance metadata (rarity, unlock conditions)
 * - Gameplay attributes (targeting, behavior)
 */

import type { UpgradesRow, EnemiesRow, AchievementsRow, HeroesRow } from '../types/database'

// ============================================
// RARITY LEVELS
// ============================================

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary' | 'starter'

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#888888', // Gray
  uncommon: '#4CAF50', // Green
  rare: '#2196F3', // Blue
  legendary: '#FFD700', // Gold
  starter: '#00F0FF', // Cyan
}

// ============================================
// UNLOCK CONDITIONS
// ============================================

export type UnlockCondition = {
  type: 'default' | 'level' | 'achievement' | 'purchase' | 'wave'
  value: string | number
  description: string
}

// ============================================
// VISUAL PROPERTIES
// ============================================

export interface VisualProperties {
  color: string
  secondaryColor: string
  sprite: string
  icon: string
  size: 'small' | 'medium' | 'large' | 'xlarge'
  glow: boolean
  glowColor: string | null
}

// ============================================
// AUDIO PROPERTIES
// ============================================

export interface AudioProperties {
  attackSound: string | null
  specialSound: string | null
  spawnSound: string | null
  deathSound: string | null
}

// ============================================
// GAMEPLAY ATTRIBUTES
// ============================================

export interface GameplayAttributes {
  // Targeting
  autoTarget: boolean
  targetPriority: 'closest' | 'weakest' | 'strongest' | 'random'
  
  // Movement
  canMove: boolean
  movementPattern: 'static' | 'follow' | 'orbit' | 'zigzag' | 'chase'
  
  // Combat
  attackType: 'melee' | 'ranged' | 'aoe' | 'passive' | 'summon'
  attackRange: number
  attackSpeed: number
  
  // Effects
  appliesSlow: boolean
  appliesBurn: boolean
  appliesFreeze: boolean
  appliesKnockback: boolean
}

// ============================================
// ENHANCED UPGRADE DEFINITIONS
// ============================================

export interface EnhancedUpgrade extends UpgradesRow {
  // Extended properties
  rarity: Rarity
  unlockCondition: UnlockCondition
  visual: VisualProperties
  audio: AudioProperties
  gameplay: GameplayAttributes
  
  // Balance metadata
  tier: number
  baseCost: number
  upgradeCost: number
  maxLevel: number
  
  // Flavor
  flavorText: string
  quote: string
}

export const enhancedUpgrades: EnhancedUpgrade[] = [
  {
    id: 'upg_01',
    name: 'Companion Robot',
    category: 'Summon',
    function_desc: 'Autonomous drone following player & firing',
    damage: 15,
    cooldown_s: 0.8,
    special: null,
    
    // Enhanced properties
    rarity: 'starter',
    unlockCondition: { type: 'default', value: 'Tech Engineer', description: 'Starting upgrade for Tech Engineer' },
    visual: {
      color: '#00F0FF',
      secondaryColor: '#FFFFFF',
      sprite: 'drone',
      icon: '🤖',
      size: 'small',
      glow: true,
      glowColor: '#00F0FF',
    },
    audio: {
      attackSound: 'sfx_drone_attack',
      specialSound: null,
      spawnSound: 'sfx_drone_spawn',
      deathSound: 'sfx_drone_death',
    },
    gameplay: {
      autoTarget: true,
      targetPriority: 'closest',
      canMove: true,
      movementPattern: 'follow',
      attackType: 'ranged',
      attackRange: 300,
      attackSpeed: 1.25,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    // Balance
    tier: 1,
    baseCost: 0,
    upgradeCost: 50,
    maxLevel: 5,
    
    // Flavor
    flavorText: 'Your loyal mechanical companion',
    quote: '"Beep boop. Target acquired."',
  },
  {
    id: 'upg_02',
    name: 'Rocket Barrage',
    category: 'AoE Weapon',
    function_desc: 'Fires explosive rockets into dense crowds',
    damage: 45,
    cooldown_s: 2.5,
    special: null,
    
    rarity: 'rare',
    unlockCondition: { type: 'wave', value: 5, description: 'Unlocked after surviving Wave 5' },
    visual: {
      color: '#FF0055',
      secondaryColor: '#FF6666',
      sprite: 'rocket',
      icon: '🚀',
      size: 'medium',
      glow: true,
      glowColor: '#FF0055',
    },
    audio: {
      attackSound: 'sfx_rocket_launch',
      specialSound: 'sfx_explosion',
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: false,
      targetPriority: 'closest',
      canMove: false,
      movementPattern: 'static',
      attackType: 'aoe',
      attackRange: 200,
      attackSpeed: 0.4,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: true,
    },
    
    tier: 3,
    baseCost: 200,
    upgradeCost: 100,
    maxLevel: 3,
    
    flavorText: 'Rain destruction from above',
    quote: '"Fire in the hole!"',
  },
  {
    id: 'upg_03',
    name: 'Orbital Laser',
    category: 'Beam Weapon',
    function_desc: 'Sweeps continuous energy beam around player',
    damage: 30,
    cooldown_s: 4.0,
    special: null,
    
    rarity: 'legendary',
    unlockCondition: { type: 'wave', value: 15, description: 'Unlocked after surviving Wave 15' },
    visual: {
      color: '#00FFFF',
      secondaryColor: '#00AAFF',
      sprite: 'laser',
      icon: '🔦',
      size: 'large',
      glow: true,
      glowColor: '#00FFFF',
    },
    audio: {
      attackSound: 'sfx_laser_charge',
      specialSound: 'sfx_laser_fire',
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: true,
      targetPriority: 'closest',
      canMove: false,
      movementPattern: 'static',
      attackType: 'ranged',
      attackRange: 350,
      attackSpeed: 2.0,
      appliesSlow: false,
      appliesBurn: true,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    tier: 4,
    baseCost: 500,
    upgradeCost: 200,
    maxLevel: 2,
    
    flavorText: 'Satellite death ray',
    quote: '"Target painted. Firing orbital laser."',
  },
  {
    id: 'upg_04',
    name: 'Magnet Pulse',
    category: 'Utility',
    function_desc: 'Pulls all map coins directly to player',
    damage: 0,
    cooldown_s: 10.0,
    special: null,
    
    rarity: 'uncommon',
    unlockCondition: { type: 'level', value: 3, description: 'Unlocked at Player Level 3' },
    visual: {
      color: '#FFD700',
      secondaryColor: '#FFCC00',
      sprite: 'magnet',
      icon: '🧲',
      size: 'medium',
      glow: true,
      glowColor: '#FFD700',
    },
    audio: {
      attackSound: 'sfx_magnet_activate',
      specialSound: null,
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: false,
      targetPriority: 'random',
      canMove: false,
      movementPattern: 'static',
      attackType: 'passive',
      attackRange: 500,
      attackSpeed: 0,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    tier: 2,
    baseCost: 100,
    upgradeCost: 75,
    maxLevel: 1,
    
    flavorText: 'Attract all the loot',
    quote: '"Cha-ching!"',
  },
  {
    id: 'upg_05',
    name: 'Bouncing Sawblade',
    category: 'Projectile',
    function_desc: 'Heavy sawblade bouncing off canvas edges',
    damage: 25,
    cooldown_s: 3.0,
    special: '5 bounces',
    
    rarity: 'uncommon',
    unlockCondition: { type: 'wave', value: 3, description: 'Unlocked after surviving Wave 3' },
    visual: {
      color: '#CCCCCC',
      secondaryColor: '#999999',
      sprite: 'sawblade',
      icon: '⚔️',
      size: 'medium',
      glow: false,
      glowColor: null,
    },
    audio: {
      attackSound: 'sfx_sawblade_throw',
      specialSound: 'sfx_sawblade_bounce',
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: false,
      targetPriority: 'closest',
      canMove: true,
      movementPattern: 'zigzag',
      attackType: 'ranged',
      attackRange: 400,
      attackSpeed: 0.8,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    tier: 2,
    baseCost: 120,
    upgradeCost: 80,
    maxLevel: 4,
    
    flavorText: 'Death spins eternally',
    quote: '"Watch it come back!"',
  },
  {
    id: 'upg_06',
    name: 'Chain Tesla',
    category: 'Ranged',
    function_desc: 'Arcs electric lightning across up to 5 foes',
    damage: 20,
    cooldown_s: 1.5,
    special: null,
    
    rarity: 'rare',
    unlockCondition: { type: 'wave', value: 8, description: 'Unlocked after surviving Wave 8' },
    visual: {
      color: '#00FFFF',
      secondaryColor: '#00AAFF',
      sprite: 'tesla',
      icon: '⚡',
      size: 'medium',
      glow: true,
      glowColor: '#00FFFF',
    },
    audio: {
      attackSound: 'sfx_tesla_zap',
      specialSound: 'sfx_tesla_chain',
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: true,
      targetPriority: 'random',
      canMove: false,
      movementPattern: 'static',
      attackType: 'ranged',
      attackRange: 250,
      attackSpeed: 1.5,
      appliesSlow: true,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    tier: 3,
    baseCost: 250,
    upgradeCost: 120,
    maxLevel: 3,
    
    flavorText: 'Chain lightning devastation',
    quote: '"Feel the shock!"',
  },
  {
    id: 'upg_07',
    name: 'Orbital Strike Beacon',
    category: 'Heavy AoE',
    function_desc: 'Drops massive satellite blast on target area',
    damage: 100,
    cooldown_s: 6.0,
    special: null,
    
    rarity: 'legendary',
    unlockCondition: { type: 'wave', value: 20, description: 'Unlocked after surviving Wave 20' },
    visual: {
      color: '#FF0000',
      secondaryColor: '#FF4444',
      sprite: 'beacon',
      icon: '📍',
      size: 'large',
      glow: true,
      glowColor: '#FF0000',
    },
    audio: {
      attackSound: 'sfx_beacon_activate',
      specialSound: 'sfx_orbital_strike',
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: false,
      targetPriority: 'random',
      canMove: false,
      movementPattern: 'static',
      attackType: 'aoe',
      attackRange: 300,
      attackSpeed: 0.1,
      appliesSlow: false,
      appliesBurn: true,
      appliesFreeze: false,
      appliesKnockback: true,
    },
    
    tier: 5,
    baseCost: 1000,
    upgradeCost: 500,
    maxLevel: 1,
    
    flavorText: 'Call down the wrath of heaven',
    quote: '"Strike from orbit!"',
  },
  {
    id: 'upg_08',
    name: 'Cryo-Aura Field',
    category: 'Passive',
    function_desc: 'Emits freezing cold aura slowing foes by 40%',
    damage: 0,
    cooldown_s: 0,
    special: '160px radius',
    
    rarity: 'uncommon',
    unlockCondition: { type: 'level', value: 5, description: 'Unlocked at Player Level 5' },
    visual: {
      color: '#00FFFF',
      secondaryColor: '#00AAFF',
      sprite: 'aura',
      icon: '❄️',
      size: 'large',
      glow: true,
      glowColor: '#00FFFF',
    },
    audio: {
      attackSound: null,
      specialSound: 'sfx_freeze',
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: false,
      targetPriority: 'random',
      canMove: false,
      movementPattern: 'static',
      attackType: 'passive',
      attackRange: 160,
      attackSpeed: 0,
      appliesSlow: true,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    tier: 2,
    baseCost: 150,
    upgradeCost: 100,
    maxLevel: 2,
    
    flavorText: 'Freeze your enemies in their tracks',
    quote: '"Cold never bothered me anyway."',
  },
  {
    id: 'upg_09',
    name: 'Emergency Nanites',
    category: 'Passive',
    function_desc: 'Regenerates 1% max player HP continuously',
    damage: 0,
    cooldown_s: 5.0,
    special: '+1% HP / 5.0s',
    
    rarity: 'rare',
    unlockCondition: { type: 'wave', value: 10, description: 'Unlocked after surviving Wave 10' },
    visual: {
      color: '#00FF00',
      secondaryColor: '#00CC00',
      sprite: 'nanites',
      icon: '💚',
      size: 'small',
      glow: true,
      glowColor: '#00FF00',
    },
    audio: {
      attackSound: null,
      specialSound: 'sfx_heal',
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: false,
      targetPriority: 'random',
      canMove: false,
      movementPattern: 'static',
      attackType: 'passive',
      attackRange: 0,
      attackSpeed: 0,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    tier: 3,
    baseCost: 300,
    upgradeCost: 150,
    maxLevel: 3,
    
    flavorText: 'Self-repairing nanotechnology',
    quote: '"Healing..."',
  },
  {
    id: 'upg_10',
    name: 'Flamethrower Pulse',
    category: 'Cone Weapon',
    function_desc: 'Spray cone of fire dealing damage over time',
    damage: 12,
    cooldown_s: 0,
    special: '120px cone',
    
    rarity: 'starter',
    unlockCondition: { type: 'default', value: 'Pyrotechnic Specialist', description: 'Starting upgrade for Pyrotechnic Specialist' },
    visual: {
      color: '#FF4400',
      secondaryColor: '#FF8800',
      sprite: 'flamethrower',
      icon: '🔥',
      size: 'medium',
      glow: true,
      glowColor: '#FF4400',
    },
    audio: {
      attackSound: 'sfx_flame',
      specialSound: null,
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: false,
      targetPriority: 'random',
      canMove: false,
      movementPattern: 'static',
      attackType: 'aoe',
      attackRange: 120,
      attackSpeed: 10.0,
      appliesSlow: false,
      appliesBurn: true,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    tier: 1,
    baseCost: 0,
    upgradeCost: 50,
    maxLevel: 5,
    
    flavorText: 'Burn them all',
    quote: '"Feel the heat!"',
  },
  {
    id: 'upg_11',
    name: 'Plasma Shield Matrix',
    category: 'Defensive',
    function_desc: 'Blocks incoming hit and fires shockwave',
    damage: 0,
    cooldown_s: 12.0,
    special: '1 shield',
    
    rarity: 'rare',
    unlockCondition: { type: 'wave', value: 12, description: 'Unlocked after surviving Wave 12' },
    visual: {
      color: '#00FFFF',
      secondaryColor: '#00AAFF',
      sprite: 'shield',
      icon: '🛡️',
      size: 'large',
      glow: true,
      glowColor: '#00FFFF',
    },
    audio: {
      attackSound: null,
      specialSound: 'sfx_shield_activate',
      spawnSound: null,
      deathSound: 'sfx_shield_break',
    },
    gameplay: {
      autoTarget: false,
      targetPriority: 'random',
      canMove: false,
      movementPattern: 'static',
      attackType: 'passive',
      attackRange: 100,
      attackSpeed: 0,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: true,
    },
    
    tier: 3,
    baseCost: 350,
    upgradeCost: 175,
    maxLevel: 2,
    
    flavorText: 'Energy barrier with counterattack',
    quote: '"Shield up!"',
  },
  {
    id: 'upg_12',
    name: 'Arc Slash',
    category: 'Melee Weapon',
    function_desc: 'Sweeping melee arc damaging all foes in front',
    damage: 35,
    cooldown_s: 0.9,
    special: '90px arc',
    
    rarity: 'starter',
    unlockCondition: { type: 'default', value: 'Vanguard Blade', description: 'Starting upgrade for Vanguard Blade' },
    visual: {
      color: '#FFFFFF',
      secondaryColor: '#CCCCCC',
      sprite: 'arc_slash',
      icon: '⚔️',
      size: 'large',
      glow: false,
      glowColor: null,
    },
    audio: {
      attackSound: 'sfx_sword_swing',
      specialSound: null,
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: false,
      targetPriority: 'closest',
      canMove: false,
      movementPattern: 'static',
      attackType: 'melee',
      attackRange: 90,
      attackSpeed: 1.1,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: true,
    },
    
    tier: 1,
    baseCost: 0,
    upgradeCost: 40,
    maxLevel: 5,
    
    flavorText: 'Wide sweeping blade strike',
    quote: '"For the Protocol!"',
  },
  {
    id: 'upg_13',
    name: 'Dual Kinetic Pistols',
    category: 'Projectile',
    function_desc: 'Twin pistols auto-firing at nearest targets',
    damage: 10,
    cooldown_s: 0.4,
    special: 'per pistol',
    
    rarity: 'starter',
    unlockCondition: { type: 'default', value: 'Outpost Ranger', description: 'Starting upgrade for Outpost Ranger' },
    visual: {
      color: '#FFD700',
      secondaryColor: '#FFCC00',
      sprite: 'dual_pistols',
      icon: '🔫',
      size: 'medium',
      glow: false,
      glowColor: null,
    },
    audio: {
      attackSound: 'sfx_pistol_shot',
      specialSound: null,
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: true,
      targetPriority: 'closest',
      canMove: false,
      movementPattern: 'static',
      attackType: 'ranged',
      attackRange: 300,
      attackSpeed: 2.5,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    tier: 1,
    baseCost: 0,
    upgradeCost: 35,
    maxLevel: 5,
    
    flavorText: 'Rapid-fire kinetic weapons',
    quote: '"Double tap!"',
  },
  {
    id: 'upg_14',
    name: 'Temporal Echo',
    category: 'Summon',
    function_desc: 'Spawns a phase shadow that mimics player attacks',
    damage: 18,
    cooldown_s: 2.0,
    special: null,
    
    rarity: 'starter',
    unlockCondition: { type: 'default', value: 'Chrono Operative', description: 'Starting upgrade for Chrono Operative' },
    visual: {
      color: '#00FFFF',
      secondaryColor: '#00AAFF',
      sprite: 'echo',
      icon: '👻',
      size: 'medium',
      glow: true,
      glowColor: '#00FFFF',
    },
    audio: {
      attackSound: 'sfx_echo_attack',
      specialSound: 'sfx_time_warp',
      spawnSound: null,
      deathSound: null,
    },
    gameplay: {
      autoTarget: true,
      targetPriority: 'closest',
      canMove: true,
      movementPattern: 'follow',
      attackType: 'ranged',
      attackRange: 250,
      attackSpeed: 1.0,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    tier: 1,
    baseCost: 0,
    upgradeCost: 45,
    maxLevel: 5,
    
    flavorText: 'Time-bending duplicate',
    quote: '"Echoes of the past."',
  },
  {
    id: 'upg_15',
    name: 'Plasma Barrier',
    category: 'Defensive',
    function_desc: 'Absorbs one hit and knocks back nearby foes',
    damage: 0,
    cooldown_s: 8.0,
    special: '1 charge',
    
    rarity: 'starter',
    unlockCondition: { type: 'default', value: 'Shield Paladin', description: 'Starting upgrade for Shield Paladin' },
    visual: {
      color: '#00F0FF',
      secondaryColor: '#00AAFF',
      sprite: 'barrier',
      icon: '🛡️',
      size: 'large',
      glow: true,
      glowColor: '#00F0FF',
    },
    audio: {
      attackSound: null,
      specialSound: 'sfx_barrier_activate',
      spawnSound: null,
      deathSound: 'sfx_barrier_break',
    },
    gameplay: {
      autoTarget: false,
      targetPriority: 'random',
      canMove: false,
      movementPattern: 'static',
      attackType: 'passive',
      attackRange: 80,
      attackSpeed: 0,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: true,
    },
    
    tier: 1,
    baseCost: 0,
    upgradeCost: 55,
    maxLevel: 3,
    
    flavorText: 'Energy shield with knockback',
    quote: '"Shield engaged!"',
  },
]
// ============================================
// ENHANCED ENEMY DEFINITIONS
// ============================================

export interface EnhancedEnemy extends EnemiesRow {
  // Extended properties
  visual: VisualProperties
  audio: AudioProperties
  gameplay: GameplayAttributes
  
  // Balance metadata
  xpValue: number
  spawnWeight: number // Higher = more likely to spawn
  minWave: number // Minimum wave to appear
  
  // AI
  chaseRange: number
  attackRange: number
  
  // Flavor
  flavorText: string
  quote: string
}

export const enhancedEnemies: EnhancedEnemy[] = [
  {
    id: 'ene_01',
    name: 'Spore Zombie',
    category: 'Swarm',
    hp: 40,
    speed: 0.50,
    coin_value: 1,
    description: 'Bioluminescent infected corpse swarming in dense waves.',
    
    visual: {
      color: '#00FF88',
      secondaryColor: '#00CC66',
      sprite: 'spore_zombie',
      icon: '🧟',
      size: 'medium',
      glow: true,
      glowColor: '#00FF88',
    },
    audio: {
      attackSound: 'sfx_zombie_attack',
      specialSound: null,
      spawnSound: 'sfx_zombie_spawn',
      deathSound: 'sfx_zombie_death',
    },
    gameplay: {
      autoTarget: true,
      targetPriority: 'closest',
      canMove: true,
      movementPattern: 'chase',
      attackType: 'melee',
      attackRange: 40,
      attackSpeed: 1.0,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    xpValue: 10,
    spawnWeight: 100,
    minWave: 1,
    chaseRange: 500,
    attackRange: 40,
    
    flavorText: 'Infected by the Swarm, these creatures attack in waves',
    quote: '"Rrrrgh..."',
  },
  {
    id: 'ene_02',
    name: 'Acidic Chitin Bug',
    category: 'Fast Flanker',
    hp: 15,
    speed: 1.10,
    coin_value: 2,
    description: 'Mutated chitin insect that moves in quick zig-zag bursts.',
    
    visual: {
      color: '#FF8800',
      secondaryColor: '#CC6600',
      sprite: 'chitin_bug',
      icon: '🐜',
      size: 'small',
      glow: false,
      glowColor: null,
    },
    audio: {
      attackSound: 'sfx_bug_attack',
      specialSound: null,
      spawnSound: 'sfx_bug_spawn',
      deathSound: 'sfx_bug_death',
    },
    gameplay: {
      autoTarget: true,
      targetPriority: 'closest',
      canMove: true,
      movementPattern: 'zigzag',
      attackType: 'melee',
      attackRange: 30,
      attackSpeed: 1.5,
      appliesSlow: false,
      appliesBurn: true,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    xpValue: 15,
    spawnWeight: 70,
    minWave: 2,
    chaseRange: 400,
    attackRange: 30,
    
    flavorText: 'Fast and acidic, these bugs flank from the sides',
    quote: '"Skitter skitter..."',
  },
  {
    id: 'ene_03',
    name: 'Aegis Tech Drone',
    category: 'Ranged Sniper',
    hp: 65,
    speed: 0.75,
    coin_value: 5,
    description: 'Hovering rogue drone that fires red laser bolts at the player.',
    
    visual: {
      color: '#FF0000',
      secondaryColor: '#CC0000',
      sprite: 'tech_drone',
      icon: '🛸',
      size: 'medium',
      glow: true,
      glowColor: '#FF0000',
    },
    audio: {
      attackSound: 'sfx_laser_shot',
      specialSound: null,
      spawnSound: 'sfx_drone_spawn',
      deathSound: 'sfx_drone_death',
    },
    gameplay: {
      autoTarget: true,
      targetPriority: 'closest',
      canMove: true,
      movementPattern: 'chase',
      attackType: 'ranged',
      attackRange: 300,
      attackSpeed: 0.8,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: false,
    },
    
    xpValue: 25,
    spawnWeight: 50,
    minWave: 3,
    chaseRange: 450,
    attackRange: 300,
    
    flavorText: 'Rogue Aegis drones fire precision lasers from a distance',
    quote: '"Target acquired."',
  },
  {
    id: 'ene_04',
    name: 'Aegis Commander Drone',
    category: 'Mini-Boss',
    hp: 240,
    speed: 0.60,
    coin_value: 50,
    description: 'Armored command unit spawning every 5th wave; alternates radial bullet bursts with aimed laser volleys. 6x Spore Zombie HP and a 5x coin drop multiplier.',
    
    visual: {
      color: '#FF00FF',
      secondaryColor: '#CC00CC',
      sprite: 'commander_drone',
      icon: '👑',
      size: 'xlarge',
      glow: true,
      glowColor: '#FF00FF',
    },
    audio: {
      attackSound: 'sfx_boss_attack',
      specialSound: 'sfx_boss_special',
      spawnSound: 'sfx_boss_spawn',
      deathSound: 'sfx_boss_death',
    },
    gameplay: {
      autoTarget: true,
      targetPriority: 'random',
      canMove: true,
      movementPattern: 'orbit',
      attackType: 'ranged',
      attackRange: 400,
      attackSpeed: 0.5,
      appliesSlow: false,
      appliesBurn: false,
      appliesFreeze: false,
      appliesKnockback: true,
    },
    
    xpValue: 100,
    spawnWeight: 1, // Only spawns on boss waves
    minWave: 5,
    chaseRange: 500,
    attackRange: 400,
    
    flavorText: 'The Aegis Commander is a formidable mini-boss that appears every 5th wave',
    quote: '"All units, attack!"',
  },
]

// ============================================
// ENHANCED HERO DEFINITIONS
// ============================================

export interface EnhancedHero extends HeroesRow {
  // Extended properties
  visual: VisualProperties
  audio: AudioProperties
  
  // Balance metadata
  unlockCondition: UnlockCondition
  baseCost: number
  
  // Stats progression
  hpPerLevel: number
  speedPerLevel: number
  damagePerLevel: number
  
  // Flavor
  flavorText: string
  quote: string
  backstory: string
}

export const enhancedHeroes: EnhancedHero[] = [
  {
    id: 'hero_01',
    name: 'Vanguard Blade',
    archetype: 'Melee Tank',
    hp: 150,
    speed: 1.0,
    starting_upgrade_id: 'upg_12',
    lore: 'Heavy frontline unit built for close-range crowd clearing.',
    
    visual: {
      color: '#FFFFFF',
      secondaryColor: '#CCCCCC',
      sprite: 'vanguard',
      icon: '⚔️',
      size: 'large',
      glow: false,
      glowColor: null,
    },
    audio: {
      attackSound: 'sfx_sword_swing',
      specialSound: 'sfx_sword_clash',
      spawnSound: null,
      deathSound: 'sfx_hero_death',
    },
    
    unlockCondition: { type: 'default', value: 'default', description: 'Available from start' },
    baseCost: 0,
    
    hpPerLevel: 25,
    speedPerLevel: 0.02,
    damagePerLevel: 5,
    
    flavorText: 'The frontline warrior',
    quote: '"For the Protocol!"',
    backstory: 'A seasoned veteran of the Swarm Wars, Vanguard Blade leads from the front with unmatched melee prowess.',
  },
  {
    id: 'hero_02',
    name: 'Outpost Ranger',
    archetype: 'Marksman',
    hp: 90,
    speed: 1.3,
    starting_upgrade_id: 'upg_13',
    lore: 'High-speed scout designed for long-range kiting tactics.',
    
    visual: {
      color: '#FFD700',
      secondaryColor: '#FFCC00',
      sprite: 'ranger',
      icon: '🏹',
      size: 'medium',
      glow: false,
      glowColor: null,
    },
    audio: {
      attackSound: 'sfx_pistol_shot',
      specialSound: 'sfx_sniper_shot',
      spawnSound: null,
      deathSound: 'sfx_hero_death',
    },
    
    unlockCondition: { type: 'default', value: 'default', description: 'Available from start' },
    baseCost: 0,
    
    hpPerLevel: 15,
    speedPerLevel: 0.03,
    damagePerLevel: 8,
    
    flavorText: 'The fast and precise marksman',
    quote: '"Never miss."',
    backstory: 'A lone wolf who prefers to strike from the shadows, Outpost Ranger excels at hit-and-run tactics.',
  },
  {
    id: 'hero_03',
    name: 'Tech Engineer',
    archetype: 'Specialist',
    hp: 110,
    speed: 1.0,
    starting_upgrade_id: 'upg_01',
    lore: 'Drone operator who lets autonomous units handle the swarm.',
    
    visual: {
      color: '#00F0FF',
      secondaryColor: '#00AAFF',
      sprite: 'engineer',
      icon: '🤖',
      size: 'medium',
      glow: true,
      glowColor: '#00F0FF',
    },
    audio: {
      attackSound: 'sfx_drone_attack',
      specialSound: 'sfx_tech_beep',
      spawnSound: null,
      deathSound: 'sfx_hero_death',
    },
    
    unlockCondition: { type: 'default', value: 'default', description: 'Available from start' },
    baseCost: 0,
    
    hpPerLevel: 20,
    speedPerLevel: 0.02,
    damagePerLevel: 6,
    
    flavorText: 'The drone commander',
    quote: '"Deploying drones!"',
    backstory: 'A brilliant engineer who prefers to let machines do the fighting while providing tactical support.',
  },
  {
    id: 'hero_04',
    name: 'Chrono Operative',
    archetype: 'Speedster',
    hp: 85,
    speed: 1.4,
    starting_upgrade_id: 'upg_14',
    lore: 'Time-warping agent who leaves damaging phase shadows.',
    
    visual: {
      color: '#8800FF',
      secondaryColor: '#6600CC',
      sprite: 'chrono',
      icon: '⏳',
      size: 'medium',
      glow: true,
      glowColor: '#8800FF',
    },
    audio: {
      attackSound: 'sfx_time_warp',
      specialSound: 'sfx_echo_attack',
      spawnSound: null,
      deathSound: 'sfx_hero_death',
    },
    
    unlockCondition: { type: 'wave', value: 10, description: 'Unlocked after surviving Wave 10' },
    baseCost: 500,
    
    hpPerLevel: 10,
    speedPerLevel: 0.05,
    damagePerLevel: 7,
    
    flavorText: 'The time-bending operative',
    quote: '"Time is on my side."',
    backstory: 'A temporal agent who can manipulate time itself, leaving behind echoes of past actions.',
  },
  {
    id: 'hero_05',
    name: 'Shield Paladin',
    archetype: 'Defender',
    hp: 175,
    speed: 0.85,
    starting_upgrade_id: 'upg_15',
    lore: 'Heavily armored fortress who knocks back enemies on collision.',
    
    visual: {
      color: '#00FFFF',
      secondaryColor: '#00AAFF',
      sprite: 'paladin',
      icon: '🛡️',
      size: 'xlarge',
      glow: true,
      glowColor: '#00FFFF',
    },
    audio: {
      attackSound: 'sfx_shield_bash',
      specialSound: 'sfx_barrier_activate',
      spawnSound: null,
      deathSound: 'sfx_hero_death',
    },
    
    unlockCondition: { type: 'wave', value: 8, description: 'Unlocked after surviving Wave 8' },
    baseCost: 400,
    
    hpPerLevel: 30,
    speedPerLevel: 0.01,
    damagePerLevel: 4,
    
    flavorText: 'The impenetrable fortress',
    quote: '"You shall not pass!"',
    backstory: 'A heavily armored warrior who can absorb tremendous damage and push back enemies with sheer force.',
  },
  {
    id: 'hero_06',
    name: 'Pyrotechnic Specialist',
    archetype: 'Area Control',
    hp: 100,
    speed: 1.1,
    starting_upgrade_id: 'upg_10',
    lore: 'Combat engineer who incinerates chokepoints and entrenched swarm nests.',
    
    visual: {
      color: '#FF4400',
      secondaryColor: '#CC3300',
      sprite: 'pyro',
      icon: '🔥',
      size: 'large',
      glow: true,
      glowColor: '#FF4400',
    },
    audio: {
      attackSound: 'sfx_flame',
      specialSound: 'sfx_explosion',
      spawnSound: null,
      deathSound: 'sfx_hero_death',
    },
    
    unlockCondition: { type: 'wave', value: 6, description: 'Unlocked after surviving Wave 6' },
    baseCost: 300,
    
    hpPerLevel: 18,
    speedPerLevel: 0.02,
    damagePerLevel: 9,
    
    flavorText: 'The fire specialist',
    quote: '"Burn in hell!"',
    backstory: 'A pyromaniac who loves to watch things burn, specializing in area denial and crowd control.',
  },
]

// ============================================
// ENHANCED ACHIEVEMENT DEFINITIONS
// ============================================

export interface EnhancedAchievement extends AchievementsRow {
  // Extended properties
  category: 'combat' | 'collection' | 'survival' | 'skill'
  difficulty: 'bronze' | 'silver' | 'gold' | 'platinum'
  points: number
  
  // Visual
  icon: string
  color: string
  
  // Progress tracking
  currentProgress: number
  isUnlocked: boolean
  unlockDate: string | null
  
  // Flavor
  description: string
  flavorText: string
}

export const enhancedAchievements: EnhancedAchievement[] = [
  {
    id: 'ach_01',
    title: 'First Contact',
    requirement: 'Defeat 100 total swarm enemies',
    reward_badge: 'Bronze Bug Hunter',
    
    category: 'combat',
    difficulty: 'bronze',
    points: 10,
    icon: '🎯',
    color: '#CD7F32', // Bronze
    currentProgress: 0,
    isUnlocked: false,
    unlockDate: null,
    description: 'Prove your worth by eliminating 100 Swarm enemies across all runs.',
    flavorText: 'The first step in becoming a Swarm hunter.',
  },
  {
    id: 'ach_02',
    title: 'Gold Hoarder',
    requirement: 'Gather 500 coins in a single run',
    reward_badge: 'Coin Master',
    
    category: 'collection',
    difficulty: 'silver',
    points: 25,
    icon: '💰',
    color: '#C0C0C0', // Silver
    currentProgress: 0,
    isUnlocked: false,
    unlockDate: null,
    description: 'Collect 500 coins in a single run to prove your greed is unmatched.',
    flavorText: 'Money can\'t buy happiness, but it can buy upgrades!',
  },
  {
    id: 'ach_03',
    title: 'Swarmslayer',
    requirement: 'Defeat 1,000 total enemies across all runs',
    reward_badge: 'Silver Vanquisher',
    
    category: 'combat',
    difficulty: 'silver',
    points: 50,
    icon: '⚔️',
    color: '#C0C0C0', // Silver
    currentProgress: 0,
    isUnlocked: false,
    unlockDate: null,
    description: 'Demonstrate your mastery by eliminating 1,000 Swarm enemies.',
    flavorText: 'The Swarm fears your name.',
  },
  {
    id: 'ach_04',
    title: 'Untouchable',
    requirement: 'Survive 3 consecutive waves without taking damage',
    reward_badge: 'Gold Aegis',
    
    category: 'skill',
    difficulty: 'gold',
    points: 100,
    icon: '🛡️',
    color: '#FFD700', // Gold
    currentProgress: 0,
    isUnlocked: false,
    unlockDate: null,
    description: 'Show perfect defense by surviving 3 waves without taking any damage.',
    flavorText: 'Perfection is your standard.',
  },
]

