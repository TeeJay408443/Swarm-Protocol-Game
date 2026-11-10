/**
 * Enemy Entity
 * Phase 7: Build the Game - Enemy System
 */

import { Vector2 } from '../utils/vector'
import { Camera } from '../engine/Camera'
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
  
  /** Spawning */
  spawnTime: number = 0
  spawnDelay: number = 0.5 // seconds of invulnerability after spawn
  isSpawning: boolean = true
  
  /** Death animation */
  isDying: boolean = false
  deathTimer: number = 0
  deathDuration: number = 0.5

  constructor(options: EnemyOptions = {}) {
    this.x = options.x || 0
    this.y = options.y || 0
    this.width = options.width || 30
    this.height = options.height || 30
    this.baseSpeed = options.speed || 50
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
      this.baseSpeed = this.enemyData.speed * 100
      this.speed = this.baseSpeed
      this.coinValue = this.enemyData.coin_value
      this.damage = this.enemyData.hp * 0.25 // Damage based on health
      
      // Determine type and behavior
      this.type = this.enemyData.category as EnemyType
      
      // Special behaviors based on type
      switch (this.type) {
        case 'Fast Flanker':
          this.color = '#FFD700' // Hazard gold
          this.movementPattern = 'zigzag'
          this.zigzagAmplitude = 80
          this.zigzagFrequency = 3
          break
        case 'Ranged Sniper':
          this.color = '#00F0FF' // Cyan
          this.movementPattern = 'flee'
          this.canShoot = true
          this.shootCooldownMax = 1.5
          this.attackRange = 300
          break
        case 'Mini-Boss':
        case 'Boss':
          this.isBoss = true
          this.color = '#FFD700' // Hazard gold for boss
          this.width = 50
          this.height = 50
          this.canShoot = true
          this.shootCooldownMax = 0.8
          this.attackRange = 400
          break
        default:
          this.color = '#FF0055' // Alert red for swarm
          this.movementPattern = 'chase'
      }
    }
    
    // Boss enemies get special treatment
    if (this.isBoss) {
      this.width = 60
      this.height = 60
      this.maxHealth *= 3
      this.health = this.maxHealth
      this.baseSpeed *= 0.7
      this.speed = this.baseSpeed
      this.damage *= 2
      this.coinValue *= 10
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
    
    // Update cooldowns
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
    
    // Apply velocity
    this.x += this.velocity.x * deltaTime
    this.y += this.velocity.y * deltaTime
    
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
   * Flee movement - away from target
   */
  private updateFlee(deltaTime: number): void {
    if (!this.target || !this.target.isAlive) {
      this.velocity = Vector2.zero()
      return
    }
    
    const direction = Vector2.normalize(
      Vector2.subtract(this.getCenter(), this.target.getCenter())
    )
    
    // Keep distance but don't flee too far
    const distance = Vector2.distance(this.getCenter(), this.target.getCenter())
    if (distance > this.attackRange * 1.5) {
      // Move toward target if too far
      this.velocity = Vector2.multiply(
        Vector2.normalize(
          Vector2.subtract(this.target.getCenter(), this.getCenter())
        ),
        this.speed * 0.5
      )
    } else {
      // Flee
      this.velocity = Vector2.multiply(direction, this.speed)
    }
    
    this.direction = Vector2.normalize(this.velocity)
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
   * Shoot projectile at target
   */
  private shoot(): void {
    if (!this.target || !this.canShoot) return
    
    const startPos = this.getCenter()
    const direction = Vector2.normalize(
      Vector2.subtract(this.target.getCenter(), startPos)
    )
    
    this.projectiles.push({
      x: startPos.x,
      y: startPos.y,
      width: 8,
      height: 8,
      speed: 300,
      direction: direction,
      damage: this.damage * 0.5,
      color: this.color,
      lifetime: 0,
      maxLifetime: 3 // seconds
    })
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
   * Clamp position to reasonable bounds
   */
  private clampToBounds(): void {
    const margin = 100
    this.x = Math.max(-margin, Math.min(this.x, 2000 + margin))
    this.y = Math.max(-margin, Math.min(this.y, 2000 + margin))
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
    
    // Visual feedback
    this.color = '#FFFFFF' // Flash white
    setTimeout(() => {
      this.color = this.baseColor
    }, 100)
    
    // Check if dead
    if (this.health <= 0) {
      this.isAlive = false
      this.isDying = true
      this.deathTimer = 0
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
   * Draw enemy on canvas
   */
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const { x: screenX, y: screenY } = camera.worldToScreen(this.x, this.y)
    
    // Draw spawning effect
    if (this.isSpawning) {
      const spawnProgress = this.spawnTime / this.spawnDelay
      ctx.globalAlpha = 0.5 + 0.5 * spawnProgress
    }
    
    // Draw enemy body
    ctx.fillStyle = this.color
    
    // Different shapes for different types
    switch (this.type) {
      case 'Fast Flanker':
        // Triangle shape
        ctx.beginPath()
        ctx.moveTo(screenX + this.width / 2, screenY)
        ctx.lineTo(screenX + this.width, screenY + this.height / 2)
        ctx.lineTo(screenX, screenY + this.height / 2)
        ctx.closePath()
        ctx.fill()
        break
      case 'Ranged Sniper':
        // Diamond shape
        ctx.beginPath()
        ctx.moveTo(screenX + this.width / 2, screenY)
        ctx.lineTo(screenX + this.width, screenY + this.height / 2)
        ctx.lineTo(screenX + this.width / 2, screenY + this.height)
        ctx.lineTo(screenX, screenY + this.height / 2)
        ctx.closePath()
        ctx.fill()
        break
      case 'Mini-Boss':
      case 'Boss':
        // Hexagon shape for boss
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2
          const px = screenX + this.width / 2 + Math.cos(angle) * this.width / 2 * 0.8
          const py = screenY + this.height / 2 + Math.sin(angle) * this.height / 2 * 0.8
          if (i === 0) {
            ctx.moveTo(px, py)
          } else {
            ctx.lineTo(px, py)
          }
        }
        ctx.closePath()
        ctx.fill()
        break
      default:
        // Circle for swarm
        ctx.beginPath()
        ctx.arc(
          screenX + this.width / 2,
          screenY + this.height / 2,
          this.width / 2,
          0,
          Math.PI * 2
        )
        ctx.fill()
    }
    
    // Draw outline
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Draw boss indicator
    if (this.isBoss) {
      ctx.fillStyle = '#FFD700'
      ctx.font = 'bold 12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('BOSS', screenX + this.width / 2, screenY - 15)
    }
    
    // Draw health bar
    const healthPercent = this.health / this.maxHealth
    ctx.fillStyle = '#FF0055'
    ctx.fillRect(
      screenX,
      screenY - 8,
      this.width * healthPercent,
      4
    )
    
    // Draw projectiles
    for (const proj of this.projectiles) {
      const { x: projX, y: projY } = camera.worldToScreen(proj.x, proj.y)
      ctx.fillStyle = proj.color
      ctx.beginPath()
      ctx.arc(projX, projY, proj.width / 2, 0, Math.PI * 2)
      ctx.fill()
    }
    
    // Draw death animation
    if (this.isDying) {
      const deathProgress = this.deathTimer / this.deathDuration
      ctx.globalAlpha = 1 - deathProgress
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(
        screenX + this.width / 2,
        screenY + this.height / 2,
        this.width / 2 * (1 + deathProgress * 0.5),
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
    
    ctx.globalAlpha = 1
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

export default Enemy
