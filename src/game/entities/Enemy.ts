/**
 * Enemy Entity
 * Phase 7: Build the Game - Enemy System
 */

import { Vector2 } from '../utils/vector'
import { Camera } from '../engine/Camera'
import { GAME_CONFIG } from '../../config/gameConstants'
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
  splitAfter?: number
  splitCount?: number
  splitSpeed?: number
  splitDone?: boolean
  splitColors?: [string, string]
  isCosmicStar?: boolean
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

export type Wave15BossIdentity = 'omega_overlord' | 'solar_archon_seraph'

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
  gridPulseCount?: number
  gridPulseIndex?: number
  gridPulseTimer?: number
  gridPulseWarningDuration?: number
  gridPulseFireDuration?: number
  gridPulseGapDuration?: number
  gridPulseFiring?: boolean
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
          this.color = '#34D399' // Armored sapphirestone emerald
          this.baseColor = '#34D399'
          this.width = 36
          this.height = 36
          this.movementPattern = 'chase'
          this.damage = Math.max(12, Math.round(this.enemyData.hp * 0.18))
          break
        case 'Fast Flanker':
          this.color = this.enemyId === 'ene_a2_02' ? '#2DD4BF' : '#FFD700'
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
          this.color = this.enemyId === 'ene_a2_03' ? '#34D399' : '#00F0FF'
          this.baseColor = this.color
          this.movementPattern = 'flee'
          this.canShoot = true
          this.shootCooldownMax = this.enemyId === 'ene_a2_03' ? 1.75 : 2.0
          this.attackRange = this.enemyId === 'ene_a2_03' ? 330 : 300
          this.zigzagDirection = Math.random() < 0.5 ? 1 : -1
          break
        case 'Ranged Caster':
          this.color = '#E879F9' // Violet-gold Astral Arcanist
          this.baseColor = '#E879F9'
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
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= deltaTime
      if (this.hitFlashTimer <= 0) {
        this.color = this.baseColor
      }
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
        return
      }
      // Stationary final bosses resist hard freeze with a chill slow
      this.slowMultiplier = Math.min(this.slowMultiplier, 0.55)
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime
    }
    
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime
    }
    
    // Movement pattern (stationary Wave 15 boss stays anchored; Worm bosses slither & dash)
    if (this.isStationaryBoss) {
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
        this.aoeCooldown -= deltaTime
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
        this.specialCooldown -= deltaTime
      }
      const hasPendingMajorPattern =
        (this.isStationaryBoss || this.isWormBoss) &&
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
            t.kind === 'cosmic_portal_lunge' ||
            t.kind === 'cosmic_orb_barrage'
        )
      if (this.specialCooldown <= 0 && !hasPendingMajorPattern && this.target && this.target.isAlive) {
        const distToTarget = Vector2.distance(this.getCenter(), this.target.getCenter())
        const triggerRange = this.isStationaryBoss || this.isWormBoss ? 1800 : 560
        if (distToTarget <= triggerRange) {
          this.spawnTelegraphedAttack()
          this.specialCooldown = this.isStationaryBoss
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

    if (this.dogDashTimer > 0) {
      this.dogDashTimer = Math.max(0, this.dogDashTimer - deltaTime)
      const dashMult = astralPhaseTwo ? 3.2 : this.isEnraged ? 2.85 : 2.35
      this.velocity = {
        x: this.dogDashDir.x * this.speed * dashMult,
        y: this.dogDashDir.y * this.speed * dashMult
      }
      this.direction = this.dogDashDir
      return
    }

    this.dogDashCooldown -= deltaTime
    if (this.dogDashCooldown <= 0 && dist > 110) {
      this.dogDashTimer = astralPhaseTwo ? 0.72 : this.isEnraged ? 0.96 : 0.84
      this.dogDashCooldown = astralPhaseTwo ? 1.45 : this.isEnraged ? 2.9 : 4.0
      this.dogDashDir = toward
      this.velocity = {
        x: toward.x * this.speed * (astralPhaseTwo ? 3.2 : 2.4),
        y: toward.y * this.speed * (astralPhaseTwo ? 3.2 : 2.4)
      }
      this.direction = toward
      return
    }

    if (astralPhaseTwo) {
      this.velocity = { x: toward.x * this.speed * 1.3, y: toward.y * this.speed * 1.3 }
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
    if (!this.target || !this.canShoot) return
    
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
    const clampedX = Math.max(64, Math.min(2000 - 64, targetPos.x))
    const clampedY = Math.max(64, Math.min(2000 - 64, targetPos.y))
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
    const wormPrimary = this.isAstralScourge ? '#34D399' : isSolarArchon ? '#FACC15' : '#22D3EE'
    const wormSecondary = this.isAstralScourge ? '#FACC15' : isSolarArchon ? '#34D399' : '#E879F9'

    let kind: BossAttackKind
    if (forcedKind) {
      kind =
        this.isAstralScourge && forcedKind === 'rotating_cross_lasers'
          ? 'astral_orbital_grid'
          : forcedKind
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

    let telegraph: BossTelegraphAttack

    if (kind === 'astral_orbital_grid') {
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
      const defaultLeft = Math.max(24, Math.min(2000 - 1280 - 24, targetCenter.x - 640))
      const defaultTop = Math.max(24, Math.min(2000 - 720 - 24, targetCenter.y - 360))
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
        accentPrimary: isSolarArchon ? '#FACC15' : '#F43F5E',
        accentSecondary: isSolarArchon ? '#34D399' : '#FACC15',
        warningLabel: isSolarArchon
          ? 'SERAPH ECLIPSE GRID — FIND THE SAFE CELL!'
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
        activeDuration: 3.15,
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
        accentPrimary: isSolarArchon ? '#FACC15' : '#FF0055',
        accentSecondary: isSolarArchon ? '#34D399' : '#FACC15',
        warningLabel: isSolarArchon ? 'SERAPH SUNLANCE — BREAK THE LOCK!' : undefined,
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

  /**
   * Advances telegraph windup timers, tracking mechanics, bullet hell curtains, and active sweeps
   */
  private updateTelegraphs(deltaTime: number): void {
    const bossCenter = this.getCenter()
    const targetCenter = this.target?.getCenter() ?? null

    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i]

      if (t.kind === 'astral_targeted_lasers') {
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
        if (t.chargeTimer >= t.chargeDuration) {
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
            t.gridPulseWarningDuration = 0.48
            t.gridPulseFireDuration = 0.34
            t.gridPulseGapDuration = 0.22
            t.gridPulseFiring = false
            t.laserDuration =
              t.gridPulseCount *
                ((t.gridPulseWarningDuration ?? 0) + (t.gridPulseFireDuration ?? 0)) +
              (t.gridPulseCount - 1) * (t.gridPulseGapDuration ?? 0)
            t.activeDuration = t.laserDuration + (t.escapeDuration ?? 1.35)
            this.randomizeAstralGridPulse(t)
          }
          t.hasTriggered = true
          t.activeTimer = 0
          if (t.kind === 'cosmic_portal_lunge' && t.portalX !== undefined && t.portalY !== undefined) {
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
                color: t.kind === 'singularity_grid' ? '#F43F5E' : '#FACC15',
                lifetime: 0,
                maxLifetime: 4.0
              })
            }
          }
        }
      } else {
        t.activeTimer += deltaTime

        if (t.kind === 'astral_orbital_grid') {
          const pulseCount = t.gridPulseCount ?? 1
          const warningDuration = t.gridPulseWarningDuration ?? 0.48
          const fireDuration = t.gridPulseFireDuration ?? 0.34
          const gapDuration = t.gridPulseGapDuration ?? 0.22
          const pulseCycleDuration = warningDuration + fireDuration + gapDuration
          const nextPulseIndex = Math.min(
            pulseCount - 1,
            Math.floor(t.activeTimer / pulseCycleDuration)
          )
          if (nextPulseIndex > (t.gridPulseIndex ?? 0)) {
            t.gridPulseIndex = nextPulseIndex
            this.randomizeAstralGridPulse(t)
          }
          t.gridPulseTimer =
            t.activeTimer - (t.gridPulseIndex ?? 0) * pulseCycleDuration
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
          const maxSpawns = 5
          if ((t.spawnsDone ?? 1) < maxSpawns && t.spawnTimer >= 0.5 && targetCenter) {
            t.spawnTimer -= 0.5
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
          this.telegraphs.splice(i, 1)
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
      proj.lifetime += deltaTime

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
    this.x = Math.max(padding, Math.min(this.x, 2000 - this.width - padding))
    this.y = Math.max(padding, Math.min(this.y, 2000 - this.height - padding))
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

    // Area Final Boss 3-Phase Progression (Phase 2 @ 66% HP, Phase 3 @ 33% HP)
    if ((this.isFinalBoss || this.isWave15SpecialBoss) && !this.isAstralScourge) {
      const phase2Threshold = Math.floor(this.maxHealth * 0.66)
      const phase3Threshold = Math.floor(this.maxHealth * 0.33)

      if (this.bossPhase < 2 && prevHealth > phase2Threshold && this.health <= phase2Threshold) {
        this.health = Math.max(1, phase2Threshold)
        this.bossPhase = 2
        this.phaseTransitionTimer = 0.85
        this.pendingPhaseAnnouncement = 2
        if (this.isWormBoss) {
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
                  this.enemyId === 'boss_a2_15' ? 'solar_archon_seraph' : 'omega_overlord',
                  2,
                  0
                )
              : 'rotating_cross_lasers'
          this.spawnTelegraphedAttack(transitionAttack)
        }
        return false
      }

      if (this.bossPhase < 3 && prevHealth > phase3Threshold && this.health <= phase3Threshold) {
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
                  this.enemyId === 'boss_a2_15' ? 'solar_archon_seraph' : 'omega_overlord',
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
    if (!this.isAlive) return
    this.health += amount
    if (this.health > this.maxHealth) this.health = this.maxHealth
  }

  /**
   * Ignite enemy with a stacking/refreshing burn DoT
   */
  applyBurn(damagePerTick: number, duration = 3.0): void {
    if (!this.isAlive || this.isSpawning) return
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
    if (!this.isAlive || this.isSpawning || duration <= 0) return
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
      const chargeProgress = Math.max(0, Math.min(1, t.chargeTimer / t.chargeDuration))
      const impactProgress = t.hasTriggered
        ? Math.max(0, Math.min(1, t.activeTimer / t.activeDuration))
        : 0

      if (t.kind === 'closing_side_lasers' && t.bounds) {
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
          (t.gridPulseTimer ?? 0) < (t.gridPulseWarningDuration ?? 0.48)
        const pulseFiring = t.hasTriggered && Boolean(t.gridPulseFiring)
        const pulseImpactProgress =
          ((t.gridPulseTimer ?? 0) - (t.gridPulseWarningDuration ?? 0.48)) /
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

  /**
   * Draw detailed enemy sprites on canvas
   */
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (this.isAstralScourgeIntermission) return

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

export function getAstralScourgePhaseTwoAttackKind(randomValue = Math.random()): BossAttackKind {
  const roll = Math.max(0, Math.min(0.999999, randomValue))
  if (roll < 0.4) return 'astral_orbital_grid'
  if (roll < 0.6) return 'astral_targeted_lasers'
  if (roll < 0.8) return 'cosmic_laser_walls'
  return 'cosmic_portal_lunge'
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
  const safePhase = Math.max(1, Math.min(3, Math.floor(phase)))
  const cycle = (identity === 'solar_archon_seraph' ? seraphCycles : omegaCycles)[safePhase]
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
  if (telegraph.kind === 'bullet_hell') {
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
  arenaSize = 2000,
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
      const invMassA = a.isStationaryBoss ? 0 : a.isBoss ? 0.2 : a.isMiniBoss ? 0.35 : 1.0
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

            const invMassB = b.isStationaryBoss ? 0 : b.isBoss ? 0.2 : b.isMiniBoss ? 0.35 : 1.0
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
    if (e.isStationaryBoss) continue
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
