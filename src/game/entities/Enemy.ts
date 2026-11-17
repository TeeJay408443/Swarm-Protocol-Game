/**
 * Enemy Entity
 * Phase 7: Build the Game - Enemy System
 */

import { Vector2 } from '../utils/vector'
import { Camera } from '../engine/Camera'
import { GAME_CONFIG } from '../../config/gameConstants'
import { EnemiesRow } from '../../types/database'
import { Player } from './Player'

export type EnemyType = 'Swarm' | 'Fast Flanker' | 'Ranged Sniper' | 'Mini-Boss' | 'Boss'

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
}

export type BossAttackKind = 'orbital_slam' | 'mega_laser' | 'bombardment_ring'

export interface BossTelegraphAttack {
  id: string
  kind: BossAttackKind
  x: number
  y: number
  endX?: number
  endY?: number
  angle?: number
  radius: number
  length?: number
  subTargets?: Array<{ x: number; y: number; radius: number }>
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
  type: EnemyType = 'Swarm'
  
  /** State */
  isAlive: boolean = true
  isActive: boolean = true
  isBoss: boolean = false
  
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

  /** Boss telegraphed big attacks */
  telegraphs: BossTelegraphAttack[] = []
  specialCooldown: number = 2.0
  specialCooldownMax: number = 3.6
  bossTier: number = 1
  bossTitle: string = 'AEGIS COMMANDER'
  private specialAttackCounter: number = 0
  
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
    this.isBoss = options.isBoss || false
    
