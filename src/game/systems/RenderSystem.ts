/**
 * Render System
 * Phase 7: Build the Game - Rendering Pipeline
 */

import { Camera } from '../engine/Camera'
import { Player } from '../entities/Player'
import { Enemy } from '../entities/Enemy'
import { Projectile } from '../entities/Projectile'
import { Coin } from '../entities/Coin'
import { Vector2 } from '../utils/vector'

export interface Renderable {
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void
  getPosition(): Vector2
  isAlive: boolean
}

export interface RenderLayer {
  name: string
  entities: Renderable[]
  visible: boolean
  opacity: number
}

export interface RenderStats {
  totalEntities: number
  entitiesByLayer: Record<string, number>
  drawCalls: number
  frameTime: number
}

export class RenderSystem {
  /** Camera reference */
  private camera: Camera
  
  /** Canvas context */
  private ctx: CanvasRenderingContext2D
  
  /** Canvas dimensions */
  private width: number
  private height: number
  
  /** Render layers (drawn in order) */
  private layers: RenderLayer[] = []
  
  /** Layer order for rendering */
  private layerOrder: string[] = [
    'background',
    'grid',
    'coins',
    'projectiles',
    'enemies',
    'player',
    'effects',
    'hud',
    'ui'
  ]
  
  /** Background */
  private backgroundColor: string = '#0B0F19' // Slate Carbon
  private gridColor: string = 'rgba(0, 240, 255, 0.1)'
  private gridSize: number = 50
  
  /** Effects */
  private effects: {
    x: number
    y: number
    type: 'hit' | 'explosion' | 'heal' | 'levelup'
    lifetime: number
    maxLifetime: number
    color: string
    size: number
  }[] = []
  
  /** Stats */
  private stats: RenderStats = {
    totalEntities: 0,
    entitiesByLayer: {},
    drawCalls: 0,
    frameTime: 0
  }
  
  /** Debug mode */
  private debugMode: boolean = false

  constructor(camera: Camera, ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.camera = camera
    this.ctx = ctx
    this.width = width
    this.height = height
    
    // Initialize layers
    this.initializeLayers()
  }

  /**
   * Initialize render layers
   */
  private initializeLayers(): void {
    for (const layerName of this.layerOrder) {
      this.layers.push({
        name: layerName,
        entities: [],
        visible: true,
        opacity: 1
      })
    }
  }

  /**
   * Get layer by name
   */
  private getLayer(name: string): RenderLayer | null {
    return this.layers.find(layer => layer.name === name) || null
  }

  /**
   * Add entity to a specific layer
   */
  addEntity(entity: Renderable, layerName: string = 'default'): void {
    // Determine layer automatically if not specified
    if (layerName === 'default') {
      layerName = this.determineLayer(entity)
    }
    
    const layer = this.getLayer(layerName)
    if (layer) {
      layer.entities.push(entity)
    } else {
      // Create new layer if it doesn't exist
      this.layers.push({
        name: layerName,
        entities: [entity],
        visible: true,
        opacity: 1
      })
      // Add to layer order if not present
      if (!this.layerOrder.includes(layerName)) {
        this.layerOrder.push(layerName)
      }
    }
  }

  /**
   * Remove entity from all layers
   */
  removeEntity(entity: Renderable): void {
    for (const layer of this.layers) {
      const index = layer.entities.indexOf(entity)
      if (index !== -1) {
        layer.entities.splice(index, 1)
        break
      }
    }
  }

  /**
   * Determine which layer an entity belongs to
   */
  private determineLayer(entity: Renderable): string {
    if (entity instanceof Player) {
      return 'player'
    } else if (entity instanceof Enemy) {
      return 'enemies'
    } else if (entity instanceof Projectile) {
      return 'projectiles'
    } else if (entity instanceof Coin) {
      return 'coins'
    }
    return 'default'
  }

  /**
   * Add multiple entities
   */
  addEntities(entities: Renderable[], layerName: string = 'default'): void {
    for (const entity of entities) {
      this.addEntity(entity, layerName)
    }
  }

  /**
   * Remove all entities from a layer
   */
  clearLayer(layerName: string): void {
    const layer = this.getLayer(layerName)
    if (layer) {
      layer.entities = []
    }
  }

  /**
   * Clear all entities from all layers
   */
  clearAll(): void {
    for (const layer of this.layers) {
      layer.entities = []
    }
    this.effects = []
  }

