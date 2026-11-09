/**
 * Game Types for Swarm Protocol: Survivor
 * TypeScript interfaces for game entities and state
 */

import type { MovementDirection } from '../config/controls'

// ============================================
// COORDINATE & VECTOR TYPES
// ============================================

export interface Position {
  x: number
  y: number
}

export interface Vector {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Bounds {
  position: Position
  size: Size
}

// ============================================
// GAME ENTITY TYPES
// ============================================

// Base entity interface
export interface GameEntity {
  id: string
  type: EntityType
  position: Position
  velocity: Vector
  radius: number
  isActive: boolean
  createdAt: number
}

// Entity types
export type EntityType = 
  | 'player'
  | 'enemy'
  | 'projectile'
  | 'coin'
  | 'upgrade_pickup'
  | 'effect'

// ============================================
// PLAYER TYPE
// ============================================

export interface Player extends GameEntity {
  type: 'player'
  heroId: string
  hp: number
  maxHp: number
  speed: number
  damage: number
  
  // Movement
  movementDirection: MovementDirection
  isMoving: boolean
  
  // Combat
  isAttacking: boolean
  attackCooldown: number
  lastAttackTime: number
  
  // Status effects
  isInvincible: boolean
  invincibilityEndTime: number
  
  // Score tracking
  coins: number
  score: number
  enemiesDefeated: number
  
  // Wave tracking
  currentWave: number
  damageFreeWaveStreak: number
  
  // Level/Progression
  level: number
  xp: number
  
  // Loadout
  primaryUpgradeId: string | null
  secondaryUpgradeId: string | null
  
  // Visual
  color: string
  sprite: string | null
}

// ============================================
// ENEMY TYPES
// ============================================

export type EnemyType = 'spore_zombie' | 'acidic_chitin_bug' | 'aegis_tech_drone' | 'aegis_commander_drone'

export type EnemyCategory = 'swarm' | 'fast_flanker' | 'ranged_sniper' | 'mini_boss'

export interface Enemy extends GameEntity {
  type: 'enemy'
  enemyType: EnemyType
  category: EnemyCategory
  name: string
  hp: number
  maxHp: number
  speed: number
  damage: number
  coinValue: number
  
  // AI
  targetPosition: Position | null
  isAggressive: boolean
  
  // Combat
  attackRange: number
  attackCooldown: number
  lastAttackTime: number
  
  // Special abilities (for boss)
  hasSpecialAbility: boolean
  specialCooldown: number
  lastSpecialTime: number
  
  // Visual
  color: string
  sprite: string | null
}

// ============================================
// PROJECTILE TYPES
// ============================================

export type ProjectileType = 
  | 'bullet'
  | 'rocket'
  | 'laser'
  | 'sawblade'
  | 'tesla_arc'
  | 'flame'

export interface Projectile extends GameEntity {
  type: 'projectile'
  projectileType: ProjectileType
  damage: number
  speed: number
  
  // Owner
  ownerId: string
  ownerType: 'player' | 'enemy'
  
  // Targeting
  targetId: string | null
  isHoming: boolean
  homingStrength: number
  
  // Lifetime
  lifetime: number
  maxLifetime: number
  
  // Bounce (for bouncing sawblade)
  bouncesRemaining: number
  maxBounces: number
  
  // Visual
  color: string
  sprite: string | null
  trailLength: number
}

// ============================================
// COIN TYPE
// ============================================

export interface Coin extends GameEntity {
  type: 'coin'
  value: number
  
  // Magnet effect
  isMagnetized: boolean
  magnetSpeed: number
  
  // Collection
  isCollected: boolean
  collectAnimation: boolean
  
  // Visual
  color: string
  sprite: string | null
  glowIntensity: number
}

// ============================================
// UPGRADE PICKUP TYPE
// ============================================

export interface UpgradePickup extends GameEntity {
  type: 'upgrade_pickup'
  upgradeId: string
  
  // Visual
  color: string
  sprite: string | null
  
  // Spawn
  spawnTime: number
  despawnTime: number
  
  // Collection
  isCollected: boolean
}

// ============================================
// EFFECT TYPES
// ============================================

export type EffectType = 
  | 'explosion'
  | 'hit_spark'
  | 'blood_splatter'
  | 'heal'
  | 'level_up'
  | 'wave_start'
  | 'boss_spawn'
  | 'screen_shake'

export interface Effect extends GameEntity {
  type: 'effect'
  effectType: EffectType
  
  // Lifetime
  duration: number
  maxDuration: number
  
  // Visual
  color: string
  sprite: string | null
  opacity: number
  scale: number
  
  // Animation
  animationFrame: number
  animationSpeed: number
}

// ============================================
// WAVE SYSTEM TYPES
// ============================================

export interface Wave {
  number: number
  isBossWave: boolean
  startTime: number
  endTime: number
  
  // Enemies
  enemiesSpawned: number
  enemiesRemaining: number
  enemiesDefeated: number
  
  // State
  isActive: boolean
  isBreather: boolean
  
