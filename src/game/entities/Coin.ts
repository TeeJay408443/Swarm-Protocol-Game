/**
 * Coin Entity
 * Phase 7: Build the Game - Collectible System
 */

import { Vector2 } from '../utils/vector'
import { Camera } from '../engine/Camera'
import { Easing } from '../utils/easing'

export type CoinType = 'Bronze' | 'Silver' | 'Gold' | 'Platinum'

export interface CoinOptions {
  x?: number
  y?: number
  width?: number
  height?: number
  value?: number
  type?: CoinType
  magnetTarget?: { x: number, y: number } | null
  magnetSpeed?: number
  isMagnetized?: boolean
}

export class Coin {
  /** Position */
  x: number
  y: number
  
  /** Dimensions */
  width: number
  height: number
  
  /** Value */
  value: number
  
  /** Type */
  type: CoinType = 'Bronze'
  
  /** Visual */
  color: string = '#FFD700' // Default gold
  baseColor: string = '#FFD700'
  
  /** State */
  isAlive: boolean = true
  isCollected: boolean = false
  isMagnetized: boolean = false
  
  /** Magnetism */
  magnetTarget: { x: number, y: number } | null = null
  magnetSpeed: number = 400
  magnetProgress: number = 0
  
  /** Animation */
  private spawnTime: number = 0
  private spawnDuration: number = 0.5
  private bobTime: number = 0
  private bobSpeed: number = 2
  private bobAmount: number = 5
  
  /** Collection */
  private collectTime: number = 0
  private collectDuration: number = 0.3
  
  /** Bounds for spawning */
  private minX: number = 0
  private maxX: number = 2000
  private minY: number = 0
  private maxY: number = 2000

  constructor(options: CoinOptions = {}) {
    this.x = options.x || 0
    this.y = options.y || 0
    this.width = options.width || 20
    this.height = options.height || 20
    this.value = options.value || 1
    this.type = options.type || this.determineTypeFromValue()
    this.magnetTarget = options.magnetTarget || null
    this.magnetSpeed = options.magnetSpeed || 400
    this.isMagnetized = options.isMagnetized || false
    
    // Set color based on type
    this.updateColorFromType()
    
    // Randomize spawn position if not provided
    if (options.x === undefined || options.y === undefined) {
      this.randomizePosition()
    }
  }

  /**
   * Determine coin type from value
   */
  private determineTypeFromValue(): CoinType {
    if (this.value >= 50) return 'Platinum'
    if (this.value >= 20) return 'Gold'
    if (this.value >= 5) return 'Silver'
    return 'Bronze'
  }

  /**
   * Update color based on coin type
   */
  private updateColorFromType(): void {
    switch (this.type) {
      case 'Bronze':
        this.color = '#CD7F32'
        this.baseColor = '#CD7F32'
        break
      case 'Silver':
        this.color = '#C0C0C0'
        this.baseColor = '#C0C0C0'
        break
      case 'Gold':
        this.color = '#FFD700'
        this.baseColor = '#FFD700'
        break
      case 'Platinum':
        this.color = '#E5E4E2'
        this.baseColor = '#E5E4E2'
        break
    }
  }

  /**
   * Set coin type and update color
   */
  setType(type: CoinType): void {
    this.type = type
    this.updateColorFromType()
  }

  /**
   * Set coin value and update type if needed
   */
  setValue(value: number): void {
    this.value = value
    const newType = this.determineTypeFromValue()
    if (newType !== this.type) {
      this.setType(newType)
    }
  }

  /**
   * Randomize coin position within bounds
   */
  randomizePosition(): void {
    this.x = Math.random() * (this.maxX - this.minX) + this.minX
    this.y = Math.random() * (this.maxY - this.minY) + this.minY
  }

