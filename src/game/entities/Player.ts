/**
 * Player Entity
 * Phase 7: Build the Game - Player Character
 */

import { Vector2 } from '../utils/vector'
import { Camera } from '../engine/Camera'
import { GAME_CONFIG } from '../../config/gameConstants'
import { HeroesRow } from '../../types/database'

export interface PlayerOptions {
  x?: number
  y?: number
  width?: number
  height?: number
  speed?: number
  color?: string
  maxHealth?: number
  hero?: HeroesRow
}

export class Player {
  /** Position */
  x: number
  y: number
  
  /** Dimensions */
  width: number
  height: number
  
  /** Movement */
  speed: number
  velocity: Vector2 = { x: 0, y: 0 }
  
  /** Visual */
  color: string
  
  /** Health */
  health: number
  maxHealth: number
  
  /** Hero data */
  hero: HeroesRow | null
  
  /** State */
  isAlive: boolean = true
  isInvulnerable: boolean = false
  invulnerabilityTimer: number = 0
  invulnerabilityDuration: number = 1 // seconds
  
  /** Combat */
  attackCooldown: number = 0
  attackCooldownMax: number = 0.5 // seconds
  
  /** Targeting & animation */
  targetPosition: Vector2 | null = null
  facingAngle: number = 0
  animTime: number = 0
  isMoving: boolean = false

  constructor(options: PlayerOptions = {}) {
    this.x = options.x || 0
    this.y = options.y || 0
    this.width = options.width || 40
    this.height = options.height || 40
    this.speed = options.speed || GAME_CONFIG.BASE_PLAYER_SPEED // 220 pixels per second
    this.color = options.color || '#00F0FF' // Cyan
    this.maxHealth = options.maxHealth || 100
    this.health = this.maxHealth
    this.hero = options.hero || null
    
    // If hero is provided, use its stats (speed multiplier * BASE_PLAYER_SPEED = 220 px/s)
    if (this.hero) {
      this.maxHealth = this.hero.hp
      this.health = this.maxHealth
      this.speed = this.hero.speed * GAME_CONFIG.BASE_PLAYER_SPEED
    }
  }

  /**
   * Update player state
   */
  update(movement: Vector2, deltaTime: number): void {
    if (!this.isAlive) return

    this.animTime += deltaTime
    const moveMag = Math.hypot(movement.x, movement.y)
    this.isMoving = moveMag > 0.05

    if (this.isMoving) {
      this.facingAngle = Math.atan2(movement.y, movement.x)
    } else if (this.targetPosition) {
      const c = this.getCenter()
      this.facingAngle = Math.atan2(this.targetPosition.y - c.y, this.targetPosition.x - c.x)
    }
    
    // Apply movement
    this.velocity = Vector2.multiply(movement, this.speed)
    this.x = Math.max(0, Math.min(2000 - this.width, this.x + this.velocity.x * deltaTime))
    this.y = Math.max(0, Math.min(2000 - this.height, this.y + this.velocity.y * deltaTime))
    
    // Update cooldowns
    if (this.attackCooldown > 0) {
      this.attackCooldown -= deltaTime
    }
    
    // Update invulnerability
    if (this.isInvulnerable) {
      this.invulnerabilityTimer -= deltaTime
      if (this.invulnerabilityTimer <= 0) {
        this.isInvulnerable = false
      }
    }
  }

  /**
   * Set player position
   */
  setPosition(x: number, y: number): void {
    this.x = x
    this.y = y
  }

  /**
   * Get player position
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
    if (!this.isAlive || this.isInvulnerable) return false
    
    this.health -= amount
    if (this.health < 0) this.health = 0
    
    // Make invulnerable briefly
    this.isInvulnerable = true
    this.invulnerabilityTimer = this.invulnerabilityDuration
    
    // Check if dead
    if (this.health <= 0) {
      this.isAlive = false
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
   * Resurrect
   */
  resurrect(): void {
    this.isAlive = true
    this.health = this.maxHealth
    this.isInvulnerable = false
    this.invulnerabilityTimer = 0
  }

  /**
   * Attack
   */
  attack(): boolean {
    if (!this.isAlive) return false
    if (this.attackCooldown > 0) return false
    
    this.attackCooldown = this.attackCooldownMax
    return true
  }

  /**
   * Set target position for auto-targeting
   */
  setTarget(x: number, y: number): void {
    this.targetPosition = { x, y }
  }

  /**
   * Clear target
   */
  clearTarget(): void {
    this.targetPosition = null
  }

  /**
   * Get target position
   */
  getTarget(): Vector2 | null {
    return this.targetPosition
  }

  /**
   * Draw hero-specific operative sprite on canvas
   */
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const { x: screenX, y: screenY } = camera.worldToScreen(this.x, this.y)
    const cx = screenX + this.width / 2
    const cy = screenY + this.height / 2
    const r = Math.max(12, this.width / 2)
    const heroId = this.hero?.id || 'hero_01'

