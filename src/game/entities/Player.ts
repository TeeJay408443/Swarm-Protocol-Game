/**
 * Player Entity
 * Phase 7: Build the Game - Player Character
 */

import { Vector2 } from '../utils/vector'
import { Camera } from '../engine/Camera'
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
  
  /** Targeting */
  targetPosition: Vector2 | null = null

  constructor(options: PlayerOptions = {}) {
    this.x = options.x || 0
    this.y = options.y || 0
    this.width = options.width || 40
    this.height = options.height || 40
    this.speed = options.speed || 200 // pixels per second
    this.color = options.color || '#00F0FF' // Cyan
    this.maxHealth = options.maxHealth || 100
    this.health = this.maxHealth
    this.hero = options.hero || null
    
    // If hero is provided, use its stats
    if (this.hero) {
      this.maxHealth = this.hero.hp
      this.health = this.maxHealth
      this.speed = this.hero.speed * 100 // Convert speed multiplier to pixels
    }
  }

  /**
   * Update player state
   */
  update(movement: Vector2, deltaTime: number): void {
    if (!this.isAlive) return
    
    // Apply movement
    this.velocity = Vector2.multiply(movement, this.speed)
    this.x += this.velocity.x * deltaTime
    this.y += this.velocity.y * deltaTime
    
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
   * Draw player on canvas
   */
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const { x: screenX, y: screenY } = camera.worldToScreen(this.x, this.y)
    
    // Draw player body
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(
      screenX + this.width / 2,
      screenY + this.height / 2,
      this.width / 2,
      0,
      Math.PI * 2
    )
    ctx.fill()
    
    // Draw player outline
    ctx.strokeStyle = '#FFFFFF'
    ctx.lineWidth = 2
    ctx.stroke()
    
    // Draw invulnerability effect
    if (this.isInvulnerable) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.01)
      ctx.fillStyle = '#FFFFFF'
      ctx.beginPath()
      ctx.arc(
        screenX + this.width / 2,
        screenY + this.height / 2,
        this.width / 2 + 5,
        0,
        Math.PI * 2
      )
      ctx.fill()
      ctx.globalAlpha = 1
    }
    
    // Draw health bar
    const healthPercent = this.health / this.maxHealth
    ctx.fillStyle = '#FF0055' // Alert red
    ctx.fillRect(
      screenX,
      screenY - 10,
      this.width * healthPercent,
      4
    )
    
    // Draw attack cooldown indicator
    if (this.attackCooldown > 0) {
      const cooldownPercent = this.attackCooldown / this.attackCooldownMax
      ctx.fillStyle = 'rgba(0, 240, 255, 0.5)'
      ctx.fillRect(
        screenX,
        screenY + this.height + 5,
        this.width * cooldownPercent,
        4
      )
    }
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