  /**
   * Add a visual effect
   */
  addEffect(
    x: number,
    y: number,
    type: 'hit' | 'explosion' | 'heal' | 'levelup',
    color: string = '#FFFFFF',
    size: number = 20
  ): void {
    this.effects.push({
      x,
      y,
      type,
      lifetime: 0,
      maxLifetime: type === 'explosion' ? 0.5 : type === 'levelup' ? 1 : 0.2,
      color,
      size
    })
  }

  /**
   * Update effects
   */
  updateEffects(deltaTime: number): void {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i]
      effect.lifetime += deltaTime
      
      if (effect.lifetime >= effect.maxLifetime) {
        this.effects.splice(i, 1)
      }
    }
  }

  /**
   * Render everything
   */
  render(deltaTime: number): void {
    const startTime = performance.now()
    
    // Clear canvas
    this.clearCanvas()
    
    // Draw background
    this.drawBackground()
    
    // Draw grid
    if (this.debugMode) {
      this.drawGrid()
    }
    
    // Draw layers in order
    for (const layerName of this.layerOrder) {
      const layer = this.getLayer(layerName)
      if (layer && layer.visible) {
        this.ctx.globalAlpha = layer.opacity
        this.drawLayer(layer, deltaTime)
        this.ctx.globalAlpha = 1
      }
    }
    
    // Draw effects
    this.drawEffects(deltaTime)
    
    // Update stats
    this.updateStats(startTime)
    
    // Draw debug info
    if (this.debugMode) {
      this.drawDebugInfo()
    }
  }

  /**
   * Clear the canvas
   */
  private clearCanvas(): void {
    this.ctx.fillStyle = this.backgroundColor
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  /**
   * Draw background
   */
  private drawBackground(): void {
    // Gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, this.width, this.height)
    gradient.addColorStop(0, '#0B0F19')
    gradient.addColorStop(1, '#1A1F2E')
    
    this.ctx.fillStyle = gradient
    this.ctx.fillRect(0, 0, this.width, this.height)
    
    // Subtle grid pattern
    this.ctx.fillStyle = 'rgba(0, 240, 255, 0.02)'
    for (let y = 0; y < this.height; y += this.gridSize * 2) {
      for (let x = 0; x < this.width; x += this.gridSize * 2) {
        this.ctx.beginPath()
        this.ctx.arc(x, y, 1, 0, Math.PI * 2)
        this.ctx.fill()
      }
    }
  }

  /**
   * Draw grid
   */
  private drawGrid(): void {
    this.ctx.strokeStyle = this.gridColor
    this.ctx.lineWidth = 1
    
    // Calculate camera offset
    const offsetX = this.camera.x % this.gridSize
    const offsetY = this.camera.y % this.gridSize
    
    // Draw vertical lines
    for (let x = -offsetX; x < this.width; x += this.gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.height)
      this.ctx.stroke()
    }
    
    // Draw horizontal lines
    for (let y = -offsetY; y < this.height; y += this.gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.width, y)
      this.ctx.stroke()
    }
  }

  /**
   * Draw a single layer
   */
  private drawLayer(layer: RenderLayer, deltaTime: number): void {
    for (const entity of layer.entities) {
      if (entity.isAlive !== false) {
        entity.draw(this.ctx, this.camera)
        this.stats.drawCalls++
      }
    }
  }

  /**
   * Draw effects
   */
  private drawEffects(deltaTime: number): void {
    for (const effect of this.effects) {
      const { x: screenX, y: screenY } = this.camera.worldToScreen(effect.x, effect.y)
      const progress = effect.lifetime / effect.maxLifetime
      
      switch (effect.type) {
        case 'hit':
          this.drawHitEffect(ctx, screenX, screenY, effect, progress)
          break
        case 'explosion':
          this.drawExplosionEffect(ctx, screenX, screenY, effect, progress)
          break
        case 'heal':
          this.drawHealEffect(ctx, screenX, screenY, effect, progress)
          break
        case 'levelup':
          this.drawLevelUpEffect(ctx, screenX, screenY, effect, progress)
          break
      }
    }
  }

  /**
   * Draw hit effect
   */
  private drawHitEffect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    effect: any,
    progress: number
  ): void {
    const size = effect.size * (1 - progress)
    ctx.fillStyle = effect.color
    ctx.globalAlpha = 1 - progress
    
    // Hit cross
    ctx.beginPath()
    ctx.moveTo(x - size / 2, y)
    ctx.lineTo(x + size / 2, y)
    ctx.moveTo(x, y - size / 2)
    ctx.lineTo(x, y + size / 2)
    ctx.strokeStyle = effect.color
    ctx.lineWidth = 2
    ctx.stroke()
    
    ctx.globalAlpha = 1
  }

  /**
   * Draw explosion effect
   */
  private drawExplosionEffect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    effect: any,
    progress: number
  ): void {
    const radius = effect.size * progress
    ctx.fillStyle = effect.color
    ctx.globalAlpha = 1 - progress
    
    // Explosion circle
    ctx.beginPath()
    ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.fill()
    
    // Explosion particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const distance = radius * 0.8
      const px = x + Math.cos(angle) * distance
      const py = y + Math.sin(angle) * distance
      ctx.beginPath()
      ctx.arc(px, py, 3, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.globalAlpha = 1
  }

  /**
   * Draw heal effect
   */
  private drawHealEffect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    effect: any,
    progress: number
  ): void {
    const size = effect.size * (1 - progress)
    ctx.fillStyle = effect.color
    ctx.globalAlpha = 1 - progress
    
    // Heal plus
    ctx.beginPath()
    ctx.moveTo(x - size / 4, y)
    ctx.lineTo(x + size / 4, y)
    ctx.moveTo(x, y - size / 4)
    ctx.lineTo(x, y + size / 4)
    ctx.strokeStyle = effect.color
    ctx.lineWidth = 3
    ctx.stroke()
    
    // Heal circle
    ctx.beginPath()
    ctx.arc(x, y, size / 2, 0, Math.PI * 2)
    ctx.stroke()
    
    ctx.globalAlpha = 1
  }

  /**
   * Draw level up effect
   */
  private drawLevelUpEffect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    effect: any,
    progress: number
  ): void {
    const size = effect.size * (1 - progress * 0.5)
    ctx.fillStyle = effect.color
    ctx.globalAlpha = 1 - progress
    
    // Glowing circle
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size)
    gradient.addColorStop(0, effect.color)
    gradient.addColorStop(1, 'transparent')
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
    
    // Level up text
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 16px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('LEVEL UP!', x, y)
    
    ctx.globalAlpha = 1
  }

  /**
   * Draw debug info
   */
  private drawDebugInfo(): void {
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.font = '12px Arial'
    this.ctx.textAlign = 'left'
    
    let y = 20
    this.ctx.fillText(`FPS: ${Math.round(1000 / this.stats.frameTime)}`, 10, y)
    y += 15
    this.ctx.fillText(`Entities: ${this.stats.totalEntities}`, 10, y)
    y += 15
    this.ctx.fillText(`Draw Calls: ${this.stats.drawCalls}`, 10, y)
    y += 15
    
    for (const layerName of this.layerOrder) {
      const count = this.stats.entitiesByLayer[layerName] || 0
      if (count > 0) {
        this.ctx.fillText(`${layerName}: ${count}`, 10, y)
        y += 15
      }
    }
    
    // Camera info
    this.ctx.fillText(`Camera: (${this.camera.x.toFixed(1)}, ${this.camera.y.toFixed(1)})`, 10, y)
    y += 15
    this.ctx.fillText(`Zoom: ${this.camera.zoom.toFixed(2)}`, 10, y)
  }

  /**
   * Update render stats
   */
  private updateStats(startTime: number): void {
    const endTime = performance.now()
    this.stats.frameTime = endTime - startTime
    
    this.stats.totalEntities = 0
    this.stats.drawCalls = 0
    this.stats.entitiesByLayer = {}
    
    for (const layer of this.layers) {
      const count = layer.entities.filter(e => e.isAlive !== false).length
      this.stats.totalEntities += count
      this.stats.entitiesByLayer[layer.name] = count
    }
  }

  /**
   * Toggle debug mode
   */
  toggleDebugMode(): void {
    this.debugMode = !this.debugMode
  }

  /**
   * Set background color
   */
  setBackgroundColor(color: string): void {
    this.backgroundColor = color
  }

  /**
   * Set grid color
   */
  setGridColor(color: string): void {
    this.gridColor = color
  }

  /**
   * Set grid size
   */
  setGridSize(size: number): void {
    this.gridSize = size
  }

  /**
   * Resize canvas
   */
  resize(width: number, height: number): void {
    this.width = width
    this.height = height
  }

  /**
   * Get render stats
   */
  getStats(): RenderStats {
    return { ...this.stats }
  }

  /**
   * Get camera reference
   */
  getCamera(): Camera {
    return this.camera
  }

  /**
   * Set camera reference
   */
  setCamera(camera: Camera): void {
    this.camera = camera
  }
}

export default RenderSystem
