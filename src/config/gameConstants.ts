/**
 * Game Constants for Swarm Protocol: Survivor
 * All numerical values and game settings are defined here
 */

// ============================================
// GAME SETTINGS
// ============================================

export const GAME_CONFIG = {
  // Target frame rate
  TARGET_FPS: 60,
  
  // Canvas dimensions
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  
  // Base player velocity (pixels per second)
  // All speeds are multipliers of this base value
  BASE_PLAYER_SPEED: 220,
  
  // World units convention: All distances in pixels, speeds as multipliers of BASE_PLAYER_SPEED
} as const

// ============================================
// WAVE SYSTEM
// ============================================

export const WAVE_CONFIG = {
  // Duration of active wave (enemies spawn)
  WAVE_DURATION_SECONDS: 30,
  
  // Duration of breather window (no spawns, safe coin collection)
  BREATHER_DURATION_SECONDS: 3,
  
  // Total wave cycle duration
  TOTAL_CYCLE_SECONDS: 33, // WAVE_DURATION + BREATHER_DURATION
  
  // Boss wave interval
  BOSS_WAVE_INTERVAL: 5, // Every 5th wave
  
  // Wave difficulty scaling
  ENEMY_SPAWN_RATE_BASE: 1, // Enemies per second at wave 1
  ENEMY_SPAWN_RATE_SCALING: 0.1, // Additional enemies per second per wave
  ENEMY_HP_SCALING: 1.1, // HP multiplier per wave
  ENEMY_SPEED_SCALING: 1.02, // Speed multiplier per wave
  
  // Maximum wave for normal enemies (boss waves continue)
  MAX_NORMAL_WAVE: 100,
} as const

// ============================================
// SCORING SYSTEM
// ============================================

export const SCORING_CONFIG = {
  // Score formula: Final Score = (Seconds Survived × SECONDS_MULTIPLIER) + (Coins Collected × COINS_MULTIPLIER)
  SECONDS_MULTIPLIER: 10,
  COINS_MULTIPLIER: 25,
  
  // Bonus multipliers
  WAVE_CLEAR_BONUS: 100, // Bonus for clearing a wave
  BOSS_KILL_BONUS: 500, // Bonus for killing a boss
  DAMAGE_FREE_STREAK_BONUS: 50, // Bonus per consecutive damage-free wave
  
  // High score thresholds
  BRONZE_SCORE: 1000,
  SILVER_SCORE: 5000,
  GOLD_SCORE: 10000,
  PLATINUM_SCORE: 25000,
} as const

// ============================================
// PLAYER CONFIGURATION
// ============================================

export const PLAYER_CONFIG = {
  // Base player stats
  BASE_HP: 100,
  BASE_SPEED: 1.0, // Multiplier of BASE_PLAYER_SPEED
  BASE_DAMAGE: 10,
  
  // Player collision
  PLAYER_RADIUS: 32, // pixels
  
  // Invincibility frames after taking damage
  INVINCIBILITY_DURATION_SECONDS: 1.0,
  
  // Default player name for guests
  DEFAULT_PLAYER_NAME: 'Guest Operative',
  
  // Respawn (disabled - perma death)
  REPAWN_ENABLED: false,
} as const

// ============================================
// ENEMY CONFIGURATION
// ============================================

export const ENEMY_CONFIG = {
  // Base enemy spawn distance from player
  SPAWN_DISTANCE_MIN: 200, // pixels
  SPAWN_DISTANCE_MAX: 300, // pixels
  
  // Enemy detection range (for targeting)
  DETECTION_RANGE: 500, // pixels
  
  // Enemy attack range
  ATTACK_RANGE: 100, // pixels
  
  // Coin drop configuration
  COIN_DROP_CHANCE: 1.0, // 100% chance to drop coins
  COIN_DROP_RADIUS: 50, // pixels from enemy death position
  
  // Enemy collision
  ENEMY_RADIUS_BASE: 24, // pixels (varies by enemy type)
} as const

// ============================================
// UPGRADE SYSTEM
// ============================================

export const UPGRADE_CONFIG = {
  // Number of upgrade options to choose from on level up
  LEVEL_UP_OPTIONS: 3,
  
  // Level up timing
  LEVEL_UP_AFTER_WAVE: 1, // Level up after every wave
  
  // Upgrade rarity (for random drops)
  COMMON_CHANCE: 0.70,
  UNCOMMON_CHANCE: 0.20,
  RARE_CHANCE: 0.08,
  LEGENDARY_CHANCE: 0.02,
  
  // Upgrade tiers
  MAX_UPGRADE_TIER: 5,
  UPGRADE_TIER_MULTIPLIER: 1.5, // Damage/HP multiplier per tier
} as const

// ============================================
// COIN SYSTEM
// ============================================

export const COIN_CONFIG = {
  // Coin collection
  COIN_RADIUS: 20, // pixels
  COIN_MAGNET_RANGE: 150, // pixels (auto-collect range)
  COIN_MAGNET_SPEED: 500, // pixels per second
  
  // Coin values (per enemy type)
  COIN_VALUE_SPAWNER: 1,
  COIN_VALUE_FAST: 2,
  COIN_VALUE_RANGED: 5,
  COIN_VALUE_BOSS: 50,
  
  // Coin decay (if not collected)
  COIN_DECAY_ENABLED: false,
  COIN_DECAY_SECONDS: 10,
} as const