    const palette: Record<string, { primary: string; secondary: string; accent: string; visor: string }> = {
      hero_01: { primary: '#1E3A8A', secondary: '#3B82F6', accent: '#00F0FF', visor: '#67E8F9' },
      hero_02: { primary: '#065F46', secondary: '#10B981', accent: '#34D399', visor: '#FFD700' },
      hero_03: { primary: '#78350F', secondary: '#D97706', accent: '#FBBF24', visor: '#00F0FF' },
      hero_04: { primary: '#4C1D95', secondary: '#8B5CF6', accent: '#C084FC', visor: '#00F0FF' },
      hero_05: { primary: '#92400E', secondary: '#F59E0B', accent: '#FDE68A', visor: '#FFFFFF' },
      hero_06: { primary: '#7F1D1D', secondary: '#EF4444', accent: '#FB923C', visor: '#FEF08A' },
    }
    const colors = palette[heroId] || palette.hero_01

    ctx.save()

    // Ground drop shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + r * 0.78, r * 0.85, r * 0.35, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.translate(cx, cy)
    ctx.rotate(this.facingAngle)

    // Thruster flame wake when moving
    if (this.isMoving) {
      const flameLen = 7 + Math.sin(this.animTime * 28) * 3
      ctx.fillStyle = colors.accent
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.moveTo(-r * 0.7, -5)
      ctx.lineTo(-r * 0.7 - flameLen, 0)
      ctx.lineTo(-r * 0.7, 5)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
    }

    // Back gear / silhouette accents per hero archetype
    if (heroId === 'hero_04') {
      // Chrono speedster swept phase fins
      ctx.fillStyle = colors.accent
      ctx.beginPath()
      ctx.moveTo(-4, -r * 0.4)
      ctx.lineTo(-r * 1.1, -r * 0.85)
      ctx.lineTo(-r * 0.65, -2)
      ctx.closePath()
      ctx.fill()
      ctx.beginPath()
      ctx.moveTo(-4, r * 0.4)
      ctx.lineTo(-r * 1.1, r * 0.85)
      ctx.lineTo(-r * 0.65, 2)
      ctx.closePath()
      ctx.fill()
    } else if (heroId === 'hero_03' || heroId === 'hero_06') {
      // Twin backpack power cells / fuel canisters
      ctx.fillStyle = heroId === 'hero_06' ? '#EA580C' : '#334155'
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(-r * 0.95, -9, 7, 7, 2)
      ctx.roundRect(-r * 0.95, 2, 7, 7, 2)
      ctx.fill()
      ctx.stroke()
    }

    // Armored shoulder pauldrons / torso plate
    ctx.fillStyle = colors.primary
    ctx.strokeStyle = colors.accent
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(-r * 0.68, -r * 0.82, r * 1.15, r * 1.64, 8)
    ctx.fill()
    ctx.stroke()

    // Central chest chassis
    ctx.fillStyle = colors.secondary
    ctx.beginPath()
    ctx.arc(0, 0, r * 0.56, 0, Math.PI * 2)
    ctx.fill()

    // Hero signature weapon silhouette
    if (heroId === 'hero_01') {
      // Vanguard plasma katana angled forward-right
      ctx.strokeStyle = '#E0F2FE'
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.moveTo(4, r * 0.55)
      ctx.lineTo(r * 1.35, r * 0.15)
      ctx.stroke()
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = 1.5
      ctx.stroke()
    } else if (heroId === 'hero_05') {
      // Paladin curved tower shield in front
      ctx.strokeStyle = '#FDE047'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.arc(3, 0, r * 0.95, -Math.PI * 0.42, Math.PI * 0.42)
      ctx.stroke()
    } else {
      // Tactical blaster / carbine barrel extending forward
      ctx.fillStyle = '#0F172A'
      ctx.strokeStyle = colors.accent
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(r * 0.25, 3, r * 0.85, 5, 2)
      ctx.fill()
      ctx.stroke()
    }

    // Tactical helmet dome & glowing visor slit
    ctx.fillStyle = '#0F172A'
    ctx.beginPath()
    ctx.arc(2, 0, r * 0.42, 0, Math.PI * 2)
    ctx.fill()

    ctx.fillStyle = colors.visor
    ctx.beginPath()
    ctx.arc(4, 0, r * 0.34, -Math.PI * 0.38, Math.PI * 0.38)
    ctx.lineTo(4, 0)
    ctx.closePath()
    ctx.fill()

    ctx.restore()

    // Invulnerability phase-shield shimmer ring
    if (this.isInvulnerable) {
      ctx.save()
      ctx.globalAlpha = 0.45 + 0.35 * Math.sin(this.animTime * 18)
      ctx.strokeStyle = '#00F0FF'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, r + 6, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // Crisp HP bar with dark frame above operative
    const barW = Math.max(36, this.width)
    const barX = cx - barW / 2
    const barY = screenY - 12
    const healthPercent = Math.max(0, Math.min(1, this.health / this.maxHealth))
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
    ctx.fillRect(barX - 1, barY - 1, barW + 2, 6)
    ctx.fillStyle = healthPercent > 0.35 ? '#10B981' : '#FF0055'
    ctx.fillRect(barX, barY, barW * healthPercent, 4)
  }

  /**
   * Get player stats
   */
  getStats(): {
    health: number,
    maxHealth: number,
    healthPercent: number,
    speed: number,
    isAlive: boolean
  } {
    return {
      health: this.health,
      maxHealth: this.maxHealth,
      healthPercent: this.health / this.maxHealth,
      speed: this.speed,
      isAlive: this.isAlive
    }
  }
}

export default Player
