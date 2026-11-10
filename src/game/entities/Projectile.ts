/**
 * Projectile Entity
 * Phase 7: Build the Game - Projectile System
 */

import { Vector2 } from '../utils/vector'
import { Camera } from '../engine/Camera'
import { UpgradesRow } from '../../types/database'

export type ProjectileType = 'Basic' | 'Rocket' | 'Laser' | 'Bouncing' | 'Tesla' | 'Sawblade' | 'Plasma'

export interface ProjectileOptions {
  x?: number
  y?: number
  width?: number
  height?: number
  speed?: number
  direction?: Vector2
  damage?: number
  color?: string
  lifetime?: number
  maxLifetime?: number
  type?: ProjectileType
  upgradeData?: UpgradesRow | null
  owner?: 'player' | 'enemy'
  bounceCount?: number
  maxBounces?: number
  pierceCount?: number
  maxPierces?: number
  homingTarget?: { x: number, y: number } | null
  homingStrength?: number
  explosionRadius?: number
}

export interface ProjectileHitInfo {
  x: number
  y: number
  damage: number
  explosion: boolean
  explosionRadius: number
}

export class Projectile {
  /** Position */
  x: number
  y: number
  
  /** Dimensions */
  width: number
  height: number
  
  /** Movement */
  speed: number
  baseSpeed: number
  direction: Vector2
  velocity: Vector2 = { x: 0, y: 0 }
  
  /** Damage */
  damage: number
  baseDamage: number
  
  /** Visual */
  color: string
  baseColor: string
  
  /** Lifetime */
  lifetime: number = 0
  maxLifetime: number = 5
  
  /** Type */
  type: ProjectileType = 'Basic'
  
  /** Upgrade data */
  upgradeData: UpgradesRow | null = null
  
  /** Owner */
  owner: 'player' | 'enemy' = 'player'
  
  /** Bouncing */
  bounceCount: number = 0
  maxBounces: number = 0
  
  /** Piercing */
  pierceCount: number = 0
  maxPierces: number = 0
  
  /** Homing */
  homingTarget: { x: number, y: number } | null = null
  homingStrength: number = 0
  
  /** Explosion */
  explosionRadius: number = 0
  
  /** State */
  isAlive: boolean = true
  isExploding: boolean = false
  explosionTimer: number = 0
  explosionDuration: number = 0.3
  
  /** Trail */
  trail: { x: number, y: number, lifetime: number }[] = []
  maxTrailLength: number = 10

  constructor(options: ProjectileOptions = {}) {
    this.x = options.x || 0
    this.y = options.y || 0
    this.width = options.width || 12
    this.height = options.height || 12
    this.baseSpeed = options.speed || 400
    this.speed = this.baseSpeed
    this.direction = options.direction || Vector2.create(1, 0)
    this.baseDamage = options.damage || 20
    this.damage = this.baseDamage
    this.baseColor = options.color || '#00F0FF'
    this.color = this.baseColor
    this.lifetime = options.lifetime || 0
    this.maxLifetime = options.maxLifetime || 5
    this.type = options.type || 'Basic'
    this.upgradeData = options.upgradeData || null
    this.owner = options.owner || 'player'
    this.bounceCount = options.bounceCount || 0
    this.maxBounces = options.maxBounces || 0
    this.pierceCount = options.pierceCount || 0
    this.maxPierces = options.maxPierces || 0
    this.homingTarget = options.homingTarget || null
    this.homingStrength = options.homingStrength || 0
    this.explosionRadius = options.explosionRadius || 0
    
    // Apply upgrade data if provided
    if (this.upgradeData) {
      this.applyUpgradeEffects()
    }
    
    // Set velocity from direction and speed
    this.velocity = Vector2.multiply(this.direction, this.speed)
  }

  /**
   * Apply upgrade effects to projectile
   */
  private applyUpgradeEffects(): void {
    if (!this.upgradeData) return
    
    switch (this.upgradeData.category) {
      case 'AoE Weapon':
        this.type = 'Rocket'
        this.color = '#FFD700'
        this.explosionRadius = 80
        this.width = 16
        this.height = 16
        break
      case 'Beam Weapon':
        this.type = 'Laser'
        this.color = '#00F0FF'
        this.width = 20
        this.height = 4
        this.maxLifetime = 0.5
        this.maxPierces = 3
        break
      case 'Projectile':
        this.type = 'Bouncing'
        this.color = '#FFD700'
        this.maxBounces = 5
        break
      case 'Ranged':
        this.type = 'Tesla'
        this.color = '#00F0FF'
        this.maxPierces = 5
        break
      case 'Summon':
        this.type = 'Plasma'
        this.color = '#FF0055'
        this.homingStrength = 200
        break
      case 'Heavy AoE':
        this.type = 'Rocket'
        this.color = '#FFD700'
        this.explosionRadius = 120
        this.damage *= 2
        this.width = 20
        this.height = 20
        break
      case 'Melee Weapon':
        this.type = 'Sawblade'
        this.color = '#FFD700'
        this.width = 24
        this.height = 24
        break
      default:
        this.type = 'Basic'
        this.color = '#00F0FF'
    }
    
    // Apply special effects
    if (this.upgradeData.special) {
      if (this.upgradeData.special.includes('bounces') || 
          this.upgradeData.special.includes('bounce')) {
        const bounces = parseInt(this.upgradeData.special) || 5
        this.maxBounces = bounces
      }
    }
  }

