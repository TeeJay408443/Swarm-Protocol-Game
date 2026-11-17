/**
 * Projectile Entity
 * Phase 7: Build the Game - Projectile System
 */

import { Vector2 } from '../utils/vector'
import { Camera } from '../engine/Camera'
import { UpgradesRow } from '../../types/database'

export type ProjectileType =
  | 'Basic'
  | 'Rocket'
  | 'Laser'
  | 'Bouncing'
  | 'Tesla'
  | 'Sawblade'
  | 'Plasma'
  | 'Flame'
  | 'Fireball'
  | 'IceShard'
  | 'ChronoBlade'

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
  burnRadius?: number
  burnDuration?: number
  burnDamage?: number
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
  
  /** Explosion & Burn Zone */
  explosionRadius: number = 0
  burnRadius: number = 0
  burnDuration: number = 0
  burnDamage: number = 0
  
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
    this.burnRadius = options.burnRadius || 0
    this.burnDuration = options.burnDuration || 0
    this.burnDamage = options.burnDamage || 0
    
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
    if (
      this.type === 'Laser' ||
      this.type === 'Rocket' ||
      this.type === 'Flame' ||
      this.type === 'Fireball' ||
      this.type === 'IceShard' ||
      this.type === 'ChronoBlade'
    ) {
      this.trail.push({ x: this.x, y: this.y, lifetime: 0 })
      if (this.trail.length > this.maxTrailLength) {
        this.trail.shift()
      }
    }
    
    // Update trail
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].lifetime += deltaTime
      if (this.trail[i].lifetime > 0.42) {
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
   * Draw detailed rotated projectile sprite on canvas
   */
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const { x: screenX, y: screenY } = camera.worldToScreen(this.x, this.y)
    const angle = Math.atan2(this.direction.y, this.direction.x)

    // Draw attack-specific trails
    for (let i = 0; i < this.trail.length; i++) {
      const point = this.trail[i]
      const { x: trailX, y: trailY } = camera.worldToScreen(point.x, point.y)
      const lifeRatio = Math.min(1, point.lifetime / 0.42)
      const alpha = Math.max(0, (1 - lifeRatio) * 0.5)

      if (this.type === 'Flame' || this.type === 'Fireball') {
        // Rising ember sparks & smoke wisps
        const emberR = Math.max(1.4, (this.width * 0.3) * (1 - lifeRatio * 0.68))
        ctx.globalAlpha = alpha * 0.85
        ctx.fillStyle = lifeRatio > 0.5 ? '#991B1B' : '#F97316'
        ctx.beginPath()
        ctx.arc(trailX, trailY - lifeRatio * 7, emberR, 0, Math.PI * 2)
        ctx.fill()
      } else if (this.type === 'IceShard') {
        // Diamond frost crystal sparkles
        const r = Math.max(1.5, (this.width * 0.22) * (1 - lifeRatio))
        ctx.save()
        ctx.translate(trailX, trailY)
        ctx.rotate(point.lifetime * 6)
        ctx.globalAlpha = alpha * 0.85
        ctx.fillStyle = '#A5F3FC'
        ctx.fillRect(-r, -r, r * 2, r * 2)
        ctx.restore()
      } else if (this.type === 'Rocket') {
        // Expanding white-gray smoke puffs
        const r = Math.max(1.5, 2.5 + lifeRatio * 5.5)
        ctx.globalAlpha = alpha * 0.45
        ctx.fillStyle = '#CBD5E1'
        ctx.beginPath()
        ctx.arc(trailX, trailY, r, 0, Math.PI * 2)
        ctx.fill()
      } else {
        const r = Math.max(0.8, (this.width / 4.5) * (1 - lifeRatio))
        ctx.globalAlpha = alpha
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(trailX, trailY, r, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1

    ctx.save()
    ctx.translate(screenX, screenY)

    switch (this.type) {
      case 'Flame': {
        // Animated roaring flame plume / fire tongue cone
        ctx.rotate(angle)
        const scale = Math.max(14, this.width)
        const expand = 0.75 + Math.min(0.9, this.lifetime * 1.9)
        const len = scale * 1.45 * expand
        const halfW = scale * 0.52 * expand
        const flicker = Math.sin(this.lifetime * 42 + this.x * 0.1) * (halfW * 0.24)
        const flicker2 = Math.cos(this.lifetime * 35 + this.y * 0.1) * (halfW * 0.22)

        // Outer crimson-orange roaring fire envelope
        ctx.fillStyle = 'rgba(239, 68, 68, 0.88)'
        ctx.beginPath()
        ctx.moveTo(-len * 0.55, 0)
        ctx.quadraticCurveTo(-len * 0.1, -halfW * 1.15 + flicker, len * 0.52, -halfW * 0.35 + flicker2)
        ctx.quadraticCurveTo(len * 0.82, flicker * 0.4, len * 0.55, halfW * 0.35 - flicker)
        ctx.quadraticCurveTo(-len * 0.1, halfW * 1.15 - flicker2, -len * 0.55, 0)
        ctx.closePath()
        ctx.fill()

        // Mid amber-orange flame tongue
        ctx.fillStyle = this.color === '#FACC15' ? '#FB923C' : '#F97316'
        ctx.beginPath()
        ctx.moveTo(-len * 0.4, 0)
        ctx.quadraticCurveTo(0, -halfW * 0.75 - flicker * 0.5, len * 0.46, -halfW * 0.15)
        ctx.quadraticCurveTo(len * 0.65, 0, len * 0.46, halfW * 0.15)
        ctx.quadraticCurveTo(0, halfW * 0.75 + flicker * 0.5, -len * 0.4, 0)
        ctx.closePath()
        ctx.fill()

        // Inner white-yellow incandescent core
        ctx.fillStyle = '#FEF08A'
        ctx.beginPath()
        ctx.moveTo(-len * 0.25, 0)
        ctx.quadraticCurveTo(len * 0.08, -halfW * 0.36, len * 0.36, 0)
        ctx.quadraticCurveTo(len * 0.08, halfW * 0.36, -len * 0.25, 0)
        ctx.closePath()
        ctx.fill()
        break
      }

      case 'Fireball': {
        // Roaring hurled fireball with sweeping crimson-orange tail and solar core
        ctx.rotate(angle)
        const r = Math.max(8, this.width * 0.55)
        const wave = Math.sin(this.lifetime * 38) * (r * 0.28)

        // Blazing comet tail sweeping backward
        ctx.fillStyle = 'rgba(239, 68, 68, 0.85)'
        ctx.beginPath()
        ctx.moveTo(r * 0.7, -r * 0.85)
        ctx.quadraticCurveTo(-r * 0.4, -r * 1.15 + wave, -r * 2.25, wave * 0.45)
        ctx.quadraticCurveTo(-r * 0.4, r * 1.15 - wave, r * 0.7, r * 0.85)
        ctx.arc(0, 0, r * 0.92, Math.PI * 0.45, -Math.PI * 0.45, true)
        ctx.closePath()
        ctx.fill()

        // Mid amber fireball crown
        ctx.fillStyle = this.color === '#FACC15' ? '#FB923C' : '#F97316'
        ctx.beginPath()
        ctx.moveTo(r * 0.65, -r * 0.55)
        ctx.quadraticCurveTo(-r * 0.25, -r * 0.78 - wave * 0.4, -r * 1.5, 0)
        ctx.quadraticCurveTo(-r * 0.25, r * 0.78 + wave * 0.4, r * 0.65, r * 0.55)
        ctx.arc(0, 0, r * 0.72, Math.PI * 0.42, -Math.PI * 0.42, true)
        ctx.closePath()
        ctx.fill()

        // Incandescent white-gold magma heart
        ctx.fillStyle = '#FEF08A'
        ctx.beginPath()
        ctx.arc(r * 0.14, 0, Math.max(3, r * 0.46), 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'IceShard': {
        // Faceted crystalline ice spearhead
        ctx.rotate(angle)
        const s = Math.max(10, this.width * 0.9)
        // Outer crystal glow
        ctx.fillStyle = 'rgba(34, 211, 238, 0.28)'
        ctx.beginPath()
        ctx.moveTo(s * 1.3, 0)
        ctx.lineTo(-s * 0.2, -s * 0.58)
        ctx.lineTo(-s * 0.95, 0)
        ctx.lineTo(-s * 0.2, s * 0.58)
        ctx.closePath()
        ctx.fill()

        // Sharp crystal body
        ctx.fillStyle = this.color
        ctx.strokeStyle = '#ECFEFF'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(s * 1.1, 0)
        ctx.lineTo(0, -s * 0.38)
        ctx.lineTo(-s * 0.75, -s * 0.2)
        ctx.lineTo(-s * 0.45, 0)
        ctx.lineTo(-s * 0.75, s * 0.2)
        ctx.lineTo(0, s * 0.38)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Specular ice facet ridge
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.moveTo(s * 0.95, 0)
        ctx.lineTo(0, -s * 0.16)
        ctx.lineTo(-s * 0.35, 0)
        ctx.closePath()
        ctx.fill()
        break
      }

      case 'ChronoBlade': {
        // Sweeping temporal phase crescent / energy sickle
        ctx.rotate(angle)
        const r = Math.max(9, this.width * 0.72)

        // Outer phase crescent
        ctx.fillStyle = this.color
        ctx.strokeStyle = '#00F0FF'
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.arc(0, 0, r, -Math.PI * 0.45, Math.PI * 0.45)
        ctx.quadraticCurveTo(r * 0.15, 0, Math.cos(-Math.PI * 0.45) * r, Math.sin(-Math.PI * 0.45) * r)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Inner bright phase edge
        ctx.strokeStyle = '#FFFFFF'
        ctx.lineWidth = 1.6
        ctx.beginPath()
        ctx.arc(0, 0, r * 0.85, -Math.PI * 0.32, Math.PI * 0.32)
        ctx.stroke()
        break
      }

      case 'Laser': {
        ctx.rotate(angle)
        const len = Math.max(20, this.width * 1.45)
        const thick = Math.max(3.5, Math.min(6, this.height * 0.48))
        // Outer beam aura
        ctx.fillStyle = this.color === '#FFD700' ? 'rgba(255, 215, 0, 0.35)' : 'rgba(0, 240, 255, 0.35)'
        ctx.beginPath()
        ctx.moveTo(len * 0.65, 0)
        ctx.lineTo(-len * 0.5, -thick * 1.25)
        ctx.lineTo(-len * 0.65, 0)
        ctx.lineTo(-len * 0.5, thick * 1.25)
        ctx.closePath()
        ctx.fill()

        // Crisp pointed energy lance core
        ctx.fillStyle = this.color === '#FFD700' ? '#FEF08A' : '#E0F2FE'
        ctx.beginPath()
        ctx.moveTo(len * 0.58, 0)
        ctx.lineTo(-len * 0.45, -thick * 0.55)
        ctx.lineTo(-len * 0.52, 0)
        ctx.lineTo(-len * 0.45, thick * 0.55)
        ctx.closePath()
        ctx.fill()
        break
      }

      case 'Rocket': {
        ctx.rotate(angle)
        const rw = Math.max(16, this.width)
        // Supersonic afterburner cone
        const flicker = 8 + Math.sin(this.lifetime * 48) * 3.5
        ctx.fillStyle = '#FB923C'
        ctx.beginPath()
        ctx.moveTo(-rw * 0.45, -4)
        ctx.lineTo(-rw * 0.45 - flicker, 0)
        ctx.lineTo(-rw * 0.45, 4)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#FEF08A'
        ctx.beginPath()
        ctx.moveTo(-rw * 0.45, -2)
        ctx.lineTo(-rw * 0.45 - flicker * 0.55, 0)
        ctx.lineTo(-rw * 0.45, 2)
        ctx.closePath()
        ctx.fill()

        // Delta stabilizer fins
        ctx.fillStyle = '#991B1B'
        ctx.beginPath()
        ctx.moveTo(-rw * 0.48, -4)
        ctx.lineTo(-rw * 0.62, -8)
        ctx.lineTo(-rw * 0.15, -4)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.moveTo(-rw * 0.48, 4)
        ctx.lineTo(-rw * 0.62, 8)
        ctx.lineTo(-rw * 0.15, 4)
        ctx.closePath()
        ctx.fill()

        // Missile fuselage & warhead cone
        ctx.fillStyle = '#334155'
        ctx.fillRect(-rw * 0.45, -4, rw * 0.68, 8)
        ctx.fillStyle = this.color === '#FFD700' ? '#FFD700' : '#FF0055'
        ctx.beginPath()
        ctx.moveTo(rw * 0.23, -4.2)
        ctx.lineTo(rw * 0.72, 0)
        ctx.lineTo(rw * 0.23, 4.2)
        ctx.closePath()
        ctx.fill()
        break
      }

      case 'Sawblade': {
        const spin = this.lifetime * 20
        const sr = Math.max(9, this.width / 2)
        ctx.rotate(spin)

        // Metallic serrated teeth
        ctx.fillStyle = '#CBD5E1'
        ctx.strokeStyle = '#FFD700'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        const teeth = 8
        for (let i = 0; i < teeth * 2; i++) {
          const a = (i / (teeth * 2)) * Math.PI * 2
          const rad = i % 2 === 0 ? sr + 2.5 : sr * 0.62
          const px = Math.cos(a) * rad
          const py = Math.sin(a) * rad
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Glowing inner bearing
        ctx.fillStyle = '#0F172A'
        ctx.beginPath()
        ctx.arc(0, 0, Math.max(2, sr * 0.35), 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#00F0FF'
        ctx.beginPath()
        ctx.arc(0, 0, Math.max(1.2, sr * 0.18), 0, Math.PI * 2)
        ctx.fill()
        break
      }

      case 'Tesla': {
        ctx.rotate(angle)
        ctx.strokeStyle = this.color
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(-12, 0)
        ctx.lineTo(-4, Math.sin(this.lifetime * 40) * 5)
        ctx.lineTo(4, -Math.sin(this.lifetime * 40) * 5)
        ctx.lineTo(14, 0)
        ctx.stroke()
        break
      }

      case 'Plasma': {
        // Pointed star-bolt plasma dart instead of plain sphere
        ctx.rotate(angle)
        const pr = Math.max(6, this.width * 0.6)
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.moveTo(pr * 1.5, 0)
        ctx.lineTo(0, -pr * 0.65)
        ctx.lineTo(-pr * 1.1, 0)
        ctx.lineTo(0, pr * 0.65)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.moveTo(pr * 1.0, 0)
        ctx.lineTo(0, -pr * 0.28)
        ctx.lineTo(-pr * 0.55, 0)
        ctx.lineTo(0, pr * 0.28)
        ctx.closePath()
        ctx.fill()
        break
      }

      default: {
        // Tapered copper/gold kinetic bullet slug + muzzle streak
        ctx.rotate(angle)
        const r = Math.max(4.5, this.width / 2)
        // Tracer wake
        ctx.strokeStyle = this.color
        ctx.globalAlpha = 0.45
        ctx.lineWidth = 2.2
        ctx.beginPath()
        ctx.moveTo(-r * 2.4, 0)
        ctx.lineTo(-r * 0.4, 0)
        ctx.stroke()
        ctx.globalAlpha = 1

        // Bullet silhouette
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.moveTo(r * 1.45, 0)
        ctx.lineTo(r * 0.2, -r * 0.52)
        ctx.lineTo(-r * 0.9, -r * 0.48)
        ctx.lineTo(-r * 0.9, r * 0.48)
        ctx.lineTo(r * 0.2, r * 0.52)
        ctx.closePath()
        ctx.fill()

        ctx.fillStyle = '#FFFFFF'
        ctx.beginPath()
        ctx.moveTo(r * 1.15, 0)
        ctx.lineTo(0, -r * 0.2)
        ctx.lineTo(0, r * 0.2)
        ctx.closePath()
        ctx.fill()
      }
    }

    ctx.restore()

    // Draw explosion wave
    if (this.isExploding) {
      const progress = Math.min(1, Math.max(0, this.explosionTimer / this.explosionDuration))
      const radius = Math.max(1, this.explosionRadius * progress)

      ctx.save()
      ctx.globalAlpha = Math.max(0, 1 - progress)
      ctx.fillStyle = 'rgba(255, 190, 0, 0.55)'
      ctx.beginPath()
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = '#FFD700'
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.restore()
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