  // Boss
  bossId: string | null
  bossSpawned: boolean
  bossDefeated: boolean
}

// ============================================
// LEVEL UP SYSTEM TYPES
// ============================================

export interface LevelUpCard {
  id: string
  upgradeId: string
  name: string
  description: string
  category: string
  damage: number
  cooldown: number
  
  // Visual
  color: string
  icon: string
  
  // Selection
  isSelected: boolean
  isHovered: boolean
}

// ============================================
// GAME STATE TYPES
// ============================================

import type { GameState } from '../config/gameConstants'

export interface GameStateManager {
  currentState: GameState
  previousState: GameState
  
  // Timing
  stateStartTime: number
  stateDuration: number
  
  // History
  stateHistory: GameState[]
}

// ============================================
// RENDER STATE TYPES
// ============================================

export interface Camera {
  position: Position
  targetPosition: Position
  zoom: number
  
  // Viewport
  viewportWidth: number
  viewportHeight: number
  
  // Shake
  isShaking: boolean
  shakeIntensity: number
  shakeDuration: number
  shakeEndTime: number
}

// ============================================
// INPUT STATE TYPES
// ============================================

export interface InputState {
  // Keyboard
  keysPressed: Set<string>
  keysJustPressed: Set<string>
  keysJustReleased: Set<string>
  
  // Movement
  movementDirection: MovementDirection
  movementVector: Vector
  
  // Actions
  actions: {
    primaryAttack: boolean
    secondaryAttack: boolean
    dash: boolean
    sprint: boolean
    interact: boolean
    pause: boolean
  }
  
  actionsJustPressed: {
    primaryAttack: boolean
    secondaryAttack: boolean
    dash: boolean
    interact: boolean
    pause: boolean
  }
  
  // Mouse
  mousePosition: Position
  mouseWorldPosition: Position
  isMouseDown: boolean
  mouseJustPressed: boolean
  mouseJustReleased: boolean
  
  // Touch
  touches: Map<number, Position>
  
  // Gamepad
  gamepadConnected: boolean
  gamepadState: any | null
}

// ============================================
// GAME WORLD TYPE
// ============================================

export interface GameWorld {
  // Entities
  player: Player | null
  enemies: Enemy[]
  projectiles: Projectile[]
  coins: Coin[]
  upgradePickups: UpgradePickup[]
  effects: Effect[]
  
  // Wave system
  currentWave: Wave
  wavesCompleted: number
  
  // Score
  score: number
  coinsCollected: number
  enemiesDefeated: number
  
  // Time
  startTime: number
  currentTime: number
  survivalSeconds: number
  
  // Level up
  levelUpCards: LevelUpCard[]
  isLevelUpActive: boolean
  levelUpStartTime: number
  
  // State
  state: GameStateManager
  
  // Camera
  camera: Camera
  
  // Input
  input: InputState
}

// ============================================
// GAME CONFIGURATION TYPE
// ============================================

export interface GameConfig {
  // Difficulty
  difficulty: 'easy' | 'normal' | 'hard' | 'insane'
  
  // Graphics
  graphicsQuality: 'low' | 'medium' | 'high'
  fullscreen: boolean
  resolution: { width: number; height: number }
  
  // Audio
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  
  // Controls
  controlScheme: 'default' | 'left_handed' | 'custom'
  
  // Accessibility
  highContrast: boolean
  colorblindMode: 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia'
  reducedMotion: boolean
}

// ============================================
// SAVE DATA TYPES
// ============================================

export interface SaveData {
  version: string
  timestamp: number
  
  // Player progress
  playerStats: {
    totalEnemiesDefeated: number
    totalCoinsCollected: number
    longestDamageFreeStreak: number
    totalPlayTime: number
    runsCompleted: number
  }
  
  // Unlocked content
  unlockedHeroes: string[]
  unlockedUpgrades: string[]
  unlockedAchievements: string[]
  
  // Settings
  settings: GameConfig
  
  // Last run
  lastRun: {
    score: number
    survivalSeconds: number
    coinsCollected: number
    enemiesDefeated: number
    heroUsed: string
    waveReached: number
    timestamp: number
  } | null
}

// ============================================
// EVENT TYPES
// ============================================

export type GameEventType = 
  | 'player_moved'
  | 'player_attacked'
  | 'player_dashed'
  | 'player_damaged'
  | 'player_healed'
  | 'player_level_up'
  | 'player_death'
  | 'enemy_spawned'
  | 'enemy_damaged'
  | 'enemy_death'
  | 'projectile_fired'
  | 'projectile_hit'
  | 'coin_collected'
  | 'upgrade_picked'
  | 'wave_started'
  | 'wave_completed'
  | 'boss_spawned'
  | 'boss_defeated'
  | 'game_paused'
  | 'game_resumed'
  | 'game_over'

export interface GameEvent {
  type: GameEventType
  timestamp: number
  data: any
}

// ============================================
// UTILITY TYPES
// ============================================

// For entity filtering
export type EntityFilter = (
  entity: GameEntity
) => boolean

// For entity sorting
export type EntitySorter = (
  a: GameEntity,
  b: GameEntity
) => number

// For collision detection
export interface CollisionResult {
  hit: boolean
  entity: GameEntity | null
  distance: number
  normal: Vector | null
}