// ============================================
// COLLISION SYSTEM
// ============================================

export const COLLISION_CONFIG = {
  // Collision detection type
  COLLISION_TYPE: 'circle-to-circle' as const, // 'circle-to-circle' | 'aabb'
  
  // Circle collision: hit when Distance < (Radius₁ + Radius₂)
  // AABB collision: hit when rectangles overlap
} as const

// ============================================
// LEVEL UP SYSTEM
// ============================================

export const LEVEL_UP_CONFIG = {
  // Experience curve
  XP_PER_WAVE: 100,
  XP_PER_ENEMY_KILL: 10,
  XP_PER_BOSS_KILL: 100,
  
  // XP required for level up
  XP_TO_LEVEL: 100,
  
  // Maximum player level per run
  MAX_LEVEL: 10,
  
  // Card selection timeout
  CARD_SELECTION_TIMEOUT_SECONDS: 30,
  
  // Auto-select if timeout
  AUTO_SELECT_ENABLED: true,
} as const

// ============================================
// ACHIEVEMENT THRESHOLDS
// ============================================

export const ACHIEVEMENT_THRESHOLDS = {
  // ach_01: First Contact
  FIRST_CONTACT_ENEMIES: 100,
  
  // ach_02: Gold Hoarder
  GOLD_HOARDER_COINS: 500,
  
  // ach_03: Swarmslayer
  SWARMSLAYER_ENEMIES: 1000,
  
  // ach_04: Untouchable
  UNTOUCHABLE_STREAK: 3,
  
  // Additional thresholds for display
  KILL_STREAK_THRESHOLDS: [5, 10, 20, 50, 100],
  WAVE_STREAK_THRESHOLDS: [3, 5, 10, 20, 50],
  COIN_COLLECTION_THRESHOLDS: [100, 500, 1000, 5000, 10000],
} as const

// ============================================
// GAME STATE MACHINE
// ============================================

export type GameState = 
  | 'MENU'
  | 'LOADOUT_SELECT'
  | 'PLAYING'
  | 'WAVE_BREATHER'
  | 'LEVEL_UP'
  | 'LEVEL_UP_PAUSE'
  | 'GAME_OVER'
  | 'PAUSED'

// Transition map
// MENU -> LOADOUT_SELECT -> PLAYING -> WAVE_BREATHER -> LEVEL_UP -> PLAYING
// PLAYING -> LEVEL_UP_PAUSE (when wave ends)
// PLAYING -> GAME_OVER (on player death)
// Any -> PAUSED (on pause)
// PAUSED -> Previous state (on resume)

// ============================================
// RENDERING CONFIGURATION
// ============================================

export const RENDER_CONFIG = {
  // Camera follow
  CAMERA_FOLLOW_SMOOTHING: 0.1, // 0 = instant, 1 = very smooth
  
  // Zoom level
  ZOOM_LEVEL: 1.0,
  MIN_ZOOM: 0.5,
  MAX_ZOOM: 2.0,
  
  // Particle effects
  PARTICLE_ENABLED: true,
  MAX_PARTICLES: 100,
  
  // Blood/splatter effects
  ENABLE_GORE: true,
  
  // Screen shake
  SCREEN_SHAKE_ENABLED: true,
  SCREEN_SHAKE_INTENSITY: 5, // pixels
  SCREEN_SHAKE_DURATION: 0.1, // seconds
} as const

// ============================================
// AUDIO CONFIGURATION
// ============================================

export const AUDIO_CONFIG = {
  // Master volume (0-1)
  MASTER_VOLUME: 0.7,
  
  // Individual volume channels
  MUSIC_VOLUME: 0.5,
  SFX_VOLUME: 0.8,
  AMBIENCE_VOLUME: 0.3,
  
  // Audio files (to be implemented)
  SOUNDTRACK_FILES: [
    'soundtrack_01.mp3',
    'soundtrack_02.mp3',
    'soundtrack_03.mp3',
  ],
  
  // SFX files
  SFX_FILES: {
    PLAYER_HIT: 'sfx_player_hit.mp3',
    ENEMY_HIT: 'sfx_enemy_hit.mp3',
    ENEMY_DEATH: 'sfx_enemy_death.mp3',
    COIN_COLLECT: 'sfx_coin_collect.mp3',
    LEVEL_UP: 'sfx_level_up.mp3',
    GAME_OVER: 'sfx_game_over.mp3',
    WAVE_START: 'sfx_wave_start.mp3',
    BOSS_SPAWN: 'sfx_boss_spawn.mp3',
  },
} as const

// ============================================
// ACCESSIBILITY CONFIGURATION
// ============================================

export const ACCESSIBILITY_CONFIG = {
  // High contrast mode
  HIGH_CONTRAST_ENABLED: false,
  
  // Colorblind modes
  COLORBLIND_MODE: 'none' as 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia',
  
  // Screen reader support
  SCREEN_READER_ENABLED: false,
  
  // Reduced motion
  REDUCED_MOTION_ENABLED: false,
  
  // Text size
  TEXT_SIZE: 'normal' as 'small' | 'normal' | 'large' | 'xlarge',
  
  // UI scale
  UI_SCALE: 1.0,
} as const