  /**
   * Set spawn bounds
   */
  setBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.minX = minX
    this.minY = minY
    this.maxX = maxX
    this.maxY = maxY
  }

  /**
   * Update coin state
   */
  update(deltaTime: number, playerPos?: Vector2): void {
    if (!this.isAlive) return
    
    // Update spawn animation
    if (this.spawnTime < this.spawnDuration) {
      this.spawnTime += deltaTime
      const progress = Math.min(1, Math.max(0, this.spawnTime / this.spawnDuration))
      const scale = Math.max(0.25, Easing.easeOutBack(progress))
      this.width = 20 * scale
      this.height = 20 * scale
    } else {
      this.width = 20
      this.height = 20
    }
    
    // Update bob animation
    this.bobTime += deltaTime
    
    // Magnetism
    if (this.isMagnetized && this.magnetTarget) {
      const dx = this.magnetTarget.x - this.x
      const dy = this.magnetTarget.y - this.y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance > 1) {
        const speed = this.magnetSpeed * (1 - this.magnetProgress)
        const moveX = (dx / distance) * speed * deltaTime
        const moveY = (dy / distance) * speed * deltaTime
        
        this.x += moveX
        this.y += moveY
        
        // Update progress
        this.magnetProgress = 1 - (distance / (Math.sqrt(
          (this.magnetTarget.x - this.x + moveX) ** 2 + 
          (this.magnetTarget.y - this.y + moveY) ** 2
        )))
      } else {
        // Reached target
        this.isMagnetized = false
        this.magnetProgress = 0
      }
    }
    
    // Check if collected
    if (playerPos && this.checkCollection(playerPos)) {
      this.collect()
    }
    
    // Update collection animation
    if (this.isCollected) {
      this.collectTime += deltaTime
      if (this.collectTime >= this.collectDuration) {
        this.isAlive = false
      }
    }
  }

  /**
   * Check if player can collect this coin
   */
  private checkCollection(playerPos: Vector2): boolean {
    const dx = this.x - playerPos.x
    const dy = this.y - playerPos.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < this.width + 20
  }

  /**
   * Collect the coin
   */
  collect(): void {
    if (this.isCollected) return
    this.isCollected = true
    this.collectTime = 0
  }

  /**
   * Magnetize the coin toward a target
   */
  magnetize(target: { x: number, y: number }): void {
    this.isMagnetized = true
    this.magnetTarget = target
    this.magnetProgress = 0
  }

  /**
   * Stop magnetism
   */
  stopMagnetize(): void {
    this.isMagnetized = false
    this.magnetTarget = null
    this.magnetProgress = 0
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
      left: this.x - this.width / 2,
      right: this.x + this.width / 2,
      top: this.y - this.height / 2,
      bottom: this.y + this.height / 2
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
   * Draw coin on canvas
   */
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    const { x: screenX, y: screenY } = camera.worldToScreen(this.x, this.y)
    
    // Apply bob animation
    const bobOffset = Math.sin(this.bobTime * this.bobSpeed) * this.bobAmount
    
    // Draw coin based on type
    switch (this.type) {
      case 'Bronze':
        this.drawBronzeCoin(ctx, screenX, screenY - bobOffset)
        break
      case 'Silver':
        this.drawSilverCoin(ctx, screenX, screenY - bobOffset)
        break
      case 'Gold':
        this.drawGoldCoin(ctx, screenX, screenY - bobOffset)
        break
      case 'Platinum':
        this.drawPlatinumCoin(ctx, screenX, screenY - bobOffset)
        break
    }
    
    // Draw value text
    if (this.value > 1) {
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 10px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('+' + this.value, screenX, screenY - this.height - 5)
    }
    
    // Draw collection animation
    if (this.isCollected) {
      const progress = Math.min(1, Math.max(0, this.collectTime / this.collectDuration))
      const scale = Math.max(0, 1 - progress)
      const alpha = Math.max(0, 1 - progress)
      const collectRadius = Math.max(0.1, (this.width / 2) * scale)
      
      ctx.globalAlpha = alpha
      ctx.fillStyle = '#00F0FF'
      ctx.beginPath()
      ctx.arc(
        screenX,
        screenY - bobOffset,
        collectRadius,
        0,
        Math.PI * 2
      )
      ctx.fill()
      
      // Collect particles
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2
        const distance = this.width * 0.5 * progress
        const px = screenX + Math.cos(angle) * distance
        const py = screenY - bobOffset + Math.sin(angle) * distance
        ctx.fillStyle = '#00F0FF'
        ctx.beginPath()
        ctx.arc(px, py, 2, 0, Math.PI * 2)
        ctx.fill()
      }
      
      ctx.globalAlpha = 1
    }
    
    // Draw magnetism effect
    if (this.isMagnetized) {
      const progress = this.magnetProgress
      ctx.strokeStyle = 'rgba(0, 240, 255, ' + (0.5 + 0.5 * progress) + ')'
      ctx.lineWidth = Math.max(0.5, 2 * (1 - progress))
      
      if (this.magnetTarget) {
        const { x: targetX, y: targetY } = camera.worldToScreen(
          this.magnetTarget.x, 
          this.magnetTarget.y
        )
        ctx.beginPath()
        ctx.moveTo(screenX, screenY - bobOffset)
        ctx.lineTo(targetX, targetY)
        ctx.stroke()
      }
    }
    
    // Draw spawn animation
    if (this.spawnTime < this.spawnDuration) {
      const progress = Math.min(1, Math.max(0, this.spawnTime / this.spawnDuration))
      const haloRadius = Math.max(0.1, (this.width / 2) * 1.5 * (1 - progress))
      
      ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.max(0, 1 - progress) + ')'
      ctx.beginPath()
      ctx.arc(
        screenX,
        screenY - bobOffset,
        haloRadius,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  }

  private drawDetailedCoin(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    rimColor: string,
    faceColor: string,
    highlightColor: string,
    glowColor?: string
  ): void {
    const outerRadius = Math.max(2, this.width / 2)
    const innerRadius = Math.max(1, outerRadius - 2.2)
    const rimRadius = Math.max(1, outerRadius - 1)
    const glint = 0.35 + 0.25 * Math.sin(this.bobTime * 4)

    if (glowColor) {
      ctx.fillStyle = glowColor
      ctx.beginPath()
      ctx.arc(x, y, outerRadius + 4, 0, Math.PI * 2)
      ctx.fill()
    }

    // Outer metallic bevel
    ctx.fillStyle = rimColor
    ctx.beginPath()
    ctx.arc(x, y, outerRadius, 0, Math.PI * 2)
    ctx.fill()

    // Recessed inner face
    ctx.fillStyle = faceColor
    ctx.beginPath()
    ctx.arc(x, y, innerRadius, 0, Math.PI * 2)
    ctx.fill()

    // Specular edge ring
    ctx.strokeStyle = highlightColor
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(x, y, rimRadius, 0, Math.PI * 2)
    ctx.stroke()

    // Minted center diamond emblem
    const emblem = Math.max(1.5, innerRadius * 0.45)
    ctx.fillStyle = highlightColor
    ctx.globalAlpha = 0.75
    ctx.beginPath()
    ctx.moveTo(x, y - emblem)
    ctx.lineTo(x + emblem * 0.75, y)
    ctx.lineTo(x, y + emblem)
    ctx.lineTo(x - emblem * 0.75, y)
    ctx.closePath()
    ctx.fill()

    // Animated diagonal shine
    ctx.fillStyle = '#FFFFFF'
    ctx.globalAlpha = glint
    ctx.beginPath()
    ctx.ellipse(
      x - outerRadius * 0.32,
      y - outerRadius * 0.32,
      Math.max(0.8, outerRadius * 0.28),
      Math.max(0.6, outerRadius * 0.16),
      Math.PI / 4,
      0,
      Math.PI * 2
    )
    ctx.fill()
    ctx.globalAlpha = 1
  }

  private drawBronzeCoin(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this.drawDetailedCoin(ctx, x, y, '#7C2D12', '#D97706', '#FDE68A')
  }

  private drawSilverCoin(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this.drawDetailedCoin(ctx, x, y, '#64748B', '#CBD5E1', '#FFFFFF')
  }

  private drawGoldCoin(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this.drawDetailedCoin(ctx, x, y, '#B45309', '#FACC15', '#FEF9C3', 'rgba(255, 215, 0, 0.25)')
  }

  private drawPlatinumCoin(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this.drawDetailedCoin(ctx, x, y, '#0EA5E9', '#E0F2FE', '#FFFFFF', 'rgba(0, 240, 255, 0.32)')
  }

  /**
   * Get coin stats
   */
  getStats(): {
    value: number
    type: CoinType
    isAlive: boolean
    isCollected: boolean
    x: number
    y: number
  } {
    return {
      value: this.value,
      type: this.type,
      isAlive: this.isAlive,
      isCollected: this.isCollected,
      x: this.x,
      y: this.y
    }
  }
}

export default Coin
