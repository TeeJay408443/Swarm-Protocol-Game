/**
 * Enemy Entity
 * Phase 7: Build the Game - Enemy System
 */

import { Vector2 } from '../utils/vector'
import { Camera } from '../engine/Camera'
import { GAME_CONFIG } from '../../config/gameConstants'
import { GAME_ARENA_SIZE } from '../constants'
import {
  ASTRAL_SCOURGE_PHASE_ONE_HP,
  ASTRAL_SCOURGE_PHASE_TWO_CUTSCENE_SECONDS,
  ASTRAL_SCOURGE_PHASE_TWO_DELAY_SECONDS,
  ASTRAL_SCOURGE_PHASE_TWO_HP,
  ASTRAL_SCOURGE_PHASE_TWO_ORBIT_RADIUS,
  ASTRAL_SCOURGE_PHASE_TWO_RUSH_SECONDS,
  ASTRAL_SCOURGE_PHASE_TWO_SEGMENT_COUNT,
  DEVOURER_CUTSCENE_DURATION_SECONDS,
  getWave15CutsceneTheme,
  WAVE_15_CUTSCENE_DURATION_SECONDS
} from '../../config/arenas'
import { EnemiesRow } from '../../types/database'
import { Player } from './Player'
import { InfernoRamTrail } from './InfernoRamTrail'
import { drawInfernoSpawnEffect } from './InfernoSpawnEffect'

export const ASTRAL_SCOURGE_PHASE_TWO_GRID_COOLDOWN_SECONDS = 20
export const INFERO_DESPERATION_DURATION_SECONDS = 10
const INFERO_DESPERATION_PORTAL_SECONDS = 0.3
const INFERO_DESPERATION_RAM_SECONDS = 0.62
const INFERO_DESPERATION_RECOVERY_SECONDS = 0.18
const INFERO_DESPERATION_RAM_SPEED = 1120

export type EnemyType =
  | 'Swarm'
  | 'Heavy Swarm'
  | 'Fast Flanker'
  | 'Ranged Sniper'
  | 'Ranged Caster'
  | 'Mini-Boss'
  | 'Boss'

export type HalfArenaDirection = 'left' | 'right' | 'top' | 'bottom'

export interface BossArenaBounds {
  left: number
  top: number
  width: number
  height: number
}

export interface EnemyOptions {
  x?: number
  y?: number
  width?: number
  height?: number
  enemyData?: EnemiesRow
  target?: Player | null
  speed?: number
  maxHealth?: number
  damage?: number
  color?: string
  coinValue?: number
  isBoss?: boolean
  isStationaryBoss?: boolean
  isFinalBoss?: boolean
  isWave15SpecialBoss?: boolean
  anchorPos?: Vector2 | null
  arenaBounds?: BossArenaBounds | null
}

export interface EnemyProjectile {
  x: number
  y: number
  width: number
  height: number
  speed: number
  direction: Vector2
  damage: number
  color: string
  lifetime: number
  maxLifetime: number
  homingTurnRate?: number
  homingRemaining?: number
  curveTurnRate?: number
  splitAfter?: number
  splitCount?: number
  splitSpeed?: number
  splitDone?: boolean
  splitColors?: [string, string]
  isCosmicStar?: boolean
  isBlazingSpear?: boolean
  isInferoFireball?: boolean
  inferoLancePhase?: 'orbiting' | 'outbound' | 'paused' | 'aiming' | 'launched'
  inferoLancePhaseTimer?: number
  inferoLanceBrakeDuration?: number
  inferoLancePauseDuration?: number
  inferoLanceAimDuration?: number
  inferoLanceOutboundSpeed?: number
  inferoLanceLaunchSpeed?: number
  inferoLanceTargetX?: number
  inferoLanceTargetY?: number
  inferoOrbitAngle?: number
  inferoOrbitRadius?: number
  inferoOrbitSpeed?: number
  inferoOrbitDuration?: number
  inferoSpearShardTimer?: number
  inferoSpearShardsRemaining?: number
  inferoSpearShardInterval?: number
  trailTimer?: number
  trailParticles?: Array<{
    x: number
    y: number
    velocityX: number
    velocityY: number
    radius: number
    lifetime: number
    maxLifetime: number
    color: string
  }>
}

export interface EnemyAoeProjectile {
  id: string
  startX: number
  startY: number
  targetX: number
  targetY: number
  currentX: number
  currentY: number
  arcOffsetY: number
  radius: number
  elapsed: number
  flightDuration: number
  activeTimer: number
  activeDuration: number
  damage: number
  color: string
  hasDetonated: boolean
  hasDamagedPlayer: boolean
}

export type ClosingSideLaserMode = 'left' | 'right' | 'pincer'

export type BossAttackKind =
  | 'orbital_slam'
  | 'mega_laser'
  | 'bombardment_ring'
  | 'half_arena'
  | 'closing_side_lasers'
  | 'tracking_strikes'
  | 'pursuit_beam'
  | 'bullet_hell'
  | 'rotating_cross_lasers'
  | 'void_meteor_salvo'
  | 'singularity_grid'
  | 'cosmic_laser_walls'
  | 'cosmic_portal_lunge'
  | 'cosmic_orb_barrage'
  | 'astral_orbital_grid'
  | 'astral_targeted_lasers'
  | 'inferno_spear_volley'
  | 'infero_spinning_lattice'
  | 'infero_solar_core'
  | 'infero_underflame_swoops'
  | 'infero_aimed_ram'
  | 'infero_rebound_lances'
  | 'infero_orbiting_lances'
  | 'infero_spear_cascade'

export type Wave15BossIdentity =
  | 'omega_overlord'
  | 'solar_archon_seraph'
  | 'primordial_starforge'

export interface CosmicLaserWallLine {
  x1: number
  y1: number
  x2: number
  y2: number
  width: number
  color?: string
  aimMode?: 'random' | 'player' | 'targeted'
}

export interface TrackingBlastNode {
  x: number
  y: number
  radius: number
  elapsed: number
  windup: number
  active: number
  hasDetonated: boolean
  hasDamagedPlayer: boolean
}

export interface InferoFireColumn {
  x: number
  y: number
  topY: number
  width: number
  height: number
  elapsed: number
  holdDuration: number
  windup: number
  active: number
  hasIgnited: boolean
  hasDamagedPlayer: boolean
  number: number
}

const INFERO_FIRE_COLUMN_HOLD_SECONDS = 0.28
const INFERO_FIRE_COLUMN_WARNING_SECONDS = 0.48
const INFERO_FIRE_COLUMN_ACTIVE_SECONDS = 3
const INFERO_UNDERFLAME_SWOOP_SECONDS = 0.5
const INFERO_UNDERFLAME_INTERVAL_SECONDS = 2.4

export interface BossTelegraphAttack {
  id: string
  kind: BossAttackKind
  x: number
  y: number
  endX?: number
  endY?: number
  portalX?: number
  portalY?: number
  angle?: number
  turnRate?: number
  orbitAngle?: number
  orbitStartAngle?: number
  orbitElapsed?: number
  orbitRadius?: number
  orbitCenterX?: number
  orbitCenterY?: number
  gridAnchorX?: number
  gridAnchorY?: number
  ringLocked?: boolean
  ringLockedHeadX?: number
  ringLockedHeadY?: number
  ringLockedSegments?: Array<{ x: number; y: number; angle: number }>
  radius: number
  length?: number
  halfDirection?: HalfArenaDirection
  sideMode?: ClosingSideLaserMode
  bounds?: BossArenaBounds
  closingReachRatio?: number
  zoneRect?: { x: number; y: number; width: number; height: number }
  safeRect?: { x: number; y: number; width: number; height: number }
  gridRects?: Array<{ x: number; y: number; width: number; height: number }>
  gridLines?: CosmicLaserWallLine[]
  projectileLanes?: Array<{
    x: number
    y: number
    directionX: number
    directionY: number
    delay: number
  }>
  projectileCount?: number
  inferoLaunchX?: number
  inferoLaunchY?: number
  inferoPositionFallback?: boolean
  lanceWaypoints?: Vector2[]
  lanceRoundCount?: number
  lanceRoundIndex?: number
  lanceVolleyCount?: number
  lanceRoundPhase?: 'volley' | 'moving'
  lanceRoundTimer?: number
  lanceRoundDuration?: number
  lanceMoveDurations?: number[]
  lanceMoveStartX?: number
  lanceMoveStartY?: number
  lanceMoveTargetX?: number
  lanceMoveTargetY?: number
  lanceMoveDuration?: number
  orbitDuration?: number
  sideSpearCount?: number
  sideSpearInterval?: number
  swoopCount?: number
  swoopIndex?: number
  swoopEndX?: number
  swoopY?: number
  swoopStartX?: number
  swoopStartY?: number
  swoopTargetX?: number
  swoopTargetY?: number
  swoopDuration?: number
  swoopInterval?: number
  fireColumns?: InferoFireColumn[]
  ramStartX?: number
  ramStartY?: number
  ramAimX?: number
  ramAimY?: number
  ramTargetX?: number
  ramTargetY?: number
  ramDuration?: number
  gridPulseCount?: number
  gridPulseIndex?: number
  gridPulseTimer?: number
  gridPulseWarningDuration?: number
  gridPulseFirstWarningDuration?: number
  gridPulseFollowupWarningDuration?: number
  gridPulseExtensionDuration?: number
  gridPulseFireDuration?: number
  gridPulseGapDuration?: number
  gridPulseFiring?: boolean
  gridPulseTravelSpeed?: number
  spinMode?: 'classic_spin' | 'furnace_volley'
  gridOffsets?: number[]
  isDiagonalGrid?: boolean
  beamCount?: number
  beamSegments?: Array<[number, number]>
  subTargets?: Array<{ x: number; y: number; radius: number }>
  trackingBlasts?: TrackingBlastNode[]
  spawnTimer?: number
  spawnsDone?: number
  pulseTimer?: number
  pulseCount?: number
  hitCooldown?: number
  laserDuration?: number
  escapeDuration?: number
  isEscaping?: boolean
  targetLockTime?: number
  laserSpread?: number
  chargeTimer: number
  chargeDuration: number
  activeTimer: number
  activeDuration: number
  damage: number
  accentPrimary?: string
  accentSecondary?: string
  warningLabel?: string
  hasTriggered: boolean
  hasDamagedPlayer: boolean
}

export class Enemy {
  /** Position */
  x: number
  y: number
  
  /** Dimensions */
  width: number
  height: number
  
  /** Movement */
  speed: number
  baseSpeed: number
  velocity: Vector2 = { x: 0, y: 0 }
  direction: Vector2 = { x: 0, y: 0 }
  
  /** Visual */
  color: string
  baseColor: string
  
  /** Health */
  health: number
  maxHealth: number
  
  /** Combat */
  damage: number
  attackCooldown: number = 0
  attackCooldownMax: number = 1 // seconds
  attackRange: number = 150
  attackRateMultiplier: number = 1
  
  /** Enemy data */
  enemyData: EnemiesRow | null
  enemyId: string = ''
  type: EnemyType = 'Swarm'
  
  /** State */
  isAlive: boolean = true
  isActive: boolean = true
  isMiniBoss: boolean = false
  isBoss: boolean = false
  isStationaryBoss: boolean = false
  isFinalBoss: boolean = false
  isWave15SpecialBoss: boolean = false
  /** Main cinematic bosses cannot be displaced by player knockback or enemy collisions. */
  get isKnockbackImmune(): boolean {
    return this.isStationaryBoss || this.isFinalBoss || this.isWave15SpecialBoss ||
      this.isDevourerOfGods || this.isAstralScourge || this.isInferoChampion
  }
  anchorPos: Vector2 | null = null
  arenaBounds: BossArenaBounds | null = null
  
  /** Target */
  target: Player | null = null
  
  /** Coins */
  coinValue: number = 1
  
  /** Movement patterns */
  private movementPattern: 'chase' | 'zigzag' | 'orbit' | 'flee' = 'chase'
  private zigzagTimer: number = 0
  private zigzagDirection: number = 1
  private zigzagAmplitude: number = 50
  private zigzagFrequency: number = 2
  
  /** Projectiles */
  projectiles: EnemyProjectile[] = []
  canShoot: boolean = false
  shootCooldown: number = 0
  shootCooldownMax: number = 2

  /** Dodgeable AoE Mortar Projectiles (used by Area 2 Mini-Boss) */
  launchesAoeProjectiles: boolean = false
  aoeProjectiles: EnemyAoeProjectile[] = []
  aoeCooldown: number = 1.0
  aoeCooldownMax: number = 2.6
  private aoeCounter: number = 0

  /** Boss telegraphed big attacks */
  telegraphs: BossTelegraphAttack[] = []
  specialCooldown: number = 2.0
  specialCooldownMax: number = 3.6
  bossTier: number = 1
  bossPhase: number = 1
  bossTitle: string = 'AEGIS COMMANDER'
  damageReduction: number = 0
  enableEnrage: boolean = false
  isEnraged: boolean = false
  phaseTransitionTimer: number = 0
  pendingPhaseAnnouncement: number | null = null
  private specialAttackCounter: number = 0
  private phaseTwoAttackIndex: number = 0
  private phaseThreeAttackIndex: number = 0
  private halfDirectionIndex: number = 0
  private sideLaserModeIndex: number = 0

  /** Calamity-style Worm Boss (Devourer of Gods / Astral Scourge) multi-segment serpent state */
  isDevourerOfGods: boolean = false
  isAstralScourge: boolean = false
  isAstralScourgeIntermission: boolean = false
  pendingAstralScourgePhaseOneDeath: boolean = false
  pendingAstralPhaseTwoCutscene: boolean = false
  astralPhaseTwoActivationTimer: number = 0
  isAstralPhaseTwoRushing: boolean = false
  private phaseTwoRushStart: { x: number; y: number } | null = null
  private phaseTwoRushEnd: { x: number; y: number } | null = null
  private phaseTwoRushElapsed: number = 0
  dogSegments: Array<{ x: number; y: number; angle: number }> = []
  cutsceneDelayTimer: number = 0
  private dogDashTimer: number = 0
  private dogDashCooldown: number = 4.2
  private dogDashDir: Vector2 = { x: 1, y: 0 }
  private astralRamHeading: number | null = null
  private astralRamSpeed: number = 0
  private astralGridCooldownRemaining: number = 0
  private inferoHoverTarget: Vector2 | null = null
  private inferoHoverRetargetTimer: number = 0
  private inferoSunEmerged: boolean = false
  private inferoSunAttackIndex: number = 0
  isInferoDesperationPhase: boolean = false
  pendingInferoDesperationCompletion: boolean = false
  hasCompletedInferoDesperation: boolean = false
  inferoDesperationTimer: number = 0
  inferoDesperationPortalPosition: Vector2 | null = null
  inferoDesperationLockedTarget: Vector2 | null = null
  readonly inferoDesperationTrail = new InfernoRamTrail()
  private inferoDesperationCycleMode: 'portal' | 'ram' | 'recover' = 'portal'
  private inferoDesperationCycleTimer: number = 0
  private inferoDesperationDirection: Vector2 = { x: 1, y: 0 }
  private inferoDesperationPortalIndex: number = 0
  private inferoDesperationRamDuration: number = INFERO_DESPERATION_RAM_SECONDS
  private visibleWorldBounds: { left: number; right: number; top: number; bottom: number } | null = null

  get isInferoChampion(): boolean {
    return this.enemyId === 'boss_a3_20'
  }

  setVisibleWorldBounds(
    bounds: { left: number; right: number; top: number; bottom: number } | null
  ): void {
    this.visibleWorldBounds = bounds ? { ...bounds } : null
  }

  get isWormBoss(): boolean {
    return this.isDevourerOfGods || this.isAstralScourge
  }
  
  /** Spawning & animation */
  spawnTime: number = 0
  spawnDelay: number = 0.5 // seconds of invulnerability after spawn
  isSpawning: boolean = true
  slowMultiplier: number = 1.0
  powerScale: number = 1.0
  damageScale: number = 1.0
  private animTime: number = Math.random() * 10
  private facingAngle: number = 0
  private hitFlashTimer: number = 0
  private attackPatternIndex: number = 0

  /** Burn DoT status (applied by Pyrotechnic Specialist or fire weapons) */
  burnTimer: number = 0
  burnTickTimer: number = 0
  burnDamagePerTick: number = 0

  /** Frost Freeze status (temporarily halts movement & attacks) */
  freezeTimer: number = 0
  freezeImmuneTimer: number = 0
  
  /** Death animation */
  isDying: boolean = false
  deathTimer: number = 0
  deathDuration: number = 0.5

  constructor(options: EnemyOptions = {}) {
    this.x = options.x || 0
    this.y = options.y || 0
    this.width = options.width || 30
    this.height = options.height || 30
    this.baseSpeed = options.speed || GAME_CONFIG.BASE_PLAYER_SPEED * 0.5
    this.speed = this.baseSpeed
    this.baseColor = options.color || '#FF0055' // Alert red
    this.color = this.baseColor
    this.maxHealth = options.maxHealth || 40
    this.health = this.maxHealth
    this.damage = options.damage || 10
    this.coinValue = options.coinValue || 1
    this.enemyData = options.enemyData || null
    this.target = options.target || null
    this.isBoss =
      options.isBoss ||
      options.isStationaryBoss ||
      options.isFinalBoss ||
      options.isWave15SpecialBoss ||
      false
    this.isStationaryBoss = options.isStationaryBoss || false
    this.isFinalBoss = options.isFinalBoss || false
    this.isWave15SpecialBoss = options.isWave15SpecialBoss || false
    this.anchorPos = options.anchorPos ? { ...options.anchorPos } : null
    this.arenaBounds = options.arenaBounds ? { ...options.arenaBounds } : null
    
    // Apply enemy data if provided
    if (this.enemyData) {
      this.enemyId = this.enemyData.id
      this.maxHealth = this.enemyData.hp
      this.health = this.maxHealth
      this.baseSpeed = this.enemyData.speed * GAME_CONFIG.BASE_PLAYER_SPEED
      this.speed = this.baseSpeed
      this.coinValue = this.enemyData.coin_value
      this.damage = Math.max(8, Math.round(this.enemyData.hp * 0.2))
      
      // Determine type and behavior
      this.type = this.enemyData.category as EnemyType
      
      // Special behaviors based on type
      switch (this.type) {
        case 'Heavy Swarm':
          this.color = this.enemyId.startsWith('ene_a3_') ? '#B45309' : '#34D399'
          this.baseColor = this.color
          this.width = 36
          this.height = 36
          this.movementPattern = 'chase'
          this.damage = Math.max(12, Math.round(this.enemyData.hp * 0.18))
          break
        case 'Fast Flanker':
          this.color =
            this.enemyId === 'ene_a2_02'
              ? '#2DD4BF'
              : this.enemyId === 'ene_a3_02'
                ? '#FB923C'
                : '#FFD700'
          this.baseColor = this.color
          if (this.enemyId === 'ene_a2_02') {
            this.width = 24
            this.height = 24
          }
          this.movementPattern = 'zigzag'
          this.zigzagAmplitude = this.enemyId === 'ene_a2_02' ? 68 : 80
          this.zigzagFrequency = this.enemyId === 'ene_a2_02' ? 3.5 : 3
          break
        case 'Ranged Sniper':
          this.color =
            this.enemyId === 'ene_a2_03'
              ? '#34D399'
              : this.enemyId === 'ene_a3_03'
                ? '#FB923C'
                : '#00F0FF'
          this.baseColor = this.color
          this.movementPattern = 'flee'
          this.canShoot = true
          this.shootCooldownMax = this.enemyId === 'ene_a2_03' ? 1.75 : 2.0
          this.attackRange = this.enemyId === 'ene_a2_03' ? 330 : 300
          this.zigzagDirection = Math.random() < 0.5 ? 1 : -1
          break
        case 'Ranged Caster':
          this.color = this.enemyId === 'ene_a3_04' ? '#FACC15' : '#E879F9'
          this.baseColor = this.color
          this.width = 32
          this.height = 32
          this.movementPattern = 'flee'
          this.canShoot = true
          this.shootCooldownMax = 2.25
          this.attackRange = 350
          this.zigzagDirection = Math.random() < 0.5 ? 1 : -1
          break
        case 'Mini-Boss':
        case 'Boss':
          if (this.enemyId === 'ene_a2_05') {
            this.isMiniBoss = true
            this.isBoss = Boolean(options.isBoss)
            this.launchesAoeProjectiles = true
            this.color = '#F59E0B'
            this.baseColor = '#F59E0B'
            this.width = this.isBoss ? 72 : 56
            this.height = this.isBoss ? 72 : 56
            this.movementPattern = 'chase'
            this.damage = Math.max(16, Math.round(this.enemyData.hp * 0.08))
            this.attackRange = 540
            this.aoeCooldown = 0.9
            this.aoeCooldownMax = this.isBoss ? 2.1 : 2.6
            this.canShoot = this.isBoss
            this.shootCooldownMax = 2.0
            this.specialCooldown = 2.0
            this.specialCooldownMax = 4.2
          } else if (this.enemyId === 'ene_a3_05' || this.enemyId === 'ene_a3_06') {
            this.isMiniBoss = true
            this.isBoss = Boolean(options.isBoss)
            this.launchesAoeProjectiles = true
            this.color = this.enemyId === 'ene_a3_06' ? '#FB923C' : '#F97316'
            this.baseColor = this.color
            this.width = this.enemyId === 'ene_a3_06' ? 68 : 60
            this.height = this.width
            this.movementPattern = this.enemyId === 'ene_a3_06' ? 'orbit' : 'chase'
            this.damage = Math.max(20, Math.round(this.enemyData.hp * 0.1))
            this.attackRange = 620
            this.aoeCooldown = 0.85
            this.aoeCooldownMax = 2.3
            this.canShoot = true
            this.shootCooldownMax = this.enemyId === 'ene_a3_06' ? 1.7 : 1.95
            this.specialCooldown = 1.8
            this.specialCooldownMax = 3.8
          } else if (this.enemyId === 'boss_a2_05') {
            this.isBoss = true
            this.color = '#10B981' // Emerald Prism Monarch
            this.baseColor = '#10B981'
            this.width = 70
            this.height = 70
            this.canShoot = true
            this.shootCooldownMax = 1.45
            this.attackRange = 540
            this.specialCooldown = 1.5
            this.specialCooldownMax = 3.4
          } else if (this.enemyId === 'boss_a2_10') {
            this.isBoss = true
            this.launchesAoeProjectiles = true
            this.color = '#38BDF8' // Astral Vortex Colossus
            this.baseColor = '#38BDF8'
            this.width = 74
            this.height = 74
            this.canShoot = true
            this.shootCooldownMax = 1.35
            this.attackRange = 560
            this.aoeCooldown = 1.0
            this.aoeCooldownMax = 2.4
            this.specialCooldown = 1.4
            this.specialCooldownMax = 3.2
          } else if (this.enemyId === 'boss_a2_15') {
            this.isBoss = true
            this.launchesAoeProjectiles = true
            this.color = '#FACC15' // Solar Archon Seraph
            this.baseColor = '#FACC15'
            this.width = 92
            this.height = 92
            this.damage = 32
            this.canShoot = true
            this.shootCooldownMax = 1.5
            this.attackRange = 1600
            this.aoeCooldown = 1.1
            this.aoeCooldownMax = 2.3
            this.specialCooldown = 1.5
            this.specialCooldownMax = 3.4
          } else if (this.enemyId === 'boss_a2_20') {
            this.isBoss = true
            this.isAstralScourge = true
            this.launchesAoeProjectiles = false
            this.color = '#34D399'
            this.baseColor = '#FACC15'
            this.width = 76
            this.height = 76
            this.damage = 42
            this.damageReduction = 0.45
            this.enableEnrage = true
            this.bossTier = 4
            this.bossTitle = 'ASTRAL SCOURGE — FINAL BOSS (W20)'
            this.canShoot = true
            this.shootCooldown = 1.4
            this.shootCooldownMax = 1.4
            this.attackRange = 1800
            this.specialCooldown = 2.2
            this.specialCooldownMax = 3.1
            this.spawnDelay = WAVE_15_CUTSCENE_DURATION_SECONDS
            this.cutsceneDelayTimer = WAVE_15_CUTSCENE_DURATION_SECONDS
            const headCx = this.x + this.width / 2
            const headCy = this.y + this.height / 2
            this.dogSegments = Array.from({ length: 22 }, (_, idx) => ({
              x: headCx,
              y: headCy - (idx + 1) * 2,
              angle: Math.PI / 2
            }))
          } else if (this.enemyId.startsWith('boss_a3_')) {
            this.isBoss = true
            this.launchesAoeProjectiles = true
            const palette: Record<string, string> = {
              boss_a3_05: '#FB923C',
              boss_a3_10: '#FACC15',
              boss_a3_15: '#EA580C',
              boss_a3_20: '#FDE047'
            }
            this.color = palette[this.enemyId] || '#F97316'
            this.baseColor = this.color
            this.width = this.enemyId === 'boss_a3_20' ? 112 : this.enemyId === 'boss_a3_15' ? 100 : 82
            this.height = this.width
            this.damage = this.enemyId === 'boss_a3_20' ? 58 : 36
            this.canShoot = true
            this.shootCooldownMax = this.enemyId === 'boss_a3_20' ? 1.05 : 1.45
            this.attackRange = 1800
            this.aoeCooldown = 0.9
            this.aoeCooldownMax = this.enemyId === 'boss_a3_20' ? 1.8 : 2.4
            this.specialCooldown = 1.3
            this.specialCooldownMax = this.enemyId === 'boss_a3_20' ? 2.4 : 3.4
            if (this.enemyId === 'boss_a3_20') {
              this.isStationaryBoss = false
              this.movementPattern = 'orbit'
              this.baseSpeed = 320
              this.speed = 320
              this.damageReduction = 0.22
              this.enableEnrage = true
            }
          } else if (this.enemyId === 'boss_secret_dog') {
            this.isBoss = true
            this.isDevourerOfGods = true
            this.launchesAoeProjectiles = false
            this.color = '#22D3EE'
            this.baseColor = '#E879F9'
            this.width = 76
            this.height = 76
            this.damage = 46
            this.damageReduction = 0.45
            this.enableEnrage = true
            this.bossTier = 4
            this.bossTitle = 'DEVOURER OF GODS'
            this.canShoot = true
            this.shootCooldown = 1.6
            this.shootCooldownMax = 1.45
            this.attackRange = 1800
            this.specialCooldown = 2.4
            this.specialCooldownMax = 3.25
            this.spawnDelay = DEVOURER_CUTSCENE_DURATION_SECONDS
            this.cutsceneDelayTimer = DEVOURER_CUTSCENE_DURATION_SECONDS
            const headCx = this.x + this.width / 2
            const headCy = this.y + this.height / 2
            this.dogSegments = Array.from({ length: 22 }, (_, idx) => ({
              x: headCx,
              y: headCy - (idx + 1) * 2
            })).map((pos) => ({ ...pos, angle: Math.PI / 2 }))
          } else {
            this.isBoss = true
            this.color = '#FFD700' // Hazard gold for boss
            this.baseColor = '#FFD700'
            this.width = 68
            this.height = 68
            this.canShoot = true
            this.shootCooldownMax = 1.5
            this.attackRange = 520
            this.specialCooldown = 1.6
            this.specialCooldownMax = 3.6
          }
          break
        default:
          this.color = '#FF0055' // Alert red for swarm
          this.baseColor = '#FF0055'
          this.movementPattern = 'chase'
      }
    }
    
    // Non-seed boss scaling
    if (this.isBoss && !this.enemyData) {
      this.width = 68
      this.height = 68
      this.maxHealth *= 6
      this.health = this.maxHealth
      this.baseSpeed *= 0.6
      this.speed = this.baseSpeed
      this.damage *= 2
      this.coinValue *= 5
      this.canShoot = true
      this.shootCooldownMax = 1.5
      this.attackRange = 520
      this.specialCooldown = 1.6
      this.specialCooldownMax = 3.6
    }

    // Wave 15 Stationary Upper-Center Boss adjustments
    if (this.isStationaryBoss) {
      this.isBoss = true
      this.type = 'Boss'
      this.width = 92
      this.height = 92
      this.baseSpeed = 0
      this.speed = 0
      this.velocity = Vector2.zero()
      this.canShoot = true
      this.shootCooldownMax = 1.65
      this.attackRange = 1600
      this.specialCooldown = 1.2
      this.specialCooldownMax = 3.4
      if (
        (this.isFinalBoss || this.isWave15SpecialBoss) &&
        !this.isDevourerOfGods &&
        !this.isAstralScourge
      ) {
        const cutsceneDuration =
          getWave15CutsceneTheme(this.enemyId === 'boss_a2_15' ? 'astral_citadel' : 'carbon_sector')
            .durationSeconds ?? WAVE_15_CUTSCENE_DURATION_SECONDS
        this.spawnDelay = cutsceneDuration
        this.cutsceneDelayTimer = cutsceneDuration
      }
      if (this.anchorPos) {
        this.x = this.anchorPos.x - this.width / 2
        this.y = this.anchorPos.y - this.height / 2
      }
    } else if (
      (this.isFinalBoss || this.isWave15SpecialBoss) &&
      !this.isDevourerOfGods &&
      !this.isAstralScourge
    ) {
      const cutsceneDuration =
        getWave15CutsceneTheme(this.enemyId === 'boss_a2_15' ? 'astral_citadel' : 'carbon_sector')
          .durationSeconds ?? WAVE_15_CUTSCENE_DURATION_SECONDS
      this.spawnDelay = cutsceneDuration
      this.cutsceneDelayTimer = cutsceneDuration
    }

    if (this.isAstralScourge && this.isFinalBoss) {
      this.maxHealth = ASTRAL_SCOURGE_PHASE_ONE_HP
      this.health = this.maxHealth
    }
  }

  /**
   * Update enemy state
   */
  update(deltaTime: number, player: Player | null = null): void {
    if (!this.isAlive) return
    
    // Set target if provided
    if (player) {
      this.target = player
    }
    
    this.animTime += deltaTime

    if (this.isAstralScourgeIntermission) {
      this.astralPhaseTwoActivationTimer = Math.max(
        0,
        this.astralPhaseTwoActivationTimer - deltaTime
      )
      if (this.astralPhaseTwoActivationTimer <= 0) {
        this.activateAstralScourgePhaseTwo()
      }
      return
    }

    if (this.isInferoDesperationPhase) {
      this.updateInferoDesperationPhase(deltaTime)
      return
    }

    // Handle spawning (including Devourer of Gods cosmic rift emergence cutscene)
    if (this.cutsceneDelayTimer > 0) {
      this.cutsceneDelayTimer = Math.max(0, this.cutsceneDelayTimer - deltaTime)
    }
    if (this.isSpawning) {
      this.spawnTime += deltaTime
      if (this.isAstralPhaseTwoRushing && this.phaseTwoRushStart && this.phaseTwoRushEnd) {
        this.phaseTwoRushElapsed += deltaTime
        const progress = Math.min(1, this.phaseTwoRushElapsed / ASTRAL_SCOURGE_PHASE_TWO_RUSH_SECONDS)
        const easedProgress = 1 - Math.pow(1 - progress, 3)
        const dx = this.phaseTwoRushEnd.x - this.phaseTwoRushStart.x
        const dy = this.phaseTwoRushEnd.y - this.phaseTwoRushStart.y
        this.x = this.phaseTwoRushStart.x + dx * easedProgress - this.width / 2
        this.y = this.phaseTwoRushStart.y + dy * easedProgress - this.height / 2
        this.facingAngle = Math.atan2(dy, dx)
        this.updateDogSegments(24)
        if (progress >= 1) {
          this.isAstralPhaseTwoRushing = false
          this.phaseTwoRushStart = null
          this.phaseTwoRushEnd = null
        }
      } else if (this.isInferoChampion) {
        // Entrance effects animate around the boss; only combat may move its body.
        this.velocity = Vector2.zero()
      } else if (this.isWormBoss) {
        const defaultDelay = this.isDevourerOfGods
          ? DEVOURER_CUTSCENE_DURATION_SECONDS
          : WAVE_15_CUTSCENE_DURATION_SECONDS
        const totalDelay = Math.max(0.5, this.spawnDelay || defaultDelay)
        const emergeProgress = Math.max(0, Math.min(1, 1 - this.cutsceneDelayTimer / totalDelay))
        this.facingAngle = Math.PI / 2 + Math.sin(this.animTime * 4) * 0.14
        const headCenter = this.getCenter()
        const targetSpacing = emergeProgress < 0.22 ? 2 : Math.min(24, ((emergeProgress - 0.22) / 0.78) * 24)
        this.updateDogSegments(targetSpacing, headCenter)
      }
      if (this.spawnTime >= this.spawnDelay && this.cutsceneDelayTimer <= 0) {
        this.isSpawning = false
      }
      this.color = this.baseColor
      return
    }
    
    // Update cooldowns and hit flash
    if (this.phaseTransitionTimer > 0) {
      this.phaseTransitionTimer = Math.max(0, this.phaseTransitionTimer - deltaTime)
    }
    if (this.astralGridCooldownRemaining > 0) {
      this.astralGridCooldownRemaining = Math.max(
        0,
        this.astralGridCooldownRemaining - deltaTime
      )
    }
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= deltaTime
      if (this.hitFlashTimer <= 0) {
        this.color = this.baseColor
      }
    }

    // Bosses never remain hard-frozen, including any status carried over when
    // an enemy is promoted into a boss encounter.
    if (this.isBoss || this.isMiniBoss) {
      this.freezeTimer = 0
      this.freezeImmuneTimer = 0
    }
    // Advance active frost freeze timer (frozen non-stationary enemies cannot move or attack)
    if (this.freezeImmuneTimer > 0) {
      this.freezeImmuneTimer = Math.max(0, this.freezeImmuneTimer - deltaTime)
    }
    if (this.freezeTimer > 0) {
      this.freezeTimer = Math.max(0, this.freezeTimer - deltaTime)
      if (this.freezeTimer === 0) {
        this.freezeImmuneTimer = 0.45
      }
      if (!this.isStationaryBoss) {
        this.velocity = Vector2.zero()
        this.slowMultiplier = 1.0
        this.updateProjectiles(deltaTime)
        this.updateAoeProjectiles(deltaTime)
        if (this.isInferoChampion) this.keepInferoSafeDistanceFromPlayer()
        return
      }
      // Stationary final bosses resist hard freeze with a chill slow
      this.slowMultiplier = Math.min(this.slowMultiplier, 0.55)
    }

    const combatDeltaTime = deltaTime * Math.max(1, this.attackRateMultiplier)
    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - combatDeltaTime)
    }
    
    if (this.shootCooldown > 0) {
      this.shootCooldown = Math.max(0, this.shootCooldown - combatDeltaTime)
    }
    
    // Movement pattern (stationary Wave 15 boss stays anchored; Worm bosses slither & dash)
    if (this.isInferoChampion) {
      this.updateInferoChampionMovement(deltaTime)
    } else if (this.isStationaryBoss) {
      this.velocity = Vector2.zero()
      if (this.anchorPos) {
        this.x = this.anchorPos.x - this.width / 2
        this.y = this.anchorPos.y - this.height / 2 + Math.sin(this.animTime * 2.2) * 3
      }
    } else if (this.isWormBoss) {
      const orbitalGrid =
        this.isAstralScourge && this.bossPhase >= 2
          ? this.telegraphs.find((telegraph) => telegraph.kind === 'astral_orbital_grid')
          : undefined
      if (!orbitalGrid || !this.updateAstralGridOrbit(orbitalGrid, deltaTime)) {
        this.updateDevourerMovement(deltaTime)
      }
    } else {
      switch (this.movementPattern) {
        case 'chase':
          this.updateChase(deltaTime)
          break
        case 'zigzag':
          this.updateZigzag(deltaTime)
          break
        case 'flee':
          this.updateFlee(deltaTime)
          break
        case 'orbit':
          this.updateOrbit(deltaTime)
          break
      }
    }

    if (this.isWormBoss && Math.hypot(this.velocity.x, this.velocity.y) > 4) {
      this.facingAngle = Math.atan2(this.velocity.y, this.velocity.x)
    } else if (this.target) {
      const tc = this.target.getCenter()
      const mc = this.getCenter()
      this.facingAngle = Math.atan2(tc.y - mc.y, tc.x - mc.x)
    } else if (Math.hypot(this.velocity.x, this.velocity.y) > 1) {
      this.facingAngle = Math.atan2(this.velocity.y, this.velocity.x)
    }
    
    // Apply velocity with cryo slow multiplier
    if (!this.isStationaryBoss) {
      this.x += this.velocity.x * this.slowMultiplier * deltaTime
      this.y += this.velocity.y * this.slowMultiplier * deltaTime
    }
    if (this.isWormBoss) {
      const lockedAstralRing =
        this.isAstralScourge && this.bossPhase >= 2
          ? this.telegraphs.find(
              (telegraph) =>
                telegraph.kind === 'astral_orbital_grid' &&
                telegraph.ringLocked &&
                !telegraph.isEscaping
            )
          : undefined
      if (lockedAstralRing?.ringLockedSegments) {
        if (lockedAstralRing.ringLockedHeadX !== undefined) {
          this.x = lockedAstralRing.ringLockedHeadX - this.width / 2
        }
        if (lockedAstralRing.ringLockedHeadY !== undefined) {
          this.y = lockedAstralRing.ringLockedHeadY - this.height / 2
        }
        this.dogSegments = lockedAstralRing.ringLockedSegments.map((segment) => ({ ...segment }))
      } else {
        this.updateDogSegments(24)
      }
    }
    this.slowMultiplier = 1.0
    
    // Range-based shooting
    if (this.canShoot && this.target && !this.target.isAlive) {
      this.target = null
    }
    
    if (this.canShoot && this.target && this.shootCooldown <= 0) {
      const distance = Vector2.distance(this.getCenter(), this.target.getCenter())
      if (distance <= this.attackRange) {
        this.shoot()
        this.shootCooldown = this.shootCooldownMax
      }
    }

    // Dodgeable AoE projectile launcher (Area 2 slow tanky mini-boss)
    if (this.launchesAoeProjectiles) {
      this.updateAoeProjectiles(deltaTime)
      if (this.aoeCooldown > 0) {
        this.aoeCooldown = Math.max(0, this.aoeCooldown - combatDeltaTime)
      }
      if (this.aoeCooldown <= 0 && this.target && this.target.isAlive) {
        const distToTarget = Vector2.distance(this.getCenter(), this.target.getCenter())
        if (distToTarget <= this.attackRange) {
          this.launchAoeProjectile()
          if (this.isBoss) {
            const tc = this.target.getCenter()
            this.launchAoeProjectile({
              x: tc.x + (Math.random() < 0.5 ? -105 : 105),
              y: tc.y + (Math.random() < 0.5 ? -75 : 75)
            })
          }
          this.aoeCooldown = this.aoeCooldownMax
        }
      }
    }

    // Boss big telegraphed dodgeable attacks
    if (this.isBoss) {
      this.updateTelegraphs(deltaTime)
      if (this.specialCooldown > 0) {
        this.specialCooldown = Math.max(0, this.specialCooldown - combatDeltaTime)
      }
      const hasPendingMajorPattern =
        (this.isStationaryBoss || this.isWormBoss || this.isInferoChampion) &&
        this.telegraphs.some(
          (t) =>
            !t.hasTriggered ||
            t.kind === 'closing_side_lasers' ||
            t.kind === 'bullet_hell' ||
            t.kind === 'tracking_strikes' ||
            t.kind === 'pursuit_beam' ||
            t.kind === 'rotating_cross_lasers' ||
            t.kind === 'void_meteor_salvo' ||
            t.kind === 'singularity_grid' ||
            t.kind === 'cosmic_laser_walls' ||
            t.kind === 'astral_orbital_grid' ||
            t.kind === 'astral_targeted_lasers' ||
            t.kind === 'inferno_spear_volley' ||
            t.kind === 'infero_spinning_lattice' ||
            t.kind === 'infero_orbiting_lances' ||
            t.kind === 'infero_spear_cascade' ||
            t.kind === 'infero_underflame_swoops' ||
            t.kind === 'cosmic_portal_lunge' ||
            t.kind === 'cosmic_orb_barrage'
        )
      if (this.specialCooldown <= 0 && !hasPendingMajorPattern && this.target && this.target.isAlive) {
        const distToTarget = Vector2.distance(this.getCenter(), this.target.getCenter())
        const triggerRange =
          this.isStationaryBoss || this.isWormBoss || this.isInferoChampion ? 1800 : 560
        if (distToTarget <= triggerRange) {
          this.spawnTelegraphedAttack()
          this.specialCooldown = this.isInferoChampion
            ? this.bossPhase >= 3
              ? 1.65
              : 2.1
            : this.isStationaryBoss
            ? this.bossPhase >= 3
              ? 1.7
              : this.bossPhase === 2
                ? 1.95
                : 2.25
            : this.isWormBoss
              ? this.isEnraged || this.bossPhase >= 3
                ? 2.05
                : this.bossPhase === 2
                  ? 2.4
                  : 2.75
              : Math.max(2.6, this.specialCooldownMax - (this.bossTier - 1) * 0.15)
        }
      }
    }
    
    // Update projectiles
    this.updateProjectiles(deltaTime)
    
    // Boundary check
    this.clampToBounds()
    if (
      this.isInferoChampion &&
      !this.telegraphs.some(
        (attack) =>
          (attack.kind === 'infero_underflame_swoops' && attack.hasTriggered) ||
          attack.kind === 'infero_aimed_ram'
      )
    ) {
      this.keepInferoSafeDistanceFromPlayer()
    }
  }

  /**
   * Chase movement - directly toward target
   */
  private updateChase(_deltaTime: number): void {
    if (!this.target || !this.target.isAlive) {
      this.velocity = Vector2.zero()
      return
    }
    
    const direction = Vector2.normalize(
      Vector2.subtract(this.target.getCenter(), this.getCenter())
    )
    
    this.velocity = Vector2.multiply(direction, this.speed)
    this.direction = direction
  }

  /**
   * Devourer of Gods cosmic serpent slither + periodic high-speed lunge dash
   */
  private updateDevourerMovement(deltaTime: number): void {
    if (!this.target || !this.target.isAlive) {
      this.velocity = Vector2.zero()
      return
    }

    const headCenter = this.getCenter()
    const targetCenter = this.target.getCenter()
    const toTarget = Vector2.subtract(targetCenter, headCenter)
    const dist = Math.hypot(toTarget.x, toTarget.y) || 1
    const toward = { x: toTarget.x / dist, y: toTarget.y / dist }
    const perp = { x: -toward.y, y: toward.x }
    const astralPhaseTwo = this.isAstralScourge && this.bossPhase >= 2

    if (astralPhaseTwo) {
      // Preserve the explicit rift lunge, but make ordinary pursuit a continuous,
      // momentum-carrying ram that steers gradually rather than firing on a timer.
      if (this.dogDashTimer > 0) {
        this.dogDashTimer = Math.max(0, this.dogDashTimer - deltaTime)
        this.velocity = {
          x: this.dogDashDir.x * this.speed * 3.8,
          y: this.dogDashDir.y * this.speed * 3.8
        }
        this.direction = this.dogDashDir
        return
      }

      if (this.astralRamHeading === null) {
        this.astralRamHeading =
          Math.hypot(this.velocity.x, this.velocity.y) > 1
            ? Math.atan2(this.velocity.y, this.velocity.x)
            : Math.atan2(toward.y, toward.x)
      }
      const desiredHeading = Math.atan2(toward.y, toward.x)
      let headingDifference = desiredHeading - this.astralRamHeading
      while (headingDifference > Math.PI) headingDifference -= Math.PI * 2
      while (headingDifference < -Math.PI) headingDifference += Math.PI * 2
      const maxTurn = 1.6 * deltaTime
      this.astralRamHeading +=
        Math.abs(headingDifference) <= maxTurn
          ? headingDifference
          : Math.sign(headingDifference) * maxTurn

      const maxRamSpeed = this.speed * 2.6
      this.astralRamSpeed = Math.min(
        maxRamSpeed,
        this.astralRamSpeed + this.speed * 2.8 * deltaTime
      )
      this.velocity = {
        x: Math.cos(this.astralRamHeading) * this.astralRamSpeed,
        y: Math.sin(this.astralRamHeading) * this.astralRamSpeed
      }
      this.direction = {
        x: Math.cos(this.astralRamHeading),
        y: Math.sin(this.astralRamHeading)
      }
      return
    }

    if (this.dogDashTimer > 0) {
      this.dogDashTimer = Math.max(0, this.dogDashTimer - deltaTime)
      const dashMult = this.isEnraged ? 2.85 : 2.35
      this.velocity = {
        x: this.dogDashDir.x * this.speed * dashMult,
        y: this.dogDashDir.y * this.speed * dashMult
      }
      this.direction = this.dogDashDir
      return
    }

    this.dogDashCooldown -= deltaTime
    if (this.dogDashCooldown <= 0 && dist > 110) {
      this.dogDashTimer = this.isEnraged ? 0.96 : 0.84
      this.dogDashCooldown = this.isEnraged ? 2.9 : 4.0
      this.dogDashDir = toward
      this.velocity = {
        x: toward.x * this.speed * 2.4,
        y: toward.y * this.speed * 2.4
      }
      this.direction = toward
      return
    }

    const waveAmp = dist > 180 ? 0.68 : 1.05
    const slitherOffset = Math.sin(this.animTime * 3.1) * waveAmp
    const rawDir = {
      x: toward.x + perp.x * slitherOffset,
      y: toward.y + perp.y * slitherOffset
    }
    const moveDir = Vector2.normalize(rawDir)
    this.velocity = Vector2.multiply(moveDir, this.speed)
    this.direction = moveDir
  }

  /**
   * Inferno Champion travels between fixed arena waypoints and gently hovers.
   * Its separation correction prevents body contact even if the player closes in.
   */
  private updateInferoChampionMovement(deltaTime: number, applyPosition = false): void {
    if (!this.target || !this.target.isAlive) {
      this.velocity = Vector2.zero()
      return
    }
    if (
      this.telegraphs.some(
        (attack) =>
          (attack.kind === 'infero_underflame_swoops' && attack.hasTriggered) ||
          attack.kind === 'infero_aimed_ram' ||
          (attack.kind === 'infero_rebound_lances' && attack.hasTriggered) ||
          (attack.kind === 'infero_spear_cascade' && attack.hasTriggered)
      )
    ) {
      this.velocity = Vector2.zero()
      return
    }

    const targetCenter = this.target.getCenter()
    const currentCenter = this.getCenter()
    const positioningAttack = this.telegraphs.find(
      (attack) =>
        (attack.kind === 'inferno_spear_volley' ||
          attack.kind === 'infero_spear_cascade' ||
          attack.kind === 'infero_spinning_lattice' ||
          (attack.kind === 'infero_underflame_swoops' && !attack.hasTriggered) ||
          (attack.kind === 'infero_rebound_lances' && !attack.hasTriggered)) &&
        attack.inferoLaunchX !== undefined &&
        attack.inferoLaunchY !== undefined
    )
    let desiredCenter: Vector2
    if (positioningAttack?.inferoLaunchX !== undefined && positioningAttack.inferoLaunchY !== undefined) {
      this.inferoHoverTarget = {
        x: positioningAttack.inferoLaunchX,
        y: positioningAttack.inferoLaunchY
      }
      this.inferoHoverRetargetTimer = Math.max(0, this.inferoHoverRetargetTimer - deltaTime)
      desiredCenter = {
        x: positioningAttack.inferoLaunchX + Math.sin(this.animTime * 1.3) * 12,
        y: positioningAttack.inferoLaunchY + Math.sin(this.animTime * 1.8) * 18
      }
      if (positioningAttack.kind === 'infero_underflame_swoops') {
        desiredCenter = {
          x: positioningAttack.inferoLaunchX,
          y: positioningAttack.inferoLaunchY
        }
        const clearance = this.getInferoMinimumPlayerDistance() + 30
        // Travel around the player instead of getting stuck against the
        // body-contact protection while approaching from above.
        if (currentCenter.y < targetCenter.y + clearance * 0.85) {
          const limits = this.getInferoCenterLimits()
          const side = currentCenter.x >= targetCenter.x ? 1 : -1
          const sideX = Math.max(
            limits.x.min,
            Math.min(limits.x.max, targetCenter.x + side * clearance)
          )
          desiredCenter = {
            x: sideX,
            y: Math.abs(currentCenter.x - targetCenter.x) < clearance * 0.9
              ? currentCenter.y
              : positioningAttack.inferoLaunchY
          }
        }
      }
    } else {
      this.inferoHoverRetargetTimer -= deltaTime
      const playerDistance = Vector2.distance(currentCenter, targetCenter)
      if (
        !this.inferoHoverTarget ||
        this.inferoHoverRetargetTimer <= 0 ||
        playerDistance > 760
      ) {
        const angle = Math.random() * Math.PI * 2
        const distance = 450 + Math.random() * 240
        const centerLimits = this.getInferoCenterLimits()
        this.inferoHoverTarget = {
          x: Math.max(
            centerLimits.x.min,
            Math.min(centerLimits.x.max, targetCenter.x + Math.cos(angle) * distance)
          ),
          y: Math.max(
            centerLimits.y.min,
            Math.min(centerLimits.y.max, targetCenter.y + Math.sin(angle) * distance)
          )
        }
        this.inferoHoverRetargetTimer = 4.2 + Math.random() * 1.8
      }

      desiredCenter = {
        x: this.inferoHoverTarget.x + Math.sin(this.animTime * 1.3) * 12,
        y: this.inferoHoverTarget.y + Math.sin(this.animTime * 1.8) * 18
      }
    }
    desiredCenter = this.clampInferoCenter(desiredCenter)

    const dx = desiredCenter.x - currentCenter.x
    const dy = desiredCenter.y - currentCenter.y
    const distance = Math.hypot(dx, dy)
    const moveSpeed = this.baseSpeed * (
      positioningAttack?.kind === 'inferno_spear_volley'
        ? 6
        : positioningAttack?.kind === 'infero_spear_cascade'
          ? 8
          : positioningAttack?.kind === 'infero_underflame_swoops'
          ? 2.4
          : positioningAttack?.kind === 'infero_rebound_lances'
            ? 5.5
          : this.bossPhase >= 3 ? 1.22 : this.bossPhase === 2 ? 1.08 : 1
    )
    const maxStep = Math.min(distance, moveSpeed * Math.max(deltaTime, 0))
    const safeDistance = Math.max(distance, 0.001)
    const nextCenter = {
      x: currentCenter.x + (dx / safeDistance) * maxStep,
      y: currentCenter.y + (dy / safeDistance) * maxStep
    }
    const safeDelta = Math.max(deltaTime, 0.001)
    this.velocity = {
      x: (nextCenter.x - currentCenter.x) / safeDelta,
      y: (nextCenter.y - currentCenter.y) / safeDelta
    }
    this.direction = Vector2.normalize(this.velocity)

    if (applyPosition) {
      this.x = nextCenter.x - this.width / 2
      this.y = nextCenter.y - this.height / 2
      this.clampToBounds()
      this.keepInferoSafeDistanceFromPlayer()
      const safeCenter = this.clampInferoCenter(this.getCenter())
      this.x = safeCenter.x - this.width / 2
      this.y = safeCenter.y - this.height / 2
    }
  }

  private updateInferoDesperationPhase(deltaTime: number): void {
    this.inferoDesperationTrail.update(deltaTime)
    this.inferoDesperationTimer = Math.min(
      INFERO_DESPERATION_DURATION_SECONDS,
      this.inferoDesperationTimer + deltaTime
    )
    if (this.inferoDesperationTimer >= INFERO_DESPERATION_DURATION_SECONDS) {
      this.velocity = Vector2.zero()
      this.pendingInferoDesperationCompletion = true
      return
    }

    this.inferoDesperationCycleTimer += deltaTime

    if (this.inferoDesperationCycleMode === 'portal') {
      this.velocity = Vector2.zero()
      if (!this.inferoDesperationPortalPosition) {
        this.openInferoDesperationPortal()
      }

      const targetCenter = this.inferoDesperationLockedTarget
      const portalCenter = this.inferoDesperationPortalPosition!
      if (targetCenter) {
        this.facingAngle = Math.atan2(targetCenter.y - portalCenter.y, targetCenter.x - portalCenter.x)
      }

      if (this.inferoDesperationCycleTimer >= INFERO_DESPERATION_PORTAL_SECONDS) {
        // Emerge and launch at the position marked when the portal first opened.
        this.x = portalCenter.x - this.width / 2
        this.y = portalCenter.y - this.height / 2
        if (targetCenter) {
          const dx = targetCenter.x - portalCenter.x
          const dy = targetCenter.y - portalCenter.y
          const distance = Math.hypot(dx, dy) || 1
          this.inferoDesperationDirection = { x: dx / distance, y: dy / distance }
          // Keep the dash active until it passes the locked target, not a fixed early reset.
          this.inferoDesperationRamDuration = Math.min(
            INFERO_DESPERATION_RAM_SECONDS,
            Math.max(0.22, (distance + 110) / INFERO_DESPERATION_RAM_SPEED)
          )
        }
        this.facingAngle = Math.atan2(
          this.inferoDesperationDirection.y,
          this.inferoDesperationDirection.x
        )
        this.inferoDesperationCycleMode = 'ram'
        this.inferoDesperationTrail.beginDash()
        this.inferoDesperationCycleTimer = 0
        this.velocity = {
          x: this.inferoDesperationDirection.x * INFERO_DESPERATION_RAM_SPEED,
          y: this.inferoDesperationDirection.y * INFERO_DESPERATION_RAM_SPEED
        }
      }
      return
    }

    if (this.inferoDesperationCycleMode === 'ram') {
      const previousCenter = this.getCenter()
      this.x += this.velocity.x * deltaTime
      this.y += this.velocity.y * deltaTime
      const clampedCenter = this.clampInferoCenter(this.getCenter())
      this.x = clampedCenter.x - this.width / 2
      this.y = clampedCenter.y - this.height / 2
      this.inferoDesperationTrail.emit(previousCenter, this.getCenter())

      if (this.inferoDesperationCycleTimer >= this.inferoDesperationRamDuration) {
        this.velocity = Vector2.zero()
        this.inferoDesperationCycleMode = 'recover'
        this.inferoDesperationCycleTimer = 0
        this.inferoDesperationPortalPosition = null
      }
      return
    }

    this.velocity = Vector2.zero()
    if (this.inferoDesperationCycleTimer >= INFERO_DESPERATION_RECOVERY_SECONDS) {
      this.inferoDesperationCycleMode = 'portal'
      this.inferoDesperationCycleTimer = 0
      this.openInferoDesperationPortal()
    }
  }

  private openInferoDesperationPortal(): void {
    const limits = this.getInferoCenterLimits()
    const target = this.target?.getCenter() ?? this.getInferoArenaCenter()
    const baseAngle = this.inferoDesperationPortalIndex++ * 2.399963
    let portal = this.clampInferoCenter(target)
    let bestScore = Infinity
    // Nearby approach positions replace distant corners, including near arena edges.
    for (let index = 0; index < 16; index++) {
      const angle = baseAngle + index * Math.PI / 8
      const candidate = {
        x: Math.max(limits.x.min, Math.min(limits.x.max, target.x + Math.cos(angle) * 340)),
        y: Math.max(limits.y.min, Math.min(limits.y.max, target.y + Math.sin(angle) * 340))
      }
      const distance = Vector2.distance(candidate, target)
      const score = Math.abs(340 - distance) + index * 0.01
      if (score < bestScore) {
        portal = candidate
        bestScore = score
      }
    }
    this.inferoDesperationPortalPosition = { ...portal }
    this.inferoDesperationLockedTarget = { ...target }
  }

  get inferoDesperationWhiteOpacity(): number {
    return Math.max(0, Math.min(1, this.inferoDesperationTimer / INFERO_DESPERATION_DURATION_SECONDS))
  }

  completeInferoDesperation(): boolean {
    if (
      !this.isAlive ||
      !this.isInferoDesperationPhase ||
      !this.pendingInferoDesperationCompletion ||
      this.inferoDesperationTimer < INFERO_DESPERATION_DURATION_SECONDS
    ) return false
    this.pendingInferoDesperationCompletion = false
    this.isInferoDesperationPhase = false
    this.hasCompletedInferoDesperation = true
    this.health = 0
    this.isAlive = false
    this.isDying = true
    this.deathTimer = 0
    this.inferoDesperationPortalPosition = null
    return true
  }

  private getInferoCenterLimits(): {
    x: { min: number; max: number }
    y: { min: number; max: number }
  } {
    const view = this.getInferoViewportBounds()
    const axisLimits = (
      visibleMin: number,
      visibleMax: number,
      arenaMax: number,
      size: number
    ) => {
      // Include the wide wings and flame crown, not only the body hitbox.
      const margin = size * 0.85 + 32
      const min = Math.max(margin, visibleMin + margin)
      const max = Math.min(arenaMax - margin, visibleMax - margin)
      if (min <= max) return { min, max }
      const center = Math.max(margin, Math.min(arenaMax - margin, (visibleMin + visibleMax) / 2))
      return { min: center, max: center }
    }

    return {
      x: axisLimits(view.left, view.right, GAME_ARENA_SIZE, this.width),
      y: axisLimits(view.top, view.bottom, GAME_ARENA_SIZE, this.height)
    }
  }

  private getInferoViewportBounds(): { left: number; right: number; top: number; bottom: number } {
    const view = this.visibleWorldBounds ?? {
      left: 0,
      right: GAME_ARENA_SIZE,
      top: 0,
      bottom: GAME_ARENA_SIZE
    }
    const left = Math.max(0, Math.min(GAME_ARENA_SIZE, view.left))
    const right = Math.max(left, Math.min(GAME_ARENA_SIZE, view.right))
    const top = Math.max(0, Math.min(GAME_ARENA_SIZE, view.top))
    const bottom = Math.max(top, Math.min(GAME_ARENA_SIZE, view.bottom))
    return { left, right, top, bottom }
  }

  private clampInferoCenter(center: Vector2): Vector2 {
    const limits = this.getInferoCenterLimits()
    return {
      x: Math.max(limits.x.min, Math.min(limits.x.max, center.x)),
      y: Math.max(limits.y.min, Math.min(limits.y.max, center.y))
    }
  }

  private getInferoArenaCenter(): Vector2 {
    if (this.arenaBounds) {
      return {
        x: this.arenaBounds.left + this.arenaBounds.width / 2,
        y: this.arenaBounds.top + this.arenaBounds.height / 2
      }
    }
    return { x: GAME_ARENA_SIZE / 2, y: GAME_ARENA_SIZE / 2 }
  }

  private getInferoMinimumPlayerDistance(): number {
    if (!this.target) return this.width + 48
    return (
      Math.hypot(this.width, this.height) / 2 +
      Math.hypot(this.target.width, this.target.height) / 2 +
      44
    )
  }

  private keepInferoSafeDistanceFromPlayer(): void {
    const visibleCenter = this.clampInferoCenter(this.getCenter())
    this.x = visibleCenter.x - this.width / 2
    this.y = visibleCenter.y - this.height / 2
    if (!this.target || !this.target.isAlive) return

    const targetCenter = this.target.getCenter()
    const currentCenter = this.getCenter()
    const minimumDistance = this.getInferoMinimumPlayerDistance()
    const currentDistance = Math.hypot(
      currentCenter.x - targetCenter.x,
      currentCenter.y - targetCenter.y
    )
    if (currentDistance >= minimumDistance) return

    const limits = this.getInferoCenterLimits()
    const minX = limits.x.min
    const maxX = limits.x.max
    const minY = limits.y.min
    const maxY = limits.y.max
    let best: { x: number; y: number; distance: number; travel: number } | null = null

    for (let index = 0; index < 24; index++) {
      const angle = (index / 24) * Math.PI * 2
      const x = Math.max(
        minX,
        Math.min(maxX, targetCenter.x + Math.cos(angle) * (minimumDistance + 8))
      )
      const y = Math.max(
        minY,
        Math.min(maxY, targetCenter.y + Math.sin(angle) * (minimumDistance + 8))
      )
      const separation = Math.hypot(x - targetCenter.x, y - targetCenter.y)
      const travel = Math.hypot(x - currentCenter.x, y - currentCenter.y)
      if (
        !best ||
        (separation >= minimumDistance && best.distance < minimumDistance) ||
        (separation >= minimumDistance &&
          best.distance >= minimumDistance &&
          travel < best.travel) ||
        (separation < minimumDistance &&
          best.distance < minimumDistance &&
          separation > best.distance)
      ) {
        best = { x, y, distance: separation, travel }
      }
    }

    if (best) {
      this.x = best.x - this.width / 2
      this.y = best.y - this.height / 2
    }
  }

  private updateAstralGridOrbit(attack: BossTelegraphAttack, deltaTime: number): boolean {
    if (!this.target || !this.target.isAlive) return false

    const targetCenter = this.target.getCenter()
    const currentCenter = this.getCenter()
    if (attack.hasTriggered && attack.activeTimer >= (attack.laserDuration ?? attack.activeDuration)) {
      if (!attack.isEscaping) {
        attack.isEscaping = true
        this.dogDashCooldown = Math.max(this.dogDashCooldown, attack.escapeDuration ?? 1.35)
      }
      const away = Vector2.normalize({
        x: currentCenter.x - targetCenter.x,
        y: currentCenter.y - targetCenter.y
      })
      const safeDelta = Math.max(deltaTime, 0.001)
      const speed = Math.max(560, this.speed * 3.5)
      const minX = this.arenaBounds ? this.arenaBounds.left + 64 : 80
      const maxX = this.arenaBounds ? this.arenaBounds.left + this.arenaBounds.width - 64 : 1920
      const minY = this.arenaBounds ? this.arenaBounds.top + 140 : 80
      const maxY = this.arenaBounds ? this.arenaBounds.top + this.arenaBounds.height - 64 : 1920
      const nextCenter = {
        x: Math.max(minX, Math.min(maxX, currentCenter.x + away.x * speed * safeDelta)),
        y: Math.max(minY, Math.min(maxY, currentCenter.y + away.y * speed * safeDelta))
      }
      this.velocity = {
        x: (nextCenter.x - currentCenter.x) / safeDelta,
        y: (nextCenter.y - currentCenter.y) / safeDelta
      }
      this.direction = Vector2.normalize(this.velocity)
      return true
    }

    const nextAngle =
      (attack.orbitAngle ??
        Math.atan2(
          currentCenter.y - (attack.orbitCenterY ?? targetCenter.y),
          currentCenter.x - (attack.orbitCenterX ?? targetCenter.x)
        )) +
      (attack.turnRate ?? 3) * deltaTime
    const orbitRadius = attack.orbitRadius ?? 360
    if (attack.ringLocked && !attack.isEscaping) {
      this.velocity = Vector2.zero()
      return true
    }
    const nextCenter = {
      x: (attack.orbitCenterX ?? targetCenter.x) + Math.cos(nextAngle) * orbitRadius,
      y: (attack.orbitCenterY ?? targetCenter.y) + Math.sin(nextAngle) * orbitRadius
    }
    const safeDelta = Math.max(deltaTime, 0.001)
    const movementScale = Math.max(0.15, this.slowMultiplier)
    attack.orbitAngle = nextAngle
    attack.orbitElapsed = (attack.orbitElapsed ?? 0) + deltaTime
    this.velocity = {
      x: (nextCenter.x - currentCenter.x) / (safeDelta * movementScale),
      y: (nextCenter.y - currentCenter.y) / (safeDelta * movementScale)
    }
    this.direction = Vector2.normalize(this.velocity)
    return true
  }

  /**
   * Follow-the-leader chain kinematics for the 22 Devourer of Gods segments
   */
  private updateDogSegments(spacing = 24, forcedHeadCenter?: Vector2): void {
    if (this.dogSegments.length === 0) return

    const formingAstralRing =
      this.isAstralScourge && this.bossPhase >= 2
        ? this.telegraphs.find(
            (attack) =>
              attack.kind === 'astral_orbital_grid' &&
              !attack.ringLocked &&
              !attack.isEscaping
          )
        : undefined
    if (formingAstralRing) {
      const radius = formingAstralRing.orbitRadius ?? 320
      const centerX = formingAstralRing.orbitCenterX ?? this.getCenter().x
      const centerY = formingAstralRing.orbitCenterY ?? this.getCenter().y
      const startAngle = formingAstralRing.orbitStartAngle ?? formingAstralRing.orbitAngle ?? 0
      const currentAngle = formingAstralRing.orbitAngle ?? startAngle
      const turnSign = Math.sign(formingAstralRing.turnRate ?? 3) || 1
      const distanceTravelled =
        (formingAstralRing.orbitElapsed ?? 0) *
        Math.abs(formingAstralRing.turnRate ?? 3) *
        radius
      const startPoint = {
        x: centerX + Math.cos(startAngle) * radius,
        y: centerY + Math.sin(startAngle) * radius
      }
      const startTangent = {
        x: -Math.sin(startAngle) * turnSign,
        y: Math.cos(startAngle) * turnSign
      }

      this.dogSegments.forEach((segment, index) => {
        const segmentDistance = (index + 1) * spacing
        if (segmentDistance <= distanceTravelled) {
          const angle = currentAngle - turnSign * (segmentDistance / radius)
          segment.x = centerX + Math.cos(angle) * radius
          segment.y = centerY + Math.sin(angle) * radius
          segment.angle = angle + turnSign * (Math.PI / 2)
          return
        }

        const remainingDistance = segmentDistance - distanceTravelled
        segment.x = startPoint.x - startTangent.x * remainingDistance
        segment.y = startPoint.y - startTangent.y * remainingDistance
        segment.angle = startAngle + turnSign * (Math.PI / 2)
      })
      return
    }

    let leader = forcedHeadCenter ?? this.getCenter()
    for (let i = 0; i < this.dogSegments.length; i++) {
      const seg = this.dogSegments[i]
      const dx = leader.x - seg.x
      const dy = leader.y - seg.y
      const dist = Math.hypot(dx, dy)
      if (dist > 0.001) {
        const angle = Math.atan2(dy, dx)
        seg.angle = angle
        seg.x = leader.x - Math.cos(angle) * spacing
        seg.y = leader.y - Math.sin(angle) * spacing
      }
      leader = { x: seg.x, y: seg.y }
    }
  }

  beginAstralScourgePhaseTwoRush(
    start: { x: number; y: number },
    end: { x: number; y: number }
  ): void {
    if (!this.isAstralScourge || this.bossPhase !== 2) return

    this.phaseTwoRushStart = { ...start }
    this.phaseTwoRushEnd = { ...end }
    this.phaseTwoRushElapsed = 0
    this.isAstralPhaseTwoRushing = true
    this.spawnTime = 0
    this.spawnDelay = ASTRAL_SCOURGE_PHASE_TWO_CUTSCENE_SECONDS
    this.cutsceneDelayTimer = this.spawnDelay
    this.x = start.x - this.width / 2
    this.y = start.y - this.height / 2

    const headCenter = this.getCenter()
    this.dogSegments = Array.from({ length: ASTRAL_SCOURGE_PHASE_TWO_SEGMENT_COUNT }, (_, index) => ({
      x: headCenter.x,
      y: headCenter.y - (index + 1) * 2,
      angle: Math.PI / 2
    }))
  }

  private activateAstralScourgePhaseTwo(): void {
    this.isAstralScourgeIntermission = false
    this.astralPhaseTwoActivationTimer = 0
    this.maxHealth = ASTRAL_SCOURGE_PHASE_TWO_HP
    this.health = this.maxHealth
    this.bossPhase = 2
    this.isEnraged = true
    this.isDying = false
    this.deathTimer = 0
    this.isSpawning = true
    this.spawnTime = 0
    this.spawnDelay = ASTRAL_SCOURGE_PHASE_TWO_CUTSCENE_SECONDS
    this.cutsceneDelayTimer = this.spawnDelay
    this.phaseTransitionTimer = 0.85
    this.pendingAstralPhaseTwoCutscene = true
    this.pendingPhaseAnnouncement = null
    this.speed = this.baseSpeed * 1.26
    this.shootCooldownMax = this.isAstralScourge
      ? 3.2
      : Math.max(0.7, this.shootCooldownMax * 0.78)
    this.specialCooldownMax = Math.max(1.8, this.specialCooldownMax * 0.78)
    this.shootCooldown = this.isAstralScourge
      ? this.shootCooldownMax
      : Math.min(this.shootCooldown, 0.25)
    this.specialCooldown = 0.2
    this.dogDashTimer = 0
    this.dogDashCooldown = 0.8
    this.astralRamHeading = null
    this.astralRamSpeed = 0
    this.astralGridCooldownRemaining = 0
    this.telegraphs = []
    this.projectiles = []
    this.aoeProjectiles = []
  }

  /**
   * Zigzag movement - for fast flankers
   */
  private updateZigzag(deltaTime: number): void {
    this.zigzagTimer += deltaTime * this.zigzagFrequency
    
    // Basic movement toward target
    let direction = Vector2.zero()
    if (this.target && this.target.isAlive) {
      direction = Vector2.normalize(
        Vector2.subtract(this.target.getCenter(), this.getCenter())
      )
    }
    
    // Add perpendicular zigzag
    const zigzagOffset = Vector2.multiply(
      { x: -direction.y, y: direction.x },
      Math.sin(this.zigzagTimer) * this.zigzagAmplitude
    )
    
    const moveDirection = Vector2.normalize(
      Vector2.add(direction, zigzagOffset)
    )
    
    this.velocity = Vector2.multiply(moveDirection, this.speed)
    this.direction = moveDirection
  }

  /**
   * Skirmish / kiting movement - keeps ranged units within visible mid-range (155-245px)
   * instead of backing off to the very edge of the screen
   */
  private updateFlee(_deltaTime: number): void {
    if (!this.target || !this.target.isAlive) {
      this.velocity = Vector2.zero()
      return
    }

    const toTarget = Vector2.subtract(this.target.getCenter(), this.getCenter())
    const distance = Vector2.length(toTarget) || 1
    const toward = Vector2.normalize(toTarget)
    const tangent = {
      x: -toward.y * this.zigzagDirection,
      y: toward.x * this.zigzagDirection
    }

    const minEngagementDist = 155
    const maxEngagementDist = 245

    let moveDir: Vector2
    let moveSpeed = this.speed

    if (distance > maxEngagementDist) {
      // Approach into comfortable visible screen range with slight strafe
      moveDir = Vector2.normalize({
        x: toward.x * 0.9 + tangent.x * 0.35,
        y: toward.y * 0.9 + tangent.y * 0.35
      })
      moveSpeed = this.speed * 0.95
    } else if (distance < minEngagementDist) {
      // Back-strafe slightly away while orbiting laterally
      moveDir = Vector2.normalize({
        x: -toward.x * 0.45 + tangent.x * 0.85,
        y: -toward.y * 0.45 + tangent.y * 0.85
      })
      moveSpeed = this.speed * 0.9
    } else {
      // Circle-strafe smoothly at mid-range
      const radialCorrection = (distance - 200) / 100
      moveDir = Vector2.normalize({
        x: tangent.x + toward.x * radialCorrection * 0.35,
        y: tangent.y + toward.y * radialCorrection * 0.35
      })
      moveSpeed = this.speed * 0.82
    }

    this.velocity = Vector2.multiply(moveDir, moveSpeed)
    this.direction = moveDir
  }

  /**
   * Orbit movement - circle around target
   */
  private updateOrbit(deltaTime: number): void {
    if (!this.target || !this.target.isAlive) {
      this.velocity = Vector2.zero()
      return
    }
    
    const center = this.target.getCenter()
    const toTarget = Vector2.subtract(center, this.getCenter())
    const distance = Vector2.length(toTarget)
    
    // Orbit at a fixed distance
    const orbitDistance = this.attackRange * 0.8
    const angle = Math.atan2(toTarget.y, toTarget.x) + deltaTime * 1.5
    
    const orbitPosition = Vector2.add(
      center,
      Vector2.fromAngle(angle, orbitDistance)
    )
    
    this.velocity = Vector2.multiply(
      Vector2.normalize(
        Vector2.subtract(orbitPosition, this.getCenter())
      ),
      this.speed
    )
    
    this.direction = Vector2.normalize(this.velocity)
  }

  /**
   * Shoot projectile(s) at target
   * Boss (Aegis Commander Drone) alternates 8-way radial burst with 3-shot aimed volley
   */
  private shoot(): void {
    if (!this.target || !this.canShoot || this.isInferoChampion) return
    
    const startPos = this.getCenter()
    const direction = Vector2.normalize(
      Vector2.subtract(this.target.getCenter(), startPos)
    )

    if (this.isWormBoss) {
      this.attackPatternIndex++
      const wormPrimary = this.isAstralScourge ? '#34D399' : '#22D3EE'
      const wormSecondary = this.isAstralScourge ? '#FACC15' : '#E879F9'
      const wormPair: [string, string] = [wormPrimary, wormSecondary]
      const fireballDmg = Math.round((this.isEnraged ? 26 : 20) * Math.max(1, this.damageScale))
      if (this.isAstralScourge && this.bossPhase >= 2) {
        if (
          this.telegraphs.some(
            (attack) =>
              attack.kind === 'astral_orbital_grid' ||
              attack.kind === 'astral_targeted_lasers' ||
              attack.kind === 'cosmic_laser_walls'
          )
        ) {
          return
        }
        const baseAngle = Math.atan2(direction.y, direction.x)
        for (const offset of [-0.16, 0, 0.16]) {
          const angle = baseAngle + offset
          this.projectiles.push({
            x: startPos.x,
            y: startPos.y,
            width: 12,
            height: 12,
            speed: 300,
            direction: { x: Math.cos(angle), y: Math.sin(angle) },
            damage: Math.round(fireballDmg * 0.7),
            color: offset === 0 ? wormSecondary : wormPrimary,
            lifetime: 0,
            maxLifetime: 3.2
          })
        }
        return
      }

      const mode = this.attackPatternIndex % 3
      if (mode === 1) {
        // Calamity Starburst Ring + Splitting Astral/Nebula Stars
        const count = this.isEnraged ? 18 : 14
        for (let i = 0; i < count; i++) {
          const ang = (i / count) * Math.PI * 2 + this.attackPatternIndex * 0.28
          const isSplitStar = i % 3 === 0
          this.projectiles.push({
            x: startPos.x,
            y: startPos.y,
            width: isSplitStar ? 18 : 13,
            height: isSplitStar ? 18 : 13,
            speed: isSplitStar ? 235 : this.isEnraged ? 305 : 265,
            direction: { x: Math.cos(ang), y: Math.sin(ang) },
            damage: fireballDmg,
            color: i % 2 === 0 ? wormPrimary : wormSecondary,
            lifetime: 0,
            maxLifetime: 4.2,
            isCosmicStar: isSplitStar,
            splitAfter: isSplitStar ? 0.72 : undefined,
            splitCount: isSplitStar ? (this.isEnraged ? 6 : 4) : undefined,
            splitSpeed: 245,
            splitColors: wormPair
          })
        }
      } else if (mode === 2) {
        // Body Segment Turret Volleys (segments along the worm fire aimed bolts)
        const tc = this.target.getCenter()
        for (let s = 3; s < this.dogSegments.length - 1; s += 4) {
          const seg = this.dogSegments[s]
          const segDir = Vector2.normalize({ x: tc.x - seg.x, y: tc.y - seg.y })
          this.projectiles.push({
            x: seg.x,
            y: seg.y,
            width: 12,
            height: 12,
            speed: this.isEnraged ? 320 : 275,
            direction: segDir,
            damage: Math.round(fireballDmg * 0.85),
            color: s % 8 === 3 ? wormPrimary : wormSecondary,
            lifetime: 0,
            maxLifetime: 3.6
          })
        }
      } else {
        // Head Fireball Fan + Splitting Center Star
        const baseAngle = Math.atan2(direction.y, direction.x)
        const offsets = this.isEnraged
          ? [-0.54, -0.36, -0.18, 0, 0.18, 0.36, 0.54]
          : [-0.38, -0.19, 0, 0.19, 0.38]
        for (let idx = 0; idx < offsets.length; idx++) {
          const a = baseAngle + offsets[idx]
          const isCenterStar = offsets[idx] === 0
          const isOuter = idx === 0 || idx === offsets.length - 1
          this.projectiles.push({
            x: startPos.x,
            y: startPos.y,
            width: isCenterStar ? 18 : 13,
            height: isCenterStar ? 18 : 13,
            speed: isCenterStar ? 260 : isOuter ? 290 : 365,
            direction: { x: Math.cos(a), y: Math.sin(a) },
            damage: fireballDmg,
            color: isOuter || isCenterStar ? wormSecondary : wormPrimary,
            lifetime: 0,
            maxLifetime: 3.9,
            homingTurnRate: isOuter ? 1.55 : undefined,
            homingRemaining: isOuter ? 1.7 : undefined,
            isCosmicStar: isCenterStar,
            splitAfter: isCenterStar ? 0.68 : undefined,
            splitCount: isCenterStar ? (this.isEnraged ? 6 : 4) : undefined,
            splitSpeed: 255,
            splitColors: wormPair
          })
        }
      }
      return
    }

    if (this.isInferoChampion) {
      this.attackPatternIndex++
      const baseAngle = Math.atan2(direction.y, direction.x)
      const fanCount = this.bossPhase >= 3 ? 7 : this.bossPhase === 2 ? 5 : 3
      const spread = this.bossPhase >= 3 ? 0.78 : this.bossPhase === 2 ? 0.58 : 0.38
      for (let index = 0; index < fanCount; index++) {
        const progress = index / (fanCount - 1)
        const angle = baseAngle + (progress - 0.5) * spread
        const outerShot = index === 0 || index === fanCount - 1
        this.projectiles.push({
          x: startPos.x,
          y: startPos.y,
          width: this.bossPhase >= 3 ? 15 : 13,
          height: this.bossPhase >= 3 ? 15 : 13,
          speed: outerShot ? 285 : 335,
          direction: { x: Math.cos(angle), y: Math.sin(angle) },
          damage: Math.round((16 + this.bossPhase * 2) * Math.max(1, this.damageScale)),
          color: outerShot ? '#FB923C' : '#FDE047',
          lifetime: 0,
          maxLifetime: 3.6,
          homingTurnRate: this.bossPhase >= 3 && outerShot ? 0.85 : undefined,
          homingRemaining: this.bossPhase >= 3 && outerShot ? 0.9 : undefined
        })
      }
      return
    }

    if (this.isBoss) {
      this.attackPatternIndex++
      const heavyPattern = this.bossTier >= 2 || this.isEnraged || this.bossPhase >= 2
      const radialDamage = Math.round((heavyPattern ? 17 : 14) * Math.max(1, this.damageScale))
      const volleyDamage = Math.round((heavyPattern ? 19 : 16) * Math.max(1, this.damageScale))
      if (this.isStationaryBoss && this.attackPatternIndex % 3 === 1) {
        // Homing Seeker Orbs that curve and follow the player (3 -> 4 in P2 -> 6 in P3)
        const baseAngle = Math.atan2(direction.y, direction.x)
        const seekerOffsets =
          this.bossPhase >= 3
            ? [-0.68, -0.4, -0.14, 0.14, 0.4, 0.68]
            : this.bossPhase === 2 || this.isEnraged
              ? [-0.54, -0.22, 0.22, 0.54]
              : [-0.42, 0, 0.42]
        for (const offset of seekerOffsets) {
          const a = baseAngle + offset
          this.projectiles.push({
            x: startPos.x,
            y: startPos.y,
            width: 12,
            height: 12,
            speed: this.bossPhase >= 3 ? 255 : this.isEnraged || this.bossPhase === 2 ? 242 : 225,
            direction: { x: Math.cos(a), y: Math.sin(a) },
            damage: radialDamage,
            color: this.bossPhase >= 3 ? '#F43F5E' : '#38BDF8',
            lifetime: 0,
            maxLifetime: 4.2,
            homingTurnRate: this.bossPhase >= 3 ? 2.15 : 1.9,
            homingRemaining: 2.35
          })
        }
      } else if (this.attackPatternIndex % 2 === 1) {
        // Radial burst: 16-way (Final P3), 14-way (Final P2), 12-way (Tier 2+/Enraged), 8-way base
        const isFinalPhase2Plus = this.isFinalBoss || this.isStationaryBoss
        const radialCount =
          isFinalPhase2Plus && this.bossPhase >= 3
            ? 16
            : isFinalPhase2Plus && this.bossPhase === 2
              ? 14
              : heavyPattern
                ? 12
                : 8
        for (let i = 0; i < radialCount; i++) {
          const angle = (i / radialCount) * Math.PI * 2 + this.attackPatternIndex * 0.2
          this.projectiles.push({
            x: startPos.x,
            y: startPos.y,
            width: heavyPattern ? 11 : 10,
            height: heavyPattern ? 11 : 10,
            speed: isFinalPhase2Plus && this.bossPhase >= 3 ? 285 : heavyPattern ? 275 : 250,
            direction: { x: Math.cos(angle), y: Math.sin(angle) },
            damage: radialDamage,
            color:
              this.isEnraged || this.bossPhase >= 3
                ? '#FF0055'
                : isFinalPhase2Plus && this.bossPhase === 2
                  ? '#38BDF8'
                  : '#FFD700',
            lifetime: 0,
            maxLifetime: 3.6
          })
        }
      } else {
        // Aimed laser spread: 7-bolt (Final P3), 5-bolt (Tier 2+/P2), 3-bolt base
        const isFinalPhase3 = (this.isFinalBoss || this.isStationaryBoss) && this.bossPhase >= 3
        const baseAngle = Math.atan2(direction.y, direction.x)
        const volleyOffsets = isFinalPhase3
          ? [-0.42, -0.28, -0.14, 0, 0.14, 0.28, 0.42]
          : heavyPattern
            ? [-0.28, -0.14, 0, 0.14, 0.28]
            : [-0.18, 0, 0.18]
        for (const offset of volleyOffsets) {
          const a = baseAngle + offset
          this.projectiles.push({
            x: startPos.x,
            y: startPos.y,
            width: heavyPattern ? 11 : 10,
            height: heavyPattern ? 11 : 10,
            speed: isFinalPhase3 ? 380 : heavyPattern ? 365 : 340,
            direction: { x: Math.cos(a), y: Math.sin(a) },
            damage: volleyDamage,
            color: '#FF0055',
            lifetime: 0,
            maxLifetime: 3
          })
        }
      }
      return
    }
    
    if (this.type === 'Ranged Caster') {
      // Astral Arcanist: fires a 3-orb fanned arcane projectile burst
      const baseAngle = Math.atan2(direction.y, direction.x)
      const orbDamage = Math.round(11 * Math.max(1, this.damageScale))
      for (const offset of [-0.22, 0, 0.22]) {
        const a = baseAngle + offset
        this.projectiles.push({
          x: startPos.x,
          y: startPos.y,
          width: 9,
          height: 9,
          speed: 245,
          direction: { x: Math.cos(a), y: Math.sin(a) },
          damage: orbDamage,
          color: '#E879F9',
          lifetime: 0,
          maxLifetime: 3.2
        })
      }
      return
    }

    if (this.enemyId === 'ene_a2_03') {
      // Prism Bolt Weaver: rapid emerald crystal lance bolt
      this.projectiles.push({
        x: startPos.x,
        y: startPos.y,
        width: 10,
        height: 6,
        speed: 325,
        direction,
        damage: Math.round(13 * Math.max(1, this.damageScale)),
        color: '#34D399',
        lifetime: 0,
        maxLifetime: 3.0
      })
      return
    }

    // Area 1 Aegis Tech Drone red laser bolt
    this.projectiles.push({
      x: startPos.x,
      y: startPos.y,
      width: 8,
      height: 8,
      speed: 290,
      direction,
      damage: Math.round(12 * Math.max(1, this.damageScale)),
      color: '#FF0055',
      lifetime: 0,
      maxLifetime: 3
    })
  }

  /**
   * Launches an arcing AoE mortar projectile with a clear dodgeable ground indicator
   */
  launchAoeProjectile(forcedTarget?: Vector2): EnemyAoeProjectile | null {
    const start = this.getCenter()
    const targetPos = forcedTarget ?? this.target?.getCenter()
    if (!targetPos) return null

    this.aoeCounter++
    const clampedX = Math.max(64, Math.min(GAME_ARENA_SIZE - 64, targetPos.x))
    const clampedY = Math.max(64, Math.min(GAME_ARENA_SIZE - 64, targetPos.y))
    const radius = this.isBoss ? 96 : 84
    const flightDuration = this.isBoss ? 1.35 : 1.45

    const aoe: EnemyAoeProjectile = {
      id: `aoe_${Date.now()}_${this.aoeCounter}`,
      startX: start.x,
      startY: start.y,
      targetX: clampedX,
      targetY: clampedY,
      currentX: start.x,
      currentY: start.y,
      arcOffsetY: 0,
      radius,
      elapsed: 0,
      flightDuration,
      activeTimer: 0,
      activeDuration: 0.38,
      damage: Math.round(24 * Math.max(1, this.damageScale)),
      color:
        this.enemyId === 'boss_a2_10'
          ? '#38BDF8'
          : this.enemyId === 'boss_a2_15'
            ? '#FACC15'
            : '#F97316',
      hasDetonated: false,
      hasDamagedPlayer: false
    }

    this.aoeProjectiles.push(aoe)
    return aoe
  }

  private updateAoeProjectiles(deltaTime: number): void {
    for (let i = this.aoeProjectiles.length - 1; i >= 0; i--) {
      const aoe = this.aoeProjectiles[i]
      if (!aoe.hasDetonated) {
        aoe.elapsed += deltaTime
        const progress = Math.max(0, Math.min(1, aoe.elapsed / aoe.flightDuration))
        aoe.currentX = aoe.startX + (aoe.targetX - aoe.startX) * progress
        aoe.currentY = aoe.startY + (aoe.targetY - aoe.startY) * progress
        aoe.arcOffsetY = Math.sin(progress * Math.PI) * 82
        if (aoe.elapsed >= aoe.flightDuration) {
          aoe.elapsed = aoe.flightDuration
          aoe.currentX = aoe.targetX
          aoe.currentY = aoe.targetY
          aoe.arcOffsetY = 0
          aoe.hasDetonated = true
          aoe.activeTimer = 0
        }
      } else {
        aoe.activeTimer += deltaTime
        if (aoe.activeTimer >= aoe.activeDuration) {
          this.aoeProjectiles.splice(i, 1)
        }
      }
    }
  }

  /**
   * Spawns a large telegraphed boss attack with clear floor/beam warning indicators
   */
  spawnTelegraphedAttack(
    forcedKind?: BossAttackKind,
    forcedHalfDir?: HalfArenaDirection,
    forcedSideMode?: ClosingSideLaserMode
  ): BossTelegraphAttack | null {
    if (!this.target) return null

    this.specialAttackCounter++
    const bossCenter = this.getCenter()
    const targetCenter = this.target.getCenter()
    const id = `boss_atk_${Date.now()}_${this.specialAttackCounter}`
    const tierBoost = Math.max(0, this.bossTier - 1)

    const isSolarArchon = this.enemyId === 'boss_a2_15'
    const isStarforgeBoss = this.enemyId.startsWith('boss_a3_')
    const wormPrimary = this.isAstralScourge
      ? '#34D399'
      : isSolarArchon
        ? '#FACC15'
        : isStarforgeBoss
          ? '#FB923C'
          : '#22D3EE'
    const wormSecondary = this.isAstralScourge
      ? '#FACC15'
      : isSolarArchon
        ? '#34D399'
        : isStarforgeBoss
          ? '#FDE047'
          : '#E879F9'

    let kind: BossAttackKind
    if (forcedKind) {
      kind =
        this.isAstralScourge && forcedKind === 'rotating_cross_lasers'
          ? 'astral_orbital_grid'
          : forcedKind
    } else if (this.isInferoChampion) {
      if (this.bossPhase >= 2 && this.inferoSunEmerged) {
        const emergedCycle: BossAttackKind[] = [
          'infero_aimed_ram',
          'infero_rebound_lances',
          'infero_aimed_ram',
          'infero_orbiting_lances',
          'infero_spinning_lattice',
          'infero_spear_cascade'
        ]
        kind = emergedCycle[this.inferoSunAttackIndex++ % emergedCycle.length]
      } else {
        kind = getInferoChampionAttackKind(this.bossPhase, this.specialAttackCounter - 1)
      }
    } else if (this.isWormBoss) {
      if (this.isAstralScourge && this.bossPhase >= 2) {
        kind = getAstralScourgePhaseTwoAttackKind()
      } else {
        const wormCycle: BossAttackKind[] = this.isAstralScourge
          ? ['cosmic_laser_walls', 'cosmic_portal_lunge', 'cosmic_orb_barrage']
          : this.isEnraged || this.bossPhase >= 2
          ? [
              'cosmic_laser_walls',
              'cosmic_portal_lunge',
              'cosmic_orb_barrage',
              'cosmic_laser_walls',
              'rotating_cross_lasers',
              'cosmic_portal_lunge'
            ]
          : [
              'cosmic_laser_walls',
              'cosmic_portal_lunge',
              'cosmic_orb_barrage',
              'rotating_cross_lasers'
            ]
        kind = wormCycle[(this.specialAttackCounter - 1) % wormCycle.length]
      }
    } else if (
      this.isStationaryBoss &&
      (this.isFinalBoss || this.isWave15SpecialBoss)
    ) {
      const identity: Wave15BossIdentity = isSolarArchon
        ? 'solar_archon_seraph'
        : isStarforgeBoss
          ? 'primordial_starforge'
          : 'omega_overlord'
      const cycleIndex =
        this.bossPhase >= 3
          ? this.phaseThreeAttackIndex++
          : this.bossPhase === 2
            ? this.phaseTwoAttackIndex++
            : this.specialAttackCounter - 1
      kind = getWave15BossAttackKind(identity, this.bossPhase, cycleIndex)
    } else if (this.isStationaryBoss) {
      if (this.bossPhase >= 3) {
        // Phase 3 (<=33% HP): Unleashes Singularity Grid + Rotating Cross Lasers + Void Meteor Salvo + core attacks
        const phase3Cycle: BossAttackKind[] = [
          'singularity_grid',
          'rotating_cross_lasers',
          'void_meteor_salvo',
          'closing_side_lasers',
          'bullet_hell',
          'pursuit_beam'
        ]
        kind = phase3Cycle[this.phaseThreeAttackIndex++ % phase3Cycle.length]
      } else if (this.bossPhase === 2) {
        // Phase 2 (<=66% HP): Unlocks Rotating Cross Lasers & Void Meteor Salvo
        const phase2Cycle: BossAttackKind[] = [
          'rotating_cross_lasers',
          'void_meteor_salvo',
          'closing_side_lasers',
          'pursuit_beam',
          'bullet_hell',
          'tracking_strikes'
        ]
        kind = phase2Cycle[this.phaseTwoAttackIndex++ % phase2Cycle.length]
      } else {
        const finalCycle: BossAttackKind[] = [
          'closing_side_lasers',
          'tracking_strikes',
          'bullet_hell',
          'closing_side_lasers',
          'pursuit_beam',
          'bullet_hell'
        ]
        kind = finalCycle[(this.specialAttackCounter - 1) % finalCycle.length]
      }
    } else {
      const kinds: BossAttackKind[] = ['orbital_slam', 'mega_laser', 'bombardment_ring']
      kind = kinds[(this.specialAttackCounter - 1) % kinds.length]
    }

    if (
      this.isAstralScourge &&
      this.bossPhase >= 2 &&
      this.astralGridCooldownRemaining > 0 &&
      kind === 'astral_orbital_grid'
    ) {
      kind = getAstralScourgePhaseTwoAttackKind(Math.random(), false)
    }

    let telegraph: BossTelegraphAttack

    if (kind === 'infero_underflame_swoops' && this.isInferoChampion) {
      const limits = this.getInferoCenterLimits()
      const view = this.getInferoViewportBounds()
      const swoopCount = 3 + Math.floor(Math.random() * 2) + (this.bossPhase >= 2 ? 1 : 0)
      const swoopInterval =
        this.bossPhase >= 2
          ? Math.max(1.75, INFERO_UNDERFLAME_INTERVAL_SECONDS * 0.82)
          : INFERO_UNDERFLAME_INTERVAL_SECONDS
      const targetX = Math.max(limits.x.min, Math.min(limits.x.max, targetCenter.x))
      const swoopY = Math.max(
        limits.y.min,
        Math.min(
          limits.y.max,
          targetCenter.y + this.getInferoMinimumPlayerDistance() + 35
        )
      )
      const column: InferoFireColumn = {
        x: targetX,
        y: view.bottom,
        topY: view.top,
        width: 104,
        height: Math.max(0, view.bottom - view.top),
        elapsed: 0,
        holdDuration: INFERO_FIRE_COLUMN_HOLD_SECONDS,
        windup: INFERO_FIRE_COLUMN_WARNING_SECONDS,
        active: INFERO_FIRE_COLUMN_ACTIVE_SECONDS,
        hasIgnited: false,
        hasDamagedPlayer: false,
        number: 1
      }
      telegraph = {
        id,
        kind,
        x: targetX,
        y: swoopY,
        inferoLaunchX: targetX,
        inferoLaunchY: swoopY,
        swoopCount,
        swoopIndex: 0,
        swoopStartX: targetX,
        swoopStartY: swoopY,
        swoopTargetX: targetX,
        swoopTargetY: swoopY,
        swoopY,
        swoopDuration: INFERO_UNDERFLAME_SWOOP_SECONDS,
        swoopInterval,
        fireColumns: [column],
        radius: 52,
        chargeTimer: 0,
        chargeDuration:
          Math.hypot(bossCenter.x - targetX, bossCenter.y - swoopY) /
            Math.max(1, this.baseSpeed * 2.4) + 0.2,
        activeTimer: 0,
        activeDuration:
          (swoopCount - 1) * swoopInterval +
          INFERO_UNDERFLAME_SWOOP_SECONDS +
          INFERO_FIRE_COLUMN_HOLD_SECONDS +
          INFERO_FIRE_COLUMN_WARNING_SECONDS +
          INFERO_FIRE_COLUMN_ACTIVE_SECONDS +
          0.12,
        damage: Math.round(32 * Math.max(1, this.damageScale)),
        warningLabel: `UNDERFLAME DIVE // ${swoopCount} PASSES`,
        hasTriggered: false,
        hasDamagedPlayer: false
      }
      this.inferoHoverTarget = { x: targetX, y: swoopY }
      this.inferoHoverRetargetTimer = telegraph.chargeDuration + telegraph.activeDuration
    } else if (kind === 'infero_spinning_lattice' && this.isInferoChampion) {
      const view = this.getInferoViewportBounds()
      const arenaCenter = this.getInferoArenaCenter()
      const inferoLaunchX = arenaCenter.x
      const inferoLaunchY = arenaCenter.y
      const phaseTwo = this.bossPhase >= 2
      const laserLength = Math.max(
        900,
        Math.hypot(view.right - view.left, view.bottom - view.top) * 1.35
      )
      const angle = Math.random() * Math.PI * 2
      if (phaseTwo) {
        const shotCount = 2
        const laserCount = 9 + Math.floor(Math.random() * 2)
        const rotationDuration = 1.25
        const extensionDuration = 0.2 // Stationary lock-on hold after rotation.
        const fireDuration = 0.46
        const gapDuration = 0.36
        telegraph = {
          id,
          kind,
          x: inferoLaunchX,
          y: inferoLaunchY,
          inferoLaunchX,
          inferoLaunchY,
          angle,
          spinMode: 'furnace_volley',
          beamCount: laserCount,
          length: laserLength,
          projectileLanes: [],
          radius: 18,
          gridLines: [],
          gridPulseCount: shotCount,
          gridPulseIndex: 0,
          gridPulseWarningDuration: rotationDuration,
          gridPulseExtensionDuration: extensionDuration,
          gridPulseFireDuration: fireDuration,
          gridPulseGapDuration: gapDuration,
          gridPulseFiring: false,
          chargeTimer: 0,
          chargeDuration: Math.max(
            1.65,
            Math.hypot(bossCenter.x - inferoLaunchX, bossCenter.y - inferoLaunchY) /
              Math.max(1, this.baseSpeed) + 0.4
          ),
          activeTimer: 0,
          activeDuration:
            shotCount * (rotationDuration + extensionDuration + fireDuration + gapDuration),
          damage: Math.round(24 * Math.max(1, this.damageScale)),
          warningLabel: `FURNACE CORE // ${shotCount} ROTATING LASER BURSTS`,
          hasTriggered: false,
          hasDamagedPlayer: false
        }
        this.randomizeInferoSpinningLaserVolley(telegraph, { x: inferoLaunchX, y: inferoLaunchY })
      } else {
        telegraph = {
          id,
          kind,
          x: inferoLaunchX,
          y: inferoLaunchY,
          inferoLaunchX,
          inferoLaunchY,
          angle,
          turnRate: 0.42,
          spinMode: 'classic_spin',
          beamCount: 2,
          length: laserLength,
          radius: 18,
          gridLines: getInferoSpinningLaserLines(
            { x: inferoLaunchX, y: inferoLaunchY },
            angle,
            laserLength
          ),
          chargeTimer: 0,
          chargeDuration: Math.max(
            1.65,
            Math.hypot(bossCenter.x - inferoLaunchX, bossCenter.y - inferoLaunchY) /
              Math.max(1, this.baseSpeed) + 0.4
          ),
          activeTimer: 0,
          activeDuration: 4.8,
          damage: Math.round(24 * Math.max(1, this.damageScale)),
          pulseTimer: 0,
          pulseCount: 0,
          gridPulseFiring: false,
          warningLabel: 'FURNACE CROSS // TWO SPINNING LANCES',
          hasTriggered: false,
          hasDamagedPlayer: false
        }
      }
      this.inferoHoverTarget = { x: inferoLaunchX, y: inferoLaunchY }
      this.inferoHoverRetargetTimer = telegraph.chargeDuration + telegraph.activeDuration + 1.2
    } else if (kind === 'infero_aimed_ram' && this.isInferoChampion) {
      const limits = this.getInferoCenterLimits()
      const aimDirection = Vector2.normalize({
        x: targetCenter.x - bossCenter.x,
        y: targetCenter.y - bossCenter.y
      })
      const direction =
        Math.hypot(aimDirection.x, aimDirection.y) > 0
          ? aimDirection
          : { x: Math.cos(this.facingAngle), y: Math.sin(this.facingAngle) }
      const xDistance =
        direction.x > 0
          ? (limits.x.max - bossCenter.x) / direction.x
          : direction.x < 0
            ? (limits.x.min - bossCenter.x) / direction.x
            : Number.POSITIVE_INFINITY
      const yDistance =
        direction.y > 0
          ? (limits.y.max - bossCenter.y) / direction.y
          : direction.y < 0
            ? (limits.y.min - bossCenter.y) / direction.y
            : Number.POSITIVE_INFINITY
      const travelDistance = Math.max(0, Math.min(xDistance, yDistance))
      const ramTargetX = bossCenter.x + direction.x * travelDistance
      const ramTargetY = bossCenter.y + direction.y * travelDistance
      const ramDuration = Math.max(
        this.bossPhase >= 2 ? 0.38 : 0.48,
        Math.min(
          1.05,
          travelDistance / Math.max(1, this.baseSpeed * (this.bossPhase >= 2 ? 9.5 : 8))
        )
      )
      telegraph = {
        id,
        kind,
        x: bossCenter.x,
        y: bossCenter.y,
        endX: ramTargetX,
        endY: ramTargetY,
        angle: Math.atan2(direction.y, direction.x),
        ramStartX: bossCenter.x,
        ramStartY: bossCenter.y,
        ramAimX: targetCenter.x,
        ramAimY: targetCenter.y,
        ramTargetX,
        ramTargetY,
        ramDuration,
        radius: 62,
        chargeTimer: 0,
        chargeDuration: this.bossPhase >= 2 ? 0.72 : 0.9,
        activeTimer: 0,
        activeDuration: ramDuration,
        damage: Math.round(42 * Math.max(1, this.damageScale)),
        warningLabel: 'INFERNO RAM // DODGE THE LOCKED LINE',
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'infero_rebound_lances' && this.isInferoChampion) {
      const phaseTwo = this.bossPhase >= 2
      const lanceCount = phaseTwo ? 12 : 10
      const desiredRoundCount = phaseTwo ? 3 : 2 + Math.floor(Math.random() * 2)
      const limits = this.getInferoCenterLimits()
      const arenaCenter = this.getInferoArenaCenter()
      const targetAtStart = this.target?.getCenter() ?? bossCenter
      const spanX = Math.max(90, (limits.x.max - limits.x.min) * 0.4)
      const spanY = Math.max(90, (limits.y.max - limits.y.min) * 0.4)
      const candidates = Array.from({ length: 32 }, () => {
        const angle = Math.random() * Math.PI * 2
        const radius = 0.72 + Math.random() * 0.28
        return this.clampInferoCenter({
          x: arenaCenter.x + Math.cos(angle) * spanX * radius,
          y: arenaCenter.y + Math.sin(angle) * spanY * radius
        })
      })
      const farCandidates = candidates.filter(
        (point) =>
          Math.hypot(point.x - targetAtStart.x, point.y - targetAtStart.y) >=
          this.getInferoMinimumPlayerDistance() + 100
      )
      const candidatePool = farCandidates.length >= desiredRoundCount ? farCandidates : candidates
      for (let index = candidatePool.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1))
        ;[candidatePool[index], candidatePool[swapIndex]] = [
          candidatePool[swapIndex],
          candidatePool[index]
        ]
      }
      const lanceWaypoints: Vector2[] = []
      for (const minimumSpacing of [280, 120, 0]) {
        for (const point of candidatePool) {
          if (
            lanceWaypoints.length < desiredRoundCount &&
            lanceWaypoints.every(
              (existing) => Math.hypot(point.x - existing.x, point.y - existing.y) >= minimumSpacing
            )
          ) {
            lanceWaypoints.push(point)
          }
        }
        if (lanceWaypoints.length >= desiredRoundCount) break
      }
      const roundCount = Math.max(2, Math.min(desiredRoundCount, lanceWaypoints.length))
      lanceWaypoints.length = roundCount
      const roundDuration = 2.65
      const relocateSpeed = Math.max(1, this.baseSpeed * 5.5)
      const lanceMoveDurations = lanceWaypoints.map((point, index) => {
        if (index === 0) return 0
        const previous = lanceWaypoints[index - 1]
        const distance = Math.hypot(point.x - previous.x, point.y - previous.y)
        return Math.max(0.45, Math.min(1.35, distance / relocateSpeed))
      })
      const initialDistance = Math.hypot(
        lanceWaypoints[0].x - bossCenter.x,
        lanceWaypoints[0].y - bossCenter.y
      )
      const initialMoveDuration = Math.max(0.35, initialDistance / relocateSpeed + 0.3)
      const activeDuration =
        (roundCount - 1) * roundDuration +
        lanceMoveDurations.slice(1).reduce((total, duration) => total + duration, 0) +
        0.4
      telegraph = {
        id,
        kind,
        x: bossCenter.x,
        y: bossCenter.y,
        projectileCount: lanceCount,
        lanceWaypoints,
        lanceRoundCount: roundCount,
        lanceRoundIndex: 0,
        lanceVolleyCount: 0,
        lanceRoundPhase: 'volley',
        lanceRoundTimer: 0,
        lanceRoundDuration: roundDuration,
        lanceMoveDurations,
        lanceMoveTargetX: lanceWaypoints[0].x,
        lanceMoveTargetY: lanceWaypoints[0].y,
        inferoLaunchX: lanceWaypoints[0].x,
        inferoLaunchY: lanceWaypoints[0].y,
        radius: 18,
        chargeTimer: 0,
        chargeDuration: initialMoveDuration,
        activeTimer: 0,
        activeDuration,
        damage: Math.round(28 * Math.max(1, this.damageScale)),
        warningLabel: `EMBER LANCE FAN // ROUND 1/${roundCount}`,
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'infero_orbiting_lances' && this.isInferoChampion) {
      const orbitDuration = 2.05
      const aimDuration = 0.72
      telegraph = {
        id,
        kind,
        x: targetCenter.x,
        y: targetCenter.y,
        projectileCount: 8,
        orbitRadius: 205,
        orbitDuration,
        radius: 205,
        chargeTimer: 0,
        chargeDuration: 0.9,
        activeTimer: 0,
        activeDuration: orbitDuration + aimDuration + 0.25,
        damage: Math.round(34 * Math.max(1, this.damageScale)),
        warningLabel: 'EMBER ORBIT // LANCES LOCK IN',
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'inferno_spear_volley' && this.isInferoChampion) {
      const sideMode: ClosingSideLaserMode = Math.random() < 0.5 ? 'left' : 'right'
      const projectileCount =
        18 + Math.floor(Math.random() * 5) + (this.bossPhase >= 2 ? 3 : 0)
      const view = this.getInferoViewportBounds()
      const centerLimits = this.getInferoCenterLimits()
      const edgeX = sideMode === 'left' ? view.left + 12 : view.right - 12
      const oppositeEdgeX = sideMode === 'left' ? view.right - 12 : view.left + 12
      const inferoLaunchX =
        sideMode === 'left' ? centerLimits.x.min + 34 : centerLimits.x.max - 34
      const inferoLaunchY = Math.max(
        centerLimits.y.min,
        Math.min(centerLimits.y.max, targetCenter.y + (Math.random() - 0.5) * 250)
      )
      const horizontalDistance = Math.abs(oppositeEdgeX - edgeX)
      const projectileLanes = Array.from({ length: projectileCount }, () => {
        const startY = Math.max(
          view.top + 40,
          Math.min(view.bottom - 40, view.top + 40 + Math.random() * Math.max(0, view.bottom - view.top - 80))
        )
        const verticalDrift = (Math.random() - 0.5) * 70
        const direction = Vector2.normalize({
          x: oppositeEdgeX - edgeX,
          y: verticalDrift
        })
        return {
          x: edgeX,
          y: startY,
          directionX: direction.x,
          directionY: direction.y,
          delay: 0.14 + Math.random() * 0.24
        }
      })
      for (let index = projectileLanes.length - 1; index > 0; index--) {
        const swapIndex = Math.floor(Math.random() * (index + 1))
        const swapLane = projectileLanes[index]
        projectileLanes[index] = projectileLanes[swapIndex]
        projectileLanes[swapIndex] = swapLane
      }
      const gridLines = projectileLanes.map((lane) => ({
        x1: lane.x,
        y1: lane.y,
        x2: lane.x + lane.directionX * horizontalDistance,
        y2: lane.y + lane.directionY * horizontalDistance,
        width: 2,
        color: '#FB923C'
      }))
      const barrageDuration = projectileLanes.reduce((total, lane) => total + lane.delay, 0) + 0.25
      telegraph = {
        id,
        kind,
        x: bossCenter.x,
        y: bossCenter.y,
        sideMode,
        radius: 10,
        projectileCount,
        inferoLaunchX,
        inferoLaunchY,
        projectileLanes,
        gridLines,
        chargeTimer: 0,
        chargeDuration:
          Math.hypot(bossCenter.x - inferoLaunchX, bossCenter.y - inferoLaunchY) /
            Math.max(1, this.baseSpeed * 6) + 0.12,
        activeTimer: 0,
        activeDuration: barrageDuration,
        damage: Math.round(24 * Math.max(1, this.damageScale)),
        pulseTimer: 0,
        pulseCount: 0,
        warningLabel: `BLAZING SPEAR BARRAGE // ${projectileCount} SPEARS`,
        hasTriggered: false,
        hasDamagedPlayer: false
      }
      this.inferoHoverTarget = { x: inferoLaunchX, y: inferoLaunchY }
      this.inferoHoverRetargetTimer =
        telegraph.chargeDuration + telegraph.activeDuration + 1.2
    } else if (kind === 'infero_spear_cascade' && this.isInferoChampion && this.bossPhase >= 2) {
      const sideMode: ClosingSideLaserMode = Math.random() < 0.5 ? 'left' : 'right'
      const view = this.getInferoViewportBounds()
      const centerLimits = this.getInferoCenterLimits()
      const directionX = sideMode === 'left' ? 1 : -1
      const startX = sideMode === 'left' ? view.left + 16 : view.right - 16
      const endX = sideMode === 'left' ? view.right - 16 : view.left + 16
      const inferoLaunchX = Math.max(centerLimits.x.min, Math.min(
        centerLimits.x.max,
        sideMode === 'left' ? centerLimits.x.min + 46 : centerLimits.x.max - 46
      ))
      const inferoLaunchY = Math.max(
        centerLimits.y.min,
        Math.min(centerLimits.y.max, targetCenter.y + (Math.random() - 0.5) * 220)
      )
      const sideSpearCount = 6
      const spearSpeed = 820
      const horizontalDistance = Math.abs(endX - startX)
      const spearTravelDistance = Math.abs(endX - inferoLaunchX)
      const sideSpearInterval = Math.max(
        0.08,
        Math.min(0.28, spearTravelDistance / (spearSpeed * (sideSpearCount + 1)))
      )
      const projectileLanes = [{
        x: startX,
        y: inferoLaunchY,
        directionX,
        directionY: 0,
        delay: 0
      }]
      telegraph = {
        id,
        kind,
        x: bossCenter.x,
        y: bossCenter.y,
        sideMode,
        radius: 16,
        inferoLaunchX,
        inferoLaunchY,
        projectileCount: 1,
        projectileLanes,
        gridLines: [{
          x1: startX,
          y1: inferoLaunchY,
          x2: endX,
          y2: inferoLaunchY,
          width: 4,
          color: '#FB923C'
        }],
        sideSpearCount,
        sideSpearInterval,
        chargeTimer: 0,
        chargeDuration:
          Math.hypot(bossCenter.x - inferoLaunchX, bossCenter.y - inferoLaunchY) /
            Math.max(1, this.baseSpeed * 8) +
          0.48,
        activeTimer: 0,
        activeDuration: horizontalDistance / spearSpeed + 0.9,
        damage: Math.round(38 * Math.max(1, this.damageScale)),
        warningLabel: 'RECLAIMING SPEAR // WATCH THE CROSS-LANE',
        hasTriggered: false,
        hasDamagedPlayer: false
      }
      this.inferoHoverTarget = { x: inferoLaunchX, y: inferoLaunchY }
      this.inferoHoverRetargetTimer =
        telegraph.chargeDuration + telegraph.activeDuration + 1.2
    } else if (kind === 'astral_orbital_grid') {
      const randomAngle = Math.random() * Math.PI
      const lineCount = 3 + Math.floor(Math.random() * 2)
      const lineSpacing = 105 + Math.random() * 75
      const gridOffsets = Array.from(
        { length: lineCount },
        (_, index) => (index - (lineCount - 1) / 2) * lineSpacing
      )
      const laserDuration = 1.8
      const escapeDuration = 1.35
      const orbitStartAngle = Math.atan2(bossCenter.y - targetCenter.y, bossCenter.x - targetCenter.x)
      telegraph = {
        id,
        kind,
        x: targetCenter.x,
        y: targetCenter.y,
        gridAnchorX: targetCenter.x,
        gridAnchorY: targetCenter.y,
        angle: randomAngle,
        turnRate: this.specialAttackCounter % 2 === 0 ? 3.1 : -3.1,
        orbitAngle: orbitStartAngle,
        orbitStartAngle,
        orbitElapsed: 0,
        orbitRadius: ASTRAL_SCOURGE_PHASE_TWO_ORBIT_RADIUS,
        radius: 5,
        gridOffsets,
        orbitCenterX: targetCenter.x,
        orbitCenterY: targetCenter.y,
        gridLines: getAstralOrbitalGridLines(targetCenter, randomAngle, gridOffsets),
        chargeDuration: 5,
        chargeTimer: 0,
        laserDuration,
        escapeDuration,
        activeDuration: laserDuration + escapeDuration,
        activeTimer: 0,
        damage: Math.round((26 + tierBoost * 5) * this.damageScale),
        hasTriggered: false,
        hasDamagedPlayer: false,
        hitCooldown: 0,
        warningLabel: 'ASTRAL ORBITAL GRID — TRACK THE GAPS!'
      }
    } else if (kind === 'astral_targeted_lasers') {
      const laserSpread = 0.1 + Math.random() * 0.08
      telegraph = {
        id,
        kind,
        x: bossCenter.x,
        y: bossCenter.y,
        endX: targetCenter.x,
        endY: targetCenter.y,
        radius: 4,
        laserSpread,
        targetLockTime: 0.28,
        gridLines: getAstralTargetedLaserLines(bossCenter, targetCenter, laserSpread),
        chargeDuration: 1.45,
        chargeTimer: 0,
        activeDuration: 0.62,
        activeTimer: 0,
        damage: Math.round((25 + tierBoost * 5) * this.damageScale),
        hasTriggered: false,
        hasDamagedPlayer: false,
        hitCooldown: 0,
        warningLabel: 'ASTRAL LOCK-ON LASERS — BREAK THE AIM!'
      }
    } else if (kind === 'cosmic_laser_walls') {
      // Worm Boss signature Laser Wall Web (orthogonal in P1, diagonal/diamond in P2+/enraged)
      const isDiag = (this.isEnraged || this.bossPhase >= 2) && this.specialAttackCounter % 2 === 0
      const halfSpan = 820
      const lineWidth = this.isEnraged || this.bossPhase >= 3 ? 30 : 26
      const spacing = this.isEnraged || this.bossPhase >= 3 ? 175 : 200
      const cx = Math.max(240, Math.min(1760, targetCenter.x))
      const cy = Math.max(240, Math.min(1760, targetCenter.y))
      const gridLines: CosmicLaserWallLine[] = []
      const offsets = [-1.5, -0.5, 0.5, 1.5]

      if (isDiag) {
        const invSqrt2 = Math.SQRT1_2
        for (const mult of offsets) {
          const d = mult * spacing
          const p1x = cx - d * invSqrt2
          const p1y = cy + d * invSqrt2
          gridLines.push({
            x1: p1x - halfSpan * invSqrt2,
            y1: p1y - halfSpan * invSqrt2,
            x2: p1x + halfSpan * invSqrt2,
            y2: p1y + halfSpan * invSqrt2,
            width: lineWidth,
            color: wormPrimary
          })
          const p2x = cx + d * invSqrt2
          const p2y = cy + d * invSqrt2
          gridLines.push({
            x1: p2x - halfSpan * invSqrt2,
            y1: p2y + halfSpan * invSqrt2,
            x2: p2x + halfSpan * invSqrt2,
            y2: p2y - halfSpan * invSqrt2,
            width: lineWidth,
            color: wormSecondary
          })
        }
      } else {
        for (const mult of offsets) {
          const offsetPx = mult * spacing
          gridLines.push({
            x1: cx + offsetPx,
            y1: cy - halfSpan,
            x2: cx + offsetPx,
            y2: cy + halfSpan,
            width: lineWidth,
            color: wormPrimary
          })
          gridLines.push({
            x1: cx - halfSpan,
            y1: cy + offsetPx,
            x2: cx + halfSpan,
            y2: cy + offsetPx,
            width: lineWidth,
            color: wormSecondary
          })
        }
      }

      telegraph = {
        id,
        kind: 'cosmic_laser_walls',
        x: cx,
        y: cy,
        radius: lineWidth / 2,
        gridLines,
        isDiagonalGrid: isDiag,
        hitCooldown: 0,
        chargeTimer: 0,
        chargeDuration: this.isEnraged ? 1.1 : 1.28,
        activeTimer: 0,
        activeDuration: 0.48,
        damage: Math.round((this.isEnraged ? 40 : 34) * Math.max(1, this.damageScale * 0.72)),
        accentPrimary: wormPrimary,
        accentSecondary: wormSecondary,
        warningLabel: this.isAstralScourge
          ? '⚠ ASTRAL LASER WALLS — WEAVE GAPS!'
          : isSolarArchon
            ? '⚠ SERAPH CROWN LATTICE — WEAVE GAPS!'
            : '⚠ COSMIC LASER WALLS — WEAVE GAPS!',
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'cosmic_portal_lunge') {
      const angleToPlayer = ((this.specialAttackCounter * 1.9 + 0.6) % (Math.PI * 2))
      const portalDist = 310
      const portalX = Math.max(110, Math.min(1890, targetCenter.x + Math.cos(angleToPlayer) * portalDist))
      const portalY = Math.max(110, Math.min(1890, targetCenter.y + Math.sin(angleToPlayer) * portalDist))
      const lungeAngle = Math.atan2(targetCenter.y - portalY, targetCenter.x - portalX)
      const lungeLen = 780
      telegraph = {
        id,
        kind: 'cosmic_portal_lunge',
        x: portalX,
        y: portalY,
        portalX,
        portalY,
        endX: portalX + Math.cos(lungeAngle) * lungeLen,
        endY: portalY + Math.sin(lungeAngle) * lungeLen,
        angle: lungeAngle,
        radius: 42,
        length: lungeLen,
        chargeTimer: 0,
        chargeDuration: this.isEnraged ? 0.92 : 1.12,
        activeTimer: 0,
        activeDuration: 0.55,
        damage: Math.round((this.isEnraged ? 44 : 36) * Math.max(1, this.damageScale * 0.75)),
        accentPrimary: wormPrimary,
        accentSecondary: wormSecondary,
        warningLabel: this.isAstralScourge ? '⚠ STARLIGHT RIFT LUNGE INCOMING!' : '⚠ RIFT LUNGE INCOMING!',
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'cosmic_orb_barrage') {
      telegraph = {
        id,
        kind: 'cosmic_orb_barrage',
        x: bossCenter.x,
        y: bossCenter.y,
        radius: 130,
        pulseTimer: 0.12,
        pulseCount: 0,
        chargeTimer: 0,
        chargeDuration: this.isEnraged ? 0.75 : 0.92,
        activeTimer: 0,
        activeDuration: 2.85,
        damage: Math.round((this.isEnraged ? 24 : 18) * Math.max(1, this.damageScale * 0.7)),
        accentPrimary: wormPrimary,
        accentSecondary: wormSecondary,
        warningLabel: this.isAstralScourge ? '⚠ ASTRAL STAR BARRAGE!' : '⚠ NEBULA STAR BARRAGE!',
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'rotating_cross_lasers') {
      // Phase 2+ New Attack: 4 sweeping X-beams anchored on boss with wide dodgeable radial gaps
      const initialAngle = Math.PI / 4 + (this.specialAttackCounter % 2) * 0.35
      const spinDir = this.specialAttackCounter % 2 === 0 ? 1 : -1
      const spinRate = (this.bossPhase >= 3 ? 0.96 : 0.72) * spinDir
      telegraph = {
        id,
        kind: 'rotating_cross_lasers',
        x: bossCenter.x,
        y: bossCenter.y,
        angle: initialAngle,
        turnRate: spinRate,
        beamCount: 4,
        beamSegments: [
          [50, 200],
          [365, 520],
          [685, 850],
          [1015, 1350]
        ],
        radius: this.bossPhase >= 3 ? 28 : 24,
        length: 1350,
        hitCooldown: 0,
        chargeTimer: 0,
        chargeDuration: this.bossPhase >= 3 ? 1.15 : 1.35,
        activeTimer: 0,
        activeDuration: this.bossPhase >= 3 ? 2.65 : 2.35,
        damage: Math.round(30 * Math.max(1, this.damageScale * 0.72)),
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'void_meteor_salvo') {
      // Phase 2+ New Attack: 7 staggered void blast craters framing the player's zone with dodge pockets
      const bounds: BossArenaBounds = this.arenaBounds ?? {
        left: Math.max(0, bossCenter.x - 640),
        top: Math.max(0, bossCenter.y - 210),
        width: 1280,
        height: 720
      }
      const zoneRadius = this.bossPhase >= 3 ? 98 : 88
      const clampX = (vx: number) =>
        Math.max(bounds.left + zoneRadius + 16, Math.min(bounds.left + bounds.width - zoneRadius - 16, vx))
      const clampY = (vy: number) =>
        Math.max(bounds.top + 150, Math.min(bounds.top + bounds.height - zoneRadius - 16, vy))
      const cx = clampX(targetCenter.x)
      const cy = clampY(targetCenter.y)
      const offsets: Array<[number, number]> = [
        [0, 0],
        [-195, -135],
        [195, -135],
        [-195, 135],
        [195, 135],
        [-340, 0],
        [340, 0]
      ]
      const subTargets = offsets.map(([ox, oy]) => ({
        x: clampX(cx + ox),
        y: clampY(cy + oy),
        radius: zoneRadius
      }))
      telegraph = {
        id,
        kind: 'void_meteor_salvo',
        x: cx,
        y: cy,
        radius: zoneRadius,
        subTargets,
        chargeTimer: 0,
        chargeDuration: this.bossPhase >= 3 ? 1.25 : 1.42,
        activeTimer: 0,
        activeDuration: 0.45,
        damage: Math.round(32 * Math.max(1, this.damageScale * 0.72)),
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'singularity_grid') {
      // Phase 3 / DoG Cosmic Laser Wall Matrix: 2 vertical + 2 horizontal full-arena laser strips forming 9 safe cells
      const defaultLeft = Math.max(
        24,
        Math.min(GAME_ARENA_SIZE - 1280 - 24, targetCenter.x - 640)
      )
      const defaultTop = Math.max(
        24,
        Math.min(GAME_ARENA_SIZE - 720 - 24, targetCenter.y - 360)
      )
      const bounds: BossArenaBounds = this.arenaBounds ?? {
        left: defaultLeft,
        top: defaultTop,
        width: 1280,
        height: 720
      }
      const beamThick = 88
      const shift = (this.phaseThreeAttackIndex % 2 === 0 ? 0.04 : -0.04)
      const v1 = bounds.left + bounds.width * (0.28 + shift) - beamThick / 2
      const v2 = bounds.left + bounds.width * (0.72 + shift) - beamThick / 2
      const h1 = bounds.top + bounds.height * 0.34 - beamThick / 2
      const h2 = bounds.top + bounds.height * 0.72 - beamThick / 2
      const gridRects = [
        { x: v1, y: bounds.top, width: beamThick, height: bounds.height },
        { x: v2, y: bounds.top, width: beamThick, height: bounds.height },
        { x: bounds.left, y: h1, width: bounds.width, height: beamThick },
        { x: bounds.left, y: h2, width: bounds.width, height: beamThick }
      ]
      telegraph = {
        id,
        kind: 'singularity_grid',
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        radius: beamThick / 2,
        bounds,
        gridRects,
        chargeTimer: 0,
        chargeDuration: 1.45,
        activeTimer: 0,
        activeDuration: 0.65,
        damage: Math.round(36 * Math.max(1, this.damageScale * 0.72)),
        accentPrimary: isSolarArchon ? '#FACC15' : isStarforgeBoss ? '#FB923C' : '#F43F5E',
        accentSecondary: isSolarArchon ? '#34D399' : isStarforgeBoss ? '#FDE047' : '#FACC15',
        warningLabel: isSolarArchon
          ? 'SERAPH ECLIPSE GRID — FIND THE SAFE CELL!'
          : isStarforgeBoss
            ? 'STARFORGE CINDER GRID — FIND THE SAFE CELL!'
            : 'OMEGA SINGULARITY GRID — FIND THE SAFE CELL!',
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'closing_side_lasers') {
      const bounds: BossArenaBounds = this.arenaBounds ?? {
        left: Math.max(0, bossCenter.x - 640),
        top: Math.max(0, bossCenter.y - 195),
        width: 1280,
        height: 720
      }
      const sideModes: ClosingSideLaserMode[] = ['left', 'right', 'pincer']
      const sideMode = forcedSideMode ?? sideModes[this.sideLaserModeIndex++ % sideModes.length]
      const closingReachRatio = 0.5 // Sweeps exactly half way across the arena

      let safeRect: { x: number; y: number; width: number; height: number }
      if (sideMode === 'left') {
        safeRect = {
          x: bounds.left + bounds.width * closingReachRatio,
          y: bounds.top,
          width: bounds.width * (1 - closingReachRatio),
          height: bounds.height
        }
      } else if (sideMode === 'right') {
        safeRect = {
          x: bounds.left,
          y: bounds.top,
          width: bounds.width * (1 - closingReachRatio),
          height: bounds.height
        }
      } else {
        // Pincer: upper-left half + lower-right half, leaving upper-right & lower-left safe
        safeRect = {
          x: bounds.left + bounds.width * closingReachRatio,
          y: bounds.top,
          width: bounds.width * (1 - closingReachRatio),
          height: bounds.height * 0.5
        }
      }

      telegraph = {
        id,
        kind: 'closing_side_lasers',
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
        radius: bounds.width * closingReachRatio,
        sideMode,
        bounds,
        closingReachRatio,
        safeRect,
        hitCooldown: 0,
        chargeTimer: 0,
        chargeDuration: 1.25,
        activeTimer: 0,
        activeDuration: 1.65,
        damage: Math.round(34 * Math.max(1, this.damageScale * 0.72)),
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'tracking_strikes') {
      const blastRadius = 82
      telegraph = {
        id,
        kind: 'tracking_strikes',
        x: targetCenter.x,
        y: targetCenter.y,
        radius: blastRadius,
        trackingBlasts: [
          {
            x: targetCenter.x,
            y: targetCenter.y,
            radius: blastRadius,
            elapsed: 0,
            windup: 0.78,
            active: 0.34,
            hasDetonated: false,
            hasDamagedPlayer: false
          }
        ],
        spawnTimer: 0,
        spawnsDone: 1,
        chargeTimer: 0,
        chargeDuration: 0.05,
        activeTimer: 0,
        activeDuration: this.isInferoChampion && this.bossPhase >= 2 ? 3.2 : 3.15,
        damage: Math.round(28 * Math.max(1, this.damageScale * 0.7)),
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'pursuit_beam') {
      const angle = Math.atan2(targetCenter.y - bossCenter.y, targetCenter.x - bossCenter.x)
      const length = 1280
      telegraph = {
        id,
        kind: 'pursuit_beam',
        x: bossCenter.x,
        y: bossCenter.y,
        endX: bossCenter.x + Math.cos(angle) * length,
        endY: bossCenter.y + Math.sin(angle) * length,
        angle,
        turnRate: 0.68,
        radius: 34,
        length,
        hitCooldown: 0,
        chargeTimer: 0,
        chargeDuration: 1.35,
        activeTimer: 0,
        activeDuration: 0.72,
        damage: Math.round(28 * Math.max(1, this.damageScale * 0.72)),
        accentPrimary: isSolarArchon ? '#FACC15' : isStarforgeBoss ? '#FB923C' : '#FF0055',
        accentSecondary: isSolarArchon ? '#34D399' : isStarforgeBoss ? '#FDE047' : '#FACC15',
        warningLabel: isSolarArchon
          ? 'SERAPH SUNLANCE — BREAK THE LOCK!'
          : isStarforgeBoss
            ? 'STARFORGE FURNACE BEAM — BREAK THE LOCK!'
            : undefined,
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'bullet_hell') {
      telegraph = {
        id,
        kind: 'bullet_hell',
        x: bossCenter.x,
        y: bossCenter.y,
        radius: 110,
        pulseTimer: 0.2,
        pulseCount: 0,
        chargeTimer: 0,
        chargeDuration: 0.95,
        activeTimer: 0,
        activeDuration: 3.3,
        damage: Math.round(13 * Math.max(1, this.damageScale * 0.65)),
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'half_arena') {
      const bounds: BossArenaBounds = this.arenaBounds ?? {
        left: Math.max(0, bossCenter.x - 640),
        top: Math.max(0, bossCenter.y - 128),
        width: 1280,
        height: 720
      }
      const halfDirs: HalfArenaDirection[] = ['left', 'bottom', 'right', 'top']
      const halfDirection = forcedHalfDir ?? halfDirs[this.halfDirectionIndex++ % halfDirs.length]

      let zoneRect: { x: number; y: number; width: number; height: number }
      let safeRect: { x: number; y: number; width: number; height: number }

      if (halfDirection === 'left') {
        zoneRect = { x: bounds.left, y: bounds.top, width: bounds.width / 2, height: bounds.height }
        safeRect = {
          x: bounds.left + bounds.width / 2,
          y: bounds.top,
          width: bounds.width / 2,
          height: bounds.height
        }
      } else if (halfDirection === 'right') {
        zoneRect = {
          x: bounds.left + bounds.width / 2,
          y: bounds.top,
          width: bounds.width / 2,
          height: bounds.height
        }
        safeRect = { x: bounds.left, y: bounds.top, width: bounds.width / 2, height: bounds.height }
      } else if (halfDirection === 'top') {
        zoneRect = { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height / 2 }
        safeRect = {
          x: bounds.left,
          y: bounds.top + bounds.height / 2,
          width: bounds.width,
          height: bounds.height / 2
        }
      } else {
        zoneRect = {
          x: bounds.left,
          y: bounds.top + bounds.height / 2,
          width: bounds.width,
          height: bounds.height / 2
        }
        safeRect = { x: bounds.left, y: bounds.top, width: bounds.width, height: bounds.height / 2 }
      }

      telegraph = {
        id,
        kind: 'half_arena',
        x: zoneRect.x + zoneRect.width / 2,
        y: zoneRect.y + zoneRect.height / 2,
        radius: Math.max(zoneRect.width, zoneRect.height) / 2,
        halfDirection,
        zoneRect,
        safeRect,
        chargeTimer: 0,
        chargeDuration: 2.05,
        activeTimer: 0,
        activeDuration: 0.48,
        damage: Math.round(36 * Math.max(1, this.damageScale * 0.72)),
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'mega_laser') {
      const angle = Math.atan2(targetCenter.y - bossCenter.y, targetCenter.x - bossCenter.x)
      const length = 660 + Math.min(140, tierBoost * 35)
      telegraph = {
        id,
        kind: 'mega_laser',
        x: bossCenter.x,
        y: bossCenter.y,
        endX: bossCenter.x + Math.cos(angle) * length,
        endY: bossCenter.y + Math.sin(angle) * length,
        angle,
        radius: 32 + Math.min(10, tierBoost * 2),
        length,
        chargeTimer: 0,
        chargeDuration: 1.35,
        activeTimer: 0,
        activeDuration: 0.42,
        damage: Math.round(34 * Math.max(1, this.damageScale)),
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else if (kind === 'bombardment_ring') {
      const zoneRadius = 86 + Math.min(20, tierBoost * 5)
      const zoneCount = Math.min(6, 4 + tierBoost)
      const minX = this.arenaBounds ? this.arenaBounds.left + 64 : 80
      const maxX = this.arenaBounds ? this.arenaBounds.left + this.arenaBounds.width - 64 : 1920
      const minY = this.arenaBounds ? this.arenaBounds.top + 140 : 80
      const maxY = this.arenaBounds ? this.arenaBounds.top + this.arenaBounds.height - 64 : 1920
      const clampX = (vx: number) => Math.max(minX, Math.min(maxX, vx))
      const clampY = (vy: number) => Math.max(minY, Math.min(maxY, vy))

      const cx = clampX(targetCenter.x)
      const cy = clampY(targetCenter.y)
      const subTargets: Array<{ x: number; y: number; radius: number }> = [
        { x: cx, y: cy, radius: zoneRadius }
      ]
      for (let i = 1; i < zoneCount; i++) {
        const a = ((i - 1) / (zoneCount - 1)) * Math.PI * 2 + this.specialAttackCounter * 0.5
        const dist = 145 + (i % 2) * 35
        subTargets.push({
          x: clampX(cx + Math.cos(a) * dist),
          y: clampY(cy + Math.sin(a) * dist),
          radius: zoneRadius
        })
      }
      telegraph = {
        id,
        kind: 'bombardment_ring',
        x: cx,
        y: cy,
        radius: zoneRadius,
        subTargets,
        chargeTimer: 0,
        chargeDuration: this.isStationaryBoss ? 1.65 : 1.5,
        activeTimer: 0,
        activeDuration: 0.4,
        damage: Math.round(28 * Math.max(1, this.damageScale * (this.isStationaryBoss ? 0.72 : 1))),
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else {
      const radius = 145 + Math.min(45, tierBoost * 12)
      telegraph = {
        id,
        kind: 'orbital_slam',
        x: targetCenter.x,
        y: targetCenter.y,
        radius,
        chargeTimer: 0,
        chargeDuration: 1.45,
        activeTimer: 0,
        activeDuration: 0.42,
        damage: Math.round(32 * Math.max(1, this.damageScale)),
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    }

    if (this.isInferoChampion) {
      const inferoWarningLabels: Partial<Record<BossAttackKind, string>> = {
        tracking_strikes: 'CINDER TRACK // MOVE BEFORE THE IMPACT',
        infero_spinning_lattice:
          telegraph.spinMode === 'classic_spin'
            ? 'FURNACE CROSS // TWO SPINNING LANCES'
            : 'FURNACE CORE // ROTATE, EXTEND, THEN DODGE',
        infero_solar_core: 'SUN CORE // DODGE THE CENTRAL LASER BURST',
        infero_underflame_swoops: 'UNDERFLAME DIVE // WATCH FOR THE FIRE COLUMN',
        infero_aimed_ram: 'INFERNO RAM // DODGE THE LOCKED LINE',
        infero_rebound_lances: 'EMBER LANCE FAN // WATCH FOR THE RE-THROW',
        infero_orbiting_lances: 'EMBER ORBIT // DODGE WHEN THE LANCES LOCK',
        infero_spear_cascade: 'RECLAIMED BLAZING SPEAR // DODGE THE SIDE SPEARS'
      }
      telegraph.warningLabel =
        kind === 'inferno_spear_volley'
          ? `BLAZING SPEAR BARRAGE // ${telegraph.projectileCount ?? 15} SPEARS`
          : inferoWarningLabels[kind] ?? 'INFERNO CHAMPION // AERIAL STRIKE'
    }

    if (this.isInferoChampion && this.bossPhase >= 2) {
      telegraph.damage = Math.round(telegraph.damage * 1.18)
    }

    this.telegraphs.push(telegraph)
    return telegraph
  }

  private randomizeAstralGridPulse(attack: BossTelegraphAttack): void {
    const center = {
      x: attack.gridAnchorX ?? attack.x,
      y: attack.gridAnchorY ?? attack.y
    }
    const angle = Math.random() * Math.PI
    const lineCount = 3 + Math.floor(Math.random() * 3)
    const spacing = 90 + Math.random() * 90
    const offsets = Array.from(
      { length: lineCount },
      (_, index) => (index - (lineCount - 1) / 2) * spacing
    )
    attack.angle = angle
    attack.gridOffsets = offsets
    attack.gridLines = getAstralOrbitalGridLines(center, angle, offsets)
  }

  private launchInferoSpearVolley(attack: BossTelegraphAttack, pulseIndex: number): void {
    const lane = attack.projectileLanes?.[pulseIndex]
    if (!lane) return
    const direction = Vector2.normalize({
      x: lane.directionX,
      y: lane.directionY
    })
    this.projectiles.push({
      x: lane.x,
      y: lane.y,
      width: 34,
      height: 12,
      speed: this.bossPhase >= 2 ? 625 : 535,
      direction,
      damage: attack.damage,
      color: pulseIndex % 2 === 0 ? '#FB923C' : '#FDE047',
      lifetime: 0,
      maxLifetime: 8,
      isBlazingSpear: true,
      trailTimer: 0,
      trailParticles: []
    })
  }

  private launchInferoSideSpear(attack: BossTelegraphAttack): void {
    const lane = attack.projectileLanes?.[0]
    if (!lane) return
    this.projectiles.push({
      x: attack.inferoLaunchX ?? lane.x,
      y: attack.inferoLaunchY ?? lane.y,
      width: 84,
      height: 22,
      speed: 820,
      direction: Vector2.normalize({ x: lane.directionX, y: lane.directionY }),
      damage: attack.damage,
      color: '#FDE047',
      lifetime: 0,
      maxLifetime: 7,
      isBlazingSpear: true,
      inferoSpearShardTimer: 0,
      inferoSpearShardsRemaining: attack.sideSpearCount ?? 4,
      inferoSpearShardInterval: attack.sideSpearInterval ?? 0.32,
      trailTimer: 0,
      trailParticles: []
    })
  }

  private launchInferoSpearSideShards(parent: EnemyProjectile): void {
    const forwardAngle = Math.atan2(parent.direction.y, parent.direction.x)
    for (const side of [-1, 1]) {
      const angle = forwardAngle + side * (Math.PI / 2)
      const direction = { x: Math.cos(angle), y: Math.sin(angle) }
      this.projectiles.push({
        x: parent.x,
        y: parent.y,
        width: 26,
        height: 10,
        speed: 570,
        direction,
        damage: Math.max(14, Math.round(parent.damage * 0.65)),
        color: side < 0 ? '#FB923C' : '#FDE047',
        lifetime: 0,
        maxLifetime: 6,
        isBlazingSpear: true,
        trailTimer: 0,
        trailParticles: []
      })
    }
  }

  private launchInferoSpinningGridVolley(
    attack: BossTelegraphAttack,
    bossCenter: Vector2,
    pulseIndex: number
  ): void {
    const spokeCount = 6
    const baseAngle = (attack.angle ?? 0) + pulseIndex * 0.31
    for (let index = 0; index < spokeCount; index++) {
      const angle = baseAngle + (index / spokeCount) * Math.PI * 2
      this.projectiles.push({
        x: bossCenter.x,
        y: bossCenter.y,
        width: 13,
        height: 13,
        speed: 275,
        direction: { x: Math.cos(angle), y: Math.sin(angle) },
        damage: Math.round(16 * Math.max(1, this.damageScale)),
        color: index % 2 === 0 ? '#FB923C' : '#FDE047',
        lifetime: 0,
        maxLifetime: 6,
        curveTurnRate: index % 2 === 0 ? 0.38 : -0.38,
        isInferoFireball: true,
        trailTimer: 0,
        trailParticles: []
      })
    }
  }

  private randomizeInferoSpinningLaserVolley(
    attack: BossTelegraphAttack,
    origin: Vector2
  ): void {
    const count = attack.beamCount ?? 8
    const firstAngle = Math.random() * Math.PI * 2
    const lanes = Array.from({ length: count }, (_, index) => {
      const angle =
        firstAngle +
        (index / count) * Math.PI * 2 +
        (Math.random() - 0.5) * (Math.PI / count)
      return {
        x: origin.x,
        y: origin.y,
        directionX: Math.cos(angle),
        directionY: Math.sin(angle),
        delay: 0
      }
    })
    attack.projectileLanes = lanes
    attack.gridLines = getInferoRotatingSpreadLines(
      origin,
      lanes,
      attack.length ?? 1500,
      0
    )
  }

  private createInferoSolarCoreTelegraph(): BossTelegraphAttack {
    const center = this.getInferoArenaCenter()
    const view = this.getInferoViewportBounds()
    const volleyCount = 2 + Math.floor(Math.random() * 2)
    const rotationDuration = 1.25
    const extensionDuration = 0.2 // Stationary lock-on hold after rotation.
    const fireDuration = 0.46
    const gapDuration = 0.2
    const attack: BossTelegraphAttack = {
      id: `infero_solar_core_${Date.now()}_${this.specialAttackCounter}`,
      kind: 'infero_solar_core',
      x: center.x,
      y: center.y,
      angle: Math.random() * Math.PI * 2,
      spinMode: 'furnace_volley',
      beamCount: 9 + Math.floor(Math.random() * 2),
      length: Math.max(
        900,
        Math.hypot(view.right - view.left, view.bottom - view.top) * 1.35
      ),
      projectileLanes: [],
      radius: 30,
      gridLines: [],
      gridPulseCount: volleyCount,
      gridPulseIndex: 0,
      gridPulseWarningDuration: rotationDuration,
      gridPulseExtensionDuration: extensionDuration,
      gridPulseFireDuration: fireDuration,
      gridPulseGapDuration: gapDuration,
      gridPulseFiring: false,
      chargeTimer: 0,
      chargeDuration: 0,
      activeTimer: 0,
      activeDuration: volleyCount * (rotationDuration + extensionDuration + fireDuration + gapDuration),
      damage: Math.round(20 * Math.max(1, this.damageScale)),
      warningLabel: `SUN CORE // ${volleyCount} MORE VOLLEYS`,
      hasTriggered: true,
      hasDamagedPlayer: false
    }
    this.randomizeInferoSpinningLaserVolley(attack, center)
    return attack
  }

  private updateInferoFurnaceVolley(attack: BossTelegraphAttack, center: Vector2): void {
    const pulseCount = attack.gridPulseCount ?? 1
    const rotationDuration = attack.gridPulseWarningDuration ?? 1.25
    const extensionDuration = attack.gridPulseExtensionDuration ?? 0.2
    const fireDuration = attack.gridPulseFireDuration ?? 0.46
    const gapDuration = attack.gridPulseGapDuration ?? 0.36
    const cycleDuration = rotationDuration + extensionDuration + fireDuration + gapDuration
    const pulseIndex = Math.min(
      pulseCount - 1,
      Math.floor(attack.activeTimer / Math.max(0.001, cycleDuration))
    )
    if (pulseIndex !== (attack.gridPulseIndex ?? 0)) {
      attack.gridPulseIndex = pulseIndex
      this.randomizeInferoSpinningLaserVolley(attack, center)
    }
    const pulseElapsed = Math.max(0, attack.activeTimer - pulseIndex * cycleDuration)
    const rotationProgress = Math.min(1, pulseElapsed / Math.max(0.001, rotationDuration))
    const isFiring =
      pulseElapsed >= rotationDuration + extensionDuration &&
      pulseElapsed < rotationDuration + extensionDuration + fireDuration
    // Sine ease-out keeps the initial speed modest and decelerates continuously to zero.
    const rotationAngle = Math.sin(rotationProgress * Math.PI / 2) * Math.PI * 2
    attack.gridPulseFiring = isFiring
    attack.gridLines = getInferoRotatingSpreadLines(
      center,
      attack.projectileLanes ?? [],
      attack.length ?? 1500,
      rotationAngle
    )
    const subject = attack.kind === 'infero_solar_core' ? 'SUN CORE' : 'FURNACE CORE'
    attack.warningLabel = isFiring
      ? `${subject} // VOLLEY ${pulseIndex + 1}/${pulseCount} — FIRE`
      : pulseElapsed < rotationDuration
        ? `${subject} // VOLLEY ${pulseIndex + 1}/${pulseCount} — ROTATING`
        : `${subject} // VOLLEY ${pulseIndex + 1}/${pulseCount} — LOCKED`
  }

  private launchInferoReboundLances(
    attack: BossTelegraphAttack,
    bossCenter: Vector2
  ): void {
    const lanceCount = attack.projectileCount ?? 10
    const firstAngle = Math.random() * Math.PI * 2
    const outboundSpeed = this.bossPhase >= 2 ? 850 : 760
    attack.lanceVolleyCount = (attack.lanceVolleyCount ?? 0) + 1
    for (let index = 0; index < lanceCount; index++) {
      const angle = firstAngle + (index / lanceCount) * Math.PI * 2
      this.projectiles.push({
        x: bossCenter.x,
        y: bossCenter.y,
        width: 34,
        height: 12,
        speed: outboundSpeed,
        direction: { x: Math.cos(angle), y: Math.sin(angle) },
        damage: attack.damage,
        color: index % 2 === 0 ? '#FB923C' : '#FDE047',
        lifetime: 0,
        maxLifetime: 10,
        isBlazingSpear: true,
        inferoLancePhase: 'outbound',
        inferoLancePhaseTimer: 0,
        inferoLanceBrakeDuration: 1 + Math.random() * 0.2,
        inferoLancePauseDuration: 0.2 + index * 0.045,
        inferoLanceAimDuration: 0.52 + (index % 4) * 0.06,
        inferoLanceOutboundSpeed: outboundSpeed,
        inferoLanceLaunchSpeed: this.bossPhase >= 2 ? 820 : 735,
        trailTimer: 0,
        trailParticles: []
      })
    }
  }

  private launchInferoOrbitingLances(
    attack: BossTelegraphAttack,
    targetCenter: Vector2
  ): void {
    const lanceCount = attack.projectileCount ?? 8
    const baseAngle = Math.random() * Math.PI * 2
    const view = this.getInferoViewportBounds()
    for (let index = 0; index < lanceCount; index++) {
      const angle = baseAngle + (index / lanceCount) * Math.PI * 2
      const radius = attack.orbitRadius ?? 205
      const x = Math.max(
        view.left + 18,
        Math.min(view.right - 18, targetCenter.x + Math.cos(angle) * radius)
      )
      const y = Math.max(
        view.top + 18,
        Math.min(view.bottom - 18, targetCenter.y + Math.sin(angle) * radius)
      )
      this.projectiles.push({
        x,
        y,
        width: 30,
        height: 11,
        speed: 0,
        direction: { x: -Math.sin(angle), y: Math.cos(angle) },
        damage: attack.damage,
        color: index % 2 === 0 ? '#FB923C' : '#FDE047',
        lifetime: 0,
        maxLifetime: 8,
        isBlazingSpear: true,
        inferoLancePhase: 'orbiting',
        inferoLancePhaseTimer: 0,
        inferoOrbitAngle: angle,
        inferoOrbitRadius: radius,
        inferoOrbitSpeed: 2.65,
        inferoOrbitDuration: attack.orbitDuration ?? 2.05,
        inferoLanceTargetX: targetCenter.x,
        inferoLanceTargetY: targetCenter.y,
        inferoLanceAimDuration: 0.72,
        inferoLanceLaunchSpeed: this.bossPhase >= 2 ? 860 : 780,
        trailTimer: 0,
        trailParticles: []
      })
    }
  }

  private updateInferoReboundLance(
    projectile: EnemyProjectile,
    deltaTime: number,
    targetCenter: Vector2 | null
  ): void {
    const phase = projectile.inferoLancePhase
    let phaseTimer = (projectile.inferoLancePhaseTimer ?? 0) + deltaTime

    if (phase === 'orbiting') {
      const orbitCenter = targetCenter ?? {
        x: projectile.inferoLanceTargetX ?? projectile.x,
        y: projectile.inferoLanceTargetY ?? projectile.y
      }
      const orbitAngle =
        (projectile.inferoOrbitAngle ?? 0) +
        (projectile.inferoOrbitSpeed ?? 2.65) * deltaTime
      projectile.inferoOrbitAngle = orbitAngle
      const radius = projectile.inferoOrbitRadius ?? 205
      const view = this.getInferoViewportBounds()
      projectile.x = Math.max(
        view.left + projectile.width / 2,
        Math.min(view.right - projectile.width / 2, orbitCenter.x + Math.cos(orbitAngle) * radius)
      )
      projectile.y = Math.max(
        view.top + projectile.height / 2,
        Math.min(view.bottom - projectile.height / 2, orbitCenter.y + Math.sin(orbitAngle) * radius)
      )
      projectile.direction = {
        x: -Math.sin(orbitAngle),
        y: Math.cos(orbitAngle)
      }
      if (phaseTimer >= (projectile.inferoOrbitDuration ?? 2.05)) {
        if (targetCenter) {
          projectile.inferoLanceTargetX = targetCenter.x
          projectile.inferoLanceTargetY = targetCenter.y
          const aim = Vector2.normalize({
            x: targetCenter.x - projectile.x,
            y: targetCenter.y - projectile.y
          })
          if (Math.hypot(aim.x, aim.y) > 0) projectile.direction = aim
        }
        projectile.inferoLancePhase = 'aiming'
        phaseTimer = 0
        projectile.speed = 0
      }
    } else if (phase === 'outbound') {
      const brakeDuration = Math.max(0.001, projectile.inferoLanceBrakeDuration ?? 0.7)
      const outboundSpeed = projectile.inferoLanceOutboundSpeed ?? projectile.speed
      const previousProgress = Math.min(
        1,
        (projectile.inferoLancePhaseTimer ?? 0) / brakeDuration
      )
      const progress = Math.min(1, phaseTimer / brakeDuration)
      const previousSpeed = outboundSpeed * (1 - previousProgress)
      const nextSpeed = outboundSpeed * (1 - progress)
      const traveled = (previousSpeed + nextSpeed) * 0.5 * deltaTime
      projectile.x += projectile.direction.x * traveled
      projectile.y += projectile.direction.y * traveled
      projectile.speed = nextSpeed
      if (progress >= 1) {
        projectile.inferoLancePhase = 'paused'
        phaseTimer = 0
        projectile.speed = 0
      }
    } else if (phase === 'paused') {
      projectile.speed = 0
      if (phaseTimer >= (projectile.inferoLancePauseDuration ?? 0.3)) {
        if (targetCenter) {
          projectile.inferoLanceTargetX = targetCenter.x
          projectile.inferoLanceTargetY = targetCenter.y
          const aim = Vector2.normalize({
            x: targetCenter.x - projectile.x,
            y: targetCenter.y - projectile.y
          })
          if (Math.hypot(aim.x, aim.y) > 0) projectile.direction = aim
        }
        projectile.inferoLancePhase = 'aiming'
        phaseTimer = 0
      }
    } else if (phase === 'aiming') {
      projectile.speed = 0
      if (phaseTimer >= (projectile.inferoLanceAimDuration ?? 0.6)) {
        projectile.inferoLancePhase = 'launched'
        phaseTimer = 0
        projectile.speed = projectile.inferoLanceLaunchSpeed ?? 735
      }
    } else if (phase === 'launched') {
      projectile.speed = projectile.inferoLanceLaunchSpeed ?? 735
      projectile.x += projectile.direction.x * projectile.speed * deltaTime
      projectile.y += projectile.direction.y * projectile.speed * deltaTime
    }

    projectile.inferoLancePhaseTimer = phaseTimer
  }

  /**
   * Advances telegraph windup timers, tracking mechanics, bullet hell curtains, and active sweeps
   */
  private updateTelegraphs(deltaTime: number): void {
    const bossCenter = this.getCenter()
    const targetCenter = this.target?.getCenter() ?? null

    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i]

      if (t.kind === 'infero_underflame_swoops' && !t.hasTriggered && targetCenter) {
        const limits = this.getInferoCenterLimits()
        const view = this.getInferoViewportBounds()
        const targetX = Math.max(limits.x.min, Math.min(limits.x.max, targetCenter.x))
        const targetY = Math.max(
          limits.y.min,
          Math.min(
            limits.y.max,
            targetCenter.y + this.getInferoMinimumPlayerDistance() + 35
          )
        )
        t.inferoLaunchX = targetX
        t.inferoLaunchY = targetY
        t.swoopY = targetY
        t.swoopTargetX = targetX
        t.swoopTargetY = targetY
        t.x = targetX
        t.y = targetY
        const firstColumn = t.fireColumns?.[0]
        if (firstColumn) {
          firstColumn.x = targetX
          firstColumn.y = view.bottom
          firstColumn.topY = view.top
          firstColumn.height = Math.max(0, view.bottom - view.top)
        }
      } else if (t.kind === 'infero_orbiting_lances' && targetCenter) {
        t.x = targetCenter.x
        t.y = targetCenter.y
      } else if (t.kind === 'infero_spinning_lattice') {
        t.x = t.inferoLaunchX ?? bossCenter.x
        t.y = t.inferoLaunchY ?? bossCenter.y
        if (t.spinMode === 'classic_spin') {
          if (!t.hasTriggered) {
            t.angle = (t.angle ?? 0) + (t.turnRate ?? 0.42) * deltaTime * 0.34
          }
          t.gridLines = getInferoSpinningLaserLines(
            { x: t.x, y: t.y },
            t.angle ?? 0,
            t.length ?? 1500
          )
        } else if (!t.hasTriggered) {
          t.gridLines = getInferoRotatingSpreadLines(
            { x: t.x, y: t.y },
            t.projectileLanes ?? [],
            t.length ?? 1500,
            0
          )
        } else if (t.hasDamagedPlayer) {
          t.hitCooldown = (t.hitCooldown ?? 0) + deltaTime
          if (t.hitCooldown >= 0.48) {
            t.hitCooldown = 0
            t.hasDamagedPlayer = false
          }
        }
      } else if (t.kind === 'infero_solar_core' && t.hasDamagedPlayer) {
        t.hitCooldown = (t.hitCooldown ?? 0) + deltaTime
        if (t.hitCooldown >= 0.48) {
          t.hitCooldown = 0
          t.hasDamagedPlayer = false
        }
      } else if (t.kind === 'astral_targeted_lasers') {
        if (!t.hasTriggered && targetCenter) {
          t.x = bossCenter.x
          t.y = bossCenter.y
          if (t.chargeDuration - t.chargeTimer > (t.targetLockTime ?? 0.28)) {
            t.endX = targetCenter.x
            t.endY = targetCenter.y
            t.gridLines = getAstralTargetedLaserLines(
              bossCenter,
              targetCenter,
              t.laserSpread ?? 0.14
            )
          }
        }
        if (t.hasTriggered && t.hasDamagedPlayer) {
          t.hitCooldown = (t.hitCooldown ?? 0) + deltaTime
          if (t.hitCooldown >= 0.45) {
            t.hitCooldown = 0
            t.hasDamagedPlayer = false
          }
        }
      } else if (t.kind === 'astral_orbital_grid') {
        if (t.hasTriggered && t.hasDamagedPlayer) {
          t.hitCooldown = (t.hitCooldown ?? 0) + deltaTime
          if (t.hitCooldown >= 0.45) {
            t.hitCooldown = 0
            t.hasDamagedPlayer = false
          }
        }
      } else if (t.kind === 'rotating_cross_lasers') {
        t.x = bossCenter.x
        t.y = bossCenter.y
        if (t.hasTriggered) {
          t.angle = (t.angle ?? 0) + (t.turnRate ?? 0.72) * deltaTime
          if (t.hasDamagedPlayer) {
            t.hitCooldown = (t.hitCooldown ?? 0) + deltaTime
            if (t.hitCooldown >= 0.48) {
              t.hitCooldown = 0
              t.hasDamagedPlayer = false
            }
          }
        }
      } else if (t.kind === 'pursuit_beam') {
        t.x = bossCenter.x
        t.y = bossCenter.y
        const shouldTrack =
          Boolean(targetCenter && !t.hasTriggered && t.chargeDuration - t.chargeTimer > 0.3)
        if (shouldTrack && targetCenter) {
          const desiredAngle = Math.atan2(targetCenter.y - t.y, targetCenter.x - t.x)
          const curAngle = t.angle ?? desiredAngle
          let diff = desiredAngle - curAngle
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          const rate = (t.turnRate ?? 0.68) * 1.15
          const maxStep = rate * deltaTime
          const nextAngle =
            Math.abs(diff) <= maxStep ? desiredAngle : curAngle + Math.sign(diff) * maxStep
          t.angle = nextAngle
          const len = t.length ?? 1280
          t.endX = t.x + Math.cos(nextAngle) * len
          t.endY = t.y + Math.sin(nextAngle) * len
        } else {
          // Keep beam anchored on boss at the locked angle once tracking stops (0.3s before fire + active fire)
          const lockedAngle = t.angle ?? 0
          const len = t.length ?? 1280
          t.endX = t.x + Math.cos(lockedAngle) * len
          t.endY = t.y + Math.sin(lockedAngle) * len
        }
        if (t.hasTriggered && t.hasDamagedPlayer) {
          t.hitCooldown = (t.hitCooldown ?? 0) + deltaTime
          if (t.hitCooldown >= 0.5) {
            t.hitCooldown = 0
            t.hasDamagedPlayer = false
          }
        }
      } else if (
        (t.kind === 'closing_side_lasers' ||
          t.kind === 'singularity_grid' ||
          t.kind === 'cosmic_laser_walls') &&
        t.hasTriggered &&
        t.hasDamagedPlayer
      ) {
        t.hitCooldown = (t.hitCooldown ?? 0) + deltaTime
        if (t.hitCooldown >= 0.45) {
          t.hitCooldown = 0
          t.hasDamagedPlayer = false
        }
      } else if (t.kind === 'cosmic_orb_barrage' && !t.hasTriggered) {
        t.x = bossCenter.x
        t.y = bossCenter.y
      }

      if (!t.hasTriggered) {
        t.chargeTimer += deltaTime
        if (
          t.kind === 'infero_spear_cascade' &&
          (t.inferoPositionFallback || t.chargeTimer >= t.chargeDuration + 1.2)
        ) {
          if (!t.inferoPositionFallback) {
            // Player separation or a moving viewport may block the original side point.
            // Use the current safe position, then show a fresh warning before throwing.
            t.inferoPositionFallback = true
            t.chargeTimer = Math.max(0, t.chargeDuration - 0.35)
          }
          t.inferoLaunchX = bossCenter.x
          t.inferoLaunchY = bossCenter.y
          if (t.projectileLanes?.[0]) t.projectileLanes[0].y = bossCenter.y
          if (t.gridLines?.[0]) {
            t.gridLines[0].y1 = bossCenter.y
            t.gridLines[0].y2 = bossCenter.y
          }
        }
        const needsInferoPosition =
          t.kind === 'infero_underflame_swoops' ||
          t.kind === 'infero_rebound_lances' ||
          (t.kind === 'infero_spear_cascade' && !t.inferoPositionFallback)
        const inferoHasReachedLaunchPoint =
          !needsInferoPosition ||
          Math.hypot(
            bossCenter.x - (t.inferoLaunchX ?? t.x),
            bossCenter.y - (t.inferoLaunchY ?? t.y)
          ) <= 46
        if (t.chargeTimer >= t.chargeDuration && inferoHasReachedLaunchPoint) {
          t.chargeTimer = t.chargeDuration
          if (t.kind === 'astral_orbital_grid' && this.isAstralScourge && this.bossPhase >= 2) {
            const lockedHead = this.getCenter()
            t.ringLocked = true
            t.ringLockedHeadX = lockedHead.x
            t.ringLockedHeadY = lockedHead.y
            t.ringLockedSegments = this.dogSegments.map((segment) => ({ ...segment }))
            t.x = t.gridAnchorX ?? t.x
            t.y = t.gridAnchorY ?? t.y
            t.gridPulseCount = 3 + Math.floor(Math.random() * 2)
            t.gridPulseIndex = 0
            t.gridPulseTimer = 0
            t.gridPulseFirstWarningDuration = 0.74
            t.gridPulseFollowupWarningDuration = 0.64
            t.gridPulseWarningDuration = t.gridPulseFirstWarningDuration
            t.gridPulseFireDuration = 0.34
            t.gridPulseGapDuration = 0.22
            t.gridPulseFiring = false
            t.laserDuration =
              (t.gridPulseFirstWarningDuration ?? 0) + (t.gridPulseFireDuration ?? 0) +
              (t.gridPulseCount - 1) *
                ((t.gridPulseFollowupWarningDuration ?? 0) +
                  (t.gridPulseFireDuration ?? 0) +
                  (t.gridPulseGapDuration ?? 0))
            t.activeDuration = t.laserDuration + (t.escapeDuration ?? 1.35)
            this.randomizeAstralGridPulse(t)
          }
          t.hasTriggered = true
          t.activeTimer = 0
          if (t.kind === 'inferno_spear_volley') {
            t.pulseTimer = 0
            t.pulseCount = 0
          } else if (t.kind === 'infero_rebound_lances') {
            t.lanceRoundIndex = 0
            t.lanceRoundPhase = 'volley'
            t.lanceRoundTimer = 0
            t.warningLabel = `EMBER LANCE FAN // ROUND 1/${t.lanceRoundCount ?? 2}`
            this.launchInferoReboundLances(t, this.getCenter())
          } else if (t.kind === 'infero_orbiting_lances' && targetCenter) {
            this.launchInferoOrbitingLances(t, targetCenter)
          } else if (t.kind === 'infero_spear_cascade') {
            this.launchInferoSideSpear(t)
          } else if (t.kind === 'infero_underflame_swoops') {
            t.swoopIndex = 0
            const positionAtDiveStart = this.getCenter()
            t.swoopStartX = positionAtDiveStart.x
            t.swoopStartY = positionAtDiveStart.y
            t.swoopTargetX = t.inferoLaunchX ?? positionAtDiveStart.x
            t.swoopTargetY = t.inferoLaunchY ?? positionAtDiveStart.y
            for (const column of t.fireColumns ?? []) {
              column.elapsed = 0
              column.hasIgnited = false
              column.hasDamagedPlayer = false
            }
          } else if (t.kind === 'infero_spinning_lattice') {
            if (t.spinMode === 'classic_spin') {
              t.pulseTimer = 0
              t.pulseCount = 0
              t.gridPulseFiring = true
              t.gridLines = getInferoSpinningLaserLines(
                this.getCenter(),
                t.angle ?? 0,
                t.length ?? 1500
              )
            } else {
              t.gridPulseIndex = 0
              t.gridPulseFiring = false
              this.randomizeInferoSpinningLaserVolley(t, this.getCenter())
            }
          } else if (t.kind === 'cosmic_portal_lunge' && t.portalX !== undefined && t.portalY !== undefined) {
            // Warp worm head cleanly into the dimensional rift and unleash blazing jaw lunge
            this.x = t.portalX - this.width / 2
            this.y = t.portalY - this.height / 2
            const ang = t.angle ?? 0
            this.facingAngle = ang
            this.dogDashDir = { x: Math.cos(ang), y: Math.sin(ang) }
            this.dogDashTimer = 0.85
            this.dogDashCooldown = this.isEnraged ? 2.8 : 3.6
            this.updateDogSegments(14, { x: t.portalX, y: t.portalY })
            // Emit rift scatter stars on emergence
            const burstCount = this.isAstralScourge ? 3 : this.isEnraged ? 10 : 6
            const pCol1 = t.accentPrimary || (this.isAstralScourge ? '#34D399' : '#22D3EE')
            const pCol2 = t.accentSecondary || (this.isAstralScourge ? '#FACC15' : '#E879F9')
            for (let b = 0; b < burstCount; b++) {
              const ba = ang + ((b / burstCount) - 0.5) * Math.PI * 1.4
              this.projectiles.push({
                x: t.portalX,
                y: t.portalY,
                width: 14,
                height: 14,
                speed: 250,
                direction: { x: Math.cos(ba), y: Math.sin(ba) },
                damage: Math.round(t.damage * 0.58),
                color: b % 2 === 0 ? pCol1 : pCol2,
                lifetime: 0,
                maxLifetime: 3.6
              })
            }
          } else if (t.kind === 'void_meteor_salvo' || t.kind === 'singularity_grid') {
            const burstCount = t.kind === 'singularity_grid' ? 12 : 8
            const burstDmg = Math.round(16 * Math.max(1, this.damageScale))
            for (let b = 0; b < burstCount; b++) {
              const ba = (b / burstCount) * Math.PI * 2 + this.specialAttackCounter * 0.25
              this.projectiles.push({
                x: bossCenter.x,
                y: bossCenter.y,
                width: 11,
                height: 11,
                speed: t.kind === 'singularity_grid' ? 255 : 230,
                direction: { x: Math.cos(ba), y: Math.sin(ba) },
                damage: burstDmg,
                color:
                  t.kind === 'singularity_grid'
                    ? t.accentPrimary || '#F43F5E'
                    : t.accentPrimary || '#FACC15',
                lifetime: 0,
                maxLifetime: 4.0
              })
            }
          }
        }
      } else {
        t.activeTimer += deltaTime

        if (t.kind === 'infero_underflame_swoops') {
          const swoopCount = t.swoopCount ?? 3
          const interval = t.swoopInterval ?? INFERO_UNDERFLAME_INTERVAL_SECONDS
          const passIndex = Math.floor(t.activeTimer / interval)
          const limits = this.getInferoCenterLimits()
          const view = this.getInferoViewportBounds()
          if (passIndex < swoopCount) {
            if (passIndex !== (t.swoopIndex ?? -1)) {
              t.swoopIndex = passIndex
              const previousCenter = this.getCenter()
              const nextTargetX = Math.max(
                limits.x.min,
                Math.min(limits.x.max, targetCenter?.x ?? previousCenter.x)
              )
              const nextTargetY = Math.max(
                limits.y.min,
                Math.min(
                  limits.y.max,
                  (targetCenter?.y ?? previousCenter.y) +
                    this.getInferoMinimumPlayerDistance() +
                    35
                )
              )
              t.swoopStartX = previousCenter.x
              t.swoopStartY = previousCenter.y
              t.swoopTargetX = nextTargetX
              t.swoopTargetY = nextTargetY
              t.swoopY = nextTargetY
              const nextColumn: InferoFireColumn = {
                x: nextTargetX,
                y: view.bottom,
                topY: view.top,
                width: 104,
                height: Math.max(0, view.bottom - view.top),
                elapsed: 0,
                holdDuration: INFERO_FIRE_COLUMN_HOLD_SECONDS,
                windup: INFERO_FIRE_COLUMN_WARNING_SECONDS,
                active: INFERO_FIRE_COLUMN_ACTIVE_SECONDS,
                hasIgnited: false,
                hasDamagedPlayer: false,
                number: passIndex + 1
              }
              t.fireColumns ??= []
              t.fireColumns.push(nextColumn)
            }

            const passStartTime = passIndex * interval
            const progress = Math.max(
              0,
              Math.min(
                1,
                (t.activeTimer - passStartTime) /
                  (t.swoopDuration ?? INFERO_UNDERFLAME_SWOOP_SECONDS)
              )
            )
            const previousCenter = this.getCenter()
            const nextCenter = this.clampInferoCenter({
              x:
                (t.swoopStartX ?? previousCenter.x) +
                ((t.swoopTargetX ?? previousCenter.x) - (t.swoopStartX ?? previousCenter.x)) *
                  progress,
              y:
                (t.swoopStartY ?? previousCenter.y) +
                ((t.swoopTargetY ?? previousCenter.y) - (t.swoopStartY ?? previousCenter.y)) *
                  progress +
                Math.sin(progress * Math.PI) * 8
            })
            this.x = nextCenter.x - this.width / 2
            this.y = nextCenter.y - this.height / 2
            this.velocity = {
              x: (nextCenter.x - previousCenter.x) / Math.max(deltaTime, 0.001),
              y: (nextCenter.y - previousCenter.y) / Math.max(deltaTime, 0.001)
            }
            this.facingAngle = Math.atan2(
              (t.swoopTargetY ?? nextCenter.y) - (t.swoopStartY ?? nextCenter.y),
              (t.swoopTargetX ?? nextCenter.x) - (t.swoopStartX ?? nextCenter.x)
            )
            t.x = nextCenter.x
            t.y = nextCenter.y
          }

          for (const column of t.fireColumns ?? []) {
            const columnPassStart = (column.number - 1) * interval
            column.elapsed = Math.max(
              0,
              t.activeTimer -
              columnPassStart -
              (t.swoopDuration ?? INFERO_UNDERFLAME_SWOOP_SECONDS)
            )
            column.y = view.bottom
            column.topY = view.top
            column.height = Math.max(0, column.y - column.topY)
            column.hasIgnited = column.elapsed >= column.holdDuration + column.windup
          }
          t.fireColumns = (t.fireColumns ?? []).filter(
            (column) =>
              column.elapsed < column.holdDuration + column.windup + column.active
          )
          const completedPasses = Math.min(swoopCount, passIndex + 1)
          t.warningLabel = `UNDERFLAME DIVE // PASS ${completedPasses}/${swoopCount}`
        } else if (t.kind === 'infero_rebound_lances') {
          t.lanceRoundTimer = (t.lanceRoundTimer ?? 0) + deltaTime
          if (t.lanceRoundPhase === 'moving') {
            const start = {
              x: t.lanceMoveStartX ?? bossCenter.x,
              y: t.lanceMoveStartY ?? bossCenter.y
            }
            const target = {
              x: t.lanceMoveTargetX ?? bossCenter.x,
              y: t.lanceMoveTargetY ?? bossCenter.y
            }
            const duration = Math.max(0.001, t.lanceMoveDuration ?? 0.6)
            const progress = Math.min(1, (t.lanceRoundTimer ?? 0) / duration)
            const nextCenter = this.clampInferoCenter({
              x: start.x + (target.x - start.x) * progress,
              y: start.y + (target.y - start.y) * progress
            })
            this.x = nextCenter.x - this.width / 2
            this.y = nextCenter.y - this.height / 2
            this.velocity = {
              x: (nextCenter.x - bossCenter.x) / Math.max(deltaTime, 0.001),
              y: (nextCenter.y - bossCenter.y) / Math.max(deltaTime, 0.001)
            }
            this.facingAngle = Math.atan2(target.y - start.y, target.x - start.x)
            t.x = nextCenter.x
            t.y = nextCenter.y
            if (progress >= 1) {
              t.lanceRoundPhase = 'volley'
              t.lanceRoundTimer = 0
              t.warningLabel = `EMBER LANCE FAN // ROUND ${(t.lanceRoundIndex ?? 0) + 1}/${t.lanceRoundCount ?? 2}`
              this.launchInferoReboundLances(t, nextCenter)
            }
          } else if ((t.lanceRoundTimer ?? 0) >= (t.lanceRoundDuration ?? 2.65)) {
            const nextIndex = (t.lanceRoundIndex ?? 0) + 1
            const nextWaypoint = t.lanceWaypoints?.[nextIndex]
            if (nextWaypoint) {
              const currentCenter = this.getCenter()
              t.lanceRoundIndex = nextIndex
              t.lanceRoundPhase = 'moving'
              t.lanceRoundTimer = 0
              t.lanceMoveStartX = currentCenter.x
              t.lanceMoveStartY = currentCenter.y
              t.lanceMoveTargetX = nextWaypoint.x
              t.lanceMoveTargetY = nextWaypoint.y
              t.lanceMoveDuration =
                t.lanceMoveDurations?.[nextIndex] ??
                Math.max(
                  0.45,
                  Math.min(
                    1.35,
                    Math.hypot(nextWaypoint.x - currentCenter.x, nextWaypoint.y - currentCenter.y) /
                      Math.max(1, this.baseSpeed * 5.5)
                  )
                )
              t.warningLabel = `EMBER LANCE FAN // MOVE TO ROUND ${nextIndex + 1}/${t.lanceRoundCount ?? 2}`
            }
          }
        } else if (t.kind === 'infero_orbiting_lances') {
          if (targetCenter) {
            t.x = targetCenter.x
            t.y = targetCenter.y
          }
          const orbitDuration = t.orbitDuration ?? 2.05
          t.warningLabel =
            t.activeTimer < orbitDuration
              ? 'EMBER ORBIT // CIRCLING THE PLAYER'
              : 'EMBER ORBIT // LANCES LOCKED — DODGE'
        } else if (t.kind === 'infero_aimed_ram') {
          const ramDuration = Math.max(0.001, t.ramDuration ?? 0.6)
          const progress = Math.max(0, Math.min(1, t.activeTimer / ramDuration))
          const previousCenter = this.getCenter()
          const nextCenter = this.clampInferoCenter({
            x:
              (t.ramStartX ?? previousCenter.x) +
              ((t.ramTargetX ?? previousCenter.x) - (t.ramStartX ?? previousCenter.x)) *
                progress,
            y:
              (t.ramStartY ?? previousCenter.y) +
              ((t.ramTargetY ?? previousCenter.y) - (t.ramStartY ?? previousCenter.y)) *
                progress
          })
          this.x = nextCenter.x - this.width / 2
          this.y = nextCenter.y - this.height / 2
          this.velocity = {
            x: (nextCenter.x - previousCenter.x) / Math.max(deltaTime, 0.001),
            y: (nextCenter.y - previousCenter.y) / Math.max(deltaTime, 0.001)
          }
          this.facingAngle = t.angle ?? this.facingAngle
          t.x = nextCenter.x
          t.y = nextCenter.y
          t.warningLabel = 'INFERNO RAM // BREAK CONTACT'
        } else if (t.kind === 'inferno_spear_volley') {
          t.x = bossCenter.x
          t.y = bossCenter.y
          t.pulseTimer = (t.pulseTimer ?? 0) + deltaTime
          const shotsFired = t.pulseCount ?? 0
          const nextSpear = t.projectileLanes?.[shotsFired]
          if (nextSpear && (t.pulseTimer ?? 0) >= nextSpear.delay) {
            t.pulseTimer = (t.pulseTimer ?? 0) - nextSpear.delay
            this.launchInferoSpearVolley(t, shotsFired)
            t.pulseCount = shotsFired + 1
            t.warningLabel =
              shotsFired + 1 < (t.projectileCount ?? 0)
                ? `BLAZING SPEAR ${shotsFired + 2}/${t.projectileCount}`
                : 'FINAL BLAZING SPEAR'
          }
        } else if (t.kind === 'infero_spear_cascade') {
          t.x = bossCenter.x
          t.y = bossCenter.y
          t.warningLabel = 'CROSS-LANE SPEAR // SIDE SPEARS INBOUND'
        } else if (t.kind === 'infero_spinning_lattice') {
          t.x = t.spinMode === 'classic_spin' ? bossCenter.x : t.inferoLaunchX ?? t.x
          t.y = t.spinMode === 'classic_spin' ? bossCenter.y : t.inferoLaunchY ?? t.y
          if (t.spinMode === 'classic_spin') {
            t.angle = (t.angle ?? 0) + (t.turnRate ?? 0.42) * deltaTime
            t.gridLines = getInferoSpinningLaserLines(
              bossCenter,
              t.angle,
              t.length ?? 1500
            )
            t.pulseTimer = (t.pulseTimer ?? 0) + deltaTime
            if ((t.pulseTimer ?? 0) >= 0.54) {
              t.pulseTimer = (t.pulseTimer ?? 0) - 0.54
              const pulseIndex = t.pulseCount ?? 0
              this.launchInferoSpinningGridVolley(t, bossCenter, pulseIndex)
              t.pulseCount = pulseIndex + 1
            }
          } else {
            this.updateInferoFurnaceVolley(t, { x: t.x, y: t.y })
          }
        } else if (t.kind === 'infero_solar_core') {
          this.updateInferoFurnaceVolley(t, { x: t.x, y: t.y })
        } else if (t.kind === 'astral_orbital_grid') {
          const pulseCount = t.gridPulseCount ?? 1
          const firstWarningDuration = t.gridPulseFirstWarningDuration ?? 0.24
          const followupWarningDuration = t.gridPulseFollowupWarningDuration ?? 0.64
          const fireDuration = t.gridPulseFireDuration ?? 0.34
          const gapDuration = t.gridPulseGapDuration ?? 0.22
          let nextPulseIndex = 0
          let pulseTimer = t.activeTimer
          while (nextPulseIndex < pulseCount - 1) {
            const currentWarning =
              nextPulseIndex === 0 ? firstWarningDuration : followupWarningDuration
            const currentCycleDuration = currentWarning + fireDuration + gapDuration
            if (pulseTimer < currentCycleDuration) break
            pulseTimer -= currentCycleDuration
            nextPulseIndex++
          }
          const previousPulseIndex = t.gridPulseIndex ?? 0
          for (let pulse = previousPulseIndex + 1; pulse <= nextPulseIndex; pulse++) {
            this.randomizeAstralGridPulse(t)
          }
          t.gridPulseIndex = nextPulseIndex
          t.gridPulseTimer = pulseTimer
          t.gridPulseWarningDuration =
            nextPulseIndex === 0 ? firstWarningDuration : followupWarningDuration
          const warningDuration = t.gridPulseWarningDuration
          t.gridPulseFiring =
            (t.gridPulseTimer ?? 0) >= warningDuration &&
            (t.gridPulseTimer ?? 0) < warningDuration + fireDuration
          t.warningLabel = `ASTRAL GRID VOLLEY ${Math.min(pulseCount, (t.gridPulseIndex ?? 0) + 1)}/${pulseCount}`
        } else if (t.kind === 'cosmic_orb_barrage') {
          t.x = bossCenter.x
          t.y = bossCenter.y
          t.pulseTimer = (t.pulseTimer ?? 0) + deltaTime
          const interval = this.isEnraged ? 0.24 : 0.3
          const oCol1 = t.accentPrimary || (this.isAstralScourge ? '#34D399' : '#22D3EE')
          const oCol2 = t.accentSecondary || (this.isAstralScourge ? '#FACC15' : '#E879F9')
          while (t.pulseTimer >= interval) {
            t.pulseTimer -= interval
            t.pulseCount = (t.pulseCount ?? 0) + 1
            const pIdx = t.pulseCount
            const dir = pIdx % 2 === 0 ? 1 : -1
            const baseRot = pIdx * 0.34 * dir
            const spokes = this.isEnraged ? 10 : 8
            for (let k = 0; k < spokes; k++) {
              const ang = baseRot + (k / spokes) * Math.PI * 2
              const spawnSplitStar = k % 4 === 0
              this.projectiles.push({
                x: bossCenter.x,
                y: bossCenter.y,
                width: spawnSplitStar ? 17 : 12,
                height: spawnSplitStar ? 17 : 12,
                speed: spawnSplitStar ? 225 : 265,
                direction: { x: Math.cos(ang), y: Math.sin(ang) },
                damage: t.damage,
                color: k % 2 === 0 ? oCol1 : oCol2,
                lifetime: 0,
                maxLifetime: 4.5,
                isCosmicStar: spawnSplitStar,
                splitAfter: spawnSplitStar ? 0.78 : undefined,
                splitCount: spawnSplitStar ? (this.isEnraged ? 6 : 4) : undefined,
                splitSpeed: 245,
                splitColors: [oCol1, oCol2]
              })
            }
          }
        } else if (t.kind === 'tracking_strikes' && t.trackingBlasts) {
          t.spawnTimer = (t.spawnTimer ?? 0) + deltaTime
          const maxSpawns = this.isInferoChampion && this.bossPhase >= 2 ? 6 : 5
          const spawnInterval = this.isInferoChampion && this.bossPhase >= 2 ? 0.42 : 0.5
          if (
            (t.spawnsDone ?? 1) < maxSpawns &&
            t.spawnTimer >= spawnInterval &&
            targetCenter
          ) {
            t.spawnTimer -= spawnInterval
            t.spawnsDone = (t.spawnsDone ?? 1) + 1
            t.trackingBlasts.push({
              x: targetCenter.x,
              y: targetCenter.y,
              radius: t.radius,
              elapsed: 0,
              windup: 0.75,
              active: 0.34,
              hasDetonated: false,
              hasDamagedPlayer: false
            })
          }
          for (const blast of t.trackingBlasts) {
            blast.elapsed += deltaTime
            if (!blast.hasDetonated && blast.elapsed >= blast.windup) {
              blast.hasDetonated = true
            }
          }
        } else if (t.kind === 'bullet_hell') {
          t.pulseTimer = (t.pulseTimer ?? 0) + deltaTime
          const interval = 0.21
          while (t.pulseTimer >= interval) {
            t.pulseTimer -= interval
            t.pulseCount = (t.pulseCount ?? 0) + 1
            const pulseIdx = t.pulseCount
            const spiralDir = pulseIdx <= 8 ? 1 : -1
            const baseRot = pulseIdx * 0.29 * spiralDir
            const spokes = 10
            for (let k = 0; k < spokes; k++) {
              const ang = baseRot + (k / spokes) * Math.PI * 2
              this.projectiles.push({
                x: bossCenter.x,
                y: bossCenter.y,
                width: 10,
                height: 10,
                speed: 215,
                direction: { x: Math.cos(ang), y: Math.sin(ang) },
                damage: t.damage,
                color: k % 2 === 0 ? '#FF0055' : '#FACC15',
                lifetime: 0,
                maxLifetime: 5.5
              })
            }
            if (pulseIdx % 3 === 0 && targetCenter) {
              const aim = Math.atan2(targetCenter.y - bossCenter.y, targetCenter.x - bossCenter.x)
              for (const offset of [-0.14, 0.14]) {
                const a = aim + offset
                this.projectiles.push({
                  x: bossCenter.x,
                  y: bossCenter.y,
                  width: 11,
                  height: 11,
                  speed: 265,
                  direction: { x: Math.cos(a), y: Math.sin(a) },
                  damage: t.damage,
                  color: '#38BDF8',
                  lifetime: 0,
                  maxLifetime: 4.5
                })
              }
            }
          }
        }

        if (t.activeTimer >= t.activeDuration) {
          if (
            t.kind === 'astral_orbital_grid' &&
            t.hasTriggered &&
            this.isAstralScourge &&
            this.bossPhase >= 2
          ) {
            this.astralGridCooldownRemaining =
              ASTRAL_SCOURGE_PHASE_TWO_GRID_COOLDOWN_SECONDS
          }
          const shouldInferoEmerge =
            this.isInferoChampion &&
            this.bossPhase >= 2 &&
            t.kind === 'infero_spinning_lattice' &&
            t.spinMode === 'furnace_volley'
          this.telegraphs.splice(i, 1)
          if (shouldInferoEmerge) {
            if (!this.inferoSunEmerged) {
              this.inferoSunEmerged = true
              this.inferoSunAttackIndex = 0
            }
            this.inferoHoverTarget = null
            this.inferoHoverRetargetTimer = 0
            this.telegraphs.push(this.createInferoSolarCoreTelegraph())
          }
        }
      }
    }
  }

  /**
   * Update all projectiles (including homing seekers & Calamity splitting Nebula Stars)
   */
  private updateProjectiles(deltaTime: number): void {
    const targetCenter = this.target && this.target.isAlive ? this.target.getCenter() : null

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
      if (proj.inferoLancePhase) {
        this.updateInferoReboundLance(proj, deltaTime, targetCenter)
      } else {
        if (proj.curveTurnRate) {
          const angle = Math.atan2(proj.direction.y, proj.direction.x) + proj.curveTurnRate * deltaTime
          proj.direction = { x: Math.cos(angle), y: Math.sin(angle) }
        }
        if (proj.homingTurnRate && proj.homingRemaining && proj.homingRemaining > 0 && targetCenter) {
          proj.homingRemaining -= deltaTime
          const currentAngle = Math.atan2(proj.direction.y, proj.direction.x)
          const desiredAngle = Math.atan2(targetCenter.y - proj.y, targetCenter.x - proj.x)
          let diff = desiredAngle - currentAngle
          while (diff > Math.PI) diff -= Math.PI * 2
          while (diff < -Math.PI) diff += Math.PI * 2
          const step = proj.homingTurnRate * deltaTime
          const nextAngle =
            Math.abs(diff) <= step ? desiredAngle : currentAngle + Math.sign(diff) * step
          proj.direction = { x: Math.cos(nextAngle), y: Math.sin(nextAngle) }
        }

        proj.x += proj.direction.x * proj.speed * deltaTime
        proj.y += proj.direction.y * proj.speed * deltaTime
      }

      proj.lifetime += deltaTime
      if ((proj.inferoSpearShardsRemaining ?? 0) > 0) {
        proj.inferoSpearShardTimer =
          (proj.inferoSpearShardTimer ?? proj.inferoSpearShardInterval ?? 0.32) + deltaTime
        const interval = Math.max(0.08, proj.inferoSpearShardInterval ?? 0.32)
        while (
          (proj.inferoSpearShardsRemaining ?? 0) > 0 &&
          (proj.inferoSpearShardTimer ?? 0) >= interval
        ) {
          proj.inferoSpearShardTimer = (proj.inferoSpearShardTimer ?? 0) - interval
          proj.inferoSpearShardsRemaining = (proj.inferoSpearShardsRemaining ?? 1) - 1
          this.launchInferoSpearSideShards(proj)
        }
      }

      if (proj.isBlazingSpear || proj.isInferoFireball) {
        const trail = (proj.trailParticles ??= [])
        for (let particleIndex = trail.length - 1; particleIndex >= 0; particleIndex--) {
          const particle = trail[particleIndex]
          particle.x += particle.velocityX * deltaTime
          particle.y += particle.velocityY * deltaTime
          particle.lifetime += deltaTime
          if (particle.lifetime >= particle.maxLifetime) trail.splice(particleIndex, 1)
        }

        proj.trailTimer = (proj.trailTimer ?? 0) + deltaTime
        while (proj.trailTimer >= 0.045) {
          proj.trailTimer -= 0.045
          const spread = (Math.random() - 0.5) * 20
          const directionAngle = Math.atan2(proj.direction.y, proj.direction.x)
          trail.push({
            x: proj.x - proj.direction.x * proj.width * 0.42 + (Math.random() - 0.5) * 5,
            y: proj.y - proj.direction.y * proj.width * 0.42 + (Math.random() - 0.5) * 5,
            velocityX: -Math.cos(directionAngle) * (36 + Math.random() * 26) + spread,
            velocityY: -Math.sin(directionAngle) * (36 + Math.random() * 26) - 20 - Math.random() * 28,
            radius: 2.5 + Math.random() * 3.5,
            lifetime: 0,
            maxLifetime: 0.22 + Math.random() * 0.2,
            color: Math.random() < 0.55 ? '#FB923C' : Math.random() < 0.72 ? '#FDE047' : '#FFF7ED'
          })
        }
        if (trail.length > 18) trail.splice(0, trail.length - 18)
      }

      // Calamity Nebula Star mid-flight radial split
      if (
        proj.splitAfter &&
        !proj.splitDone &&
        proj.lifetime >= proj.splitAfter
      ) {
        proj.splitDone = true
        const count = Math.max(4, proj.splitCount ?? 4)
        const childSpeed = proj.splitSpeed ?? 245
        const baseAngle = Math.atan2(proj.direction.y, proj.direction.x)
        const splitPalette = proj.splitColors ?? ['#22D3EE', '#E879F9']
        for (let s = 0; s < count; s++) {
          const sa = baseAngle + (s / count) * Math.PI * 2
          this.projectiles.push({
            x: proj.x,
            y: proj.y,
            width: 11,
            height: 11,
            speed: childSpeed,
            direction: { x: Math.cos(sa), y: Math.sin(sa) },
            damage: Math.max(8, Math.round(proj.damage * 0.75)),
            color: s % 2 === 0 ? splitPalette[0] : splitPalette[1],
            lifetime: 0,
            maxLifetime: 2.6
          })
        }
        this.projectiles.splice(i, 1)
        continue
      }

      // Remove expired projectiles
      if (proj.lifetime >= proj.maxLifetime) {
        this.projectiles.splice(i, 1)
      }
    }
  }

  /**
   * Clamp position inside playable arena bounds
   */
  private clampToBounds(): void {
    const padding = 24
    this.x = Math.max(padding, Math.min(this.x, GAME_ARENA_SIZE - this.width - padding))
    this.y = Math.max(padding, Math.min(this.y, GAME_ARENA_SIZE - this.height - padding))
  }

  /**
   * Set position
   */
  setPosition(x: number, y: number): void {
    this.x = x
    this.y = y
  }

  /**
   * Get position
   */
  getPosition(): Vector2 {
    return { x: this.x, y: this.y }
  }

  /**
   * Get center position
   */
  getCenter(): Vector2 {
    return { x: this.x + this.width / 2, y: this.y + this.height / 2 }
  }

  /**
   * Get bounds
   */
  getBounds(): { left: number, right: number, top: number, bottom: number } {
    return {
      left: this.x,
      right: this.x + this.width,
      top: this.y,
      bottom: this.y + this.height
    }
  }

  /**
   * Check collision with another entity
   */
  checkCollision(x: number, y: number, width: number, height: number): boolean {
    const bounds = this.getBounds()
    return (
      bounds.left < x + width &&
      bounds.right > x &&
      bounds.top < y + height &&
      bounds.bottom > y
    )
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): boolean {
    if (!this.isAlive || this.isSpawning) return false
    if (this.isInferoDesperationPhase) return false

    let effectiveDamage =
      this.damageReduction > 0
        ? Math.max(1, Math.round(amount * (1 - Math.min(0.75, Math.max(0, this.damageReduction)))))
        : amount

    if (this.phaseTransitionTimer > 0) {
      effectiveDamage = Math.max(1, Math.round(effectiveDamage * 0.15))
    }

    const prevHealth = this.health
    this.health -= effectiveDamage
    if (this.health < 0) this.health = 0

    // Visual feedback via frame-safe timer
    this.color = '#FFFFFF'
    this.hitFlashTimer = 0.08

    // Astral Scourge enters Phase 2 only after Phase 1 is fully defeated.
    if (this.isAstralScourge && this.isFinalBoss && this.bossPhase === 1 && this.health <= 0) {
      this.health = 0
      this.isDying = false
      this.deathTimer = 0
      this.isSpawning = true
      this.spawnTime = 0
      this.spawnDelay = ASTRAL_SCOURGE_PHASE_TWO_DELAY_SECONDS
      this.cutsceneDelayTimer = this.spawnDelay
      this.astralPhaseTwoActivationTimer = ASTRAL_SCOURGE_PHASE_TWO_DELAY_SECONDS
      this.isAstralScourgeIntermission = true
      this.pendingAstralScourgePhaseOneDeath = true
      this.telegraphs = []
      this.projectiles = []
      this.aoeProjectiles = []
      return false
    }

    // Area final-boss phase gates; Infero deliberately has only two phases.
    if ((this.isFinalBoss || this.isWave15SpecialBoss || this.isInferoChampion) && !this.isAstralScourge) {
      const phase2Threshold = Math.floor(this.maxHealth * (this.isInferoChampion ? 0.5 : 0.66))
      const phase3Threshold = Math.floor(this.maxHealth * 0.33)

      if (this.bossPhase < 2 && prevHealth > phase2Threshold && this.health <= phase2Threshold) {
        this.health = Math.max(1, phase2Threshold)
        this.bossPhase = 2
        this.phaseTransitionTimer = 0.85
        this.pendingPhaseAnnouncement = 2
        if (this.isInferoChampion) {
          this.isEnraged = true
          this.speed = this.baseSpeed * 1.16
          this.damage = Math.round(this.damage * 1.12)
          this.damageScale *= 1.12
          this.shootCooldownMax = Math.max(0.62, this.shootCooldownMax * 0.82)
          this.aoeCooldownMax = Math.max(0.95, this.aoeCooldownMax * 0.82)
          this.specialCooldownMax = Math.max(1.25, this.specialCooldownMax * 0.72)
        } else if (this.isWormBoss) {
          this.speed = this.baseSpeed * 1.15
        }
        this.shootCooldownMax = Math.max(0.85, this.shootCooldownMax * 0.86)
        this.specialCooldownMax = Math.max(1.85, this.specialCooldownMax * 0.86)
        this.shootCooldown = Math.min(this.shootCooldown, 0.25)
        this.specialCooldown = 0.15
        if (this.target && this.target.isAlive) {
          const transitionAttack = this.isWormBoss
            ? 'cosmic_laser_walls'
            : this.isStationaryBoss
              ? getWave15BossAttackKind(
                  this.enemyId === 'boss_a2_15'
                    ? 'solar_archon_seraph'
                    : this.enemyId.startsWith('boss_a3_')
                      ? 'primordial_starforge'
                      : 'omega_overlord',
                  2,
                  0
                )
              : 'rotating_cross_lasers'
          this.spawnTelegraphedAttack(transitionAttack)
        }
        return false
      }

      if (
        !this.isInferoChampion &&
        this.bossPhase < 3 &&
        prevHealth > phase3Threshold &&
        this.health <= phase3Threshold
      ) {
        this.health = Math.max(1, phase3Threshold)
        this.bossPhase = 3
        this.isEnraged = true
        this.phaseTransitionTimer = 0.95
        this.pendingPhaseAnnouncement = 3
        if (this.isWormBoss) {
          this.speed = this.baseSpeed * 1.28
        }
        this.shootCooldownMax = Math.max(0.68, this.shootCooldownMax * 0.82)
        this.specialCooldownMax = Math.max(1.55, this.specialCooldownMax * 0.82)
        this.shootCooldown = Math.min(this.shootCooldown, 0.2)
        this.specialCooldown = 0.15
        if (this.target && this.target.isAlive) {
          const transitionAttack = this.isWormBoss
            ? 'cosmic_laser_walls'
            : this.isStationaryBoss
              ? getWave15BossAttackKind(
                  this.enemyId === 'boss_a2_15'
                    ? 'solar_archon_seraph'
                    : this.enemyId.startsWith('boss_a3_')
                      ? 'primordial_starforge'
                      : 'omega_overlord',
                  3,
                  0
                )
              : 'singularity_grid'
          this.spawnTelegraphedAttack(transitionAttack)
        }
        return false
      }
    }

    // Check if dead
    if (this.health <= 0) {
      if (
        this.isInferoChampion &&
        !this.hasCompletedInferoDesperation
      ) {
        this.health = 0
        this.isInferoDesperationPhase = true
        this.pendingInferoDesperationCompletion = false
        this.inferoDesperationTimer = 0
        this.inferoDesperationCycleMode = 'portal'
        this.inferoDesperationCycleTimer = 0
        this.inferoDesperationPortalIndex = 0
        this.openInferoDesperationPortal()
        this.isDying = false
        this.color = this.baseColor
        this.hitFlashTimer = 0
        this.freezeTimer = 0
        this.burnTimer = 0
        this.pendingPhaseAnnouncement = null
        this.telegraphs = []
        this.projectiles = []
        this.aoeProjectiles = []
        this.velocity = Vector2.zero()
        return false
      }
      this.isAlive = false
      this.isDying = true
      this.deathTimer = 0
      this.telegraphs = []
      this.aoeProjectiles = []
      return true
    }

    // Devourer of Gods (and non-final Dev-spawned Astral Scourge) Phase 2 awakening at <= 60% HP
    if ((this.isDevourerOfGods || (!this.isFinalBoss && this.isAstralScourge)) && !this.isEnraged && this.health <= this.maxHealth * 0.6) {
      this.isEnraged = true
      this.bossPhase = 2
      this.pendingPhaseAnnouncement = 2
      this.phaseTransitionTimer = 0.75
      this.speed = this.baseSpeed * 1.26
      this.shootCooldownMax = Math.max(0.7, this.shootCooldownMax * 0.78)
      this.specialCooldownMax = Math.max(1.8, this.specialCooldownMax * 0.78)
      this.shootCooldown = Math.min(this.shootCooldown, 0.25)
      this.specialCooldown = 0.2
      if (this.target && this.target.isAlive) {
        this.spawnTelegraphedAttack('cosmic_laser_walls')
      }
    }

    // Standard Boss Phase 2 Enrage at <= 50% HP for armored/buffed non-final bosses
    if (
      !this.isFinalBoss &&
      !this.isWormBoss &&
      this.enableEnrage &&
      !this.isEnraged &&
      this.health <= this.maxHealth * 0.5
    ) {
      this.isEnraged = true
      this.bossPhase = 2
      this.pendingPhaseAnnouncement = 2
      if (!this.isStationaryBoss) {
        this.speed = this.baseSpeed * 1.22
      }
      this.shootCooldownMax = Math.max(0.72, this.shootCooldownMax * 0.78)
      this.specialCooldownMax = Math.max(1.85, this.specialCooldownMax * 0.78)
      this.shootCooldown = Math.min(this.shootCooldown, 0.35)
      this.specialCooldown = Math.min(this.specialCooldown, 0.5)
    }

    return false
  }

  /**
   * Heal
   */
  heal(amount: number): void {
    if (!this.isAlive || this.isInferoDesperationPhase) return
    this.health += amount
    if (this.health > this.maxHealth) this.health = this.maxHealth
  }

  /**
   * Ignite enemy with a stacking/refreshing burn DoT
   */
  applyBurn(damagePerTick: number, duration = 3.0): void {
    if (!this.isAlive || this.isSpawning || this.isInferoDesperationPhase) return
    const safeDmg = Math.max(1, Math.round(damagePerTick))
    this.burnDamagePerTick = Math.max(this.burnDamagePerTick, safeDmg)
    this.burnTimer = Math.max(this.burnTimer, duration)
  }

  /**
   * Advance burn timer and return burn tick damage every 0.5s (0 if no tick this frame)
   */
  tickBurn(deltaTime: number): number {
    if (!this.isAlive || this.isSpawning || this.burnTimer <= 0 || this.burnDamagePerTick <= 0) {
      return 0
    }
    this.burnTimer = Math.max(0, this.burnTimer - deltaTime)
    this.burnTickTimer += deltaTime
    if (this.burnTickTimer >= 0.5) {
      this.burnTickTimer -= 0.5
      return this.burnDamagePerTick
    }
    return 0
  }

  /**
   * Freeze enemy temporarily in solid ice (halting movement & attacks)
   */
  applyFreeze(duration = 1.6): void {
    if (
      !this.isAlive ||
      this.isSpawning ||
      this.isInferoDesperationPhase ||
      this.isBoss ||
      this.isMiniBoss ||
      duration <= 0
    ) return
    if (this.freezeTimer <= 0 && this.freezeImmuneTimer > 0) return
    const effectiveDuration = this.isStationaryBoss
      ? Math.min(0.45, duration * 0.25)
      : this.isBoss || this.isMiniBoss
        ? this.damageReduction > 0 || this.enableEnrage
          ? Math.max(0.35, Math.min(0.6, duration * 0.32))
          : Math.max(0.55, duration * 0.55)
        : duration
    this.freezeTimer = Math.min(2.6, Math.max(this.freezeTimer, effectiveDuration))
    if (this.isBoss && (this.damageReduction > 0 || this.enableEnrage)) {
      this.freezeImmuneTimer = Math.max(this.freezeImmuneTimer, 1.35)
    }
    if (!this.isStationaryBoss) {
      this.velocity = Vector2.zero()
    }
  }

  /**
   * Get enemy type
   */
  getType(): EnemyType {
    return this.type
  }

  /**
   * Get coin value
   */
  getCoinValue(): number {
    return this.coinValue
  }

  /**
   * Update death animation
   */
  updateDeath(deltaTime: number): boolean {
    if (!this.isDying) return false
    this.inferoDesperationTrail.update(deltaTime)
    
    this.deathTimer += deltaTime
    if (this.deathTimer >= this.deathDuration) {
      this.isDying = false
      return true
    }
    
    // Death animation - fade out
    return false
  }

  /**
   * Draw dodgeable AoE projectile landing warning circles & detonation bursts on the floor
   */
  drawAoeIndicators(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!this.isAlive || this.aoeProjectiles.length === 0) return

    for (const aoe of this.aoeProjectiles) {
      const sp = camera.worldToScreen(aoe.targetX, aoe.targetY)
      const r = Math.max(14, aoe.radius)

      ctx.save()
      if (!aoe.hasDetonated) {
        const progress = Math.max(0, Math.min(1, aoe.elapsed / aoe.flightDuration))
        const pulse = 0.72 + 0.28 * Math.sin(this.animTime * 20)

        // Floor hazard circle
        ctx.fillStyle = `rgba(249, 115, 22, ${0.15 + progress * 0.18})`
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
        ctx.fill()

        // Expanding inner charge circle indicating exact detonation timing
        ctx.fillStyle = 'rgba(250, 204, 21, 0.28)'
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, Math.max(4, r * progress), 0, Math.PI * 2)
        ctx.fill()

        // Pulsing dashed warning border
        ctx.strokeStyle = `rgba(255, 59, 92, ${0.9 * pulse})`
        ctx.lineWidth = 3
        ctx.setLineDash([9, 6])
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])

        // Crosshair marker at impact center
        ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)'
        ctx.lineWidth = 1.8
        const cross = r * 0.28
        ctx.beginPath()
        ctx.moveTo(sp.x - cross, sp.y)
        ctx.lineTo(sp.x + cross, sp.y)
        ctx.moveTo(sp.x, sp.y - cross)
        ctx.lineTo(sp.x, sp.y + cross)
        ctx.stroke()

        const remainingSec = Math.max(0, aoe.flightDuration - aoe.elapsed).toFixed(1)
        ctx.fillStyle = '#FEF08A'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(`⚠ AOE BLAST (${remainingSec}s)`, sp.x, sp.y - r - 8)
      } else {
        const impactProgress = Math.max(0, Math.min(1, aoe.activeTimer / aoe.activeDuration))
        const alpha = Math.max(0, 1 - impactProgress)
        const blastR = Math.max(10, r * (0.85 + impactProgress * 0.28))
        ctx.globalAlpha = alpha
        ctx.fillStyle = 'rgba(249, 115, 22, 0.58)'
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, blastR, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#FEF08A'
        ctx.lineWidth = 3.5
        ctx.beginPath()
        ctx.arc(sp.x, sp.y, blastR, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    }
  }

  /**
   * Draw telegraphed boss attack warning indicators & detonations on the arena floor
   */
  drawTelegraphs(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!this.isAlive || this.telegraphs.length === 0) return

    for (const t of this.telegraphs) {
      const chargeProgress =
        t.chargeDuration > 0
          ? Math.max(0, Math.min(1, t.chargeTimer / t.chargeDuration))
          : Number(t.hasTriggered)
      const impactProgress = t.hasTriggered
        ? Math.max(0, Math.min(1, t.activeTimer / t.activeDuration))
        : 0

      if (t.kind === 'infero_spear_cascade' && t.projectileLanes?.[0]) {
        const lane = t.projectileLanes[0]
        const mainPath = t.gridLines?.[0]
        if (!mainPath) continue
        const start = camera.worldToScreen(mainPath.x1, mainPath.y1)
        const end = camera.worldToScreen(mainPath.x2, mainPath.y2)
        const view = this.getInferoViewportBounds()
        const top = camera.worldToScreen(lane.x, view.top + 12)
        const bottom = camera.worldToScreen(lane.x, view.bottom - 12)
        const warningAlpha = t.hasTriggered
          ? Math.max(0.16, 0.58 - impactProgress * 0.38)
          : 0.35 + chargeProgress * 0.42
        ctx.save()
        ctx.lineCap = 'round'
        ctx.setLineDash([15, 10])
        ctx.strokeStyle = `rgba(253, 224, 71, ${warningAlpha})`
        ctx.lineWidth = t.hasTriggered ? 3 : 2.5
        ctx.shadowColor = '#F97316'
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(end.x, end.y)
        ctx.stroke()

        if (!t.hasTriggered) {
          const bossPoint = camera.worldToScreen(
            t.inferoLaunchX ?? t.x,
            t.inferoLaunchY ?? t.y
          )
          const retrievalProgress = Math.max(
            0,
            Math.min(1, t.chargeTimer / Math.max(0.1, t.chargeDuration - 0.48))
          )
          const returnX = end.x + (bossPoint.x - end.x) * retrievalProgress
          const returnY = start.y + (bossPoint.y - start.y) * retrievalProgress
          const returnAngle = t.sideMode === 'left' ? Math.PI : 0
          ctx.setLineDash([])
          ctx.globalAlpha = 0.94
          ctx.save()
          ctx.translate(returnX, returnY)
          ctx.rotate(returnAngle)
          ctx.fillStyle = '#FDE047'
          ctx.shadowBlur = 15
          ctx.beginPath()
          ctx.moveTo(17, 0)
          ctx.lineTo(-8, -5)
          ctx.lineTo(-5, 0)
          ctx.lineTo(-8, 5)
          ctx.closePath()
          ctx.fill()
          ctx.strokeStyle = '#FFF7ED'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(-17, 0)
          ctx.lineTo(7, 0)
          ctx.stroke()
          ctx.restore()
        }

        ctx.globalAlpha = 1
        const labelY = Math.max(30, start.y - 30)
        ctx.fillStyle = 'rgba(28, 25, 23, 0.9)'
        ctx.fillRect((start.x + end.x) / 2 - 176, labelY - 17, 352, 24)
        ctx.fillStyle = t.hasTriggered ? '#FEF08A' : '#FEF3C7'
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'center'
        const warningText = t.hasTriggered
          ? t.warningLabel ?? 'CROSS-LANE SPEAR'
          : t.chargeTimer < t.chargeDuration - 0.48
            ? 'SPEAR RECALL // SIDE SPEARS WILL FAN OUT'
            : 'SPEAR RECLAIMED // DODGE THE CROSS-LANE'
        ctx.fillText(warningText, (start.x + end.x) / 2, labelY)
        ctx.restore()
      } else if (t.kind === 'inferno_spear_volley' && t.projectileLanes) {
        const remainingAlpha = t.hasTriggered ? Math.max(0.12, 0.72 - impactProgress * 0.6) : 0.28 + chargeProgress * 0.48
        const lines = t.gridLines ?? []
        const nextSpearIndex = Math.min(t.pulseCount ?? 0, Math.max(0, lines.length - 1))
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        for (let index = 0; index < lines.length; index++) {
          const line = lines[index]
          const start = camera.worldToScreen(line.x1, line.y1)
          const end = camera.worldToScreen(line.x2, line.y2)
          const isNextSpear = index === nextSpearIndex
          const hasFired = t.hasTriggered && index < (t.pulseCount ?? 0)
          const lineAlpha = hasFired ? 0.06 : isNextSpear ? remainingAlpha : 0.13
          ctx.strokeStyle = `rgba(251, 146, 60, ${lineAlpha})`
          ctx.lineWidth = isNextSpear ? (t.hasTriggered ? 4 : 2 + chargeProgress * 2) : 1
          ctx.setLineDash(isNextSpear ? [14, 10] : [4, 14])
          ctx.beginPath()
          ctx.moveTo(start.x, start.y)
          ctx.lineTo(end.x, end.y)
          ctx.stroke()

          ctx.setLineDash([])
          if (!isNextSpear || hasFired) continue
          ctx.fillStyle = '#FDE047'
          ctx.shadowColor = '#F97316'
          ctx.shadowBlur = 13
          ctx.beginPath()
          ctx.arc(start.x, start.y, 7 + chargeProgress * 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }

        if (lines[0]) {
          const nextLine = lines[nextSpearIndex]
          const first = camera.worldToScreen(nextLine.x1, nextLine.y1)
          const labelX = t.sideMode === 'right' ? first.x - 280 : first.x - 8
          const labelAlign = t.sideMode === 'right' ? 'right' : 'left'
          const labelY = Math.max(30, first.y - 40)
          ctx.fillStyle = 'rgba(28, 25, 23, 0.9)'
          ctx.fillRect(labelX, labelY - 17, 280, 24)
          ctx.fillStyle = '#FEF3C7'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = labelAlign
          ctx.fillText(
            `${t.warningLabel ?? 'BLAZING SPEAR'}${t.hasTriggered ? '' : ` • ${(t.chargeDuration - t.chargeTimer).toFixed(1)}s`}`,
            labelAlign === 'right' ? labelX + 272 : labelX + 8,
            labelY
          )
        }
        ctx.restore()
      } else if (t.kind === 'infero_orbiting_lances') {
        const center = camera.worldToScreen(t.x, t.y)
        const ringRadius = (t.orbitRadius ?? 205) * camera.zoom
        const pulse = 0.72 + Math.sin(this.animTime * 12) * 0.12
        ctx.save()
        ctx.globalAlpha = t.hasTriggered ? 0.72 : 0.9
        ctx.strokeStyle = t.hasTriggered ? '#FB923C' : '#FDE047'
        ctx.lineWidth = t.hasTriggered ? 2.5 : 2
        ctx.shadowColor = '#F97316'
        ctx.shadowBlur = 12
        ctx.setLineDash([11, 8])
        ctx.beginPath()
        ctx.arc(center.x, center.y, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
        for (let index = 0; index < (t.projectileCount ?? 8); index++) {
          const angle =
            this.animTime * (t.hasTriggered ? 2.65 : 0.24) +
            (index / (t.projectileCount ?? 8)) * Math.PI * 2
          const markerX = center.x + Math.cos(angle) * ringRadius
          const markerY = center.y + Math.sin(angle) * ringRadius
          ctx.globalAlpha = (t.hasTriggered ? 0.8 : 0.55) * pulse
          ctx.fillStyle = index % 2 === 0 ? '#FFF7ED' : '#FDE047'
          ctx.beginPath()
          ctx.arc(markerX, markerY, (t.hasTriggered ? 5 : 4) * camera.zoom, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#F97316'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(markerX - 7 * camera.zoom, markerY)
          ctx.lineTo(markerX + 7 * camera.zoom, markerY)
          ctx.moveTo(markerX, markerY - 7 * camera.zoom)
          ctx.lineTo(markerX, markerY + 7 * camera.zoom)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
        ctx.fillStyle = 'rgba(28, 25, 23, 0.9)'
        ctx.fillRect(center.x - 168, center.y - ringRadius - 34, 336, 24)
        ctx.fillStyle = t.hasTriggered ? '#FEF08A' : '#FDBA74'
        ctx.font = 'bold 11px monospace'
        ctx.textAlign = 'center'
        const remaining = t.hasTriggered
          ? Math.max(0, (t.orbitDuration ?? 2.05) - t.activeTimer)
          : Math.max(0, t.chargeDuration - t.chargeTimer)
        ctx.fillText(
          `${t.warningLabel ?? 'EMBER ORBIT'} • ${remaining.toFixed(1)}s`,
          center.x,
          center.y - ringRadius - 18
        )
        ctx.restore()
      } else if (t.kind === 'infero_rebound_lances') {
        const showMoveTarget = !t.hasTriggered || t.lanceRoundPhase === 'moving'
        const targetX = showMoveTarget
          ? t.hasTriggered
            ? t.lanceMoveTargetX
            : t.inferoLaunchX
          : undefined
        const targetY = showMoveTarget
          ? t.hasTriggered
            ? t.lanceMoveTargetY
            : t.inferoLaunchY
          : undefined
        const bossPoint = camera.worldToScreen(this.getCenter().x, this.getCenter().y)
        ctx.save()
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(28, 25, 23, 0.88)'
        ctx.fillRect(bossPoint.x - 136, bossPoint.y - 57, 272, 23)
        ctx.fillStyle = '#FEF3C7'
        ctx.fillText(t.warningLabel ?? 'EMBER LANCE FAN', bossPoint.x, bossPoint.y - 41)
        if (targetX !== undefined && targetY !== undefined) {
          const target = camera.worldToScreen(targetX, targetY)
          ctx.strokeStyle = 'rgba(251, 146, 60, 0.7)'
          ctx.lineWidth = 2
          ctx.setLineDash([10, 8])
          ctx.beginPath()
          ctx.moveTo(bossPoint.x, bossPoint.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.strokeStyle = '#FDE047'
          ctx.shadowColor = '#F97316'
          ctx.shadowBlur = 14
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(target.x, target.y, 16 + Math.sin(this.animTime * 7) * 2, 0, Math.PI * 2)
          ctx.moveTo(target.x - 23, target.y)
          ctx.lineTo(target.x + 23, target.y)
          ctx.moveTo(target.x, target.y - 23)
          ctx.lineTo(target.x, target.y + 23)
          ctx.stroke()
          ctx.shadowBlur = 0
        }
        ctx.restore()
      } else if (t.kind === 'infero_aimed_ram') {
        const start = camera.worldToScreen(
          t.ramStartX ?? t.x,
          t.ramStartY ?? t.y
        )
        const end = camera.worldToScreen(
          t.ramTargetX ?? t.endX ?? t.x,
          t.ramTargetY ?? t.endY ?? t.y
        )
        const aim = camera.worldToScreen(
          t.ramAimX ?? t.x,
          t.ramAimY ?? t.y
        )
        const dx = end.x - start.x
        const dy = end.y - start.y
        const angle = Math.atan2(dy, dx)
        const headSize = 26 * camera.zoom
        const pathEnd = t.hasTriggered
          ? camera.worldToScreen(this.getCenter().x, this.getCenter().y)
          : end

        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'
        ctx.strokeStyle = t.hasTriggered
          ? 'rgba(249, 115, 22, 0.8)'
          : `rgba(253, 224, 71, ${0.55 + chargeProgress * 0.4})`
        ctx.lineWidth = t.hasTriggered ? 28 : 12
        ctx.shadowColor = '#F97316'
        ctx.shadowBlur = t.hasTriggered ? 24 : 16
        ctx.setLineDash(t.hasTriggered ? [] : [18, 12])
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(pathEnd.x, pathEnd.y)
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.strokeStyle = t.hasTriggered ? '#FEF08A' : '#FFF7ED'
        ctx.lineWidth = t.hasTriggered ? 5 : 3
        ctx.beginPath()
        ctx.moveTo(start.x, start.y)
        ctx.lineTo(pathEnd.x, pathEnd.y)
        ctx.stroke()
        ctx.setLineDash([])

        if (!t.hasTriggered) {
          ctx.strokeStyle = '#FDE047'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(end.x, end.y)
          ctx.lineTo(
            end.x - Math.cos(angle - 0.45) * headSize,
            end.y - Math.sin(angle - 0.45) * headSize
          )
          ctx.moveTo(end.x, end.y)
          ctx.lineTo(
            end.x - Math.cos(angle + 0.45) * headSize,
            end.y - Math.sin(angle + 0.45) * headSize
          )
          ctx.stroke()
          ctx.strokeStyle = 'rgba(255, 247, 237, 0.95)'
          ctx.beginPath()
          ctx.arc(aim.x, aim.y, 22 * camera.zoom, 0, Math.PI * 2)
          ctx.moveTo(aim.x - 30 * camera.zoom, aim.y)
          ctx.lineTo(aim.x + 30 * camera.zoom, aim.y)
          ctx.moveTo(aim.x, aim.y - 30 * camera.zoom)
          ctx.lineTo(aim.x, aim.y + 30 * camera.zoom)
          ctx.stroke()
        }

        const midX = (start.x + end.x) / 2
        const midY = (start.y + end.y) / 2
        const labelY = Math.max(28, Math.min(camera.height - 20, midY - 18))
        ctx.fillStyle = 'rgba(28, 25, 23, 0.92)'
        ctx.fillRect(midX - 148, labelY - 19, 296, 25)
        ctx.fillStyle = '#FEF3C7'
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(
          t.hasTriggered
            ? 'INFERNO RAM // INCOMING'
            : `INFERNO RAM // LOCKED ${(t.chargeDuration - t.chargeTimer).toFixed(1)}s`,
          midX,
          labelY
        )
        ctx.restore()
      } else if (t.kind === 'infero_underflame_swoops' && t.fireColumns) {
        ctx.save()
        ctx.lineCap = 'round'
        for (const column of t.fireColumns) {
          if (!t.hasTriggered || column.elapsed < column.holdDuration) continue
          const warningComplete = column.holdDuration + column.windup
          const isWarning = column.elapsed < warningComplete
          const extensionProgress = Math.max(
            0,
            Math.min(1, (column.elapsed - warningComplete) / 0.18)
          )
          const beamTopY = isWarning
            ? column.topY
            : column.y - (column.y - column.topY) * extensionProgress
          const topLeft = camera.worldToScreen(
            column.x - column.width / 2,
            beamTopY
          )
          const screenWidth = column.width * camera.zoom
          const screenHeight = Math.max(1, (column.y - beamTopY) * camera.zoom)
          const centerX = topLeft.x + screenWidth / 2
          const warningRemaining = Math.max(0, warningComplete - column.elapsed)
          if (isWarning) {
            const pulse = 0.7 + Math.sin(this.animTime * 15) * 0.22
            ctx.fillStyle = `rgba(249, 115, 22, ${0.12 + pulse * 0.12})`
            ctx.fillRect(topLeft.x, topLeft.y, screenWidth, screenHeight)
            ctx.strokeStyle = `rgba(253, 224, 71, ${pulse})`
            ctx.lineWidth = 3
            ctx.setLineDash([9, 6])
            ctx.strokeRect(topLeft.x, topLeft.y, screenWidth, screenHeight)
            ctx.setLineDash([])
            ctx.strokeStyle = 'rgba(255, 247, 237, 0.9)'
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(centerX, topLeft.y + 12)
            ctx.lineTo(centerX, topLeft.y + screenHeight - 12)
            ctx.moveTo(topLeft.x + 12, topLeft.y + screenHeight / 2)
            ctx.lineTo(topLeft.x + screenWidth - 12, topLeft.y + screenHeight / 2)
            ctx.stroke()
            ctx.fillStyle = 'rgba(28, 25, 23, 0.92)'
            ctx.fillRect(centerX - 92, topLeft.y + 5, 184, 20)
            ctx.fillStyle = '#FEF08A'
            ctx.font = 'bold 11px monospace'
            ctx.textAlign = 'center'
            ctx.fillText(
              `FIRE COLUMN ${column.number}/${t.swoopCount ?? 3} • ${warningRemaining.toFixed(1)}s`,
              centerX,
              topLeft.y + 19
            )
          } else {
            const columnGradient = ctx.createLinearGradient(
              0,
              topLeft.y,
              0,
              topLeft.y + screenHeight
            )
            columnGradient.addColorStop(0, 'rgba(254, 240, 138, 0.76)')
            columnGradient.addColorStop(0.42, 'rgba(249, 115, 22, 0.82)')
            columnGradient.addColorStop(1, 'rgba(127, 29, 29, 0.28)')
            ctx.globalAlpha = Math.max(0.18, 1 - (column.elapsed - warningComplete) / column.active)
            ctx.shadowColor = '#F97316'
            ctx.shadowBlur = 30
            ctx.fillStyle = columnGradient
            ctx.fillRect(topLeft.x, topLeft.y, screenWidth, screenHeight)
            ctx.shadowBlur = 0
            ctx.fillStyle = 'rgba(254, 240, 138, 0.78)'
            ctx.fillRect(centerX - 7, topLeft.y, 14, screenHeight)
            for (let spark = 0; spark < 18; spark++) {
              const travel = (this.animTime * 1.7 + spark * 0.137) % 1
              const sparkX = centerX + Math.sin(spark * 4.1 + this.animTime * 9) * screenWidth * 0.45
              const sparkY = topLeft.y + screenHeight * (1 - travel)
              ctx.fillStyle = spark % 2 === 0 ? '#FFF7ED' : '#FDBA74'
              ctx.fillRect(sparkX, sparkY, 2 + spark % 3, 9 + spark % 7)
            }
            ctx.strokeStyle = '#FDE047'
            ctx.lineWidth = 4
            ctx.strokeRect(topLeft.x + 2, topLeft.y, screenWidth - 4, screenHeight)
            ctx.fillStyle = '#FFF7ED'
            ctx.beginPath()
            ctx.arc(centerX, topLeft.y + screenHeight, 11 + Math.sin(this.animTime * 20) * 3, 0, Math.PI * 2)
            ctx.fill()
            ctx.globalAlpha = 1
          }
        }
        ctx.restore()
      } else if (
        (t.kind === 'infero_spinning_lattice' || t.kind === 'infero_solar_core') &&
        t.gridLines
      ) {
        const lines = t.gridLines
        const warningAlpha = t.spinMode === 'furnace_volley'
          ? 0.6 + chargeProgress * 0.25
          : 0.25 + chargeProgress * 0.55
        const isLaserShotActive = Boolean(t.hasTriggered && t.gridPulseFiring)
        ctx.save()
        ctx.lineCap = 'round'
        ctx.lineJoin = 'round'

        if (t.spinMode === 'furnace_volley') {
          const isSolarCore = t.kind === 'infero_solar_core'
          const fireballCenter = camera.worldToScreen(t.x, t.y)
          const fireballRadius =
            (isSolarCore ? Math.max(142, this.width * 1.35 + 35) : this.width * 0.72 + 20) *
            camera.zoom
          const glowExtent = fireballRadius * 1.42
          const coreVisible =
            !isSolarCore ||
            (fireballCenter.x >= -glowExtent &&
              fireballCenter.x <= ctx.canvas.width + glowExtent &&
              fireballCenter.y >= -glowExtent &&
              fireballCenter.y <= ctx.canvas.height + glowExtent)
          if (coreVisible) {
            const fireballGlow = ctx.createRadialGradient(
              fireballCenter.x,
              fireballCenter.y,
              fireballRadius * 0.12,
              fireballCenter.x,
              fireballCenter.y,
              glowExtent
            )
            fireballGlow.addColorStop(0, 'rgba(255, 255, 255, 0.98)')
            fireballGlow.addColorStop(0.2, 'rgba(255, 247, 205, 0.9)')
            fireballGlow.addColorStop(0.46, 'rgba(253, 224, 71, 0.68)')
            fireballGlow.addColorStop(0.74, 'rgba(249, 115, 22, 0.38)')
            fireballGlow.addColorStop(1, 'rgba(234, 88, 12, 0)')
            ctx.globalCompositeOperation = 'lighter'
            ctx.fillStyle = fireballGlow
            ctx.beginPath()
            ctx.arc(fireballCenter.x, fireballCenter.y, glowExtent, 0, Math.PI * 2)
            ctx.fill()
            ctx.globalCompositeOperation = 'source-over'
            ctx.strokeStyle = '#FFF7ED'
            ctx.lineWidth = isSolarCore ? 4 : 3
            ctx.shadowColor = '#FDE047'
            ctx.shadowBlur = isSolarCore ? 18 : 14
            ctx.beginPath()
            ctx.arc(
              fireballCenter.x,
              fireballCenter.y,
              fireballRadius * (0.78 + Math.sin(this.animTime * 7) * (isSolarCore ? 0.07 : 0.04)),
              0,
              Math.PI * 2
            )
            ctx.stroke()
            const flameCount = isSolarCore ? 8 : 9
            for (let flame = 0; flame < flameCount; flame++) {
              const angle =
                this.animTime * (flame % 2 === 0 ? 1.4 : -1.1) +
                (flame / flameCount) * Math.PI * 2
              const flameOrbit =
                fireballRadius * (isSolarCore ? 0.73 + (flame % 3) * 0.055 : 0.68)
              const flameX = fireballCenter.x + Math.cos(angle) * flameOrbit
              const flameY = fireballCenter.y + Math.sin(angle) * flameOrbit
              ctx.fillStyle =
                flame % 4 === 0 ? '#FFFFFF' : flame % 2 === 0 ? '#FFF7ED' : '#FDE047'
              ctx.shadowColor = '#F97316'
              ctx.shadowBlur = isSolarCore ? 12 : 14
              ctx.beginPath()
              ctx.arc(
                flameX,
                flameY,
                (isSolarCore ? 5 : 4) + (flame % 3) * (isSolarCore ? 2 : 1.5),
                0,
                Math.PI * 2
              )
              ctx.fill()
            }
            if (isSolarCore) {
              for (let spark = 0; spark < 10; spark++) {
                const angle = spark * 2.39996 + this.animTime * (spark % 2 === 0 ? 0.82 : -0.58)
                const travel = (this.animTime * 0.72 + spark * 0.173) % 1
                const orbit = fireballRadius * (0.82 + travel * 0.56)
                const sparkX = fireballCenter.x + Math.cos(angle) * orbit
                const sparkY = fireballCenter.y + Math.sin(angle) * orbit
                const tailLength = (7 + (spark % 5) * 3) * camera.zoom
                const color =
                  spark % 5 === 0 ? '#FFFFFF' : spark % 2 === 0 ? '#FEF08A' : '#FB923C'
                ctx.strokeStyle = color
                ctx.lineWidth = (spark % 3 === 0 ? 2.4 : 1.6) * camera.zoom
                ctx.shadowColor = color
                ctx.shadowBlur = 6
                ctx.beginPath()
                ctx.moveTo(sparkX, sparkY)
                ctx.lineTo(
                  sparkX - Math.cos(angle) * tailLength,
                  sparkY - Math.sin(angle) * tailLength
                )
                ctx.stroke()
                ctx.fillStyle = '#FFF7ED'
                ctx.beginPath()
                ctx.arc(sparkX, sparkY, (2 + (spark % 3) * 0.8) * camera.zoom, 0, Math.PI * 2)
                ctx.fill()
              }
            }
          }
          ctx.globalCompositeOperation = 'source-over'
        }

        for (let beamIndex = 0; beamIndex < lines.length; beamIndex++) {
          const line = lines[beamIndex]
          const start = camera.worldToScreen(line.x1, line.y1)
          const end = camera.worldToScreen(line.x2, line.y2)
          const activeAlpha = isLaserShotActive ? 0.95 : warningAlpha
          const beamWidth = isLaserShotActive ? 10 : 3 + chargeProgress * 2

          ctx.setLineDash(isLaserShotActive ? [] : [10, 8])
          ctx.strokeStyle = `rgba(249, 115, 22, ${isLaserShotActive ? 0.42 : warningAlpha * 0.55})`
          ctx.lineWidth = isLaserShotActive ? 22 : 8
          ctx.shadowColor = '#F97316'
          ctx.shadowBlur = isLaserShotActive ? 20 : 12
          ctx.beginPath()
          ctx.moveTo(start.x, start.y)
          ctx.lineTo(end.x, end.y)
          ctx.stroke()

          ctx.setLineDash(isLaserShotActive ? [] : [10, 8])
          ctx.strokeStyle = `rgba(251, 146, 60, ${activeAlpha})`
          ctx.lineWidth = beamWidth
          ctx.shadowBlur = isLaserShotActive ? 18 : 0
          ctx.beginPath()
          ctx.moveTo(start.x, start.y)
          ctx.lineTo(end.x, end.y)
          ctx.stroke()

          if (isLaserShotActive) {
            ctx.setLineDash([])
            ctx.strokeStyle = `rgba(254, 240, 138, ${0.9 + Math.sin(this.animTime * 18 + beamIndex) * 0.1})`
            ctx.lineWidth = 3
            ctx.shadowColor = '#FEF08A'
            ctx.shadowBlur = 11
            ctx.beginPath()
            ctx.moveTo(start.x, start.y)
            ctx.lineTo(end.x, end.y)
            ctx.stroke()

            for (let mote = 0; mote < 3; mote++) {
              const progress = (this.animTime * 0.82 + mote * 0.3 + beamIndex * 0.31) % 1
              const moteX = start.x + (end.x - start.x) * progress
              const moteY = start.y + (end.y - start.y) * progress
              const moteRadius = 1.8 + Math.sin(this.animTime * 14 + mote) * 0.8
              ctx.fillStyle = mote % 2 === 0 ? '#FEF08A' : '#FB923C'
              ctx.shadowColor = '#F97316'
              ctx.shadowBlur = 13
              ctx.beginPath()
              ctx.arc(moteX, moteY, Math.max(1.2, moteRadius), 0, Math.PI * 2)
              ctx.fill()
            }
          }
        }
        ctx.setLineDash([])
        ctx.shadowBlur = 0
        const center = camera.worldToScreen(t.x, t.y)
        if (t.spinMode === 'classic_spin' && t.hasTriggered && t.activeTimer < t.activeDuration) {
          const paths = getInferoSpinningGridProjectilePaths(
            { x: t.x, y: t.y },
            t.angle ?? 0,
            t.pulseCount ?? 0,
            6,
            275
          )
          const secondsToVolley = Math.max(0, 0.54 - (t.pulseTimer ?? 0))
          ctx.globalAlpha = 0.76
          ctx.setLineDash([5, 7])
          ctx.lineWidth = 2
          ctx.strokeStyle = '#FDE68A'
          ctx.shadowColor = '#FB923C'
          ctx.shadowBlur = 7
          for (const path of paths) {
            if (path.length < 2) continue
            const first = camera.worldToScreen(path[0].x, path[0].y)
            ctx.beginPath()
            ctx.moveTo(first.x, first.y)
            for (let pointIndex = 1; pointIndex < path.length; pointIndex++) {
              const point = camera.worldToScreen(path[pointIndex].x, path[pointIndex].y)
              ctx.lineTo(point.x, point.y)
            }
            ctx.stroke()
            const endpoint = camera.worldToScreen(path[path.length - 1].x, path[path.length - 1].y)
            ctx.setLineDash([])
            ctx.fillStyle = '#FEF3C7'
            ctx.beginPath()
            ctx.arc(endpoint.x, endpoint.y, 3.2, 0, Math.PI * 2)
            ctx.fill()
            ctx.setLineDash([5, 7])
          }
          ctx.setLineDash([])
          ctx.shadowBlur = 0
          ctx.globalAlpha = 1
          ctx.fillStyle = 'rgba(28, 25, 23, 0.84)'
          ctx.fillRect(center.x - 147, center.y + 38, 294, 20)
          ctx.fillStyle = '#FDE68A'
          ctx.font = 'bold 10px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(`CURVED FIRE PATHS • NEXT VOLLEY ${secondsToVolley.toFixed(1)}s`, center.x, center.y + 52)
        } else if (t.spinMode === 'furnace_volley' && t.hasTriggered && t.activeTimer < t.activeDuration) {
          const rotationDuration = t.gridPulseWarningDuration ?? 1.25
          const extensionDuration = t.gridPulseExtensionDuration ?? 0.2
          const fireDuration = t.gridPulseFireDuration ?? 0.46
          const gapDuration = t.gridPulseGapDuration ?? 0.36
          const pulseCycle = rotationDuration + extensionDuration + fireDuration + gapDuration
          const pulseElapsed = t.activeTimer % pulseCycle
          const modeLabel =
            pulseElapsed < rotationDuration
              ? 'LASERS ROTATING'
              : pulseElapsed < rotationDuration + extensionDuration
                ? 'LASERS LOCKED'
                : pulseElapsed < rotationDuration + extensionDuration + fireDuration
                  ? 'FURNACE LASERS LIVE'
                  : 'NEXT LASER SPIN'
          const timeRemaining =
            pulseElapsed < rotationDuration
              ? rotationDuration - pulseElapsed
              : pulseElapsed < rotationDuration + extensionDuration
                ? rotationDuration + extensionDuration - pulseElapsed
                : pulseElapsed < rotationDuration + extensionDuration + fireDuration
                  ? rotationDuration + extensionDuration + fireDuration - pulseElapsed
                  : pulseCycle - pulseElapsed
          ctx.fillStyle = 'rgba(28, 25, 23, 0.84)'
          ctx.fillRect(center.x - 135, center.y + 38, 270, 20)
          ctx.fillStyle = '#FDE68A'
          ctx.font = 'bold 10px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(`${modeLabel} • ${timeRemaining.toFixed(1)}s`, center.x, center.y + 52)
        }
        ctx.fillStyle = 'rgba(28, 25, 23, 0.9)'
        ctx.fillRect(center.x - 176, center.y - 58, 352, 25)
        ctx.fillStyle = t.hasTriggered ? '#FEF08A' : '#FDBA74'
        ctx.font = 'bold 12px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(
          `${t.warningLabel ?? 'SPINNING FURNACE LATTICE'}${t.hasTriggered ? '' : ` • ${(t.chargeDuration - t.chargeTimer).toFixed(1)}s`}`,
          center.x,
          center.y - 41
        )
        ctx.restore()
      } else if (t.kind === 'closing_side_lasers' && t.bounds) {
        const b = t.bounds
        const reach = t.closingReachRatio ?? 0.5
        const mode = t.sideMode ?? 'left'
        const bTopLeft = camera.worldToScreen(b.left, b.top)
        const bx = bTopLeft.x
        const by = bTopLeft.y
        const bw = b.width
        const bh = b.height
        const pulse = 0.72 + 0.28 * Math.sin(this.animTime * 20)

        ctx.save()
        // Faint center 50% marker so crossing past half the screen is unmistakably clear
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.24)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([6, 6])
        ctx.beginPath()
        ctx.moveTo(bx + bw * 0.5, by)
        ctx.lineTo(bx + bw * 0.5, by + bh)
        ctx.stroke()
        ctx.setLineDash([])

        // Draw planned danger lanes (extending past 50% width!)
        const laneRects = getClosingSideLaserTrackRects(t)
        for (const lr of laneRects) {
          const sp = camera.worldToScreen(lr.x, lr.y)
          ctx.fillStyle = `rgba(255, 0, 85, ${t.hasTriggered ? 0.12 : 0.14 + chargeProgress * 0.14})`
          ctx.fillRect(sp.x, sp.y, lr.width, lr.height)
          ctx.strokeStyle = `rgba(250, 204, 21, ${0.75 * pulse})`
          ctx.lineWidth = 2.5
          ctx.setLineDash([12, 8])
          ctx.strokeRect(sp.x + 1, sp.y + 1, lr.width - 2, lr.height - 2)
          ctx.setLineDash([])
        }

        // Draw Safe Pocket Hint
        if (!t.hasTriggered && t.safeRect) {
          const sr = camera.worldToScreen(t.safeRect.x, t.safeRect.y)
          ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'
          ctx.fillRect(sr.x, sr.y, t.safeRect.width, t.safeRect.height)
          ctx.fillStyle = 'rgba(110, 231, 183, 0.92)'
          ctx.font = 'bold 13px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('✓ SAFE ZONE', sr.x + t.safeRect.width / 2, sr.y + t.safeRect.height / 2)
        }

        if (!t.hasTriggered) {
          const rem = Math.max(0, t.chargeDuration - t.chargeTimer).toFixed(1)
          const label =
            mode === 'left'
              ? `◀◀ CLOSING LEFT LASER (HALF SCREEN) • ${rem}s`
              : mode === 'right'
                ? `CLOSING RIGHT LASER (HALF SCREEN) ▶▶ • ${rem}s`
                : `◀ DUAL PINCER LASERS (HALF EACH SIDE) ▶ • ${rem}s`
          ctx.fillStyle = 'rgba(15, 23, 42, 0.86)'
          ctx.fillRect(bx + bw / 2 - 205, by + bh * 0.5 - 22, 410, 42)
          ctx.strokeStyle = '#FF0055'
          ctx.lineWidth = 2
          ctx.strokeRect(bx + bw / 2 - 205, by + bh * 0.5 - 22, 410, 42)
          ctx.fillStyle = '#FEF08A'
          ctx.font = 'bold 13px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(label, bx + bw / 2, by + bh * 0.5 + 4)

          // Glowing emitter bars warming up on the outer side edge(s)
          ctx.fillStyle = '#FF0055'
          if (mode === 'left' || mode === 'pincer') {
            ctx.fillRect(bx, by, 10 + chargeProgress * 12, mode === 'pincer' ? bh * 0.5 : bh)
          }
          if (mode === 'right' || mode === 'pincer') {
            const w = 10 + chargeProgress * 12
            const yOff = mode === 'pincer' ? by + bh * 0.5 : by
            const h = mode === 'pincer' ? bh * 0.5 : bh
            ctx.fillRect(bx + bw - w, yOff, w, h)
          }
        } else {
          // Active sweeping laser walls closing inward from side edges past half the screen!
          const activeRects = getClosingSideLaserRects(t)
          const fadeOut =
            impactProgress > 0.85 ? Math.max(0.15, 1 - (impactProgress - 0.85) / 0.15) : 1
          ctx.globalAlpha = fadeOut
          for (const ar of activeRects) {
            const sp = camera.worldToScreen(ar.x, ar.y)
            ctx.fillStyle = 'rgba(255, 0, 85, 0.72)'
            ctx.fillRect(sp.x, sp.y, ar.width, ar.height)
            ctx.fillStyle = 'rgba(250, 204, 21, 0.48)'
            ctx.fillRect(sp.x + 6, sp.y + 6, Math.max(0, ar.width - 12), Math.max(0, ar.height - 12))
            ctx.fillStyle = '#FFFFFF'
            // Intense leading laser beam edge sweeping inward
            const leadX =
              mode === 'right' || (mode === 'pincer' && ar.y > b.top + b.height * 0.2)
                ? sp.x
                : sp.x + Math.max(0, ar.width - 8)
            ctx.fillRect(leadX, sp.y, Math.min(8, ar.width), ar.height)
          }
          void reach
        }
        ctx.restore()
      } else if (t.kind === 'tracking_strikes' && t.trackingBlasts) {
        for (const blast of t.trackingBlasts) {
          const sp = camera.worldToScreen(blast.x, blast.y)
          const r = Math.max(12, blast.radius)
          ctx.save()
          if (!blast.hasDetonated) {
            const p = Math.max(0, Math.min(1, blast.elapsed / blast.windup))
            ctx.fillStyle = 'rgba(249, 115, 22, 0.18)'
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
            ctx.fill()

            ctx.fillStyle = 'rgba(255, 0, 85, 0.28)'
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, Math.max(4, r * p), 0, Math.PI * 2)
            ctx.fill()

            ctx.strokeStyle = '#FACC15'
            ctx.lineWidth = 2.5
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
            ctx.stroke()

            ctx.fillStyle = '#FEF08A'
            ctx.font = 'bold 10px monospace'
            ctx.textAlign = 'center'
            ctx.fillText('TARGET LOCK', sp.x, sp.y + 3)
          } else if (blast.elapsed < blast.windup + blast.active) {
            const blastP = (blast.elapsed - blast.windup) / blast.active
            ctx.globalAlpha = Math.max(0, 1 - blastP)
            ctx.fillStyle = 'rgba(255, 0, 85, 0.72)'
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, r * (0.9 + blastP * 0.25), 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 3
            ctx.stroke()
          }
          ctx.restore()
        }
      } else if (t.kind === 'bullet_hell') {
        const sp = camera.worldToScreen(t.x, t.y)
        ctx.save()
        if (!t.hasTriggered) {
          const r = 74 + Math.sin(this.animTime * 20) * 8
          ctx.strokeStyle = '#FF0055'
          ctx.lineWidth = 3
          ctx.setLineDash([10, 6])
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, r, this.animTime * 3, this.animTime * 3 + Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = '#FEF08A'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('⚠ BULLET HELL BARRAGE!', sp.x, sp.y + r + 18)
        } else {
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)'
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.arc(sp.x, sp.y, 68 + Math.sin(this.animTime * 16) * 5, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.restore()
      } else if (t.kind === 'half_arena' && t.zoneRect) {
        const zr = t.zoneRect
        const topLeft = camera.worldToScreen(zr.x, zr.y)
        const sx = topLeft.x
        const sy = topLeft.y
        const sw = zr.width
        const sh = zr.height

        if (!t.hasTriggered) {
          const pulse = 0.72 + 0.28 * Math.sin(this.animTime * 20)
          const remainingSec = Math.max(0, t.chargeDuration - t.chargeTimer).toFixed(1)

          if (t.safeRect) {
            const safeTopLeft = camera.worldToScreen(t.safeRect.x, t.safeRect.y)
            ctx.save()
            ctx.fillStyle = 'rgba(16, 185, 129, 0.07)'
            ctx.fillRect(safeTopLeft.x, safeTopLeft.y, t.safeRect.width, t.safeRect.height)
            ctx.strokeStyle = 'rgba(52, 211, 153, 0.42)'
            ctx.lineWidth = 2
            ctx.setLineDash([12, 8])
            ctx.strokeRect(
              safeTopLeft.x + 2,
              safeTopLeft.y + 2,
              t.safeRect.width - 4,
              t.safeRect.height - 4
            )
            ctx.setLineDash([])
            ctx.fillStyle = 'rgba(110, 231, 183, 0.88)'
            ctx.font = 'bold 13px monospace'
            ctx.textAlign = 'center'
            ctx.fillText(
              '✓ SAFE ZONE',
              safeTopLeft.x + t.safeRect.width / 2,
              safeTopLeft.y + t.safeRect.height / 2
            )
            ctx.restore()
          }

          ctx.save()
          ctx.fillStyle = `rgba(255, 0, 85, ${0.16 + chargeProgress * 0.2})`
          ctx.fillRect(sx, sy, sw, sh)
          ctx.strokeStyle = `rgba(255, 0, 85, ${0.95 * pulse})`
          ctx.lineWidth = 4
          ctx.setLineDash([16, 8])
          ctx.strokeRect(sx + 2, sy + 2, sw - 4, sh - 4)
          ctx.setLineDash([])

          const labelCx = sx + sw / 2
          const labelCy =
            t.halfDirection === 'top'
              ? sy + Math.max(sh * 0.62, 160)
              : sy + sh / 2
          ctx.fillStyle = '#FEF08A'
          ctx.font = 'bold 13px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(`⚠ HALF-ARENA BLAST (${remainingSec}s)`, labelCx, labelCy)
          ctx.restore()
        } else {
          const alpha = Math.max(0, 1 - impactProgress)
          ctx.save()
          ctx.globalAlpha = alpha
          ctx.fillStyle = 'rgba(255, 0, 85, 0.72)'
          ctx.fillRect(sx, sy, sw, sh)
          ctx.restore()
        }
      } else if (t.kind === 'mega_laser' || t.kind === 'pursuit_beam') {
        const start = camera.worldToScreen(t.x, t.y)
        const angle = t.angle ?? 0
        const len = t.length ?? 660
        const halfW = Math.max(8, t.radius)
        const beamPrimary = t.accentPrimary ?? '#FF0055'
        const beamSecondary = t.accentSecondary ?? '#FACC15'

        ctx.save()
        ctx.translate(start.x, start.y)
        ctx.rotate(angle)

        if (!t.hasTriggered) {
          const isPursuitLocked =
            t.kind === 'pursuit_beam' && t.chargeDuration - t.chargeTimer <= 0.3
          const pulse = 0.7 + 0.3 * Math.sin(this.animTime * 22)
          ctx.fillStyle = beamPrimary
          ctx.globalAlpha = isPursuitLocked ? 0.32 : 0.14 + chargeProgress * 0.14
          ctx.fillRect(0, -halfW, len, halfW * 2)

          ctx.fillStyle = isPursuitLocked ? '#FFFFFF' : beamSecondary
          ctx.globalAlpha = isPursuitLocked ? 0.35 : 0.22 + chargeProgress * 0.25
          const innerH = Math.max(2, halfW * 2 * chargeProgress)
          ctx.fillRect(0, -innerH / 2, len, innerH)

          ctx.globalAlpha = 1
          ctx.strokeStyle = isPursuitLocked ? '#FFFFFF' : beamPrimary
          ctx.lineWidth = isPursuitLocked ? 3 : 2.5
          if (!isPursuitLocked) ctx.globalAlpha = 0.65 * pulse
          if (!isPursuitLocked) ctx.setLineDash([12, 8])
          ctx.strokeRect(0, -halfW, len, halfW * 2)
          ctx.setLineDash([])

          ctx.globalAlpha = 1
          ctx.strokeStyle = isPursuitLocked ? '#FFFFFF' : beamSecondary
          ctx.lineWidth = isPursuitLocked ? 2.5 : 1.5
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(len, 0)
          ctx.stroke()

          ctx.fillStyle = isPursuitLocked ? '#FFFFFF' : '#FEF08A'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(
            t.warningLabel ??
            (t.kind === 'pursuit_beam'
              ? isPursuitLocked
                ? '⚠ BEAM LOCKED - DODGE NOW!'
                : '⚠ TRACKING LASER - LOCKING AIM...'
              : '⚠ MEGA LASER - DODGE!'),
            Math.min(280, len * 0.45),
            -halfW - 8
          )
        } else {
          const alpha =
            t.kind === 'pursuit_beam'
              ? impactProgress > 0.8
                ? Math.max(0.2, 1 - (impactProgress - 0.8) / 0.2)
                : 0.95
              : Math.max(0, 1 - impactProgress)
          ctx.globalAlpha = alpha
          ctx.fillStyle = beamPrimary
          ctx.fillRect(0, -halfW * 1.15, len, halfW * 2.3)
          ctx.fillStyle = beamSecondary
          ctx.fillRect(0, -halfW * 0.72, len, halfW * 1.44)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, -halfW * 0.36, len, halfW * 0.72)
        }
        ctx.restore()
      } else if (t.kind === 'rotating_cross_lasers') {
        const start = camera.worldToScreen(t.x, t.y)
        const baseAngle = t.angle ?? 0
        const beams = t.beamCount ?? 4
        const segments = getRotatingCrossLaserSegments(t)
        const halfW = Math.max(10, t.radius)
        const pulse = 0.75 + 0.25 * Math.sin(this.animTime * 22)

        for (let b = 0; b < beams; b++) {
          const beamAngle = baseAngle + (b / beams) * Math.PI * 2
          ctx.save()
          ctx.translate(start.x, start.y)
          ctx.rotate(beamAngle)

          if (!t.hasTriggered) {
            for (let sIdx = 0; sIdx < segments.length; sIdx++) {
              const [segStart, segEnd] = segments[sIdx]
              const segLen = segEnd - segStart
              if (segLen <= 0) continue

              ctx.fillStyle = `rgba(255, 0, 85, ${0.13 + chargeProgress * 0.16})`
              ctx.fillRect(segStart, -halfW, segLen, halfW * 2)
              ctx.fillStyle = `rgba(56, 189, 248, ${0.22 + chargeProgress * 0.24})`
              const innerH = Math.max(3, halfW * 2 * chargeProgress)
              ctx.fillRect(segStart, -innerH / 2, segLen, innerH)
              ctx.strokeStyle = `rgba(250, 204, 21, ${0.72 * pulse})`
              ctx.lineWidth = 2
              ctx.setLineDash([12, 8])
              ctx.strokeRect(segStart, -halfW, segLen, halfW * 2)
              ctx.setLineDash([])

              if (sIdx < segments.length - 1) {
                const nextStart = segments[sIdx + 1][0]
                const gapWidth = nextStart - segEnd
                if (gapWidth > 30) {
                  ctx.fillStyle = `rgba(16, 185, 129, ${0.08 + 0.06 * pulse})`
                  ctx.fillRect(segEnd, -halfW * 0.9, gapWidth, halfW * 1.8)
                  ctx.strokeStyle = `rgba(52, 211, 153, ${0.45 * pulse})`
                  ctx.lineWidth = 1.5
                  ctx.setLineDash([6, 6])
                  ctx.strokeRect(segEnd + 4, -halfW * 0.85, gapWidth - 8, halfW * 1.7)
                  ctx.setLineDash([])
                }
              }
            }
          } else {
            const fadeOut =
              impactProgress > 0.85 ? Math.max(0.2, 1 - (impactProgress - 0.85) / 0.15) : 0.94
            ctx.globalAlpha = fadeOut
            for (const [segStart, segEnd] of segments) {
              const segLen = segEnd - segStart
              if (segLen <= 0) continue

              ctx.fillStyle = '#FF0055'
              ctx.fillRect(segStart, -halfW * 1.15, segLen, halfW * 2.3)
              ctx.beginPath()
              ctx.arc(segStart, 0, halfW * 1.05, 0, Math.PI * 2)
              ctx.arc(segEnd, 0, halfW * 1.05, 0, Math.PI * 2)
              ctx.fill()

              ctx.fillStyle = '#FACC15'
              ctx.fillRect(segStart, -halfW * 0.65, segLen, halfW * 1.3)
              ctx.beginPath()
              ctx.arc(segStart, 0, halfW * 0.62, 0, Math.PI * 2)
              ctx.arc(segEnd, 0, halfW * 0.62, 0, Math.PI * 2)
              ctx.fill()

              ctx.fillStyle = '#FFFFFF'
              ctx.fillRect(segStart, -halfW * 0.28, segLen, halfW * 0.56)
              ctx.beginPath()
              ctx.arc(segStart, 0, halfW * 0.28, 0, Math.PI * 2)
              ctx.arc(segEnd, 0, halfW * 0.28, 0, Math.PI * 2)
              ctx.fill()
            }
          }
          ctx.restore()
        }

        if (!t.hasTriggered) {
          ctx.save()
          ctx.fillStyle = '#FEF08A'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          const rem = Math.max(0, t.chargeDuration - t.chargeTimer).toFixed(1)
          ctx.fillText(`⚠ ROTATING X-BEAM SWEEP — DODGE THROUGH GAPS! (${rem}s)`, start.x, start.y + 68)
          ctx.restore()
        }
      } else if (
        t.kind === 'astral_orbital_grid' &&
        t.gridLines &&
        !(t.hasTriggered && t.activeTimer >= (t.laserDuration ?? t.activeDuration))
      ) {
        const pulse = 0.68 + 0.32 * Math.sin(this.animTime * 25)
        const pulseWarning =
          t.hasTriggered &&
          !t.gridPulseFiring &&
          (t.gridPulseIndex ?? 0) < (t.gridPulseCount ?? 0) &&
          (t.gridPulseTimer ?? 0) < (t.gridPulseWarningDuration ?? 0.24)
        const pulseFiring = t.hasTriggered && Boolean(t.gridPulseFiring)
        const pulseImpactProgress =
          ((t.gridPulseTimer ?? 0) - (t.gridPulseWarningDuration ?? 0.24)) /
          Math.max(0.01, t.gridPulseFireDuration ?? 0.34)
        ctx.save()
        ctx.lineCap = 'round'
        for (const line of t.gridLines) {
          const p1 = camera.worldToScreen(line.x1, line.y1)
          const p2 = camera.worldToScreen(line.x2, line.y2)
          const color = line.color ?? (line.aimMode === 'player' ? '#FACC15' : '#34D399')
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          if (!t.hasTriggered || pulseWarning) {
            ctx.globalAlpha = 0.45 + chargeProgress * 0.35
            ctx.strokeStyle = color
            ctx.lineWidth = Math.max(1.5, line.width * 0.42)
            ctx.setLineDash(line.aimMode === 'player' ? [7, 8] : [15, 13])
            ctx.stroke()
            ctx.setLineDash([])
            ctx.globalAlpha = 0.7 * pulse
            ctx.lineWidth = 1.2
            ctx.stroke()
          } else if (pulseFiring) {
            const fadeOut =
              pulseImpactProgress > 0.82
                ? Math.max(0.2, 1 - (pulseImpactProgress - 0.82) / 0.18)
                : 1
            ctx.globalAlpha = fadeOut * 0.44
            ctx.strokeStyle = color
            ctx.lineWidth = line.width * 1.8
            ctx.shadowColor = color
            ctx.shadowBlur = 14
            ctx.stroke()
            ctx.globalAlpha = fadeOut
            ctx.lineWidth = Math.max(2, line.width * 0.52)
            ctx.shadowBlur = 4
            ctx.stroke()
            ctx.globalAlpha = fadeOut * 0.94
            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = 1.1
            ctx.shadowBlur = 0
            ctx.stroke()
          }
        }

        const marker = camera.worldToScreen(t.x, t.y)
        ctx.globalAlpha = !t.hasTriggered
          ? 0.45 + chargeProgress * 0.45
          : pulseWarning
            ? 0.82
            : pulseFiring
              ? 0.45
              : 0.2
        ctx.strokeStyle = '#F8FAFC'
        ctx.lineWidth = 1.5
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.arc(marker.x, marker.y, 22 + 4 * pulse, 0, Math.PI * 2)
        ctx.moveTo(marker.x - 31, marker.y)
        ctx.lineTo(marker.x - 17, marker.y)
        ctx.moveTo(marker.x + 17, marker.y)
        ctx.lineTo(marker.x + 31, marker.y)
        ctx.moveTo(marker.x, marker.y - 31)
        ctx.lineTo(marker.x, marker.y - 17)
        ctx.moveTo(marker.x, marker.y + 17)
        ctx.lineTo(marker.x, marker.y + 31)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        if (!t.hasTriggered) {
          ctx.save()
          ctx.fillStyle = '#FEF08A'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          const rem = Math.max(0, t.chargeDuration - t.chargeTimer).toFixed(1)
          ctx.fillText(`${t.warningLabel ?? 'ASTRAL ORBITAL GRID'} (${rem}s)`, marker.x, marker.y + 60)
          ctx.restore()
        } else if (pulseWarning) {
          ctx.save()
          ctx.fillStyle = '#FEF08A'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(
            `GRID VOLLEY ${(t.gridPulseIndex ?? 0) + 1}/${t.gridPulseCount ?? 0} — DODGE!`,
            marker.x,
            marker.y + 60
          )
          ctx.restore()
        }
      } else if (t.kind === 'astral_targeted_lasers' && t.gridLines) {
        const pulse = 0.65 + 0.35 * Math.sin(this.animTime * 24)
        ctx.save()
        ctx.lineCap = 'round'
        for (const line of t.gridLines) {
          const p1 = camera.worldToScreen(line.x1, line.y1)
          const p2 = camera.worldToScreen(line.x2, line.y2)
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          if (!t.hasTriggered) {
            ctx.strokeStyle = '#FACC15'
            ctx.globalAlpha = 0.48 + chargeProgress * 0.4
            ctx.lineWidth = 1.6
            ctx.setLineDash([9, 8])
            ctx.stroke()
            ctx.setLineDash([])
            ctx.globalAlpha = 0.65 * pulse
            ctx.lineWidth = 1
            ctx.stroke()
          } else {
            ctx.strokeStyle = '#FACC15'
            ctx.globalAlpha = 0.42
            ctx.lineWidth = 11
            ctx.shadowColor = '#FACC15'
            ctx.shadowBlur = 12
            ctx.stroke()
            ctx.globalAlpha = 0.95
            ctx.lineWidth = 3.2
            ctx.shadowBlur = 3
            ctx.stroke()
            ctx.strokeStyle = '#FFFFFF'
            ctx.globalAlpha = 0.9
            ctx.lineWidth = 1.1
            ctx.shadowBlur = 0
            ctx.stroke()
          }
        }

        const targetMarker = camera.worldToScreen(t.endX ?? t.x, t.endY ?? t.y)
        ctx.globalAlpha = t.hasTriggered ? 0.9 : 0.55 + chargeProgress * 0.4
        ctx.strokeStyle = '#FACC15'
        ctx.lineWidth = 1.8
        ctx.setLineDash([5, 4])
        ctx.beginPath()
        ctx.arc(targetMarker.x, targetMarker.y, 18 + pulse * 4, 0, Math.PI * 2)
        ctx.moveTo(targetMarker.x - 28, targetMarker.y)
        ctx.lineTo(targetMarker.x - 12, targetMarker.y)
        ctx.moveTo(targetMarker.x + 12, targetMarker.y)
        ctx.lineTo(targetMarker.x + 28, targetMarker.y)
        ctx.moveTo(targetMarker.x, targetMarker.y - 28)
        ctx.lineTo(targetMarker.x, targetMarker.y - 12)
        ctx.moveTo(targetMarker.x, targetMarker.y + 12)
        ctx.lineTo(targetMarker.x, targetMarker.y + 28)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.restore()

        if (!t.hasTriggered) {
          ctx.save()
          ctx.fillStyle = '#FEF08A'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          const rem = Math.max(0, t.chargeDuration - t.chargeTimer).toFixed(1)
          ctx.fillText(`${t.warningLabel ?? 'ASTRAL LOCK-ON LASERS'} (${rem}s)`, targetMarker.x, targetMarker.y + 54)
          ctx.restore()
        }
      } else if (t.kind === 'cosmic_laser_walls' && t.gridLines) {
        // Calamity DoG Cosmic Laser Wall sightlines -> blazing laser flash
        const pulse = 0.72 + 0.28 * Math.sin(this.animTime * 24)
        ctx.save()
        for (const line of t.gridLines) {
          const p1 = camera.worldToScreen(line.x1, line.y1)
          const p2 = camera.worldToScreen(line.x2, line.y2)
          const accent = line.color || '#22D3EE'
          ctx.lineCap = 'round'
          if (!t.hasTriggered) {
            // Sharp Calamity laser wall telegraph sightline
            ctx.strokeStyle = accent
            ctx.globalAlpha = 0.22 + chargeProgress * 0.24
            ctx.lineWidth = line.width
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()

            ctx.globalAlpha = 0.72 * pulse + chargeProgress * 0.28
            ctx.strokeStyle = accent
            ctx.lineWidth = 2.4
            ctx.setLineDash([14, 10])
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
            ctx.setLineDash([])
          } else {
            const alpha = Math.max(0, 1 - impactProgress * 0.75)
            ctx.globalAlpha = alpha
            ctx.strokeStyle = accent
            ctx.lineWidth = line.width * 1.2
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()

            ctx.strokeStyle = '#FFFFFF'
            ctx.lineWidth = Math.max(4, line.width * 0.42)
            ctx.beginPath()
            ctx.moveTo(p1.x, p1.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.stroke()
          }
        }
        if (!t.hasTriggered) {
          const centerSp = camera.worldToScreen(t.x, t.y)
          const rem = Math.max(0, t.chargeDuration - t.chargeTimer).toFixed(1)
          ctx.fillStyle = 'rgba(8, 12, 26, 0.88)'
          ctx.fillRect(centerSp.x - 165, centerSp.y - 20, 330, 34)
          ctx.strokeStyle = t.accentPrimary || '#22D3EE'
          ctx.lineWidth = 2
          ctx.strokeRect(centerSp.x - 165, centerSp.y - 20, 330, 34)
          ctx.fillStyle = '#E0F2FE'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(`${t.warningLabel || '⚠ COSMIC LASER WALLS — WEAVE GAPS!'} (${rem}s)`, centerSp.x, centerSp.y + 1)
        }
        ctx.restore()
      } else if (t.kind === 'cosmic_portal_lunge') {
        const pScr = camera.worldToScreen(t.portalX ?? t.x, t.portalY ?? t.y)
        const eScr = camera.worldToScreen(t.endX ?? t.x, t.endY ?? t.y)
        const ang = t.angle ?? 0
        const primary = t.accentPrimary || '#22D3EE'
        const secondary = t.accentSecondary || '#E879F9'
        ctx.save()
        // Portal Rift Circle
        const portalAlpha = t.hasTriggered ? Math.max(0, 1 - impactProgress) : 0.45 + 0.55 * chargeProgress
        ctx.globalAlpha = portalAlpha
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)'
        ctx.beginPath()
        ctx.arc(pScr.x, pScr.y, 44, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = secondary
        ctx.lineWidth = 3.5
        ctx.beginPath()
        ctx.arc(pScr.x, pScr.y, 44, 0, Math.PI * 2)
        ctx.stroke()
        ctx.strokeStyle = primary
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(pScr.x, pScr.y, 32, ang - 1.2, ang + 1.2)
        ctx.stroke()

        // Lunge Trajectory Corridor
        if (!t.hasTriggered) {
          const halfW = t.radius
          ctx.translate(pScr.x, pScr.y)
          ctx.rotate(ang)
          ctx.fillStyle = this.isAstralScourge
            ? `rgba(52, 211, 153, ${0.14 + chargeProgress * 0.2})`
            : `rgba(232, 121, 249, ${0.14 + chargeProgress * 0.2})`
          ctx.fillRect(0, -halfW, t.length ?? 780, halfW * 2)
          ctx.strokeStyle = primary
          ctx.lineWidth = 2.5
          ctx.setLineDash([14, 8])
          ctx.strokeRect(0, -halfW, t.length ?? 780, halfW * 2)
          ctx.setLineDash([])

          ctx.fillStyle = secondary
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'left'
          ctx.fillText(t.warningLabel || '⚠ RIFT LUNGE INCOMING!', 52, -halfW - 8)
        } else {
          ctx.globalAlpha = Math.max(0, (1 - impactProgress) * 0.75)
          ctx.strokeStyle = primary
          ctx.lineWidth = 10
          ctx.beginPath()
          ctx.moveTo(pScr.x, pScr.y)
          ctx.lineTo(eScr.x, eScr.y)
          ctx.stroke()
        }
        ctx.restore()
      } else if (t.kind === 'cosmic_orb_barrage') {
        const bScr = camera.worldToScreen(t.x, t.y)
        const primary = t.accentPrimary || '#22D3EE'
        const secondary = t.accentSecondary || '#E879F9'
        ctx.save()
        if (!t.hasTriggered) {
          ctx.strokeStyle = secondary
          ctx.lineWidth = 3
          ctx.setLineDash([10, 8])
          ctx.beginPath()
          ctx.arc(bScr.x, bScr.y, 64 + (1 - chargeProgress) * 44, 0, Math.PI * 2)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.fillStyle = primary
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(t.warningLabel || '⚠ NEBULA STAR BARRAGE!', bScr.x, bScr.y - 72)
        }
        ctx.restore()
      } else if (t.kind === 'singularity_grid' && t.gridRects) {
        const pulse = 0.72 + 0.28 * Math.sin(this.animTime * 22)
        const gridPrimary = t.accentPrimary ?? '#F43F5E'
        const gridSecondary = t.accentSecondary ?? '#FACC15'
        ctx.save()
        for (const gr of t.gridRects) {
          const sp = camera.worldToScreen(gr.x, gr.y)
          if (!t.hasTriggered) {
            ctx.globalAlpha = 0.15 + chargeProgress * 0.18
            ctx.fillStyle = gridPrimary
            ctx.fillRect(sp.x, sp.y, gr.width, gr.height)
            ctx.globalAlpha = 0.8 * pulse
            ctx.strokeStyle = gridSecondary
            ctx.lineWidth = 2.5
            ctx.setLineDash([10, 8])
            ctx.strokeRect(sp.x + 1, sp.y + 1, gr.width - 2, gr.height - 2)
            ctx.setLineDash([])
          } else {
            const alpha = Math.max(0, 1 - impactProgress * 0.85)
            ctx.globalAlpha = alpha
            ctx.fillStyle = gridPrimary
            ctx.fillRect(sp.x, sp.y, gr.width, gr.height)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
            if (gr.width < gr.height) {
              ctx.fillRect(sp.x + gr.width * 0.3, sp.y, gr.width * 0.4, gr.height)
            } else {
              ctx.fillRect(sp.x, sp.y + gr.height * 0.3, gr.width, gr.height * 0.4)
            }
          }
        }
        if (!t.hasTriggered && t.bounds) {
          const centerSp = camera.worldToScreen(
            t.bounds.left + t.bounds.width / 2,
            t.bounds.top + t.bounds.height * 0.52
          )
          const rem = Math.max(0, t.chargeDuration - t.chargeTimer).toFixed(1)
          ctx.fillStyle = 'rgba(15, 23, 42, 0.88)'
          ctx.fillRect(centerSp.x - 185, centerSp.y - 20, 370, 38)
          ctx.strokeStyle = gridPrimary
          ctx.lineWidth = 2
          ctx.strokeRect(centerSp.x - 185, centerSp.y - 20, 370, 38)
          ctx.fillStyle = '#FEF08A'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(`⚠ APOCALYPSE LASER GRID • MOVE TO SAFE CELL (${rem}s)`, centerSp.x, centerSp.y + 4)
        }
        ctx.restore()
      } else {
        const zones =
          (t.kind === 'bombardment_ring' || t.kind === 'void_meteor_salvo') &&
          t.subTargets &&
          t.subTargets.length > 0
            ? t.subTargets
            : [{ x: t.x, y: t.y, radius: t.radius }]

        for (let zi = 0; zi < zones.length; zi++) {
          const z = zones[zi]
          const sp = camera.worldToScreen(z.x, z.y)
          const r = Math.max(12, z.radius)

          ctx.save()
          if (!t.hasTriggered) {
            const pulse = 0.75 + 0.25 * Math.sin(this.animTime * 20)
            // Floor warning circle
            ctx.fillStyle = `rgba(255, 0, 85, ${0.14 + chargeProgress * 0.16})`
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
            ctx.fill()

            // Expanding inner charge circle indicating exact trigger timing
            const fillR = Math.max(4, r * chargeProgress)
            ctx.fillStyle = 'rgba(250, 204, 21, 0.28)'
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, fillR, 0, Math.PI * 2)
            ctx.fill()

            // Pulsing outer dashed border
            ctx.strokeStyle = `rgba(255, 0, 85, ${0.85 * pulse})`
            ctx.lineWidth = 3
            ctx.setLineDash([10, 6])
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2)
            ctx.stroke()
            ctx.setLineDash([])

            // Hazard crosshair X
            ctx.strokeStyle = 'rgba(254, 240, 138, 0.7)'
            ctx.lineWidth = 1.8
            const cross = r * 0.38
            ctx.beginPath()
            ctx.moveTo(sp.x - cross, sp.y - cross)
            ctx.lineTo(sp.x + cross, sp.y + cross)
            ctx.moveTo(sp.x + cross, sp.y - cross)
            ctx.lineTo(sp.x - cross, sp.y + cross)
            ctx.stroke()

            if (zi === 0) {
              ctx.fillStyle = '#FEF08A'
              ctx.font = 'bold 12px monospace'
              ctx.textAlign = 'center'
              ctx.fillText(
                t.kind === 'orbital_slam'
                  ? '⚠ ORBITAL SLAM!'
                  : t.kind === 'void_meteor_salvo'
                    ? '⚠ VOID METEOR SALVO!'
                    : '⚠ BARRAGE ZONE!',
                sp.x,
                sp.y - r - 8
              )
            }
          } else {
            // Triggered detonation shockwave
            const alpha = Math.max(0, 1 - impactProgress)
            const blastR = Math.max(8, r * (0.85 + impactProgress * 0.3))
            ctx.globalAlpha = alpha
            ctx.fillStyle = 'rgba(255, 68, 0, 0.55)'
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, blastR, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#FEF08A'
            ctx.lineWidth = 4
            ctx.beginPath()
            ctx.arc(sp.x, sp.y, blastR, 0, Math.PI * 2)
            ctx.stroke()
          }
          ctx.restore()
        }
      }
    }
  }

  private drawAreaThreeEnemySprite(
    ctx: CanvasRenderingContext2D,
    r: number,
    isFlashing: boolean
  ): void {
    const basalt = isFlashing ? '#FFFFFF' : '#292524'
    const glowing = '#FB923C'
    ctx.save()

    switch (this.enemyId) {
      case 'ene_a3_01': {
        // Basalt Bulwark: broad shield shell with branching magma seams.
        ctx.fillStyle = basalt
        ctx.strokeStyle = '#A8A29E'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(r * 0.92, 0)
        ctx.lineTo(r * 0.56, -r * 0.8)
        ctx.lineTo(-r * 0.24, -r * 0.96)
        ctx.lineTo(-r * 0.92, -r * 0.42)
        ctx.lineTo(-r * 0.92, r * 0.42)
        ctx.lineTo(-r * 0.24, r * 0.96)
        ctx.lineTo(r * 0.56, r * 0.8)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.strokeStyle = glowing
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(-r * 0.46, -r * 0.54)
        ctx.lineTo(-r * 0.08, -r * 0.15)
        ctx.lineTo(-r * 0.37, r * 0.16)
        ctx.moveTo(r * 0.08, -r * 0.58)
        ctx.lineTo(r * 0.35, -r * 0.16)
        ctx.lineTo(r * 0.08, r * 0.27)
        ctx.lineTo(r * 0.4, r * 0.54)
        ctx.stroke()
        ctx.fillStyle = '#FDE047'
        ctx.beginPath()
        ctx.arc(r * 0.25, 0, r * 0.13, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'ene_a3_02': {
        // Cinder Skater: narrow flying shard with a twin-flame exhaust.
        const flicker = Math.sin(this.animTime * 30) * r * 0.12
        ctx.strokeStyle = '#F97316'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(-r * 0.55, -r * 0.28)
        ctx.lineTo(-r * 1.45 - flicker, -r * 0.58)
        ctx.moveTo(-r * 0.55, r * 0.28)
        ctx.lineTo(-r * 1.35 + flicker, r * 0.58)
        ctx.stroke()
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#7C2D12'
        ctx.strokeStyle = '#FDBA74'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(r * 1.15, 0)
        ctx.lineTo(-r * 0.38, -r * 0.68)
        ctx.lineTo(-r * 0.16, 0)
        ctx.lineTo(-r * 0.38, r * 0.68)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#FEF08A'
        ctx.beginPath()
        ctx.arc(r * 0.35, 0, r * 0.14, 0, Math.PI * 2)
        ctx.fill()
        break
      }
      case 'ene_a3_03': {
        // Furnace Marksman: kiln-mask and long precision barrel.
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#3F1D15'
        ctx.strokeStyle = '#F97316'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(r * 0.52, 0)
        ctx.lineTo(r * 0.14, -r * 0.62)
        ctx.lineTo(-r * 0.5, -r * 0.44)
        ctx.lineTo(-r * 0.64, 0)
        ctx.lineTo(-r * 0.5, r * 0.44)
        ctx.lineTo(r * 0.14, r * 0.62)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#292524'
        ctx.fillRect(r * 0.2, -r * 0.16, r * 1.9, r * 0.32)
        ctx.strokeStyle = '#FDBA74'
        ctx.lineWidth = 2
        ctx.strokeRect(r * 0.2, -r * 0.16, r * 1.9, r * 0.32)
        ctx.fillStyle = '#FEF08A'
        ctx.beginPath()
        ctx.arc(r * 0.06, 0, r * 0.18, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#F97316'
        ctx.fillRect(r * 1.78, -r * 0.08, r * 0.48, r * 0.16)
        break
      }
      case 'ene_a3_04': {
        // Searing Runesmith: floating rune-kiln with three orbiting hot sigils.
        const rotation = this.animTime * 1.9
        ctx.strokeStyle = '#FACC15'
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.arc(0, 0, r * 1.06, rotation, rotation + Math.PI * 1.55)
        ctx.stroke()
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#451A03'
        ctx.strokeStyle = '#FB923C'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + rotation * 0.35
          const radius = r * (i % 2 === 0 ? 0.76 : 0.62)
          const x = Math.cos(angle) * radius
          const y = Math.sin(angle) * radius
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#FDE047'
        ctx.shadowColor = '#F97316'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.24, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        for (let i = 0; i < 3; i++) {
          const angle = rotation + i * ((Math.PI * 2) / 3)
          ctx.fillStyle = i % 2 === 0 ? '#FDBA74' : '#FEF08A'
          ctx.beginPath()
          ctx.arc(Math.cos(angle) * r * 1.24, Math.sin(angle) * r * 1.24, r * 0.13, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      }
      case 'ene_a3_05': {
        // Crucible Brute: thick arms frame a furnace-core chest.
        const stomp = Math.abs(Math.sin(this.animTime * 5)) * r * 0.06
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#292524'
        ctx.strokeStyle = '#A8A29E'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(-r * 0.5, -r * 0.44)
        ctx.lineTo(r * 0.34, -r * 0.52)
        ctx.lineTo(r * 0.7, -r * 0.15)
        ctx.lineTo(r * 0.55, r * 0.5)
        ctx.lineTo(-r * 0.48, r * 0.5)
        ctx.lineTo(-r * 0.72, r * 0.04)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#1C1917'
        ctx.strokeStyle = '#F97316'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.ellipse(0, 0, r * 0.35, r * 0.4, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#FDE047'
        ctx.beginPath()
        ctx.arc(r * 0.04, 0, r * (0.2 + stomp), 0, Math.PI * 2)
        ctx.fill()
        for (const side of [-1, 1]) {
          ctx.fillStyle = '#57534E'
          ctx.beginPath()
          ctx.roundRect(side * r * 0.72 - r * 0.2, -r * 0.24, r * 0.4, r * 0.7, r * 0.12)
          ctx.fill()
          ctx.strokeStyle = '#FDBA74'
          ctx.stroke()
        }
        break
      }
      case 'ene_a3_06': {
        // Furnace Leviathan: segmented ember-serpent curled behind a horned head.
        for (let i = 4; i >= 1; i--) {
          const x = -r * (0.34 + i * 0.39)
          const y = Math.sin(this.animTime * 2.8 - i * 0.72) * r * 0.34
          const size = r * (0.48 - i * 0.045)
          ctx.fillStyle = i % 2 === 0 ? '#7C2D12' : '#292524'
          ctx.strokeStyle = i % 2 === 0 ? '#FB923C' : '#FACC15'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.ellipse(x, y, size, size * 0.72, 0, 0, Math.PI * 2)
          ctx.fill()
          ctx.stroke()
        }
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#431407'
        ctx.strokeStyle = '#FDBA74'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(r * 0.9, 0)
        ctx.lineTo(r * 0.28, -r * 0.58)
        ctx.lineTo(-r * 0.36, -r * 0.34)
        ctx.lineTo(-r * 0.43, r * 0.34)
        ctx.lineTo(r * 0.28, r * 0.58)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.fillStyle = '#FEF08A'
        ctx.beginPath()
        ctx.arc(r * 0.32, -r * 0.12, r * 0.11, 0, Math.PI * 2)
        ctx.fill()
        ctx.beginPath()
        ctx.arc(r * 0.32, r * 0.12, r * 0.11, 0, Math.PI * 2)
        ctx.fill()
        break
      }
    }
    ctx.restore()
  }

  /**
   * Draw detailed enemy sprites on canvas
   */
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (this.isAstralScourgeIntermission) return
    this.inferoDesperationTrail.draw(ctx, camera)
    if (this.isInferoChampion && this.isSpawning) {
      drawInfernoSpawnEffect(
        ctx, camera, this.getCenter(),
        Math.min(1, this.spawnTime / Math.max(0.001, this.spawnDelay)),
        this.spawnTime
      )
    }

    const { x: screenX, y: screenY } = camera.worldToScreen(this.x, this.y)
    const cx = screenX + this.width / 2
    const cy = screenY + this.height / 2
    const r = Math.max(8, this.width / 2)
    const isFlashing = this.hitFlashTimer > 0

    ctx.save()

    if (this.isSpawning) {
      const spawnProgress = Math.min(1, this.spawnTime / this.spawnDelay)
      ctx.globalAlpha = 0.4 + 0.6 * spawnProgress
    }

    if (this.isInferoDesperationPhase && this.inferoDesperationPortalPosition) {
      const portal = camera.worldToScreen(
        this.inferoDesperationPortalPosition.x,
        this.inferoDesperationPortalPosition.y
      )
      const pulse = 0.82 + Math.sin(this.animTime * 18) * 0.14
      ctx.save()
      ctx.translate(portal.x, portal.y)
      ctx.rotate(this.animTime * 1.6)
      ctx.globalAlpha = pulse
      ctx.shadowColor = '#F97316'
      ctx.shadowBlur = 32
      ctx.fillStyle = 'rgba(67, 20, 7, 0.92)'
      ctx.beginPath()
      ctx.ellipse(0, 0, 25, 48, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.strokeStyle = '#FDBA74'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.ellipse(0, 0, 34, 58, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.strokeStyle = '#FDE047'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(0, 0, 17, 40, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
      if (this.inferoDesperationCycleMode === 'portal') {
        // Show the destination and intended charge before the simultaneous teleport/ram.
        const target = this.inferoDesperationLockedTarget
        if (target) {
          const destination = camera.worldToScreen(target.x, target.y)
          const angle = Math.atan2(destination.y - portal.y, destination.x - portal.x)
          ctx.save()
          ctx.strokeStyle = 'rgba(253, 224, 71, 0.8)'
          ctx.lineWidth = 3
          ctx.setLineDash([12, 10])
          ctx.beginPath()
          ctx.moveTo(portal.x, portal.y)
          ctx.lineTo(portal.x + Math.cos(angle) * 1600, portal.y + Math.sin(angle) * 1600)
          ctx.stroke()
          ctx.restore()
        }
        // The old body dissolves as the remote portal opens.
        ctx.globalAlpha = Math.max(0.1, 1 - this.inferoDesperationCycleTimer / INFERO_DESPERATION_PORTAL_SECONDS)
      }
    }

    // Segmented Worm Bosses (Devourer of Gods / Astral Scourge) trailing body segments
    if (this.isWormBoss && this.dogSegments.length > 0) {
      const totalDelay = Math.max(
        0.5,
        this.spawnDelay || (this.isDevourerOfGods ? DEVOURER_CUTSCENE_DURATION_SECONDS : WAVE_15_CUTSCENE_DURATION_SECONDS)
      )
      const emergeProgress =
        this.cutsceneDelayTimer > 0
          ? Math.max(0, Math.min(1, 1 - this.cutsceneDelayTimer / totalDelay))
          : 1
      const emergeFraction =
        this.cutsceneDelayTimer > 0 ? Math.max(0, Math.min(1, (emergeProgress - 0.18) / 0.68)) : 1
      const visibleCount = Math.floor(this.dogSegments.length * emergeFraction)
      for (let i = visibleCount - 1; i >= 0; i--) {
        const seg = this.dogSegments[i]
        const sp = camera.worldToScreen(seg.x, seg.y)
        const taper = 1 - (i / this.dogSegments.length) * 0.56
        const sr = Math.max(10, 27 * taper)
        const isTail = i === this.dogSegments.length - 1

        ctx.save()
        ctx.translate(sp.x, sp.y)
        ctx.rotate(seg.angle)

        // Segment glow aura
        ctx.fillStyle = this.isAstralScourge
          ? this.isEnraged || this.bossPhase >= 3
            ? 'rgba(250, 204, 21, 0.22)'
            : 'rgba(52, 211, 153, 0.18)'
          : this.isEnraged
            ? 'rgba(244, 63, 94, 0.18)'
            : 'rgba(34, 211, 238, 0.16)'
        ctx.beginPath()
        ctx.arc(0, 0, sr * 1.35, 0, Math.PI * 2)
        ctx.fill()

        const armorFill = this.isAstralScourge
          ? this.bossPhase >= 3
            ? '#451A03'
            : '#064E3B'
          : this.isEnraged
            ? '#3B0764'
            : '#1E1B4B'
        const edgeA = this.isAstralScourge
          ? '#34D399'
          : this.isEnraged
            ? '#F43F5E'
            : '#22D3EE'
        const edgeB = this.isAstralScourge ? '#FACC15' : '#E879F9'
        const spineColor = this.isAstralScourge
          ? this.bossPhase >= 3
            ? '#FACC15'
            : i % 2 === 0
              ? '#34D399'
              : '#FEF08A'
          : this.isEnraged
            ? '#F43F5E'
            : i % 2 === 0
              ? '#22D3EE'
              : '#F0ABFC'

        if (isTail) {
          // Bladed stinger tail
          ctx.fillStyle = isFlashing ? '#FFFFFF' : armorFill
          ctx.strokeStyle = this.isAstralScourge ? '#FACC15' : edgeA
          ctx.lineWidth = 2.4
          ctx.beginPath()
          ctx.moveTo(sr * 1.1, 0)
          ctx.lineTo(-sr * 0.4, -sr * 0.9)
          ctx.lineTo(-sr * 1.65, 0)
          ctx.lineTo(-sr * 0.4, sr * 0.9)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        } else {
          // Armored plates + side dorsal fins
          ctx.fillStyle = isFlashing ? '#FFFFFF' : armorFill
          ctx.strokeStyle = i % 2 === 0 ? edgeA : edgeB
          ctx.lineWidth = 2.4
          ctx.beginPath()
          ctx.moveTo(sr * 0.92, 0)
          ctx.lineTo(sr * 0.25, -sr * 0.95)
          ctx.lineTo(-sr * 0.85, -sr * 0.62)
          ctx.lineTo(-sr * 0.55, 0)
          ctx.lineTo(-sr * 0.85, sr * 0.62)
          ctx.lineTo(sr * 0.25, sr * 0.95)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Glowing inner spine core
          ctx.fillStyle = spineColor
          ctx.beginPath()
          ctx.ellipse(0, 0, sr * 0.42, sr * 0.22, 0, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
      }
    }

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + r * 0.75, r * 0.85, r * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()

    // Enraged aura ring when overtime powerScale >= 1.8
    if (this.powerScale >= 1.8 && !this.isBoss) {
      ctx.strokeStyle = 'rgba(255, 0, 85, 0.45)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, r + 4 + Math.sin(this.animTime * 8) * 1.5, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(this.facingAngle)

    switch (this.type) {
      case 'Heavy Swarm': {
        if (this.enemyId === 'ene_a3_01') {
          this.drawAreaThreeEnemySprite(ctx, r, isFlashing)
          break
        }

        // Citadel Golem: slow, chunky sapphirestone carapace with glowing emerald crystal core
        const lumber = Math.sin(this.animTime * 6) * 1.8
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#1E3A5F'
        ctx.strokeStyle = '#34D399'
        ctx.lineWidth = 2.4
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2
          const px = Math.cos(a) * r * 0.9
          const py = Math.sin(a) * r * 0.9
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Armored shoulder gauntlets
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#0F172A'
        ctx.strokeStyle = '#6EE7B7'
        ctx.lineWidth = 1.6
        ctx.fillRect(0, -r * 0.95 + lumber, r * 0.72, 6)
        ctx.strokeRect(0, -r * 0.95 + lumber, r * 0.72, 6)
        ctx.fillRect(0, r * 0.95 - 6 - lumber, r * 0.72, 6)
        ctx.strokeRect(0, r * 0.95 - 6 - lumber, r * 0.72, 6)

        // Glowing emerald crystal heart
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#10B981'
        ctx.beginPath()
        ctx.moveTo(r * 0.35, 0)
        ctx.lineTo(0, -r * 0.34)
        ctx.lineTo(-r * 0.35, 0)
        ctx.lineTo(0, r * 0.34)
        ctx.closePath()
        ctx.fill()
        break
      }

      case 'Fast Flanker': {
        if (this.enemyId === 'ene_a3_02') {
          this.drawAreaThreeEnemySprite(ctx, r, isFlashing)
          break
        }

        if (this.enemyId === 'ene_a2_02') {
          // Zephyr Shardling: razor-winged high-speed cyan crystal swarmer
          const flutter = Math.sin(this.animTime * 28) * 3.5
          ctx.fillStyle = isFlashing ? '#FFFFFF' : '#0F766E'
          ctx.strokeStyle = '#5EEAD4'
          ctx.lineWidth = 1.8
          ctx.beginPath()
          ctx.moveTo(r * 1.05, 0)
          ctx.lineTo(-r * 0.5, -r * 0.9 + flutter)
          ctx.lineTo(-r * 0.15, 0)
          ctx.lineTo(-r * 0.5, r * 0.9 - flutter)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = '#99F6E4'
          ctx.beginPath()
          ctx.arc(r * 0.25, 0, 2.5, 0, Math.PI * 2)
          ctx.fill()
          break
        }

        // Acidic Chitin Bug: animated 6 scuttling legs + chitin carapace + mandibles
        ctx.strokeStyle = isFlashing ? '#FFFFFF' : '#CA8A04'
        ctx.lineWidth = 2
        for (let leg = -1; leg <= 1; leg++) {
          const swing = Math.sin(this.animTime * 20 + leg * 1.4) * 3.5
          const lx = leg * 5
          ctx.beginPath()
          ctx.moveTo(lx, -4)
          ctx.lineTo(lx + swing, -r * 0.95)
          ctx.moveTo(lx, 4)
          ctx.lineTo(lx - swing, r * 0.95)
          ctx.stroke()
        }

        // Segmented abdomen & thorax
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#713F12'
        ctx.strokeStyle = '#FACC15'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.ellipse(-3, 0, r * 0.72, r * 0.52, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Bioluminescent acid sac
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#A3E635'
        ctx.beginPath()
        ctx.arc(-5, 0, r * 0.32, 0, Math.PI * 2)
        ctx.fill()

        // Snapping front mandibles
        const snap = Math.abs(Math.sin(this.animTime * 12)) * 0.25
        ctx.strokeStyle = '#FEF08A'
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(r * 0.45, -4)
        ctx.lineTo(r * 0.95, -2 - snap * 6)
        ctx.moveTo(r * 0.45, 4)
        ctx.lineTo(r * 0.95, 2 + snap * 6)
        ctx.stroke()
        break
      }

      case 'Ranged Sniper': {
        if (this.enemyId === 'ene_a3_03') {
          this.drawAreaThreeEnemySprite(ctx, r, isFlashing)
          break
        }

        if (this.enemyId === 'ene_a2_03') {
          // Prism Bolt Weaver: faceted sapphire diamond ranged spire + spinning emerald ring
          ctx.fillStyle = isFlashing ? '#FFFFFF' : '#064E3B'
          ctx.strokeStyle = '#34D399'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(r * 0.95, 0)
          ctx.lineTo(0, -r * 0.72)
          ctx.lineTo(-r * 0.85, 0)
          ctx.lineTo(0, r * 0.72)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)'
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.55, this.animTime * 8, this.animTime * 8 + Math.PI * 1.35)
          ctx.stroke()

          ctx.fillStyle = '#A7F3D0'
          ctx.beginPath()
          ctx.arc(r * 0.35, 0, 3.6, 0, Math.PI * 2)
          ctx.fill()
          break
        }

        // Aegis Tech Drone: angular V-wing hunter chassis + spinning rotor pods + laser lens
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#0F172A'
        ctx.strokeStyle = '#00F0FF'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(r * 0.95, 0)
        ctx.lineTo(-r * 0.7, -r * 0.88)
        ctx.lineTo(-r * 0.3, 0)
        ctx.lineTo(-r * 0.7, r * 0.88)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Twin spinning rotor rings
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)'
        ctx.lineWidth = 1.5
        for (const ry of [-r * 0.58, r * 0.58]) {
          ctx.beginPath()
          ctx.arc(-r * 0.35, ry, 5, this.animTime * 14, this.animTime * 14 + Math.PI * 1.4)
          ctx.stroke()
        }

        // Crimson sniper eye & laser emitter
        ctx.fillStyle = '#FF0055'
        ctx.beginPath()
        ctx.arc(r * 0.35, 0, 4, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'Ranged Caster': {
        if (this.enemyId === 'ene_a3_04') {
          this.drawAreaThreeEnemySprite(ctx, r, isFlashing)
          break
        }

        // Astral Arcanist: hovering violet-gold rune octagon firing 3-orb fans
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#3B0764'
        ctx.strokeStyle = '#E879F9'
        ctx.lineWidth = 2.2
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + this.animTime * 1.4
          const px = Math.cos(a) * r * 0.78
          const py = Math.sin(a) * r * 0.78
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Twin glowing gold arc emitters
        ctx.strokeStyle = '#FACC15'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.98, -0.75, 0.75)
        ctx.stroke()

        ctx.fillStyle = '#F0ABFC'
        ctx.beginPath()
        ctx.arc(r * 0.25, 0, 4.2, 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'Mini-Boss':
      case 'Boss': {
        if (this.enemyId === 'ene_a3_05' || this.enemyId === 'ene_a3_06') {
          this.drawAreaThreeEnemySprite(ctx, r, isFlashing)
          break
        }

        if (this.enemyId === 'ene_a2_05') {
          const coreColor = '#FDE047'
          const pulse = 0.92 + Math.sin(this.animTime * 6) * 0.05
          ctx.fillStyle = isFlashing ? '#FFFFFF' : '#431407'
          ctx.strokeStyle = '#F97316'
          ctx.lineWidth = 3
          ctx.beginPath()
          for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 + this.animTime * 0.12
            const radius = r * (i % 2 === 0 ? pulse : 0.76)
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
          ctx.strokeStyle = '#FDBA74'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.moveTo(-r * 0.72, -r * 0.36)
          ctx.lineTo(r * 0.72, -r * 0.36)
          ctx.moveTo(-r * 0.72, r * 0.36)
          ctx.lineTo(r * 0.72, r * 0.36)
          ctx.stroke()
          ctx.fillStyle = coreColor
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.29, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#FFF7ED'
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2)
          ctx.fill()
          break
        }

        if (this.enemyId.startsWith('boss_a3_')) {
          const isFinalStar = this.enemyId === 'boss_a3_20'
          if (isFinalStar) {
            const wingBeat = Math.sin(this.animTime * 5) * r * 0.07

            // Broad basalt wings with glowing magma seams.
            for (const side of [-1, 1]) {
              ctx.save()
              ctx.scale(side, 1)
              ctx.fillStyle = isFlashing ? '#FFFFFF' : '#292524'
              ctx.strokeStyle = '#A8A29E'
              ctx.lineWidth = 2.5
              ctx.beginPath()
              ctx.moveTo(r * 0.3, -r * 0.18)
              ctx.lineTo(r * 0.92, -r * 0.78 + wingBeat)
              ctx.lineTo(r * 1.52, -r * 0.96 + wingBeat)
              ctx.lineTo(r * 1.31, -r * 0.52 + wingBeat * 0.5)
              ctx.lineTo(r * 1.56, -r * 0.34)
              ctx.lineTo(r * 1.13, -r * 0.17)
              ctx.lineTo(r * 1.35, r * 0.16 + wingBeat * 0.35)
              ctx.lineTo(r * 0.78, r * 0.08)
              ctx.lineTo(r * 0.48, r * 0.32)
              ctx.closePath()
              ctx.fill()
              ctx.stroke()

              ctx.strokeStyle = '#F97316'
              ctx.lineWidth = 2
              ctx.beginPath()
              ctx.moveTo(r * 0.49, -r * 0.12)
              ctx.lineTo(r * 1.31, -r * 0.65 + wingBeat * 0.6)
              ctx.moveTo(r * 0.64, r * 0.04)
              ctx.lineTo(r * 1.34, -r * 0.27 + wingBeat * 0.3)
              ctx.stroke()
              ctx.restore()
            }

            // Fire-shaped head, layered from deep red to a near-white hot center.
            ctx.save()
            ctx.shadowColor = '#F97316'
            ctx.shadowBlur = 22
            const fireGradient = ctx.createLinearGradient(0, -r * 1.5, 0, -r * 0.45)
            fireGradient.addColorStop(0, '#FEF08A')
            fireGradient.addColorStop(0.36, '#FACC15')
            fireGradient.addColorStop(0.72, '#F97316')
            fireGradient.addColorStop(1, '#B91C1C')
            ctx.fillStyle = fireGradient
            ctx.beginPath()
            ctx.moveTo(-r * 0.38, -r * 0.47)
            ctx.quadraticCurveTo(-r * 0.62, -r * 0.96, -r * 0.24, -r * 1.18)
            ctx.lineTo(-r * 0.1, -r * 1.5)
            ctx.lineTo(r * 0.08, -r * 1.2)
            ctx.quadraticCurveTo(r * 0.42, -r * 1.46, r * 0.34, -r * 1.1)
            ctx.quadraticCurveTo(r * 0.66, -r * 0.75, r * 0.38, -r * 0.47)
            ctx.closePath()
            ctx.fill()

            ctx.fillStyle = '#FFF7AE'
            ctx.beginPath()
            ctx.moveTo(-r * 0.17, -r * 0.57)
            ctx.quadraticCurveTo(-r * 0.28, -r * 0.9, -r * 0.04, -r * 1.18)
            ctx.quadraticCurveTo(r * 0.08, -r * 0.98, r * 0.2, -r * 0.7)
            ctx.lineTo(r * 0.14, -r * 0.54)
            ctx.closePath()
            ctx.fill()
            ctx.restore()

            // Jagged molten-rock body.
            ctx.fillStyle = isFlashing ? '#FFFFFF' : '#292524'
            ctx.strokeStyle = '#A8A29E'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(0, -r * 0.74)
            ctx.lineTo(r * 0.48, -r * 0.48)
            ctx.lineTo(r * 0.63, -r * 0.05)
            ctx.lineTo(r * 0.47, r * 0.48)
            ctx.lineTo(r * 0.2, r * 0.72)
            ctx.lineTo(0, r * 0.59)
            ctx.lineTo(-r * 0.25, r * 0.73)
            ctx.lineTo(-r * 0.52, r * 0.38)
            ctx.lineTo(-r * 0.62, -r * 0.08)
            ctx.lineTo(-r * 0.44, -r * 0.49)
            ctx.closePath()
            ctx.fill()
            ctx.stroke()

            // Glowing magma cracks and a bright chest core.
            ctx.strokeStyle = '#FB923C'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.moveTo(-r * 0.08, -r * 0.45)
            ctx.lineTo(r * 0.08, -r * 0.2)
            ctx.lineTo(-r * 0.06, r * 0.02)
            ctx.lineTo(r * 0.16, r * 0.29)
            ctx.moveTo(-r * 0.46, -r * 0.12)
            ctx.lineTo(-r * 0.18, r * 0.02)
            ctx.lineTo(-r * 0.34, r * 0.34)
            ctx.moveTo(r * 0.43, -r * 0.1)
            ctx.lineTo(r * 0.21, r * 0.08)
            ctx.lineTo(r * 0.36, r * 0.34)
            ctx.stroke()

            ctx.fillStyle = '#FDE047'
            ctx.shadowColor = '#F97316'
            ctx.shadowBlur = 18
            ctx.beginPath()
            ctx.arc(0, r * 0.05, r * 0.18, 0, Math.PI * 2)
            ctx.fill()
            ctx.shadowBlur = 0

            // Small molten eyes beneath the flame crown.
            ctx.fillStyle = '#FFF7ED'
            ctx.beginPath()
            ctx.ellipse(-r * 0.19, -r * 0.53, r * 0.08, r * 0.045, -0.12, 0, Math.PI * 2)
            ctx.ellipse(r * 0.19, -r * 0.53, r * 0.08, r * 0.045, 0.12, 0, Math.PI * 2)
            ctx.fill()

            if (
              this.telegraphs.some(
                (telegraph) =>
                  telegraph.kind === 'inferno_spear_volley' ||
                  (telegraph.kind === 'infero_spear_cascade' &&
                    !telegraph.hasTriggered &&
                    telegraph.chargeTimer >= telegraph.chargeDuration - 0.45)
              )
            ) {
              ctx.save()
              ctx.translate(r * 0.38, r * 0.18)
              ctx.rotate(0.12)
              ctx.shadowColor = '#F97316'
              ctx.shadowBlur = 15
              ctx.strokeStyle = '#FDE68A'
              ctx.lineWidth = Math.max(3, r * 0.055)
              ctx.beginPath()
              ctx.moveTo(-r * 0.18, 0)
              ctx.lineTo(r * 1.9, 0)
              ctx.stroke()
              ctx.fillStyle = '#FB923C'
              ctx.beginPath()
              ctx.moveTo(r * 2.36, 0)
              ctx.lineTo(r * 1.82, -r * 0.18)
              ctx.lineTo(r * 1.94, 0)
              ctx.lineTo(r * 1.82, r * 0.18)
              ctx.closePath()
              ctx.fill()
              ctx.shadowBlur = 0
              ctx.restore()
            }
            break
          }

          const coreColor =
            this.enemyId === 'boss_a3_10'
              ? '#FDE047'
              : this.enemyId === 'boss_a3_15'
                ? '#FDBA74'
                : '#FFF7ED'
          const rotation = this.animTime * 0.28
          ctx.fillStyle = isFlashing ? '#FFFFFF' : '#431407'
          ctx.strokeStyle = this.color
          ctx.lineWidth = 3
          ctx.beginPath()
          for (let i = 0; i < 8; i++) {
            const count = 8
            const angle = (i / count) * Math.PI * 2 + rotation
            const radius = r * (i % 2 === 0 ? 0.95 : 0.77)
            const x = Math.cos(angle) * radius
            const y = Math.sin(angle) * radius
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          ctx.fillStyle = this.enemyId === 'boss_a3_15' ? '#7C2D12' : '#9A3412'
          ctx.beginPath()
          ctx.moveTo(0, -r * 0.62)
          ctx.lineTo(r * 0.58, -r * 0.18)
          ctx.lineTo(r * 0.44, r * 0.48)
          ctx.lineTo(0, r * 0.65)
          ctx.lineTo(-r * 0.44, r * 0.48)
          ctx.lineTo(-r * 0.58, -r * 0.18)
          ctx.closePath()
          ctx.fill()
          ctx.fillStyle = coreColor
          ctx.shadowColor = this.color
          ctx.shadowBlur = 12
          ctx.beginPath()
          ctx.arc(0, 0, r * 0.23, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
          break
        }

        if (this.enemyId === 'ene_a2_05') {
          // Astral Bastion Warden: heavy golden-amber fortress hull + twin shoulder AoE mortars
          ctx.fillStyle = isFlashing ? '#FFFFFF' : '#1E293B'
          ctx.strokeStyle = '#F59E0B'
          ctx.lineWidth = 3
          ctx.beginPath()
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2
            const px = Math.cos(a) * r * 0.9
            const py = Math.sin(a) * r * 0.9
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Twin shoulder AoE mortar cannons
          ctx.fillStyle = '#475569'
          ctx.strokeStyle = '#F97316'
          ctx.lineWidth = 2
          ctx.fillRect(-r * 0.2, -r * 0.98, r * 0.85, 8)
          ctx.strokeRect(-r * 0.2, -r * 0.98, r * 0.85, 8)
          ctx.fillRect(-r * 0.2, r * 0.98 - 8, r * 0.85, 8)
          ctx.strokeRect(-r * 0.2, r * 0.98 - 8, r * 0.85, 8)

          // Glowing orange-emerald citadel furnace core
          const pulse = 5.5 + Math.sin(this.animTime * 6) * 2
          ctx.fillStyle = '#F97316'
          ctx.beginPath()
          ctx.arc(0, 0, pulse + 3, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#34D399'
          ctx.beginPath()
          ctx.arc(0, 0, pulse * 0.55, 0, Math.PI * 2)
          ctx.fill()
          break
        }

        if (this.enemyId === 'boss_a2_05') {
          // Emerald Prism Monarch (Area 2 W5 Boss): radiant emerald hexagonal citadel prism + 6 orbiting shard blades
          ctx.fillStyle = isFlashing ? '#FFFFFF' : '#064E3B'
          ctx.strokeStyle = '#34D399'
          ctx.lineWidth = 3
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2
            const px = Math.cos(a) * r * 0.92
            const py = Math.sin(a) * r * 0.92
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Inner sapphire facet diamond
          ctx.fillStyle = '#0F766E'
          ctx.strokeStyle = '#FACC15'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(0, -r * 0.56)
          ctx.lineTo(r * 0.56, 0)
          ctx.lineTo(0, r * 0.56)
          ctx.lineTo(-r * 0.56, 0)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Orbiting emerald prism blades
          for (let i = 0; i < 6; i++) {
            const oa = this.animTime * 2.5 + (i * Math.PI) / 3
            const ox = Math.cos(oa) * (r + 8)
            const oy = Math.sin(oa) * (r + 8)
            ctx.fillStyle = i % 2 === 0 ? '#34D399' : '#38BDF8'
            ctx.beginPath()
            ctx.arc(ox, oy, 4, 0, Math.PI * 2)
            ctx.fill()
          }
          break
        }

        if (this.enemyId === 'boss_a2_10') {
          // Astral Vortex Colossus (Area 2 W10 & Endless Boss): celestial star dreadnought + twin mortar pods
          ctx.fillStyle = isFlashing ? '#FFFFFF' : '#1E1B4B'
          ctx.strokeStyle = '#38BDF8'
          ctx.lineWidth = 3
          ctx.beginPath()
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2 + this.animTime * 0.4
            const rad = i % 2 === 0 ? r * 0.95 : r * 0.62
            const px = Math.cos(a) * rad
            const py = Math.sin(a) * rad
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Swirling astral singularity core
          const vortexPulse = 7 + Math.sin(this.animTime * 7) * 2
          ctx.fillStyle = '#A855F7'
          ctx.beginPath()
          ctx.arc(0, 0, vortexPulse + 4, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#38BDF8'
          ctx.beginPath()
          ctx.arc(0, 0, vortexPulse * 0.65, 0, Math.PI * 2)
          ctx.fill()

          // 4 orbiting void-cyan beacons
          for (let i = 0; i < 4; i++) {
            const oa = -this.animTime * 2.6 + (i * Math.PI) / 2
            const ox = Math.cos(oa) * (r + 9)
            const oy = Math.sin(oa) * (r + 9)
            ctx.fillStyle = '#F0ABFC'
            ctx.beginPath()
            ctx.arc(ox, oy, 4.2, 0, Math.PI * 2)
            ctx.fill()
          }
          break
        }

        if (this.enemyId === 'boss_a2_15') {
          // Solar Archon Seraph (Area 2 W15 Final Boss): celestial winged golden crown + blinding solar core
          if (this.bossPhase >= 2 || this.isEnraged) {
            ctx.save()
            ctx.strokeStyle =
              this.bossPhase >= 3 ? 'rgba(255, 0, 85, 0.8)' : 'rgba(56, 189, 248, 0.72)'
            ctx.lineWidth = 3.5
            ctx.beginPath()
            ctx.arc(0, 0, r * (1.2 + Math.sin(this.animTime * 11) * 0.06), 0, Math.PI * 2)
            ctx.stroke()
            ctx.restore()
          }
          ctx.save()
          const wingBeat = Math.sin(this.animTime * 4) * 5
          ctx.fillStyle = isFlashing ? '#FFFFFF' : this.bossPhase >= 3 ? '#7F1D1D' : '#78350F'
          ctx.strokeStyle = this.bossPhase >= 3 ? '#FF0055' : '#FACC15'
          ctx.lineWidth = 3
          // Twin seraphic solar wings
          for (const side of [-1, 1]) {
            ctx.beginPath()
            ctx.moveTo(0, side * r * 0.35)
            ctx.lineTo(-r * 0.85, side * (r * 1.08 + wingBeat))
            ctx.lineTo(r * 0.4, side * (r * 0.9 + wingBeat))
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
          }
          ctx.restore()

          // Central decagonal solar fortress
          ctx.fillStyle = isFlashing ? '#FFFFFF' : '#312E81'
          ctx.strokeStyle = '#FACC15'
          ctx.lineWidth = 3.5
          ctx.beginPath()
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2
            const px = Math.cos(a) * r * 0.84
            const py = Math.sin(a) * r * 0.84
            if (i === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          }
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Radiant solar heart
          const solarPulse = 9 + Math.sin(this.animTime * 8) * 2.5
          ctx.fillStyle = '#F97316'
          ctx.beginPath()
          ctx.arc(0, 0, solarPulse + 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#FEF08A'
          ctx.beginPath()
          ctx.arc(0, 0, solarPulse * 0.72, 0, Math.PI * 2)
          ctx.fill()

          // 6 orbiting emerald-gold crown seals
          for (let i = 0; i < 6; i++) {
            const oa = this.animTime * 2.1 + (i * Math.PI) / 3
            const ox = Math.cos(oa) * (r + 10)
            const oy = Math.sin(oa) * (r + 10)
            ctx.fillStyle = i % 2 === 0 ? '#FACC15' : '#34D399'
            ctx.beginPath()
            ctx.arc(ox, oy, 4.5, 0, Math.PI * 2)
            ctx.fill()
          }
          break
        }

        if (this.isWormBoss) {
          // Segmented Worm Boss Head (Devourer of Gods cyan/violet vs Astral Scourge emerald/solar-gold)
          const jawSnap = Math.abs(Math.sin(this.animTime * 9)) * 0.22
          const headGlow = this.isAstralScourge
            ? this.bossPhase >= 3
              ? 'rgba(250, 204, 21, 0.78)'
              : 'rgba(52, 211, 153, 0.75)'
            : this.isEnraged
              ? 'rgba(244, 63, 94, 0.75)'
              : 'rgba(34, 211, 238, 0.72)'
          const jawStroke = this.isAstralScourge
            ? this.bossPhase >= 3
              ? '#FACC15'
              : '#34D399'
            : this.isEnraged
              ? '#F43F5E'
              : '#22D3EE'
          const headFill = this.isAstralScourge
            ? this.bossPhase >= 3
              ? '#451A03'
              : '#064E3B'
            : this.isEnraged
              ? '#4C0519'
              : '#1E1B4B'
          const crestStroke = this.isAstralScourge ? '#FACC15' : '#E879F9'
          const coreColor = this.isAstralScourge
            ? this.bossPhase >= 3
              ? '#FEF08A'
              : '#34D399'
            : this.isEnraged
              ? '#F43F5E'
              : '#22D3EE'

          ctx.save()
          ctx.strokeStyle = headGlow
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(0, 0, r * (1.22 + Math.sin(this.animTime * 10) * 0.06), 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()

          // Twin curved pincer mandibles snapping at the front
          for (const side of [-1, 1]) {
            ctx.save()
            ctx.rotate(side * jawSnap)
            ctx.fillStyle = isFlashing ? '#FFFFFF' : '#0F172A'
            ctx.strokeStyle = jawStroke
            ctx.lineWidth = 2.6
            ctx.beginPath()
            ctx.moveTo(r * 0.55, side * r * 0.28)
            ctx.lineTo(r * 1.38, side * r * 0.55)
            ctx.lineTo(r * 1.12, side * r * 0.12)
            ctx.closePath()
            ctx.fill()
            ctx.stroke()
            ctx.restore()
          }

          // Armored head carapace + sweeping side horns
          ctx.fillStyle = isFlashing ? '#FFFFFF' : headFill
          ctx.strokeStyle = crestStroke
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(r * 1.05, 0)
          ctx.lineTo(r * 0.25, -r * 0.85)
          ctx.lineTo(-r * 0.92, -r * 1.08)
          ctx.lineTo(-r * 0.52, -r * 0.42)
          ctx.lineTo(-r * 0.82, 0)
          ctx.lineTo(-r * 0.52, r * 0.42)
          ctx.lineTo(-r * 0.92, r * 1.08)
          ctx.lineTo(r * 0.25, r * 0.85)
          ctx.closePath()
          ctx.fill()
          ctx.stroke()

          // Glowing core slit & 4 piercing eyes
          ctx.fillStyle = coreColor
          ctx.beginPath()
          ctx.ellipse(0, 0, r * 0.48, r * 0.2, 0, 0, Math.PI * 2)
          ctx.fill()

          ctx.fillStyle = this.isAstralScourge ? '#FEF9C3' : '#FFFFFF'
          for (const side of [-1, 1]) {
            ctx.beginPath()
            ctx.arc(r * 0.42, side * r * 0.34, 3.6, 0, Math.PI * 2)
            ctx.arc(r * 0.16, side * r * 0.48, 2.8, 0, Math.PI * 2)
            ctx.fill()
          }
          break
        }

        // Aegis Commander Drone: octagonal dreadnought hull + 4 orbiting shield pylons + pulsing core
        if (this.isEnraged || this.bossPhase >= 2) {
          ctx.save()
          ctx.strokeStyle =
            this.isEnraged || this.bossPhase >= 3
              ? 'rgba(255, 0, 85, 0.78)'
              : 'rgba(56, 189, 248, 0.72)'
          ctx.lineWidth = 3.5
          ctx.beginPath()
          ctx.arc(0, 0, r * (1.16 + Math.sin(this.animTime * 12) * 0.06), 0, Math.PI * 2)
          ctx.stroke()
          ctx.restore()
        }
        ctx.fillStyle = isFlashing
          ? '#FFFFFF'
          : this.isEnraged || this.bossPhase >= 3
            ? '#3B0712'
            : this.bossPhase === 2
              ? '#0F2942'
              : '#1E1B4B'
        ctx.strokeStyle =
          this.isEnraged || this.bossPhase >= 3
            ? '#FF0055'
            : this.bossPhase === 2
              ? '#38BDF8'
              : '#FFD700'
        ctx.lineWidth = 3
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2
          const px = Math.cos(a) * r * 0.88
          const py = Math.sin(a) * r * 0.88
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Twin heavy sponsons
        ctx.fillStyle = '#334155'
        ctx.strokeStyle = '#FF0055'
        ctx.lineWidth = 2
        ctx.fillRect(-4, -r * 0.96, r * 0.9, 6)
        ctx.strokeRect(-4, -r * 0.96, r * 0.9, 6)
        ctx.fillRect(-4, r * 0.96 - 6, r * 0.9, 6)
        ctx.strokeRect(-4, r * 0.96 - 6, r * 0.9, 6)

        // Pulsing boss reactor core
        const corePulse = 6 + Math.sin(this.animTime * 7) * 2
        ctx.fillStyle = '#FF0055'
        ctx.beginPath()
        ctx.arc(0, 0, corePulse + 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFD700'
        ctx.beginPath()
        ctx.arc(0, 0, corePulse * 0.6, 0, Math.PI * 2)
        ctx.fill()

        // 4 Orbiting shield pylons
        for (let i = 0; i < 4; i++) {
          const orbitAngle = this.animTime * 2.2 + (i * Math.PI) / 2
          const ox = Math.cos(orbitAngle) * (r + 7)
          const oy = Math.sin(orbitAngle) * (r + 7)
          ctx.fillStyle = '#00F0FF'
          ctx.beginPath()
          ctx.arc(ox, oy, 3.5, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      }

      default: {
        // Spore Zombie (Swarm): animated reaching arms + mottled husk + glowing bioluminescent fungal pods
        const armSway = Math.sin(this.animTime * 9) * 3
        ctx.strokeStyle = isFlashing ? '#FFFFFF' : '#9F1239'
        ctx.lineWidth = 4
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(2, -r * 0.55)
        ctx.lineTo(r * 0.85, -r * 0.45 + armSway)
        ctx.moveTo(2, r * 0.55)
        ctx.lineTo(r * 0.85, r * 0.45 - armSway)
        ctx.stroke()

        // Infected torso
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#881337'
        ctx.strokeStyle = '#FB7185'
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()

        // Bioluminescent spore clusters on shoulders
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#84CC16'
        ctx.beginPath()
        ctx.arc(-4, -5, 4, 0, Math.PI * 2)
        ctx.arc(-5, 4, 3.2, 0, Math.PI * 2)
        ctx.fill()

        // Glowing infected eyes
        ctx.fillStyle = '#FEF08A'
        ctx.beginPath()
        ctx.arc(r * 0.35, -3, 1.8, 0, Math.PI * 2)
        ctx.arc(r * 0.35, 3, 1.8, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    ctx.restore()

    // Active Burn flame aura on ignited enemies
    if (this.burnTimer > 0) {
      ctx.save()
      for (let f = 0; f < 3; f++) {
        const a = this.animTime * 6 + (f * Math.PI * 2) / 3
        const fx = cx + Math.cos(a) * (r * 0.55)
        const fy = cy + Math.sin(a) * (r * 0.35) - 4 - Math.abs(Math.sin(this.animTime * 14 + f)) * 6
        ctx.fillStyle = f % 2 === 0 ? '#FB923C' : '#FACC15'
        ctx.beginPath()
        ctx.moveTo(fx - 4, fy + 5)
        ctx.lineTo(fx, fy - 7)
        ctx.lineTo(fx + 4, fy + 5)
        ctx.closePath()
        ctx.fill()
      }
      ctx.restore()
    }

    // Active Frost Freeze translucent crystal prism encasement
    if (this.freezeTimer > 0) {
      ctx.save()
      const iceRadius = r * 1.24
      ctx.fillStyle = 'rgba(56, 189, 248, 0.38)'
      ctx.strokeStyle = '#BAE6FD'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6
        const rad = i % 2 === 0 ? iceRadius * 1.08 : iceRadius * 0.92
        const px = cx + Math.cos(a) * rad
        const py = cy + Math.sin(a) * rad
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Specular ice sheen facets
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(cx - r * 0.55, cy - r * 0.55)
      ctx.lineTo(cx + r * 0.2, cy - r * 0.85)
      ctx.moveTo(cx - r * 0.7, cy + r * 0.15)
      ctx.lineTo(cx + r * 0.45, cy - r * 0.3)
      ctx.stroke()
      ctx.restore()
    }

    // Boss charging indicator ring around boss chassis
    if (this.isBoss && this.telegraphs.some((t) => !t.hasTriggered)) {
      ctx.strokeStyle = '#FF0055'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(4, r + 11 + Math.sin(this.animTime * 18) * 3), 0, Math.PI * 2)
      ctx.stroke()
    }

    // Boss / Mini-Boss Nameplate (suppressed briefly during initial boss cutscene emergence)
    const showBossLabel =
      !(this.isWormBoss || this.isFinalBoss || this.isWave15SpecialBoss) ||
      this.cutsceneDelayTimer <= 1.4
    if (this.isBoss && showBossLabel) {
      ctx.fillStyle = this.isDevourerOfGods
        ? '#22D3EE'
        : this.isAstralScourge
          ? '#34D399'
          : '#FFD700'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(this.bossTitle || 'COMMANDER BOSS', cx, screenY - 14)
    } else if (this.isMiniBoss) {
      ctx.fillStyle = '#FBBF24'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('WARDEN MINI-BOSS', cx, screenY - 13)
    }

    // Health bar with dark backing
    const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth))
    if (showBossLabel && (healthPercent < 1 || this.isBoss || this.isMiniBoss)) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
      ctx.fillRect(screenX - 1, screenY - 9, this.width + 2, 6)
      ctx.fillStyle = this.isDevourerOfGods
        ? '#E879F9'
        : this.isAstralScourge
          ? '#FACC15'
          : this.isBoss
            ? '#FFD700'
            : this.isMiniBoss
              ? '#F97316'
              : '#FF0055'
      ctx.fillRect(screenX, screenY - 8, this.width * healthPercent, 4)
    }

    // Enemy Laser / Arcane / Cosmic Nebula Star Projectiles
    for (const proj of this.projectiles) {
      const { x: projX, y: projY } = camera.worldToScreen(proj.x, proj.y)
      if ((proj.isBlazingSpear || proj.isInferoFireball) && proj.trailParticles) {
        for (const particle of proj.trailParticles) {
          const particleScreen = camera.worldToScreen(particle.x, particle.y)
          const alpha = Math.max(0, 1 - particle.lifetime / particle.maxLifetime)
          ctx.save()
          ctx.globalAlpha = alpha
          ctx.shadowColor = particle.color
          ctx.shadowBlur = 10
          ctx.fillStyle = particle.color
          ctx.beginPath()
          ctx.arc(particleScreen.x, particleScreen.y, particle.radius * alpha, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }
      }

      if (
        proj.inferoLancePhase === 'aiming' &&
        proj.inferoLanceTargetX !== undefined &&
        proj.inferoLanceTargetY !== undefined
      ) {
        const targetMark = camera.worldToScreen(
          proj.inferoLanceTargetX,
          proj.inferoLanceTargetY
        )
        const aimAngle = Math.atan2(targetMark.y - projY, targetMark.x - projX)
        const arrowSize = 11
        ctx.save()
        ctx.globalAlpha = 0.78 + Math.sin(this.animTime * 18) * 0.12
        ctx.lineCap = 'round'
        ctx.setLineDash([8, 7])
        ctx.strokeStyle = '#FDE047'
        ctx.lineWidth = 2
        ctx.shadowColor = '#F97316'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.moveTo(projX, projY)
        ctx.lineTo(targetMark.x, targetMark.y)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(targetMark.x, targetMark.y)
        ctx.lineTo(
          targetMark.x - Math.cos(aimAngle - 0.48) * arrowSize,
          targetMark.y - Math.sin(aimAngle - 0.48) * arrowSize
        )
        ctx.moveTo(targetMark.x, targetMark.y)
        ctx.lineTo(
          targetMark.x - Math.cos(aimAngle + 0.48) * arrowSize,
          targetMark.y - Math.sin(aimAngle + 0.48) * arrowSize
        )
        ctx.stroke()
        ctx.strokeStyle = '#FFF7ED'
        ctx.beginPath()
        ctx.arc(targetMark.x, targetMark.y, 8, 0, Math.PI * 2)
        ctx.moveTo(targetMark.x - 12, targetMark.y)
        ctx.lineTo(targetMark.x + 12, targetMark.y)
        ctx.moveTo(targetMark.x, targetMark.y - 12)
        ctx.lineTo(targetMark.x, targetMark.y + 12)
        ctx.stroke()
        ctx.restore()
      }

      const angle = proj.isCosmicStar
        ? this.animTime * 6.5
        : Math.atan2(proj.direction.y, proj.direction.x)
      ctx.save()
      ctx.translate(projX, projY)
      ctx.rotate(angle)
      if (proj.isCosmicStar) {
        const starR = Math.max(7, proj.width * 0.65)
        ctx.fillStyle = proj.color
        ctx.beginPath()
        for (let k = 0; k < 8; k++) {
          const ka = (k / 8) * Math.PI * 2
          const kr = k % 2 === 0 ? starR : starR * 0.42
          const sx = Math.cos(ka) * kr
          const sy = Math.sin(ka) * kr
          if (k === 0) ctx.moveTo(sx, sy)
          else ctx.lineTo(sx, sy)
        }
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(0, 0, starR * 0.34, 0, Math.PI * 2)
        ctx.fill()
      } else if (proj.isInferoFireball) {
        ctx.shadowColor = '#F97316'
        ctx.shadowBlur = 16
        ctx.fillStyle = '#EA580C'
        ctx.beginPath()
        ctx.ellipse(-3, 0, 12, 7, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FDE047'
        ctx.beginPath()
        ctx.arc(0, 0, 5.5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFF7ED'
        ctx.beginPath()
        ctx.arc(1, 0, 2.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (proj.isBlazingSpear) {
        const halfLength = proj.width * 0.62
        const halfHeight = Math.max(4, proj.height * 0.34)
        ctx.shadowColor = '#F97316'
        ctx.shadowBlur = 14
        ctx.fillStyle = '#9A3412'
        ctx.strokeStyle = '#FDE047'
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.moveTo(-halfLength, -halfHeight * 0.45)
        ctx.lineTo(halfLength * 0.38, -halfHeight * 0.45)
        ctx.lineTo(halfLength * 0.38, -halfHeight)
        ctx.lineTo(halfLength, 0)
        ctx.lineTo(halfLength * 0.38, halfHeight)
        ctx.lineTo(halfLength * 0.38, halfHeight * 0.45)
        ctx.lineTo(-halfLength, halfHeight * 0.45)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
        ctx.shadowBlur = 0
        ctx.fillStyle = '#FB923C'
        ctx.beginPath()
        ctx.moveTo(-halfLength * 0.7, -halfHeight * 0.24)
        ctx.lineTo(halfLength * 0.36, -halfHeight * 0.24)
        ctx.lineTo(halfLength * 0.36, -halfHeight * 0.54)
        ctx.lineTo(halfLength * 0.78, 0)
        ctx.lineTo(halfLength * 0.36, halfHeight * 0.54)
        ctx.lineTo(halfLength * 0.36, halfHeight * 0.24)
        ctx.lineTo(-halfLength * 0.7, halfHeight * 0.24)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#FFF7ED'
        ctx.beginPath()
        ctx.arc(halfLength * 0.44, 0, Math.max(1.5, halfHeight * 0.22), 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = proj.color
        ctx.beginPath()
        ctx.ellipse(0, 0, Math.max(4, proj.width * 0.8), Math.max(2, proj.height * 0.38), 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.arc(2, 0, Math.max(1.5, proj.height * 0.2), 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    // Airborne Arcing AoE Mortar Bombs (heading toward ground indicators)
    for (const aoe of this.aoeProjectiles) {
      if (aoe.hasDetonated) continue
      const groundScreen = camera.worldToScreen(aoe.currentX, aoe.currentY)
      const orbY = groundScreen.y - aoe.arcOffsetY
      ctx.save()
      // Ground shadow under arcing mortar
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      ctx.beginPath()
      ctx.ellipse(groundScreen.x, groundScreen.y, 10, 5, 0, 0, Math.PI * 2)
      ctx.fill()

      // Fiery mortar core
      ctx.fillStyle = '#F97316'
      ctx.beginPath()
      ctx.arc(groundScreen.x, orbY, 10, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#FEF08A'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(groundScreen.x, orbY, 10, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(groundScreen.x - 2, orbY - 2, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Death burst animation
    if (this.isDying) {
      const deathProgress = Math.min(1, this.deathTimer / this.deathDuration)
      ctx.globalAlpha = Math.max(0, 1 - deathProgress)
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(1, r * (1 + deathProgress * 0.8)), 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.restore()
  }

  /**
   * Get enemy stats
   */
  getStats(): {
    health: number,
    maxHealth: number,
    healthPercent: number,
    damage: number,
    speed: number,
    type: EnemyType,
    isBoss: boolean,
    isAlive: boolean
  } {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      healthPercent: this.health / this.maxHealth,
      damage: this.damage,
      speed: this.speed,
      type: this.type,
      isBoss: this.isBoss,
      isAlive: this.isAlive
    }
  }
}

/**
 * Checks whether a target circle is caught inside a detonating enemy AoE projectile indicator
 */
export function checkEnemyAoeHit(
  aoe: EnemyAoeProjectile,
  targetCircle: { x: number; y: number; radius: number }
): boolean {
  const dx = targetCircle.x - aoe.targetX
  const dy = targetCircle.y - aoe.targetY
  return Math.hypot(dx, dy) <= aoe.radius + targetCircle.radius * 0.65
}

/**
 * Returns full planned track rectangles for a closing_side_lasers attack (reaching 50% across arena)
 */
export function getClosingSideLaserTrackRects(
  telegraph: BossTelegraphAttack
): Array<{ x: number; y: number; width: number; height: number }> {
  const b = telegraph.bounds
  if (!b) return []
  const reach = telegraph.closingReachRatio ?? 0.5
  const mode = telegraph.sideMode ?? 'left'
  const w = b.width * reach

  if (mode === 'left') {
    return [{ x: b.left, y: b.top, width: w, height: b.height }]
  }
  if (mode === 'right') {
    return [{ x: b.left + b.width - w, y: b.top, width: w, height: b.height }]
  }
  // pincer: left closes upper half to center, right closes lower half to center
  return [
    { x: b.left, y: b.top, width: w, height: b.height * 0.5 },
    { x: b.left + b.width - w, y: b.top + b.height * 0.5, width: w, height: b.height * 0.5 }
  ]
}

/**
 * Returns the active sweeping rectangles of closing_side_lasers at current activeTimer progress
 */
export function getClosingSideLaserRects(
  telegraph: BossTelegraphAttack,
  forcedProgress?: number
): Array<{ x: number; y: number; width: number; height: number }> {
  const b = telegraph.bounds
  if (!b) return []
  const reach = telegraph.closingReachRatio ?? 0.5
  const mode = telegraph.sideMode ?? 'left'
  const sweepDuration = Math.max(0.1, telegraph.activeDuration * 0.8)
  const rawProgress =
    forcedProgress !== undefined
      ? forcedProgress
      : telegraph.hasTriggered
        ? Math.min(1, telegraph.activeTimer / sweepDuration)
        : 0
  const progress = Math.max(0, Math.min(1, rawProgress))
  const curW = b.width * reach * progress

  if (mode === 'left') {
    return [{ x: b.left, y: b.top, width: curW, height: b.height }]
  }
  if (mode === 'right') {
    return [{ x: b.left + b.width - curW, y: b.top, width: curW, height: b.height }]
  }
  return [
    { x: b.left, y: b.top, width: curW, height: b.height * 0.5 },
    { x: b.left + b.width - curW, y: b.top + b.height * 0.5, width: curW, height: b.height * 0.5 }
  ]
}

/**
 * Returns the radial laser segments ([startDist, endDist]) along each beam of a rotating_cross_lasers attack,
 * leaving wide dodgeable safe gaps so players can weave through the spinning sweep.
 */
export function getRotatingCrossLaserSegments(
  telegraph: BossTelegraphAttack
): Array<[number, number]> {
  const maxLen = Math.max(100, telegraph.length ?? 1350)
  const rawSegments: Array<[number, number]> =
    telegraph.beamSegments && telegraph.beamSegments.length > 0
      ? telegraph.beamSegments
      : [
          [50, 200],
          [365, 520],
          [685, 850],
          [1015, 1350]
        ]

  const result: Array<[number, number]> = []
  for (const [s, e] of rawSegments) {
    const start = Math.max(0, s)
    const end = Math.min(maxLen, e)
    if (end > start) {
      result.push([start, end])
    }
  }
  return result
}

export function getAstralOrbitalGridLines(
  center: { x: number; y: number },
  randomAngle: number,
  offsets: number[] = [-120, 0, 120]
): CosmicLaserWallLine[] {
  const halfLength = 1100
  const lineFamilies: Array<{ angle: number; aimMode: 'random'; color: string }> = [
    { angle: randomAngle, aimMode: 'random', color: '#34D399' },
    { angle: randomAngle + Math.PI / 2, aimMode: 'random', color: '#FACC15' }
  ]
  const lines: CosmicLaserWallLine[] = []

  for (const family of lineFamilies) {
    const dirX = Math.cos(family.angle)
    const dirY = Math.sin(family.angle)
    const normalX = -dirY
    const normalY = dirX
    for (const offset of offsets) {
      const cx = center.x + normalX * offset
      const cy = center.y + normalY * offset
      lines.push({
        x1: cx - dirX * halfLength,
        y1: cy - dirY * halfLength,
        x2: cx + dirX * halfLength,
        y2: cy + dirY * halfLength,
        width: 6,
        color: family.color,
        aimMode: family.aimMode
      })
    }
  }

  return lines
}

export function getAstralTargetedLaserLines(
  boss: { x: number; y: number },
  target: { x: number; y: number },
  spread = 0.14
): CosmicLaserWallLine[] {
  const baseAngle = Math.atan2(target.y - boss.y, target.x - boss.x)
  const halfLength = 1100
  return [-1, 0, 1].map((index) => {
    const angle = baseAngle + index * spread
    return {
      x1: boss.x,
      y1: boss.y,
      x2: boss.x + Math.cos(angle) * halfLength * 2,
      y2: boss.y + Math.sin(angle) * halfLength * 2,
      width: 6,
      color: '#FACC15',
      aimMode: 'targeted'
    }
  })
}

export function getAstralScourgePhaseTwoAttackKind(
  randomValue = Math.random(),
  allowOrbitalGrid = true
): BossAttackKind {
  const roll = Math.max(0, Math.min(0.999999, randomValue))
  if (!allowOrbitalGrid) {
    if (roll < 1 / 3) return 'astral_targeted_lasers'
    if (roll < 2 / 3) return 'cosmic_laser_walls'
    return 'cosmic_portal_lunge'
  }
  if (roll < 0.4) return 'astral_orbital_grid'
  if (roll < 0.6) return 'astral_targeted_lasers'
  if (roll < 0.8) return 'cosmic_laser_walls'
  return 'cosmic_portal_lunge'
}

export function getInferoSpinningLaserLines(
  center: Vector2,
  angle: number,
  length: number
): CosmicLaserWallLine[] {
  const rayLength = Math.max(0, length)
  return [0, 1].map((beamIndex) => {
    const beamAngle = angle + beamIndex * Math.PI
    const dx = Math.cos(beamAngle) * rayLength
    const dy = Math.sin(beamAngle) * rayLength
    return {
      x1: center.x,
      y1: center.y,
      x2: center.x + dx,
      y2: center.y + dy,
      width: 22,
      color: '#F97316'
    }
  })
}

export function getInferoSpinningVolleyLines(
  center: Vector2,
  lanes: NonNullable<BossTelegraphAttack['projectileLanes']>,
  offsetDistance: number,
  segmentLength: number
): CosmicLaserWallLine[] {
  const offset = Math.max(0, offsetDistance)
  const length = Math.max(0, segmentLength)
  return lanes.map((lane) => {
    const startX = center.x + lane.directionX * offset
    const startY = center.y + lane.directionY * offset
    return {
      x1: startX,
      y1: startY,
      x2: startX + lane.directionX * length,
      y2: startY + lane.directionY * length,
      width: 12,
      color: '#FB923C'
    }
  })
}

export function getInferoRotatingSpreadLines(
  center: Vector2,
  lanes: NonNullable<BossTelegraphAttack['projectileLanes']>,
  length: number,
  rotation: number
): CosmicLaserWallLine[] {
  const rayLength = Math.max(0, length)
  return lanes.map((lane) => {
    const angle = Math.atan2(lane.directionY, lane.directionX) + rotation
    return {
      x1: center.x,
      y1: center.y,
      x2: center.x + Math.cos(angle) * rayLength,
      y2: center.y + Math.sin(angle) * rayLength,
      width: 12,
      color: '#FB923C'
    }
  })
}

export function getInferoSpinningGridProjectilePaths(
  center: Vector2,
  angle: number,
  pulseIndex: number,
  spokeCount: number,
  speed: number,
  duration = 2
): Vector2[][] {
  const step = 0.08
  return Array.from({ length: spokeCount }, (_, index) => {
    const turnRate = index % 2 === 0 ? 0.38 : -0.38
    let directionAngle = angle + pulseIndex * 0.31 + (index / spokeCount) * Math.PI * 2
    let x = center.x
    let y = center.y
    const points: Vector2[] = [{ x, y }]
    for (let elapsed = 0; elapsed < duration; elapsed += step) {
      const dt = Math.min(step, duration - elapsed)
      directionAngle += turnRate * dt
      x += Math.cos(directionAngle) * speed * dt
      y += Math.sin(directionAngle) * speed * dt
      points.push({ x, y })
    }
    return points
  })
}

export function getInferoChampionAttackKind(phase: number, cycleIndex: number): BossAttackKind {
  const cycles: Record<number, BossAttackKind[]> = {
    1: [
      'inferno_spear_volley',
      'infero_aimed_ram',
      'tracking_strikes',
      'infero_spinning_lattice',
      'infero_underflame_swoops',
      'infero_rebound_lances',
      'infero_aimed_ram'
    ],
    2: [
      'tracking_strikes',
      'infero_spinning_lattice',
      'infero_aimed_ram',
      'inferno_spear_volley',
      'infero_underflame_swoops',
      'infero_rebound_lances',
      'infero_aimed_ram',
      'infero_orbiting_lances',
      'infero_spear_cascade'
    ]
  }
  const safePhase = Math.max(1, Math.min(2, Math.floor(phase)))
  const cycle = cycles[safePhase]
  const safeIndex = ((Math.floor(cycleIndex) % cycle.length) + cycle.length) % cycle.length
  return cycle[safeIndex]
}

export function getWave15BossAttackKind(
  identity: Wave15BossIdentity,
  phase: number,
  cycleIndex: number
): BossAttackKind {
  const omegaCycles: Record<number, BossAttackKind[]> = {
    1: ['closing_side_lasers', 'tracking_strikes', 'bullet_hell'],
    2: ['rotating_cross_lasers', 'void_meteor_salvo', 'closing_side_lasers', 'bullet_hell'],
    3: ['singularity_grid', 'rotating_cross_lasers', 'void_meteor_salvo', 'bullet_hell']
  }
  const seraphCycles: Record<number, BossAttackKind[]> = {
    1: ['pursuit_beam', 'tracking_strikes', 'cosmic_laser_walls'],
    2: ['pursuit_beam', 'cosmic_laser_walls', 'void_meteor_salvo'],
    3: ['cosmic_laser_walls', 'pursuit_beam', 'singularity_grid', 'void_meteor_salvo']
  }
  const starforgeCycles: Record<number, BossAttackKind[]> = {
    1: ['pursuit_beam', 'tracking_strikes', 'closing_side_lasers'],
    2: ['rotating_cross_lasers', 'void_meteor_salvo', 'pursuit_beam', 'closing_side_lasers'],
    3: ['singularity_grid', 'void_meteor_salvo', 'rotating_cross_lasers', 'pursuit_beam']
  }
  const safePhase = Math.max(1, Math.min(3, Math.floor(phase)))
  const cycle =
    (identity === 'solar_archon_seraph'
      ? seraphCycles
      : identity === 'primordial_starforge'
        ? starforgeCycles
        : omegaCycles)[safePhase]
  const safeIndex = ((Math.floor(cycleIndex) % cycle.length) + cycle.length) % cycle.length
  return cycle[safeIndex]
}

/**
 * Checks whether a player circle is caught inside a triggered boss telegraphed attack
 */
export function checkBossTelegraphHit(
  telegraph: BossTelegraphAttack,
  targetCircle: { x: number; y: number; radius: number }
): boolean {
  if (telegraph.kind === 'bullet_hell' || telegraph.kind === 'infero_spear_cascade') {
    return false // Projectiles are checked via enemy.projectiles collisions
  }
  if (
    telegraph.kind === 'astral_orbital_grid' &&
    telegraph.hasTriggered &&
    telegraph.activeTimer >= (telegraph.laserDuration ?? telegraph.activeDuration)
  ) {
    return false // The boss is retreating; the laser grid is no longer active.
  }
  if (
    telegraph.kind === 'astral_orbital_grid' &&
    (!telegraph.hasTriggered || !telegraph.gridPulseFiring)
  ) {
    return false // Grid indicators are safe until their randomized pulse fires.
  }

  if (telegraph.kind === 'closing_side_lasers') {
    const rects = getClosingSideLaserRects(telegraph)
    const effectiveR = targetCircle.radius * 0.7
    for (const r of rects) {
      if (r.width <= 0 || r.height <= 0) continue
      const closestX = Math.max(r.x, Math.min(targetCircle.x, r.x + r.width))
      const closestY = Math.max(r.y, Math.min(targetCircle.y, r.y + r.height))
      const dx = targetCircle.x - closestX
      const dy = targetCircle.y - closestY
      if (dx * dx + dy * dy <= effectiveR * effectiveR) {
        return true
      }
    }
    return false
  }

  if (telegraph.kind === 'tracking_strikes' && telegraph.trackingBlasts) {
    for (const blast of telegraph.trackingBlasts) {
      if (blast.hasDetonated && !blast.hasDamagedPlayer) {
        if (Math.hypot(targetCircle.x - blast.x, targetCircle.y - blast.y) <= blast.radius + targetCircle.radius * 0.65) {
          return true
        }
      }
    }
    return false
  }

  if (telegraph.kind === 'infero_underflame_swoops' && telegraph.fireColumns) {
    for (const column of telegraph.fireColumns) {
      if (checkInferoFireColumnHit(column, targetCircle)) return true
    }
    return false
  }

  if (
    (telegraph.kind === 'infero_spinning_lattice' || telegraph.kind === 'infero_solar_core') &&
    telegraph.gridLines
  ) {
    if (
      !telegraph.hasTriggered ||
      telegraph.activeTimer >= telegraph.activeDuration
    ) {
      return false
    }
    if (telegraph.spinMode === 'furnace_volley' && !telegraph.gridPulseFiring) return false
    for (const line of telegraph.gridLines) {
      const dx = line.x2 - line.x1
      const dy = line.y2 - line.y1
      const lengthSquared = dx * dx + dy * dy
      if (lengthSquared <= 0.0001) continue
      const projection = Math.max(
        0,
        Math.min(
          1,
          ((targetCircle.x - line.x1) * dx + (targetCircle.y - line.y1) * dy) /
            lengthSquared
        )
      )
      const closestX = line.x1 + projection * dx
      const closestY = line.y1 + projection * dy
      const hitDistance = line.width / 2 + targetCircle.radius * 0.65
      if (Math.hypot(targetCircle.x - closestX, targetCircle.y - closestY) <= hitDistance) {
        return true
      }
    }
    return false
  }

  if (telegraph.kind === 'half_arena' && telegraph.zoneRect) {
    const r = telegraph.zoneRect
    const closestX = Math.max(r.x, Math.min(targetCircle.x, r.x + r.width))
    const closestY = Math.max(r.y, Math.min(targetCircle.y, r.y + r.height))
    const dx = targetCircle.x - closestX
    const dy = targetCircle.y - closestY
    const effectiveR = targetCircle.radius * 0.55
    return dx * dx + dy * dy <= effectiveR * effectiveR
  }

  if (telegraph.kind === 'rotating_cross_lasers') {
    const baseAngle = telegraph.angle ?? 0
    const beams = telegraph.beamCount ?? 4
    const segments = getRotatingCrossLaserSegments(telegraph)
    const hitDist = telegraph.radius + targetCircle.radius * 0.65
    for (let b = 0; b < beams; b++) {
      const a = baseAngle + (b / beams) * Math.PI * 2
      const cosA = Math.cos(a)
      const sinA = Math.sin(a)
      for (const [segStart, segEnd] of segments) {
        const x1 = telegraph.x + cosA * segStart
        const y1 = telegraph.y + sinA * segStart
        const dx = cosA * (segEnd - segStart)
        const dy = sinA * (segEnd - segStart)
        const lenSq = dx * dx + dy * dy
        if (lenSq <= 0.0001) continue
        const t = Math.max(0, Math.min(1, ((targetCircle.x - x1) * dx + (targetCircle.y - y1) * dy) / lenSq))
        const projX = x1 + t * dx
        const projY = y1 + t * dy
        if (Math.hypot(targetCircle.x - projX, targetCircle.y - projY) <= hitDist) {
          return true
        }
      }
    }
    return false
  }

  if (telegraph.kind === 'cosmic_orb_barrage') {
    return false // Projectiles & splitting nebula stars are checked via enemy.projectiles collisions
  }

  if (
    (telegraph.kind === 'cosmic_laser_walls' ||
      telegraph.kind === 'astral_orbital_grid' ||
      telegraph.kind === 'astral_targeted_lasers') &&
    telegraph.gridLines
  ) {
    for (const line of telegraph.gridLines) {
      const hitDist = line.width * 0.5 + targetCircle.radius * 0.65
      const dx = line.x2 - line.x1
      const dy = line.y2 - line.y1
      const lenSq = dx * dx + dy * dy
      if (lenSq <= 0.0001) continue
      const t = Math.max(
        0,
        Math.min(1, ((targetCircle.x - line.x1) * dx + (targetCircle.y - line.y1) * dy) / lenSq)
      )
      const projX = line.x1 + t * dx
      const projY = line.y1 + t * dy
      if (Math.hypot(targetCircle.x - projX, targetCircle.y - projY) <= hitDist) {
        return true
      }
    }
    return false
  }

  if (telegraph.kind === 'cosmic_portal_lunge') {
    if (telegraph.activeTimer > 0.18) return false
    const x1 = telegraph.portalX ?? telegraph.x
    const y1 = telegraph.portalY ?? telegraph.y
    const x2 = telegraph.endX ?? x1 + Math.cos(telegraph.angle ?? 0) * (telegraph.length ?? 780)
    const y2 = telegraph.endY ?? y1 + Math.sin(telegraph.angle ?? 0) * (telegraph.length ?? 780)
    const dx = x2 - x1
    const dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq <= 0.0001) return false
    const t = Math.max(0, Math.min(1, ((targetCircle.x - x1) * dx + (targetCircle.y - y1) * dy) / lenSq))
    const projX = x1 + t * dx
    const projY = y1 + t * dy
    return Math.hypot(targetCircle.x - projX, targetCircle.y - projY) <= telegraph.radius + targetCircle.radius * 0.65
  }

  if (telegraph.kind === 'singularity_grid' && telegraph.gridRects) {
    const effectiveR = targetCircle.radius * 0.65
    for (const r of telegraph.gridRects) {
      const closestX = Math.max(r.x, Math.min(targetCircle.x, r.x + r.width))
      const closestY = Math.max(r.y, Math.min(targetCircle.y, r.y + r.height))
      const dx = targetCircle.x - closestX
      const dy = targetCircle.y - closestY
      if (dx * dx + dy * dy <= effectiveR * effectiveR) {
        return true
      }
    }
    return false
  }

  if (telegraph.kind === 'mega_laser' || telegraph.kind === 'pursuit_beam') {
    const x1 = telegraph.x
    const y1 = telegraph.y
    const x2 = telegraph.endX ?? x1 + Math.cos(telegraph.angle ?? 0) * (telegraph.length ?? 660)
    const y2 = telegraph.endY ?? y1 + Math.sin(telegraph.angle ?? 0) * (telegraph.length ?? 660)
    const dx = x2 - x1
    const dy = y2 - y1
    const lenSq = dx * dx + dy * dy
    if (lenSq <= 0.0001) {
      return Math.hypot(targetCircle.x - x1, targetCircle.y - y1) <= telegraph.radius + targetCircle.radius * 0.7
    }
    const t = Math.max(0, Math.min(1, ((targetCircle.x - x1) * dx + (targetCircle.y - y1) * dy) / lenSq))
    const projX = x1 + t * dx
    const projY = y1 + t * dy
    return Math.hypot(targetCircle.x - projX, targetCircle.y - projY) <= telegraph.radius + targetCircle.radius * 0.7
  }

  const zones =
    (telegraph.kind === 'bombardment_ring' || telegraph.kind === 'void_meteor_salvo') &&
    telegraph.subTargets &&
    telegraph.subTargets.length > 0
      ? telegraph.subTargets
      : [{ x: telegraph.x, y: telegraph.y, radius: telegraph.radius }]

  for (const z of zones) {
    if (Math.hypot(targetCircle.x - z.x, targetCircle.y - z.y) <= z.radius + targetCircle.radius * 0.65) {
      return true
    }
  }
  return false
}

/**
 * Spatial-grid circle separation so enemies collide cleanly with each other and cannot overlap
 */
export function resolveEnemyCollisions(
  enemies: Enemy[],
  arenaSize = GAME_ARENA_SIZE,
  iterations = 2
): void {
  const active: Enemy[] = []
  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i]
    if (e.isAlive) {
      active.push(e)
    }
  }
  const n = active.length
  if (n < 2) return

  const cellSize = 80
  const padding = 24

  for (let pass = 0; pass < iterations; pass++) {
    const grid = new Map<number, number[]>()

    for (let i = 0; i < n; i++) {
      const e = active[i]
      const cx = e.x + e.width / 2
      const cy = e.y + e.height / 2
      const gx = Math.floor(cx / cellSize)
      const gy = Math.floor(cy / cellSize)
      const key = gx * 4096 + gy
      let bucket = grid.get(key)
      if (!bucket) {
        bucket = []
        grid.set(key, bucket)
      }
      bucket.push(i)
    }

    for (let i = 0; i < n; i++) {
      const a = active[i]
      const acx = a.x + a.width / 2
      const acy = a.y + a.height / 2
      const rA = Math.max(8, a.width / 2)
      const invMassA = a.isKnockbackImmune
        ? 0 : a.isBoss ? 0.2 : a.isMiniBoss ? 0.35 : 1.0
      const gx = Math.floor(acx / cellSize)
      const gy = Math.floor(acy / cellSize)

      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const bucket = grid.get((gx + ox) * 4096 + (gy + oy))
          if (!bucket) continue

          for (let bIdx = 0; bIdx < bucket.length; bIdx++) {
            const j = bucket[bIdx]
            if (j <= i) continue

            const b = active[j]
            const bcx = b.x + b.width / 2
            const bcy = b.y + b.height / 2
            const rB = Math.max(8, b.width / 2)
            const minDist = rA + rB

            const dx = bcx - acx
            const dy = bcy - acy
            const distSq = dx * dx + dy * dy
            if (distSq >= minDist * minDist) continue

            let nx: number
            let ny: number
            let overlap: number
            if (distSq < 0.0001) {
              const angle = ((i * 137.5 + j * 43.1) % 360) * (Math.PI / 180)
              nx = Math.cos(angle)
              ny = Math.sin(angle)
              overlap = minDist
            } else {
              const dist = Math.sqrt(distSq)
              nx = dx / dist
              ny = dy / dist
              overlap = minDist - dist
            }

            const invMassB = b.isKnockbackImmune
              ? 0 : b.isBoss ? 0.2 : b.isMiniBoss ? 0.35 : 1.0
            const totalInvMass = invMassA + invMassB
            if (totalInvMass <= 0) continue
            const pushA = (overlap * invMassA) / totalInvMass
            const pushB = (overlap * invMassB) / totalInvMass

            a.x -= nx * pushA
            a.y -= ny * pushA
            b.x += nx * pushB
            b.y += ny * pushB
          }
        }
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const e = active[i]
    if (e.isKnockbackImmune) continue
    e.x = Math.max(padding, Math.min(e.x, arenaSize - e.width - padding))
    e.y = Math.max(padding, Math.min(e.y, arenaSize - e.height - padding))
  }
}

/**
 * Checks whether a target circle collides with any trailing body segment of the Devourer of Gods
 */
export function checkDevourerSegmentHit(
  enemy: Enemy,
  targetCircle: { x: number; y: number; radius: number }
): boolean {
  if (!enemy.isAlive || enemy.isSpawning || !enemy.isWormBoss || enemy.dogSegments.length === 0) {
    return false
  }
  const total = enemy.dogSegments.length
  for (let i = 0; i < total; i++) {
    const seg = enemy.dogSegments[i]
    const taper = 1 - (i / total) * 0.56
    const segRadius = Math.max(9, 24 * taper)
    const dx = targetCircle.x - seg.x
    const dy = targetCircle.y - seg.y
    const minDist = segRadius + targetCircle.radius * 0.72
    if (dx * dx + dy * dy <= minDist * minDist) {
      return true
    }
  }
  return false
}

export function checkInferoFireColumnHit(
  column: InferoFireColumn,
  targetCircle: { x: number; y: number; radius: number }
): boolean {
  const warningComplete = column.holdDuration + column.windup
  if (
    !column.hasIgnited ||
    column.elapsed < warningComplete ||
    column.elapsed >= warningComplete + column.active
  ) {
    return false
  }
  const beamProgress = Math.max(
    0,
    Math.min(1, (column.elapsed - warningComplete) / 0.18)
  )
  const beamTop = column.y - (column.y - column.topY) * beamProgress
  const left = column.x - column.width / 2
  const top = beamTop
  const closestX = Math.max(left, Math.min(targetCircle.x, left + column.width))
  const beamHeight = column.y - beamTop
  const closestY = Math.max(top, Math.min(targetCircle.y, top + beamHeight))
  const dx = targetCircle.x - closestX
  const dy = targetCircle.y - closestY
  return dx * dx + dy * dy <= targetCircle.radius * targetCircle.radius
}

export function checkAstralScourgeTailHit(
  enemy: Enemy,
  targetCircle: { x: number; y: number; radius: number }
): boolean {
  if (
    !enemy.isAlive ||
    enemy.isSpawning ||
    !enemy.isAstralScourge ||
    enemy.dogSegments.length === 0
  ) {
    return false
  }
  const tailIndex = enemy.dogSegments.length - 1
  const tail = enemy.dogSegments[tailIndex]
  const taper = 1 - (tailIndex / enemy.dogSegments.length) * 0.56
  const tailRadius = Math.max(10, 27 * taper) * 1.25
  const dx = targetCircle.x - tail.x
  const dy = targetCircle.y - tail.y
  const minDist = tailRadius + targetCircle.radius * 0.72
  return dx * dx + dy * dy <= minDist * minDist
}

export default Enemy
