/**
 * Enemy Entity
 * Phase 7: Build the Game - Enemy System
 */

import { Vector2 } from '../utils/vector'
import { Camera } from '../engine/Camera'
import { GAME_CONFIG } from '../../config/gameConstants'
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
  angle?: number
  turnRate?: number
  radius: number
  length?: number
  halfDirection?: HalfArenaDirection
  sideMode?: ClosingSideLaserMode
  bounds?: BossArenaBounds
  closingReachRatio?: number
  zoneRect?: { x: number; y: number; width: number; height: number }
  safeRect?: { x: number; y: number; width: number; height: number }
  gridRects?: Array<{ x: number; y: number; width: number; height: number }>
  beamCount?: number
  beamSegments?: Array<[number, number]>
  subTargets?: Array<{ x: number; y: number; radius: number }>
  trackingBlasts?: TrackingBlastNode[]
  spawnTimer?: number
  spawnsDone?: number
  pulseTimer?: number
  pulseCount?: number
  hitCooldown?: number
  chargeTimer: number
  chargeDuration: number
  activeTimer: number
  activeDuration: number
  damage: number
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
    this.isBoss = options.isBoss || options.isStationaryBoss || options.isFinalBoss || false
    this.isStationaryBoss = options.isStationaryBoss || false
    this.isFinalBoss = options.isFinalBoss || false
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
      if (this.anchorPos) {
        this.x = this.anchorPos.x - this.width / 2
        this.y = this.anchorPos.y - this.height / 2
      }
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

    // Handle spawning
    if (this.isSpawning) {
      this.spawnTime += deltaTime
      if (this.spawnTime >= this.spawnDelay) {
        this.isSpawning = false
      }
      // Spawn effect - pulse
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
    
    // Movement pattern (stationary Wave 15 boss stays anchored in upper center)
    if (this.isStationaryBoss) {
      this.velocity = Vector2.zero()
      if (this.anchorPos) {
        this.x = this.anchorPos.x - this.width / 2
        this.y = this.anchorPos.y - this.height / 2 + Math.sin(this.animTime * 2.2) * 3
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

    if (this.target) {
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
        this.isStationaryBoss &&
        this.telegraphs.some(
          (t) =>
            !t.hasTriggered ||
            t.kind === 'closing_side_lasers' ||
            t.kind === 'bullet_hell' ||
            t.kind === 'tracking_strikes' ||
            t.kind === 'pursuit_beam' ||
            t.kind === 'rotating_cross_lasers' ||
            t.kind === 'void_meteor_salvo' ||
            t.kind === 'singularity_grid'
        )
      if (this.specialCooldown <= 0 && !hasPendingMajorPattern && this.target && this.target.isAlive) {
        const distToTarget = Vector2.distance(this.getCenter(), this.target.getCenter())
        const triggerRange = this.isStationaryBoss ? 1800 : 560
        if (distToTarget <= triggerRange) {
          this.spawnTelegraphedAttack()
          this.specialCooldown = this.isStationaryBoss
            ? this.bossPhase >= 3
              ? 1.7
              : this.bossPhase === 2
                ? 1.95
                : 2.25
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
  private updateChase(deltaTime: number): void {
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

    let kind: BossAttackKind
    if (forcedKind) {
      kind = forcedKind
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

    if (kind === 'rotating_cross_lasers') {
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
      // Phase 3 New Attack: 2 vertical + 2 horizontal full-arena laser strips forming 9 safe cells + nova burst
      const bounds: BossArenaBounds = this.arenaBounds ?? {
        left: Math.max(0, bossCenter.x - 640),
        top: Math.max(0, bossCenter.y - 210),
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

  /**
   * Advances telegraph windup timers, tracking mechanics, bullet hell curtains, and active sweeps
   */
  private updateTelegraphs(deltaTime: number): void {
    const bossCenter = this.getCenter()
    const targetCenter = this.target?.getCenter() ?? null

    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i]

      if (t.kind === 'rotating_cross_lasers') {
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
        (t.kind === 'closing_side_lasers' || t.kind === 'singularity_grid') &&
        t.hasTriggered &&
        t.hasDamagedPlayer
      ) {
        t.hitCooldown = (t.hitCooldown ?? 0) + deltaTime
        if (t.hitCooldown >= 0.52) {
          t.hitCooldown = 0
          t.hasDamagedPlayer = false
        }
      }

      if (!t.hasTriggered) {
        t.chargeTimer += deltaTime
        if (t.chargeTimer >= t.chargeDuration) {
          t.chargeTimer = t.chargeDuration
          t.hasTriggered = true
          t.activeTimer = 0
          if (t.kind === 'void_meteor_salvo' || t.kind === 'singularity_grid') {
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

        if (t.kind === 'tracking_strikes' && t.trackingBlasts) {
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
   * Update all projectiles (including optional homing seekers that curve toward player)
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

    // Wave 15 Final Boss 3-Phase Progression (Phase 2 @ 66% HP, Phase 3 @ 33% HP)
    if (this.isFinalBoss) {
      const phase2Threshold = Math.floor(this.maxHealth * 0.66)
      const phase3Threshold = Math.floor(this.maxHealth * 0.33)

      if (this.bossPhase < 2 && prevHealth > phase2Threshold && this.health <= phase2Threshold) {
        this.health = Math.max(1, phase2Threshold)
        this.bossPhase = 2
        this.phaseTransitionTimer = 0.85
        this.pendingPhaseAnnouncement = 2
        this.shootCooldownMax = Math.max(0.85, this.shootCooldownMax * 0.86)
        this.specialCooldownMax = Math.max(1.85, this.specialCooldownMax * 0.86)
        this.shootCooldown = Math.min(this.shootCooldown, 0.25)
        this.specialCooldown = 0.15
        if (this.target && this.target.isAlive) {
          this.spawnTelegraphedAttack('rotating_cross_lasers')
        }
        return false
      }

      if (this.bossPhase < 3 && prevHealth > phase3Threshold && this.health <= phase3Threshold) {
        this.health = Math.max(1, phase3Threshold)
        this.bossPhase = 3
        this.isEnraged = true
        this.phaseTransitionTimer = 0.95
        this.pendingPhaseAnnouncement = 3
        this.shootCooldownMax = Math.max(0.68, this.shootCooldownMax * 0.82)
        this.specialCooldownMax = Math.max(1.55, this.specialCooldownMax * 0.82)
        this.shootCooldown = Math.min(this.shootCooldown, 0.2)
        this.specialCooldown = 0.15
        if (this.target && this.target.isAlive) {
          this.spawnTelegraphedAttack('singularity_grid')
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

    // Standard Boss Phase 2 Enrage at <= 50% HP for armored/buffed non-final bosses
    if (!this.isFinalBoss && this.enableEnrage && !this.isEnraged && this.health <= this.maxHealth * 0.5) {
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

        ctx.save()
        ctx.translate(start.x, start.y)
        ctx.rotate(angle)

        if (!t.hasTriggered) {
          const isPursuitLocked =
            t.kind === 'pursuit_beam' && t.chargeDuration - t.chargeTimer <= 0.3
          const pulse = 0.7 + 0.3 * Math.sin(this.animTime * 22)
          ctx.fillStyle = isPursuitLocked
            ? 'rgba(255, 0, 85, 0.32)'
            : `rgba(255, 0, 85, ${0.14 + chargeProgress * 0.14})`
          ctx.fillRect(0, -halfW, len, halfW * 2)

          ctx.fillStyle = isPursuitLocked
            ? 'rgba(255, 255, 255, 0.35)'
            : `rgba(250, 204, 21, ${0.22 + chargeProgress * 0.25})`
          const innerH = Math.max(2, halfW * 2 * chargeProgress)
          ctx.fillRect(0, -innerH / 2, len, innerH)

          ctx.strokeStyle = isPursuitLocked
            ? '#FFFFFF'
            : `rgba(255, 0, 85, ${0.65 * pulse})`
          ctx.lineWidth = isPursuitLocked ? 3 : 2.5
          if (!isPursuitLocked) ctx.setLineDash([12, 8])
          ctx.strokeRect(0, -halfW, len, halfW * 2)
          ctx.setLineDash([])

          ctx.strokeStyle = isPursuitLocked ? '#00F0FF' : '#FACC15'
          ctx.lineWidth = isPursuitLocked ? 2.5 : 1.5
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(len, 0)
          ctx.stroke()

          ctx.fillStyle = isPursuitLocked ? '#FFFFFF' : '#FEF08A'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText(
            t.kind === 'pursuit_beam'
              ? isPursuitLocked
                ? '⚠ BEAM LOCKED - DODGE NOW!'
                : '⚠ TRACKING LASER - LOCKING AIM...'
              : '⚠ MEGA LASER - DODGE!',
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
          ctx.fillStyle = '#FF0055'
          ctx.fillRect(0, -halfW * 1.15, len, halfW * 2.3)
          ctx.fillStyle = '#FACC15'
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
      } else if (t.kind === 'singularity_grid' && t.gridRects) {
        const pulse = 0.72 + 0.28 * Math.sin(this.animTime * 22)
        ctx.save()
        for (const gr of t.gridRects) {
          const sp = camera.worldToScreen(gr.x, gr.y)
          if (!t.hasTriggered) {
            ctx.fillStyle = `rgba(244, 63, 94, ${0.15 + chargeProgress * 0.18})`
            ctx.fillRect(sp.x, sp.y, gr.width, gr.height)
            ctx.strokeStyle = `rgba(250, 204, 21, ${0.8 * pulse})`
            ctx.lineWidth = 2.5
            ctx.setLineDash([10, 8])
            ctx.strokeRect(sp.x + 1, sp.y + 1, gr.width - 2, gr.height - 2)
            ctx.setLineDash([])
          } else {
            const alpha = Math.max(0, 1 - impactProgress * 0.85)
            ctx.globalAlpha = alpha
            ctx.fillStyle = '#FF0055'
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
          ctx.strokeStyle = '#F43F5E'
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

    // Boss / Mini-Boss Nameplate
    if (this.isBoss) {
      ctx.fillStyle = '#FFD700'
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
    if (healthPercent < 1 || this.isBoss || this.isMiniBoss) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
      ctx.fillRect(screenX - 1, screenY - 9, this.width + 2, 6)
      ctx.fillStyle = this.isBoss ? '#FFD700' : this.isMiniBoss ? '#F97316' : '#FF0055'
      ctx.fillRect(screenX, screenY - 8, this.width * healthPercent, 4)
    }

    // Enemy Laser / Arcane Projectiles
    for (const proj of this.projectiles) {
      const { x: projX, y: projY } = camera.worldToScreen(proj.x, proj.y)
      const angle = Math.atan2(proj.direction.y, proj.direction.x)
      ctx.save()
      ctx.translate(projX, projY)
      ctx.rotate(angle)
      ctx.fillStyle = proj.color
      ctx.beginPath()
      ctx.ellipse(0, 0, Math.max(4, proj.width * 0.8), Math.max(2, proj.height * 0.38), 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(2, 0, Math.max(1.5, proj.height * 0.2), 0, Math.PI * 2)
      ctx.fill()
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

export default Enemy