  /**
   * Update projectile state
   */
  update(deltaTime: number): void {
    if (!this.isAlive) return
    
    // Update lifetime
    this.lifetime += deltaTime
    
    // Check if expired
    if (this.lifetime >= this.maxLifetime) {
      this.isAlive = false
      if (this.explosionRadius > 0) {
        this.isExploding = true
        this.explosionTimer = 0
      }
      return
    }
    
    // Homing behavior
    if (this.homingTarget && this.homingStrength > 0) {
      const toTarget = Vector2.subtract(this.homingTarget, { x: this.x, y: this.y })
      const distance = Vector2.length(toTarget)
      
      if (distance > 0) {
        const normalized = Vector2.normalize(toTarget)
        // Blend between current direction and target direction
        this.direction = Vector2.normalize(
          Vector2.add(
            this.direction,
            Vector2.multiply(normalized, this.homingStrength * deltaTime)
          )
        )
        this.velocity = Vector2.multiply(this.direction, this.speed)
      }
    }
    
    // Apply velocity
    this.x += this.velocity.x * deltaTime
    this.y += this.velocity.y * deltaTime
    
    // Add to trail
    if (this.type === 'Laser' || this.type === 'Rocket') {
      this.trail.push({ x: this.x, y: this.y, lifetime: 0 })
      if (this.trail.length > this.maxTrailLength) {
        this.trail.shift()
      }
    }
    
    // Update trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].lifetime += deltaTime
      if (this.trail[i].lifetime > 0.5) {
        this.trail.splice(i, 1)
      }
    }
  }

  /**
   * Bounce projectile off a surface
   */
  bounce(normal: Vector2): void {
    if (this.bounceCount >= this.maxBounces) {
      this.isAlive = false
      if (this.explosionRadius > 0) {
        this.isExploding = true
        this.explosionTimer = 0
      }
      return
    }
    
    // Reflect direction off the normal
    const dot = Vector2.dot(this.direction, normal)
    this.direction = Vector2.subtract(
      this.direction,
      Vector2.multiply(normal, 2 * dot)
    )
    
    // Normalize direction
    this.direction = Vector2.normalize(this.direction)
    
    // Update velocity
    this.velocity = Vector2.multiply(this.direction, this.speed)
    
    // Increment bounce count
    this.bounceCount++
    
    // Visual feedback
    this.color = '#FFFFFF'
    setTimeout(() => {
      this.color = this.baseColor
    }, 50)
  }

  /**
   * Handle collision with entity
   */
  hitEntity(): boolean {
    if (this.pierceCount >= this.maxPierces) {
      this.isAlive = false
      if (this.explosionRadius > 0) {
        this.isExploding = true
        this.explosionTimer = 0
      }
      return true
    }
    
    this.pierceCount++
    
    // Visual feedback
    this.color = '#FFFFFF'
    setTimeout(() => {
      this.color = this.baseColor
    }, 50)
    
    return false
  }

  /**
   * Get hit info for damage calculation
   */
  getHitInfo(): ProjectileHitInfo {
    return {
      x: this.x,
      y: this.y,
      damage: this.damage,
      explosion: this.explosionRadius > 0,
      explosionRadius: this.explosionRadius
    }
  }

  /**
   * Update explosion animation
   */
  updateExplosion(deltaTime: number): boolean {
    if (!this.isExploding) return false
    
    this.explosionTimer += deltaTime
    if (this.explosionTimer >= this.explosionDuration) {
      this.isExploding = false
      return true
    }
    
    return false
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
   * Check collision with rectangle
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
   * Draw projectile on canvas
   */
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const { x: screenX, y: screenY } = camera.worldToScreen(this.x, this.y)
    
    // Draw trail
    for (const point of this.trail) {
      const { x: trailX, y: trailY } = camera.worldToScreen(point.x, point.y)
      const alpha = 1 - (point.lifetime / 0.5)
      ctx.globalAlpha = alpha * 0.5
      ctx.fillStyle = this.color
      ctx.beginPath()
      ctx.arc(trailX, trailY, this.width / 4, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.globalAlpha = 1
    
    // Draw projectile based on type
    switch (this.type) {
      case 'Laser':
        // Draw laser beam
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.rect(
          screenX - this.width / 2,
          screenY - this.height / 2,
          this.width,
          this.height
        )
        ctx.fill()
        
        // Laser glow effect
        ctx.fillStyle = 'rgba(0, 240, 255, 0.5)'
        ctx.beginPath()
        ctx.rect(
          screenX - this.width / 2 - 2,
          screenY - this.height / 2 - 2,
          this.width + 4,
          this.height + 4
        )
        ctx.fill()
        break
      
      case 'Rocket':
        // Draw rocket
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.moveTo(screenX + this.width / 2, screenY)
        ctx.lineTo(screenX + this.width / 4, screenY + this.height / 2)
        ctx.lineTo(screenX - this.width / 4, screenY + this.height / 2)
        ctx.closePath()
        ctx.fill()
        
        // Rocket flame
        ctx.fillStyle = '#FF5500'
        ctx.beginPath()
        ctx.moveTo(screenX + this.width / 2, screenY + this.height / 2)
        ctx.lineTo(screenX + this.width / 4, screenY + this.height)
        ctx.lineTo(screenX - this.width / 4, screenY + this.height)
        ctx.closePath()
        ctx.fill()
        break
      
      case 'Sawblade':
        // Draw sawblade
        ctx.fillStyle = '#888888'
        ctx.beginPath()
        ctx.arc(screenX, screenY, this.width / 2, 0, Math.PI * 2)
        ctx.fill()
        
        // Sawblade teeth
        ctx.strokeStyle = '#FFD700'
        ctx.lineWidth = 2
        ctx.beginPath()
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2
          const outerX = screenX + Math.cos(angle) * this.width / 2
          const outerY = screenY + Math.sin(angle) * this.width / 2
          const innerX = screenX + Math.cos(angle) * this.width / 3
          const innerY = screenY + Math.sin(angle) * this.width / 3
          
          if (i === 0) {
            ctx.moveTo(outerX, outerY)
          } else {
            ctx.lineTo(outerX, outerY)
          }
          ctx.lineTo(innerX, innerY)
        }
        ctx.closePath()
        ctx.stroke()
        
        // Center
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(screenX, screenY, this.width / 6, 0, Math.PI * 2)
        ctx.fill()
        break
      
      case 'Tesla':
        // Draw tesla arc
        ctx.strokeStyle = this.color
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(screenX, screenY)
        const endX = screenX + this.width * Math.cos(this.lifetime * 10)
        const endY = screenY + this.height * Math.sin(this.lifetime * 10)
        ctx.lineTo(endX, endY)
        ctx.stroke()
        
        // Tesla particles
        for (let i = 0; i < 3; i++) {
          const angle = this.lifetime * 5 + (i / 3) * Math.PI * 2
          const px = screenX + Math.cos(angle) * this.width
          const py = screenY + Math.sin(angle) * this.height
          ctx.fillStyle = this.color
          ctx.beginPath()
          ctx.arc(px, py, 3, 0, Math.PI * 2)
          ctx.fill()
        }
        break
      
      case 'Plasma':
        // Draw plasma ball
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(screenX, screenY, this.width / 2, 0, Math.PI * 2)
        ctx.fill()
        
        // Plasma glow
        ctx.fillStyle = 'rgba(255, 0, 85, 0.3)'
        ctx.beginPath()
        ctx.arc(screenX, screenY, this.width / 2 + 3, 0, Math.PI * 2)
        ctx.fill()
        break
      
      default:
        // Basic projectile - circle
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(screenX, screenY, this.width / 2, 0, Math.PI * 2)
        ctx.fill()
        
        // Outline
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 1
        ctx.stroke()
    }
    
    // Draw explosion
    if (this.isExploding) {
      const progress = this.explosionTimer / this.explosionDuration
      const radius = this.explosionRadius * progress
      
      ctx.fillStyle = 'rgba(255, 200, 0, ' + (1 - progress) + ')'
      ctx.beginPath()
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
      ctx.fill()
      
      // Explosion particles
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2
        const distance = radius * 0.8
        const px = screenX + Math.cos(angle) * distance
        const py = screenY + Math.sin(angle) * distance
        ctx.fillStyle = 'rgba(255, 100, 0, ' + (1 - progress) + ')'
        ctx.beginPath()
        ctx.arc(px, py, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  /**
   * Get projectile stats
   */
  getStats(): {
    damage: number
    speed: number
    type: ProjectileType
    lifetime: number
    maxLifetime: number
    isAlive: boolean
    owner: 'player' | 'enemy'
  } {
    return {
      damage: this.damage,
      speed: this.speed,
      type: this.type,
      lifetime: this.lifetime,
      maxLifetime: this.maxLifetime,
      isAlive: this.isAlive,
      owner: this.owner
    }
  }
}

export default Projectile