    // Apply enemy data if provided
    if (this.enemyData) {
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
        case 'Fast Flanker':
          this.color = '#FFD700' // Hazard gold
          this.baseColor = '#FFD700'
          this.movementPattern = 'zigzag'
          this.zigzagAmplitude = 80
          this.zigzagFrequency = 3
          break
        case 'Ranged Sniper':
          this.color = '#00F0FF' // Cyan
          this.baseColor = '#00F0FF'
          this.movementPattern = 'flee'
          this.canShoot = true
          this.shootCooldownMax = 2.0
          this.attackRange = 300
          this.zigzagDirection = Math.random() < 0.5 ? 1 : -1
          break
        case 'Mini-Boss':
        case 'Boss':
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
    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= deltaTime
      if (this.hitFlashTimer <= 0) {
        this.color = this.baseColor
      }
    }
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime
    }
    
    if (this.shootCooldown > 0) {
      this.shootCooldown -= deltaTime
    }
    
    // Movement pattern
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

    if (this.target) {
      const tc = this.target.getCenter()
      const mc = this.getCenter()
      this.facingAngle = Math.atan2(tc.y - mc.y, tc.x - mc.x)
    } else if (Math.hypot(this.velocity.x, this.velocity.y) > 1) {
      this.facingAngle = Math.atan2(this.velocity.y, this.velocity.x)
    }
    
    // Apply velocity with cryo slow multiplier
    this.x += this.velocity.x * this.slowMultiplier * deltaTime
    this.y += this.velocity.y * this.slowMultiplier * deltaTime
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

    // Boss big telegraphed dodgeable attacks
    if (this.isBoss) {
      this.updateTelegraphs(deltaTime)
      if (this.specialCooldown > 0) {
        this.specialCooldown -= deltaTime
      }
      if (this.specialCooldown <= 0 && this.target && this.target.isAlive) {
        const distToTarget = Vector2.distance(this.getCenter(), this.target.getCenter())
        if (distToTarget <= 560) {
          this.spawnTelegraphedAttack()
          this.specialCooldown = Math.max(2.6, this.specialCooldownMax - (this.bossTier - 1) * 0.15)
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
      const radialDamage = Math.round(14 * Math.max(1, this.damageScale))
      const volleyDamage = Math.round(16 * Math.max(1, this.damageScale))
      if (this.attackPatternIndex % 2 === 1) {
        // Radial 8-bullet burst
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2
          this.projectiles.push({
            x: startPos.x,
            y: startPos.y,
            width: 10,
            height: 10,
            speed: 250,
            direction: { x: Math.cos(angle), y: Math.sin(angle) },
            damage: radialDamage,
            color: '#FFD700',
            lifetime: 0,
            maxLifetime: 3.5
          })
        }
      } else {
        // 3-bolt aimed laser spread
        const baseAngle = Math.atan2(direction.y, direction.x)
        for (const offset of [-0.18, 0, 0.18]) {
          const a = baseAngle + offset
          this.projectiles.push({
            x: startPos.x,
            y: startPos.y,
            width: 10,
            height: 10,
            speed: 340,
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
    
    // Aegis Tech Drone red laser bolt
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
   * Spawns a large telegraphed boss attack with clear floor/beam warning indicators
   */
  spawnTelegraphedAttack(forcedKind?: BossAttackKind): BossTelegraphAttack | null {
    if (!this.target) return null

    this.specialAttackCounter++
    const kinds: BossAttackKind[] = ['orbital_slam', 'mega_laser', 'bombardment_ring']
    const kind = forcedKind || kinds[(this.specialAttackCounter - 1) % kinds.length]
    const bossCenter = this.getCenter()
    const targetCenter = this.target.getCenter()
    const id = `boss_atk_${Date.now()}_${this.specialAttackCounter}`
    const tierBoost = Math.max(0, this.bossTier - 1)

    let telegraph: BossTelegraphAttack

    if (kind === 'mega_laser') {
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
        radius: 32 + Math.min(10, tierBoost * 2), // Half-width of laser lane (64px+ wide beam)
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
      const subTargets: Array<{ x: number; y: number; radius: number }> = [
        { x: targetCenter.x, y: targetCenter.y, radius: zoneRadius }
      ]
      for (let i = 1; i < zoneCount; i++) {
        const a = ((i - 1) / (zoneCount - 1)) * Math.PI * 2 + this.specialAttackCounter * 0.5
        const dist = 145 + (i % 2) * 35
        subTargets.push({
          x: Math.max(80, Math.min(1920, targetCenter.x + Math.cos(a) * dist)),
          y: Math.max(80, Math.min(1920, targetCenter.y + Math.sin(a) * dist)),
          radius: zoneRadius
        })
      }
      telegraph = {
        id,
        kind: 'bombardment_ring',
        x: targetCenter.x,
        y: targetCenter.y,
        radius: zoneRadius,
        subTargets,
        chargeTimer: 0,
        chargeDuration: 1.5,
        activeTimer: 0,
        activeDuration: 0.4,
        damage: Math.round(28 * Math.max(1, this.damageScale)),
        hasTriggered: false,
        hasDamagedPlayer: false
      }
    } else {
      // Orbital Shockwave Slam
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
   * Advances telegraph windup timers and active impact visuals
   */
  private updateTelegraphs(deltaTime: number): void {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i]
      if (!t.hasTriggered) {
        t.chargeTimer += deltaTime
        if (t.chargeTimer >= t.chargeDuration) {
          t.chargeTimer = t.chargeDuration
          t.hasTriggered = true
          t.activeTimer = 0
        }
      } else {
        t.activeTimer += deltaTime
        if (t.activeTimer >= t.activeDuration) {
          this.telegraphs.splice(i, 1)
        }
      }
    }
  }

  /**
   * Update all projectiles
   */
  private updateProjectiles(deltaTime: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i]
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
    
    this.health -= amount
    if (this.health < 0) this.health = 0
    
    // Visual feedback via frame-safe timer
    this.color = '#FFFFFF'
    this.hitFlashTimer = 0.08
    
    // Check if dead
    if (this.health <= 0) {
      this.isAlive = false
      this.isDying = true
      this.deathTimer = 0
      this.telegraphs = []
      return true
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
   * Draw telegraphed boss attack warning indicators & detonations on the arena floor
   */
  drawTelegraphs(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!this.isAlive || this.telegraphs.length === 0) return

    for (const t of this.telegraphs) {
      const chargeProgress = Math.max(0, Math.min(1, t.chargeTimer / t.chargeDuration))
      const impactProgress = t.hasTriggered
        ? Math.max(0, Math.min(1, t.activeTimer / t.activeDuration))
        : 0

      if (t.kind === 'mega_laser') {
        const start = camera.worldToScreen(t.x, t.y)
        const angle = t.angle ?? 0
        const len = t.length ?? 660
        const halfW = Math.max(8, t.radius)

        ctx.save()
        ctx.translate(start.x, start.y)
        ctx.rotate(angle)

        if (!t.hasTriggered) {
          const pulse = 0.7 + 0.3 * Math.sin(this.animTime * 22)
          // Red danger corridor background
          ctx.fillStyle = `rgba(255, 0, 85, ${0.14 + chargeProgress * 0.14})`
          ctx.fillRect(0, -halfW, len, halfW * 2)

          // Expanding inner charge bar showing when laser fires
          ctx.fillStyle = `rgba(250, 204, 21, ${0.22 + chargeProgress * 0.25})`
          const innerH = Math.max(2, halfW * 2 * chargeProgress)
          ctx.fillRect(0, -innerH / 2, len, innerH)

          // Dashed danger rails
          ctx.strokeStyle = `rgba(255, 0, 85, ${0.65 * pulse})`
          ctx.lineWidth = 2.5
          ctx.setLineDash([12, 8])
          ctx.strokeRect(0, -halfW, len, halfW * 2)
          ctx.setLineDash([])

          // Center laser sightline
          ctx.strokeStyle = '#FACC15'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(0, 0)
          ctx.lineTo(len, 0)
          ctx.stroke()

          // Warning label along corridor
          ctx.fillStyle = '#FEF08A'
          ctx.font = 'bold 12px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('⚠ MEGA LASER - DODGE!', Math.min(260, len * 0.45), -halfW - 8)
        } else {
          // Active hyper-laser blast
          const alpha = Math.max(0, 1 - impactProgress)
          ctx.globalAlpha = alpha
          ctx.fillStyle = '#FF0055'
          ctx.fillRect(0, -halfW * 1.15, len, halfW * 2.3)
          ctx.fillStyle = '#FACC15'
          ctx.fillRect(0, -halfW * 0.72, len, halfW * 1.44)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, -halfW * 0.36, len, halfW * 0.72)
        }
        ctx.restore()
      } else {
        const zones =
          t.kind === 'bombardment_ring' && t.subTargets && t.subTargets.length > 0
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
                t.kind === 'orbital_slam' ? '⚠ ORBITAL SLAM!' : '⚠ BARRAGE ZONE!',
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
      case 'Fast Flanker': {
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

      case 'Mini-Boss':
      case 'Boss': {
        // Aegis Commander Drone: octagonal dreadnought hull + 4 orbiting shield pylons + pulsing core
        ctx.fillStyle = isFlashing ? '#FFFFFF' : '#1E1B4B'
        ctx.strokeStyle = '#FFD700'
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

    // Boss charging indicator ring around boss chassis
    if (this.isBoss && this.telegraphs.some((t) => !t.hasTriggered)) {
      ctx.strokeStyle = '#FF0055'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, Math.max(4, r + 11 + Math.sin(this.animTime * 18) * 3), 0, Math.PI * 2)
      ctx.stroke()
    }

    // Boss Nameplate
    if (this.isBoss) {
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 11px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(this.bossTitle || 'COMMANDER BOSS', cx, screenY - 14)
    }

    // Health bar with dark backing
    const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth))
    if (healthPercent < 1 || this.isBoss) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
      ctx.fillRect(screenX - 1, screenY - 9, this.width + 2, 6)
      ctx.fillStyle = this.isBoss ? '#FFD700' : '#FF0055'
      ctx.fillRect(screenX, screenY - 8, this.width * healthPercent, 4)
    }

    // Enemy Laser Projectiles
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
 * Checks whether a player circle is caught inside a triggered boss telegraphed attack
 */
export function checkBossTelegraphHit(
  telegraph: BossTelegraphAttack,
  targetCircle: { x: number; y: number; radius: number }
): boolean {
  if (telegraph.kind === 'mega_laser') {
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
    telegraph.kind === 'bombardment_ring' && telegraph.subTargets && telegraph.subTargets.length > 0
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
      const invMassA = a.isBoss ? 0.2 : 1.0
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

            const invMassB = b.isBoss ? 0.2 : 1.0
            const totalInvMass = invMassA + invMassB
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
    e.x = Math.max(padding, Math.min(e.x, arenaSize - e.width - padding))
    e.y = Math.max(padding, Math.min(e.y, arenaSize - e.height - padding))
  }
}

export default Enemy
